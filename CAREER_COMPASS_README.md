# Career Compass - Feature Documentation

## Overview

**Career Compass** is a new section in the AIstudyassistant that helps students discover their career path with personalized guidance from an AI mentor. It's designed to be warm, encouraging, and personal—like having a mentor who understands their unique journey.

## What Students Can Do

### 1. **Build Their Career Profile**
Students fill out a simple, friendly form with:
- **Career Goals**: Choose between Internship, Job, Higher Studies, or just Exploring
- **Interests**: Select from suggestions or add custom ones (AI, Web Dev, Research, etc.)
- **Skills**: List technical skills they already have (Python, React, AWS, etc.)
- **Experience**: Checkbox-based tracking of what they've done (Hackathons, Open Source, Internships, Research, Jobs) with optional details

### 2. **Get AI-Powered Career Analysis**
Once submitted, the AI automatically:
- **Analyzes their standing** in simple, encouraging language
- **Recommends opportunities** most relevant to their interests and goals (not just semester-based)
- **Identifies unexplored areas** and explains WHY they matter in a positive, motivating way
- **Creates a 6-12 month roadmap** tailored to their profile
- **Provides a personalized motivational message**

### 3. **Update Anytime, Anytime**
Students can revisit Career Compass anytime to:
- Update their interests, skills, or goals
- Log new experiences they've completed
- Get refreshed recommendations based on their growth

## Key Features

### ✨ Warm, Mentor-Like Tone
- All AI guidance reads like a personal conversation, not a checklist
- Uses "you" language and acknowledges where they are
- Encourages exploration without pressure

### 🎯 Opportunities for Everyone
- **Internships**: For those seeking practical experience
- **Hackathons**: For building projects and networking
- **Research**: For academic and innovation-focused students
- **Open Source**: For collaborative learning
- **Jobs**: For those ready to enter industry

### 💡 Motivation, Not Just Information
- Explains *why* each opportunity matters for their specific goals
- Gently nudges toward unexplored areas with encouragement
- Provides concrete next steps to get started

### 📊 Personalization
- Recommendations based on **interests & goals**, not just semester
- Considers what they've already done and what's missing
- Adapts as they add new skills and experiences

## Technical Details

### Database Model: `CareerProfile`
Stored in `career_profiles` table with fields:
- `user_id`: Foreign key to users table
- `interests`: JSON array of career interests
- `skills`: JSON array of technical skills
- `career_goal`: String (internship, job, higher_studies, exploring)
- Experience flags: `has_done_hackathons`, `has_done_open_source`, etc.
- Experience details: Optional text descriptions of each experience
- `ai_analysis`: JSON containing the full career analysis
- `ai_motivational_message`: Personalized motivational message

### API Endpoints

#### GET `/api/career/profile`
Retrieve the user's existing career profile.
- **Auth**: Required (login_required)
- **Response**: Full profile object with analysis if available

#### POST `/api/career/profile`
Save or update career profile and generate AI analysis.
- **Auth**: Required
- **Body**: Profile object with interests, skills, career_goal, experience flags
- **Response**: Updated profile with new AI analysis and motivational message
- **Note**: Automatically calls Gemini AI to generate recommendations

#### GET `/api/career/analysis`
Get just the AI-generated analysis and motivational message.
- **Auth**: Required
- **Response**: Analysis and motivational message

#### DELETE `/api/career/profile`
Delete the user's career profile (if they want a fresh start).
- **Auth**: Required

### AI Service: `career_service.py`
Located at `backend/services/career_service.py`

**Key Functions**:
- `analyze_career_profile()`: Analyzes student profile and generates recommendations
  - Uses Gemini API with temperature 0.7 for creative but coherent responses
  - Returns structured JSON with opportunities, unexplored areas, and roadmap
  
- `generate_motivational_message()`: Creates a brief, personal motivational message
  - Short (1-2 sentences) and encouraging
  - Acknowledges their unique journey

### Frontend Component: `CareerCompass.jsx`
Located at `frontend/src/pages/CareerCompass.jsx`

