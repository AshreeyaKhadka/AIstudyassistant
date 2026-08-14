"""
Career Compass AI Service
========================
Analyzes student career profiles and generates personalized recommendations
using Gemini API for warm, mentoring-style guidance.
"""

import json
import logging
from services.llm_service import call_prompt

logger = logging.getLogger(__name__)


def _call_gemini(
    prompt: str,
    temperature: float = 0.7,
    max_tokens: int = 2000,
    json_mode: bool = True,
) -> str:
    """Compatibility wrapper around the shared provider/fallback service."""
    return call_prompt(
        prompt,
        temperature=temperature,
        max_tokens=max_tokens,
        json_mode=json_mode,
    )


def analyze_career_profile(user_name: str, interests: list, skills: list, career_goal: str, 
                          experience: dict, user_semester: int = 1) -> dict:
    """
    Analyze a student's career profile and generate personalized recommendations.
    
    Args:
        user_name: Student's name
        interests: List of career interests (e.g., ['AI', 'Web Dev', 'Research'])
        skills: List of technical skills (e.g., ['Python', 'React', 'Machine Learning'])
        career_goal: Career goal (internship, job, higher_studies, exploring)
        experience: Dict with boolean flags for different experiences
        user_semester: Current semester (for context)
    
    Returns:
        Dict with analysis and recommendations
    """
    
    # Build experience summary
    done_experiences = []
    missing_experiences = []
    
    if experience.get('hackathons'):
        done_experiences.append('Hackathons')
    else:
        missing_experiences.append('Hackathons')
        
    if experience.get('open_source'):
        done_experiences.append('Open Source')
    else:
        missing_experiences.append('Open Source')
        
    if experience.get('internships'):
        done_experiences.append('Internships')
    else:
        missing_experiences.append('Internships')
        
    if experience.get('research_papers'):
        done_experiences.append('Research')
    else:
        missing_experiences.append('Research')
        
    if experience.get('jobs'):
        done_experiences.append('Jobs/Industry')
    else:
        missing_experiences.append('Jobs/Industry')
    
    # Create the analysis prompt
    prompt = f"""You are a warm, encouraging career mentor speaking directly to a student. Analyze this student's profile and provide personalized guidance.

**Student Profile:**
- Name: {user_name}
- Semester: {user_semester}
- Career Interests: {', '.join(interests) if interests else 'Not specified yet'}
- Technical Skills: {', '.join(skills) if skills else 'Still building'}
- Career Goal: {career_goal if career_goal else 'Exploring options'}
- What they've done: {', '.join(done_experiences) if done_experiences else 'Just getting started'}
- What they haven't explored yet: {', '.join(missing_experiences) if missing_experiences else 'Everything!'}

Please provide your response as a JSON object with the following structure:
{{
  "current_standing": "A 2-3 sentence warm assessment of where this student is in their career journey",
  "personality": "Your persona - warm, mentor-like, encouraging",
  "opportunities": [
    {{
      "type": "Internship|Hackathon|Research|Open Source|Job",
      "title": "A specific opportunity recommendation",
      "why_for_them": "Why this is perfect for them based on their profile",
      "next_steps": ["Step 1", "Step 2", "Step 3"],
      "timeline": "When they should pursue this"
    }},
    ...
  ],
  "unexplored_areas": [
    {{
      "area": "Hackathons|Open Source|Research|Internships|Jobs",
      "why_matters": "Why this is important for their goals (mentoring tone, not preachy)",
      "how_to_start": "A warm, encouraging way to get started",
      "benefit_to_them": "How it will help their specific interests/goals"
    }},
    ...
  ],
  "motivational_message": "A personal, warm message that acknowledges their current stage and motivates them forward (2-3 sentences, like a mentor)",
  "suggested_path": "A high-level suggested learning/experience path for the next 6-12 months"
}}

Remember:
- Be warm and encouraging, like a mentor, not a checker
- Acknowledge where they are - some may just be starting
- Make recommendations specific to their interests and goals
- For missing experiences, explain WHY they matter, then encourage gently
- Use "you" and speak directly to them
- Keep the tone personal and motivating"""

    try:
        response_text = _call_gemini(prompt, temperature=0.7, max_tokens=2500)
        analysis = json.loads(response_text)
        return analysis
    except json.JSONDecodeError:
        logger.error(f"Failed to parse Gemini response as JSON: {response_text}")
        raise RuntimeError("AI analysis failed - invalid response format")
    except Exception as e:
        logger.error(f"Error analyzing career profile: {str(e)}")
        raise


def generate_motivational_message(user_name: str, analysis: dict) -> str:
    """
    Generate a brief, personalized motivational message based on analysis.
    """
    prompt = f"""Based on this career analysis, write a brief (1-2 sentence) personal, warm motivational message for {user_name}.

Analysis context:
- Current standing: {analysis.get('current_standing', '')}
- Opportunities identified: {len(analysis.get('opportunities', []))} relevant opportunities
- Unexplored areas: {len(analysis.get('unexplored_areas', []))} areas to explore

Write a message that:
1. Acknowledges their unique position and interests
2. Expresses confidence in their journey
3. Encourages them to explore without pressure

Keep it personal and mentor-like. Return as plain text, no JSON."""

    try:
        message = _call_gemini(prompt, temperature=0.8, max_tokens=150, json_mode=False)
        return message.strip()
    except Exception as e:
        logger.error(f"Error generating motivational message: {str(e)}")
        return f"Every step you take toward your goals is progress, {user_name}. You've got this! 🌟"
