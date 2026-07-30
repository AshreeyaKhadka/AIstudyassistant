# Career Compass - Developer Reference Card

## 🎯 Quick Reference

### Database Model
```
CareerProfile
├── id (PK)
├── user_id (FK, unique)
├── interests (JSON)
├── skills (JSON)
├── career_goal (enum)
├── experience flags (boolean x5)
├── experience details (text)
├── ai_analysis (JSON - cached)
├── ai_motivational_message (text)
├── created_at, updated_at
```

### API Endpoints Signature

**POST /api/career/profile**
```python
Request: {
  "interests": ["AI", "Web Dev"],
  "skills": ["Python", "React"],
  "career_goal": "internship",
  "experience": {
    "hackathons": true,
    "open_source": false,
    ...
  },
  "experience_details": {...}
}

Response: {
  "success": true,
  "profile": {...},
  "ai_analysis": {...},
  "ai_motivational_message": "..."
}
```

**GET /api/career/profile**
```
Response: Full CareerProfile object
```

**GET /api/career/analysis**
```
Response: {
  "analysis": {...},
  "motivational_message": "...",
  "updated_at": "ISO timestamp"
}
```

### AI Analysis JSON Structure
```json
{
  "current_standing": "string",
  "opportunities": [
    {
      "type": "Internship|Hackathon|Research|Open Source|Job",
      "title": "string",
      "why_for_them": "string",
      "next_steps": ["string"],
      "timeline": "string"
    }
  ],
  "unexplored_areas": [
    {
      "area": "string",
      "why_matters": "string",
      "how_to_start": "string",
      "benefit_to_them": "string"
    }
  ],
  "suggested_path": "string",
  "motivational_message": "string"
}
```

---

## 🔧 Configuration

### Environment Variables (backend/.env)
```
GEMINI_API_KEY=<your-key>
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

### Feature Flags (if needed)
Add to config.py or enable in code:
```python
CAREER_COMPASS_ENABLED = True
CAREER_COMPASS_AI_MODEL = 'gemini-2.5-flash'
CAREER_ANALYSIS_CACHE_MINUTES = 0  # 0 = cache forever until update
```

---

## 📂 File Structure

```
Project Root
├── backend/
│   ├── models/
│   │   ├── __init__.py ← UPDATED: added CareerProfile
│   │   └── career.py ← NEW
│   ├── services/
│   │   └── career_service.py ← NEW
│   ├── routes/
│   │   └── career.py ← NEW
│   └── app.py ← UPDATED: registered blueprint
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   └── CareerCompass.jsx ← NEW
│       ├── components/
│       │   └── Sidebar.jsx ← UPDATED: added nav
│       └── router/
│           └── AppRouter.jsx ← UPDATED: added route
│
└── Documentation
    ├── CAREER_COMPASS_README.md ← Feature guide
    ├── TESTING_DEPLOYMENT_GUIDE.md ← Test guide
    ├── IMPLEMENTATION_SUMMARY.md ← Architecture
    ├── VERIFICATION_CHECKLIST.md ← What's done
    └── QUICK_START.md ← Quick start
```

---

## 🧠 AI Prompting Strategy

### Temperature Settings
- **Analysis**: 0.7 (balanced creativity & consistency)
- **Motivational**: 0.8 (more creative)

### Token Limits
- **Analysis**: 2500 tokens
- **Motivational**: 150 tokens

### Prompt Tone Directives
- Warm and encouraging
- Personal and mentor-like
- Use "you" language
- Acknowledge current stage
- No corporate jargon

---

## 🛡️ Security Checklist

```python
@login_required  # All endpoints
def endpoint(user):
    # User ID automatically extracted from request
    profile = CareerProfile.query.filter_by(user_id=user.id).first()
    # Can only access own profile
```

- Authentication: ✓ login_required decorator
- Authorization: ✓ Implicit (user_id matching)
- Input validation: ✓ JSON schema
- SQL injection: ✓ SQLAlchemy ORM
- CORS: ✓ Already configured

---

## 📊 Performance Metrics

| Operation | Time | Notes |
|-----------|------|-------|
| Save profile (first) | 10-30s | Includes AI analysis |
| Save profile (update) | 10-30s | Regenerates analysis |
| View profile | <100ms | Database query only |
| View analysis | <100ms | Cached in profile |

---

## 🐛 Common Debugging

### Backend Debugging
```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Test Gemini API directly
from services.career_service import analyze_career_profile
result = analyze_career_profile("Name", ["AI"], ["Python"], "internship", {})
```

### Frontend Debugging
```javascript
// Check API responses in Network tab
// Console logs for React errors
// Check localStorage for session/auth
```

---

## 🚀 Deployment Checklist

- [ ] GEMINI_API_KEY configured
- [ ] Database migrations run
- [ ] Backend app loads
- [ ] Frontend builds
- [ ] All imports verified
- [ ] Test one profile end-to-end
- [ ] Monitor API quota usage
- [ ] Check error logs post-deployment

---

## 📈 Scaling Considerations

### For 1000+ users
- Add async job queue (Celery)
- Cache popular profiles
- Add rate limiting on updates
- Monitor Gemini API quota

### Database optimizations
```sql
CREATE INDEX idx_career_user_id ON career_profiles(user_id);
CREATE INDEX idx_career_updated ON career_profiles(updated_at DESC);
```

### API caching headers
```python
response.cache_control.max_age = 3600  # 1 hour
```

---

## 🔄 Update Workflow

1. **User updates profile** → POST /api/career/profile
2. **Server saves profile** → Database commit
3. **Server calls AI** → Gemini API (async recommended)
4. **AI returns analysis** → Stored in profile
5. **Server returns response** → Include analysis
6. **Frontend displays results** → User sees recommendations

---

## 🎨 UI Component Props

### CareerCompass.jsx
```jsx
// State managed internally
// No props required
// Uses React hooks for state
// Framer Motion for animations
// Lucide icons for UI

<CareerCompass />
```

---

## 🧪 Test Scenarios

### Scenario 1: New Student
- Interests: None yet
- Skills: Basic Python
- Goal: Exploring
- AI should: Encourage exploration

### Scenario 2: Focused Student
- Interests: AI, ML
- Skills: Python, TensorFlow
- Goal: Internship
- AI should: Target ML internships

### Scenario 3: Experienced Student
- Interests: Web Dev
- Skills: React, Node, AWS
- Goal: Job
- Experience: All (hackathons, open source, internships, etc)
- AI should: Recommend jobs, mention research

---

## 📞 Support / Troubleshooting

**API returning 401?**
→ Check login_required decorator, user must be authenticated

**Gemini API error?**
→ Check API key, quota, rate limits

**Profile saves but no analysis?**
→ Check Gemini API logs, network tab

**Frontend not showing Career Compass?**
→ Check route registration, sidebar import, browser cache

**Styling broken?**
→ Check Tailwind CSS running, clear cache, restart dev server

---

## 📚 Useful Links

- [Gemini API Docs](https://ai.google.dev/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/introduction/)
- [Lucide Icons](https://lucide.dev/)
- [SQLAlchemy Docs](https://docs.sqlalchemy.org/)

---

**Last Updated**: 2026-07-26
**Status**: Complete & Ready
**Version**: 1.0