**UI Flow**:
1. **Form Step**: Collect profile information with interactive UI
2. **Loading Step**: Show "Creating your Career Compass..." while AI analyzes
3. **Results Step**: Display analysis with opportunities, unexplored areas, and roadmap

**Features**:
- Smooth animations between steps
- Preset suggestions for interests and skills (easily editable)
- Checkbox-based experience tracking
- Beautiful cards for each recommendation
- "Save as PDF" button for reference
- "Update Profile" button to edit anytime

## Navigation & Integration

### Sidebar Navigation
Career Compass appears under a new **"Career & Growth"** section in the sidebar with a compass icon 🧭

### Route
- **Path**: `/dashboard/career`
- **Access**: Only for authenticated users
- **Layout**: Uses the existing DashboardLayout

## How to Use (For Students)

1. **Navigate**: Click "Career Compass" in the sidebar under "Career & Growth"
2. **Fill Profile**: 
   - Select your career goal
   - Add interests (use suggestions or type custom)
   - Add skills (same as interests)
   - Checkbox what you've done, optionally describe
3. **Submit**: Click "Get My Career Compass"
4. **Review**: Read your personalized analysis
5. **Update Anytime**: Click "Update Profile" to refresh recommendations

## Customization & Extension

### Adding More Interest Suggestions
Edit the `interestSuggestions` array in `CareerCompass.jsx`:
```javascript
const interestSuggestions = [
  'AI & Machine Learning',
  'Web Development',
  // Add more here
];
```

### Modifying AI Prompts
Edit the prompt in `career_service.py`'s `analyze_career_profile()` function to change how the AI analyzes profiles.

### Changing Opportunity Types
The system currently supports: Internship, Hackathon, Research, Open Source, Job
To add more, update:
1. Experience checkboxes in `CareerCompass.jsx`
2. Opportunity type handling in `career_service.py` prompt
3. Experience flags in `CareerProfile` model

## Example AI Response Structure

The AI returns JSON like:
```json
{
  "current_standing": "You're building a strong foundation with interests in AI...",
  "opportunities": [
    {
      "type": "Internship",
      "title": "AI/ML Internship at Tech Startup",
      "why_for_them": "Your Python and ML skills are exactly what they need...",
      "timeline": "Next semester when you finish your ML course",
      "next_steps": ["Search on LinkedIn", "Connect with alumni", ...]
    }
  ],
  "unexplored_areas": [
    {
      "area": "Open Source",
      "why_matters": "Contributing to open source shows real-world impact...",
      "how_to_start": "Start with a beginner-friendly project on GitHub...",
      "benefit_to_them": "It will give you practical experience..."
    }
  ],
  "suggested_path": "Month 1-2: Build 2 small projects...",
  "motivational_message": "Your journey is unique and exciting..."
}
```

## Files Created/Modified

### New Files
- `backend/models/career.py` - CareerProfile database model
- `backend/services/career_service.py` - AI analysis service
- `backend/routes/career.py` - API endpoints
- `frontend/src/pages/CareerCompass.jsx` - Career Compass component

### Modified Files
- `backend/app.py` - Added CareerProfile import and career route registration
- `frontend/src/router/AppRouter.jsx` - Added career route and import
- `frontend/src/components/Sidebar.jsx` - Added Career Compass nav item

## Troubleshooting

### "GEMINI_API_KEY not configured"
Make sure your `.env` file has `GEMINI_API_KEY` set in the backend.

### Profile saves but no analysis appears
Check browser console and backend logs for errors. Ensure Gemini API key is valid and has quota.

### Frontend doesn't show Career Compass option
1. Restart the frontend dev server
2. Check that `CareerCompass.jsx` is in the right location
3. Verify imports in `AppRouter.jsx` and `Sidebar.jsx`

## Future Enhancements

- [ ] Career milestone tracking (completed opportunities)
- [ ] Peer comparison (see how your path compares to others)
- [ ] Integration with job boards to show real opportunities
- [ ] Export analysis as PDF with better formatting
- [ ] Monthly career newsletter with fresh recommendations
- [ ] Mentor matching based on profile
- [ ] Career skill gaps analysis with learning resources

---

**Career Compass** is designed to grow with your students. It's not a one-time tool—it's a companion that evolves as they do. 🌟
