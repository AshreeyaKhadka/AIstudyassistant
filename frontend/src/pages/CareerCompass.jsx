import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Heart,
  Zap,
  Target,
  BookOpen,
  Code,
  Briefcase,
  GitBranch,
  FileText,
  Save,
  Loader,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Plus,
  X,
} from 'lucide-react';

const CareerCompass = () => {
  const [currentStep, setCurrentStep] = useState('form'); // form, loading, results
  const [profile, setProfile] = useState({
    interests: [],
    skills: [],
    career_goal: '',
    experience: {
      hackathons: false,
      open_source: false,
      internships: false,
      research_papers: false,
      jobs: false,
    },
    experience_details: {
      hackathon_details: '',
      open_source_details: '',
      internship_details: '',
      research_details: '',
      job_details: '',
    },
  });

  const [analysis, setAnalysis] = useState(null);
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const [newInterest, setNewInterest] = useState('');
  const [newSkill, setNewSkill] = useState('');

  // Predefined interests and skills for suggestions
  const interestSuggestions = [
    'AI & Machine Learning',
    'Web Development',
    'Mobile Development',
    'Cloud & DevOps',
    'Data Science',
    'Cybersecurity',
    'Core Engineering',
    'Research',
    'Robotics',
    'Game Development',
  ];

  const skillSuggestions = [
    'Python',
    'JavaScript',
    'React',
    'Node.js',
    'Java',
    'C++',
    'SQL',
    'AWS',
    'Docker',
    'Git',
    'Machine Learning',
    'Data Analysis',
  ];

  // Load existing profile on mount
  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    try {
      const response = await fetch('/api/career/profile', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({
          interests: data.interests || [],
          skills: data.skills || [],
          career_goal: data.career_goal || '',
          experience: data.experience || {
            hackathons: false,
            open_source: false,
            internships: false,
            research_papers: false,
            jobs: false,
          },
          experience_details: data.experience_details || {
            hackathon_details: '',
            open_source_details: '',
            internship_details: '',
            research_details: '',
            job_details: '',
          },
        });

        // Load analysis if exists
        const analysisResponse = await fetch('/api/career/analysis', {
          credentials: 'include',
        });
        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          setAnalysis(analysisData.analysis);
          setMotivationalMessage(analysisData.motivational_message);
          setCurrentStep('results');
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const addInterest = () => {
    if (newInterest.trim() && !profile.interests.includes(newInterest)) {
      setProfile({
        ...profile,
        interests: [...profile.interests, newInterest],
      });
      setNewInterest('');
    }
  };

  const removeInterest = (interest) => {
    setProfile({
      ...profile,
      interests: profile.interests.filter((i) => i !== interest),
    });
  };

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill)) {
      setProfile({
        ...profile,
        skills: [...profile.skills, newSkill],
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skill) => {
    setProfile({
      ...profile,
      skills: profile.skills.filter((s) => s !== skill),
    });
  };

  const toggleExperience = (key) => {
    setProfile({
      ...profile,
      experience: {
        ...profile.experience,
        [key]: !profile.experience[key],
      },
    });
  };

  const updateExperienceDetail = (key, value) => {
    setProfile({
      ...profile,
      experience_details: {
        ...profile.experience_details,
        [key]: value,
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/career/profile', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile');
      }

      const data = await response.json();
      setSaved(true);

      // Fetch the analysis
      setTimeout(async () => {
        try {
          const analysisResponse = await fetch('/api/career/analysis', {
            credentials: 'include',
          });
          if (analysisResponse.ok) {
            const analysisData = await analysisResponse.json();
            setAnalysis(analysisData.analysis);
            setMotivationalMessage(analysisData.motivational_message);
            setCurrentStep('results');
          }
        } catch (err) {
          console.error('Error fetching analysis:', err);
        }
        setLoading(false);
      }, 500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Form Step
  if (currentStep === 'form') {
    return (
      <div className="space-y-8 max-w-4xl mx-auto pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-[#102326]" />
            <h1 className="text-3xl md:text-4xl font-bold text-[#111111]">
              Career Compass
            </h1>
          </div>
          <p className="text-[#666666] text-lg max-w-2xl mx-auto">
            Tell us about your interests, skills, and goals. Our AI mentor will analyze your profile
            and create a personalized career roadmap just for you.
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-lg border border-[#D7D3CF] shadow-sm overflow-hidden"
        >
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 text-red-700">
              <p className="font-semibold text-sm">Error: {error}</p>
            </div>
          )}

          <div className="p-6 md:p-8 space-y-8">
            {/* 1. Career Goal */}
            <section>
              <h2 className="text-xl font-bold text-[#111111] mb-4 flex items-center gap-2">
                <Target size={20} className="text-[#102326]" />
                What's Your Career Goal?
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['internship', 'job', 'higher_studies', 'exploring'].map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() =>
                      setProfile({ ...profile, career_goal: goal })
                    }
                    className={`px-4 py-3 rounded-lg border-2 font-semibold transition-all ${
                      profile.career_goal === goal
                        ? 'bg-[#102326] text-white border-[#102326]'
                        : 'bg-white text-[#111111] border-[#D7D3CF] hover:border-[#102326]'
                    }`}
                  >
                    {goal === 'internship' && '🎓 Internship'}
                    {goal === 'job' && '💼 Job'}
                    {goal === 'higher_studies' && '🎯 Higher Studies'}
                    {goal === 'exploring' && '🔍 Exploring'}
                  </button>
                ))}
              </div>
            </section>

            {/* 2. Interests */}
            <section>
              <h2 className="text-xl font-bold text-[#111111] mb-4 flex items-center gap-2">
                <Heart size={20} className="text-[#102326]" />
                Your Interests
              </h2>
              <div className="space-y-3">
                {/* Selected Interests */}
                {profile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest) => (
                      <motion.div
                        key={interest}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-[#102326] text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"
                      >
                        {interest}
                        <button
                          type="button"
                          onClick={() => removeInterest(interest)}
                          className="hover:opacity-80"
                        >
                          <X size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Input & Suggestions */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                    placeholder="Type your interest..."
                    className="flex-1 px-3 py-2 border border-[#D7D3CF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102326]"
                  />
                  <button
                    type="button"
                    onClick={addInterest}
                    className="bg-[#102326] text-white px-3 py-2 rounded-lg hover:bg-[#0a1819] transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Suggestions */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {interestSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() =>
                        setProfile({
                          ...profile,
                          interests: [...profile.interests, suggestion],
                        }) && setNewInterest('')
                      }
                      disabled={profile.interests.includes(suggestion)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all ${
                        profile.interests.includes(suggestion)
                          ? 'bg-[#D7D3CF] text-[#666666] cursor-not-allowed opacity-50'
                          : 'bg-[#ECEAE7] text-[#111111] hover:bg-[#D7D3CF]'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* 3. Skills */}
            <section>
              <h2 className="text-xl font-bold text-[#111111] mb-4 flex items-center gap-2">
                <Code size={20} className="text-[#102326]" />
                Your Skills
              </h2>
              <div className="space-y-3">
                {/* Selected Skills */}
                {profile.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <motion.div
                        key={skill}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-[#102326] text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="hover:opacity-80"
                        >
                          <X size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Input & Suggestions */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Type your skill..."
                    className="flex-1 px-3 py-2 border border-[#D7D3CF] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102326]"
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="bg-[#102326] text-white px-3 py-2 rounded-lg hover:bg-[#0a1819] transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Suggestions */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {skillSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        if (!profile.skills.includes(suggestion)) {
                          setProfile({
                            ...profile,
                            skills: [...profile.skills, suggestion],
                          });
                          setNewSkill('');
                        }
                      }}
                      disabled={profile.skills.includes(suggestion)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all ${
                        profile.skills.includes(suggestion)
                          ? 'bg-[#D7D3CF] text-[#666666] cursor-not-allowed opacity-50'
                          : 'bg-[#ECEAE7] text-[#111111] hover:bg-[#D7D3CF]'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* 4. Experience */}
            <section>
              <h2 className="text-xl font-bold text-[#111111] mb-4 flex items-center gap-2">
                <Briefcase size={20} className="text-[#102326]" />
                Your Experience
              </h2>
              <p className="text-[#666666] text-sm mb-4">
                Select what you've already done. Don't worry if you haven't done everything yet—we'll
                recommend what to explore!
              </p>

              <div className="space-y-4">
                {[
                  {
                    key: 'hackathons',
                    icon: <Zap size={18} />,
                    label: 'Hackathons',
                    detail: 'hackathon_details',
                  },
                  {
                    key: 'open_source',
                    icon: <GitBranch size={18} />,
                    label: 'Open Source',
                    detail: 'open_source_details',
                  },
                  {
                    key: 'internships',
                    icon: <Briefcase size={18} />,
                    label: 'Internships',
                    detail: 'internship_details',
                  },
                  {
                    key: 'research_papers',
                    icon: <FileText size={18} />,
                    label: 'Research Papers',
                    detail: 'research_details',
                  },
                  {
                    key: 'jobs',
                    icon: <Briefcase size={18} />,
                    label: 'Jobs / Industry',
                    detail: 'job_details',
                  },
                ].map(({ key, icon, label, detail }) => (
                  <div
                    key={key}
                    className="border border-[#D7D3CF] rounded-lg p-4 transition-all hover:border-[#102326]"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        id={key}
                        checked={profile.experience[key]}
                        onChange={() => toggleExperience(key)}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                      <label htmlFor={key} className="flex items-center gap-2 cursor-pointer font-medium">
                        {icon}
                        {label}
                      </label>
                      {profile.experience[key] && <CheckCircle2 size={18} className="ml-auto text-green-600" />}
                    </div>
                    {profile.experience[key] && (
                      <textarea
                        value={profile.experience_details[detail]}
                        onChange={(e) => updateExperienceDetail(detail, e.target.value)}
                        placeholder={`Tell us about your ${label.toLowerCase()} experience (optional)`}
                        className="w-full px-3 py-2 border border-[#D7D3CF] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#102326]"
                        rows="2"
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Submit Button */}
          <div className="bg-[#F7F5F2] border-t border-[#D7D3CF] p-6 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-[#D7D3CF] text-[#666666] cursor-not-allowed'
                  : 'bg-[#102326] text-white hover:bg-[#0a1819]'
              }`}
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Analyzing Your Profile...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Get My Career Compass
                </>
              )}
            </button>
          </div>
        </motion.form>
      </div>
    );
  }

  // Loading Step
  if (currentStep === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader size={48} className="animate-spin text-[#102326]" />
        <p className="text-[#666666] text-lg">Creating your personalized Career Compass...</p>
      </div>
    );
  }

  // Results Step
  if (currentStep === 'results' && analysis) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto pb-12">
        {/* Header with Motivational Message */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-[#111111] mb-4 flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-[#102326]" />
            Your Career Compass
          </h1>
          {motivationalMessage && (
            <p className="text-lg text-[#102326] font-semibold italic max-w-2xl mx-auto bg-[#ECEAE7] rounded-lg p-4">
              "{motivationalMessage}"
            </p>
          )}
        </motion.div>

        {/* Current Standing */}
        {analysis.current_standing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-[#D7D3CF] shadow-sm p-6 md:p-8"
          >
            <h2 className="text-2xl font-bold text-[#111111] mb-4 flex items-center gap-2">
              <Heart size={24} className="text-[#102326]" />
              Where You Stand
            </h2>
            <p className="text-[#444444] leading-relaxed text-lg">{analysis.current_standing}</p>
          </motion.div>
        )}

        {/* Opportunities */}
        {analysis.opportunities && analysis.opportunities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-[#111111] flex items-center gap-2">
              <Target size={24} className="text-[#102326]" />
              Recommended Opportunities for You
            </h2>
            <div className="grid gap-4">
              {analysis.opportunities.map((opp, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-lg border border-[#D7D3CF] shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#ECEAE7] flex items-center justify-center shrink-0 text-2xl">
                      {opp.type === 'Internship' && '🎓'}
                      {opp.type === 'Hackathon' && '🚀'}
                      {opp.type === 'Research' && '🔬'}
                      {opp.type === 'Open Source' && '🌍'}
                      {opp.type === 'Job' && '💼'}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#111111] mb-2">{opp.title}</h3>
                      <p className="text-[#666666] mb-3">{opp.why_for_them}</p>
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-[#102326] mb-2">When to explore:</p>
                        <p className="text-sm text-[#444444]">{opp.timeline}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#102326] mb-2">Your next steps:</p>
                        <ul className="space-y-1">
                          {opp.next_steps && opp.next_steps.map((step, stepIdx) => (
                            <li key={stepIdx} className="text-sm text-[#444444] flex items-start gap-2">
                              <ChevronRight size={14} className="mt-0.5 shrink-0" />
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Unexplored Areas */}
        {analysis.unexplored_areas && analysis.unexplored_areas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-[#111111] flex items-center gap-2">
              <BookOpen size={24} className="text-[#102326]" />
              Let's Explore New Areas
            </h2>
            <p className="text-[#666666]">
              These areas might not be on your radar yet, but they could really complement your
              journey:
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {analysis.unexplored_areas.map((area, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white rounded-lg border border-[#D7D3CF] shadow-sm p-6"
                >
                  <h3 className="text-lg font-bold text-[#102326] mb-2 flex items-center gap-2">
                    <Sparkles size={18} />
                    {area.area}
                  </h3>
                  <p className="text-[#666666] mb-3">{area.why_matters}</p>
                  <div className="bg-[#ECEAE7] rounded-lg p-3 mb-3">
                    <p className="text-sm font-semibold text-[#111111] mb-2">How to get started:</p>
                    <p className="text-sm text-[#444444]">{area.how_to_start}</p>
                  </div>
                  <p className="text-sm text-[#102326] font-semibold">
                    For you: {area.benefit_to_them}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Suggested Path */}
        {analysis.suggested_path && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#ECEAE7] rounded-lg border border-[#D7D3CF] p-6 md:p-8"
          >
            <h2 className="text-2xl font-bold text-[#111111] mb-4 flex items-center gap-2">
              <Zap size={24} className="text-[#102326]" />
              Your 6-12 Month Roadmap
            </h2>
            <p className="text-[#444444] leading-relaxed whitespace-pre-wrap">{analysis.suggested_path}</p>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 pt-4"
        >
          <button
            onClick={() => setCurrentStep('form')}
            className="px-6 py-3 bg-white border border-[#D7D3CF] text-[#111111] font-bold rounded-lg hover:bg-[#ECEAE7] transition-colors"
          >
            Update Profile
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-[#102326] text-white font-bold rounded-lg hover:bg-[#0a1819] transition-colors"
          >
            Save as PDF
          </button>
        </motion.div>
      </div>
    );
  }

  return null;
};

export default CareerCompass;
