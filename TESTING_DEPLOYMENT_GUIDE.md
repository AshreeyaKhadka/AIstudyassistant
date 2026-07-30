# Career Compass - Testing & Deployment Guide

## Quick Start

### Backend Setup

1. **Database Migration** (automatic):
   - The `CareerProfile` model will be created automatically when the app starts
   - Run `python app.py` and the table will be created

2. **Verify Setup**:
   ```bash
   cd backend
   python -c "from models import CareerProfile; print('CareerProfile model loaded')"
   python -c "from routes.career import career_bp; print('Career routes loaded')"
   ```

3. **Environment Variables** (ensure these exist in `.env`):
   ```
   GEMINI_API_KEY=<your-key>
   GEMINI_MODEL=gemini-2.5-flash  # or latest model
   GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
   ```

### Frontend Setup

1. **No additional dependencies needed** - uses existing Lucide icons and Framer Motion

2. **Verify Component** (should show no errors):
   ```bash
   cd frontend
   npm start
   # Navigate to /dashboard/career in the app
   ```

## Testing Checklist

### Backend API Tests

**Test 1: Unauthenticated Request (should fail)**
```bash
curl -X GET http://localhost:5000/api/career/profile
# Expected: 401 Unauthorized
```

**Test 2: Create/Update Profile (authenticated)**
```bash
# First, get a valid JWT/session token from login
curl -X POST http://localhost:5000/api/career/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{
    "interests": ["AI", "Machine Learning"],
    "skills": ["Python", "TensorFlow"],
    "career_goal": "internship",
    "experience": {
      "hackathons": true,
      "open_source": false,
      "internships": false,
      "research_papers": true,
      "jobs": false
    },
    "experience_details": {
      "hackathon_details": "Won hackathon at college",
      "research_details": "Published paper on DL"
    }
  }'
# Expected: 200 with updated profile and AI analysis
```

**Test 3: Get Analysis**
```bash
curl -X GET http://localhost:5000/api/career/analysis \
  -H "Cookie: <your-session-cookie>"
# Expected: 200 with analysis, motivational_message, and updated_at
```

**Test 4: Retrieve Profile**
```bash
curl -X GET http://localhost:5000/api/career/profile \
  -H "Cookie: <your-session-cookie>"
# Expected: 200 with full profile object
```

### Frontend Manual Tests

**Test 1: Navigation**
- [ ] Log in to dashboard
- [ ] Sidebar shows "Career & Growth" section
- [ ] Compass icon is visible
- [ ] Clicking "Career Compass" navigates to /dashboard/career

**Test 2: Form Interaction**
- [ ] All 4 career goal buttons are clickable
- [ ] Can add interests from suggestions
- [ ] Can type custom interests
- [ ] Remove interest button (X) works
- [ ] Same for skills
- [ ] Checkboxes toggle experience flags
- [ ] Experience detail textareas appear when checked

**Test 3: Profile Submission**
- [ ] Click "Get My Career Compass"
- [ ] Loading state shows spinner + message
- [ ] Page transitions to results after analysis completes
- [ ] Results show all sections: Standing, Opportunities, Unexplored Areas, Roadmap

**Test 4: Results Display**
- [ ] "Where You Stand" section appears
- [ ] Opportunities list shows with icons, titles, descriptions
- [ ] Each opportunity shows "Why for them", "Next steps", "Timeline"
- [ ] Unexplored areas show with emoji icons
- [ ] Suggested roadmap appears
- [ ] Motivational message is displayed

**Test 5: Profile Updates**
- [ ] Click "Update Profile" button
- [ ] Form repopulates with previous data
- [ ] Can modify profile
- [ ] Save shows loading state
- [ ] Results refresh with new analysis

**Test 6: Print/Export**
- [ ] Click "Save as PDF"
- [ ] Browser print dialog opens
- [ ] Content is readable and formatted well

### Common Issues & Fixes

**Issue: "GEMINI_API_KEY not configured"**
```
Solution: Check backend/.env for GEMINI_API_KEY
```

**Issue: Career Compass not appearing in sidebar**
```
Solution: 
1. Check Sidebar.jsx has Compass import
2. Verify the Career & Growth section exists
3. Restart frontend dev server
```

**Issue: API returns 404 on /api/career endpoints**
```
Solution:
1. Check app.py has career_bp registration
2. Verify career routes are in /backend/routes/career.py
3. Backend must be restarted after file changes
```

**Issue: Profile saves but AI analysis doesn't show**
```
Solution:
1. Check browser console for JS errors
2. Check backend logs for Gemini API errors
3. Verify GEMINI_API_KEY is valid and has quota
4. Check network tab - POST should return analysis in profile object
```

**Issue: Interest/Skill suggestions not working**
```
Solution:
1. Check the interestSuggestions and skillSuggestions arrays in CareerCompass.jsx
2. Verify onClick handlers are correctly implemented
3. Check browser console for React errors
```

## Performance Considerations

### Optimization Done
- AI analysis is cached in the database (`ai_analysis` column)
- Only regenerates when profile is updated
- No re-analysis on every view

### Recommendations
- If handling many concurrent analysis requests, consider:
  - Adding a queue for AI generation (Celery)
  - Caching frequently generated analyses
  - Rate limiting profile updates to once per day

## Scaling Notes

**For Large User Base:**
1. **Database**: Consider indexing `user_id` in `career_profiles`
2. **API**: Add pagination if pulling analysis data
3. **AI**: Monitor Gemini API quota, consider rate limiting
4. **Cache**: Store completed analyses to reduce API calls

## Security Checklist

- [x] login_required decorator on all career endpoints
- [x] User can only access/modify their own profile
- [x] No sensitive data exposed in JSON responses
- [x] Input validation on profile submission
- [x] SQL injection prevention via SQLAlchemy ORM

## Monitoring

**Key Metrics to Track**:
1. API response times for `/api/career/profile` POST (should be < 30s due to AI)
2. Gemini API error rates
3. Profile completion rate (% of users who create profile)
4. Most common interests/skills (for UI optimization)

## Deployment Checklist

### Before Going Live
- [ ] All tests pass
- [ ] Backend database migrations run
- [ ] GEMINI_API_KEY configured in production
- [ ] CORS settings allow frontend domain
- [ ] Frontend build succeeds (`npm run build`)
- [ ] Error handling tested
- [ ] API rate limiting considered

### Post-Deployment
- [ ] Monitor backend logs for errors
- [ ] Check Gemini API quota usage
- [ ] Test profile creation as actual user
- [ ] Verify data is persisting in production DB
- [ ] Monitor frontend console for errors

## Rollback Plan

If issues occur:
1. **Frontend**: Simply delete or hide the Career Compass route
2. **Backend**: Routes remain but won't be called
3. **Database**: No data loss, table remains
4. **Users**: Will see no change in sidebar

## Future Testing

After deployment, consider:
- A/B testing different prompt approaches
- User survey on AI recommendation quality
- Analytics on which opportunities users pursue
- Feedback loop for improving AI prompts
