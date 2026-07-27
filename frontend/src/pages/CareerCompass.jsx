import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Code,
  Compass,
  FileText,
  GitBranch,
  GraduationCap,
  Heart,
  Layers3,
  Loader,
  Map,
  Plus,
  Printer,
  Rocket,
  Save,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react';

const defaultExperience = {
  hackathons: false,
  open_source: false,
  internships: false,
  research_papers: false,
  jobs: false,
};

const defaultExperienceDetails = {
  hackathon_details: '',
  open_source_details: '',
  internship_details: '',
  research_details: '',
  job_details: '',
};

const goalOptions = [
  { id: 'internship', label: 'Internship', description: 'Build proof of ability and get industry exposure.', icon: Briefcase },
  { id: 'job', label: 'Full-time role', description: 'Prepare for hiring pipelines, projects, and interviews.', icon: Rocket },
  { id: 'higher_studies', label: 'Graduate studies', description: 'Shape research direction, exams, and academic profile.', icon: GraduationCap },
  { id: 'exploring', label: 'Exploring options', description: 'Compare paths before committing deeply.', icon: Compass },
];

const experienceOptions = [
  { key: 'hackathons', icon: Zap, label: 'Hackathons', detail: 'hackathon_details', prompt: 'Projects, awards, themes, or roles you handled.' },
  { key: 'open_source', icon: GitBranch, label: 'Open Source', detail: 'open_source_details', prompt: 'Repos, pull requests, issues, or communities you contributed to.' },
  { key: 'internships', icon: Briefcase, label: 'Internships', detail: 'internship_details', prompt: 'Company, role, stack, responsibilities, or outcomes.' },
  { key: 'research_papers', icon: FileText, label: 'Research Papers', detail: 'research_details', prompt: 'Topics, papers, supervisors, publications, or experiments.' },
  { key: 'jobs', icon: Briefcase, label: 'Jobs / Industry', detail: 'job_details', prompt: 'Roles, projects, production work, or impact delivered.' },
];

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

const profileStats = [
  { label: 'Career signal', value: 'Personalized' },
  { label: 'Roadmap', value: '6–12 mo' },
  { label: 'Inputs', value: 'Skills + goals' },
];


const normalizeProfile = (data) => ({
  interests: data.interests || [],
  skills: data.skills || [],
  career_goal: data.career_goal || '',
  experience: { ...defaultExperience, ...(data.experience || {}) },
  experience_details: { ...defaultExperienceDetails, ...(data.experience_details || {}) },
});

const CareerCompass = () => {
  const [currentStep, setCurrentStep] = useState('form');
  const [profile, setProfile] = useState({
    interests: [],
    skills: [],
    career_goal: '',
    experience: defaultExperience,
    experience_details: defaultExperienceDetails,
  });
  const [analysis, setAnalysis] = useState(null);
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [newSkill, setNewSkill] = useState('');

  useEffect(() => {
    loadExistingProfile();
  }, []);

  const selectedExperienceCount = useMemo(
    () => Object.values(profile.experience).filter(Boolean).length,
    [profile.experience]
  );

  const completionScore = useMemo(() => {
    let score = 0;
    if (profile.career_goal) score += 25;
    if (profile.interests.length > 0) score += 25;
    if (profile.skills.length > 0) score += 25;
    if (selectedExperienceCount > 0) score += 25;
    return score;
  }, [profile.career_goal, profile.interests.length, profile.skills.length, selectedExperienceCount]);

  const loadExistingProfile = async () => {
    try {
      const response = await fetch('/api/career/profile', { credentials: 'include' });

      if (response.ok) {
        const data = await response.json();
        setProfile(normalizeProfile(data));

        const analysisResponse = await fetch('/api/career/analysis', { credentials: 'include' });
        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          setAnalysis(analysisData.analysis);
          setMotivationalMessage(analysisData.motivational_message || '');
          setCurrentStep('results');
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const addUniqueItem = (field, value) => {
    const trimmed = value.trim();
    if (!trimmed || profile[field].includes(trimmed)) return;
    setProfile((current) => ({ ...current, [field]: [...current[field], trimmed] }));
  };

  const removeItem = (field, value) => {
    setProfile((current) => ({ ...current, [field]: current[field].filter((item) => item !== value) }));
  };

  const addInterest = () => {
    addUniqueItem('interests', newInterest);
    setNewInterest('');
  };

  const addSkill = () => {
    addUniqueItem('skills', newSkill);
    setNewSkill('');
  };

  const toggleExperience = (key) => {
    setProfile((current) => ({
      ...current,
      experience: {
        ...current.experience,
        [key]: !current.experience[key],
      },
    }));
  };

  const updateExperienceDetail = (key, value) => {
    setProfile((current) => ({
      ...current,
      experience_details: {
        ...current.experience_details,
        [key]: value,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    setCurrentStep('loading');

    try {
      const response = await fetch('/api/career/profile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save profile');
      }

      setSaved(true);

      const analysisResponse = await fetch('/api/career/analysis', { credentials: 'include' });
      if (!analysisResponse.ok) throw new Error('Profile saved, but analysis could not be loaded.');

      const analysisData = await analysisResponse.json();
      setAnalysis(analysisData.analysis);
      setMotivationalMessage(analysisData.motivational_message || '');
      setCurrentStep('results');
    } catch (err) {
      setError(err.message);
      setCurrentStep('form');
    } finally {
      setLoading(false);
    }
  };

  const renderSelectedChips = (items, field) => (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-2 rounded-full bg-[#102326] px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
        >
          {item}
          <button type="button" onClick={() => removeItem(field, item)} className="rounded-full text-white/80 hover:text-white" aria-label={`Remove ${item}`}>
            <X size={13} aria-hidden="true" />
          </button>
        </span>
      ))}
    </div>
  );

  const renderSuggestionGrid = (suggestions, field, clearInput) => (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {suggestions.map((suggestion) => {
        const selected = profile[field].includes(suggestion);
        return (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              addUniqueItem(field, suggestion);
              clearInput('');
            }}
            disabled={selected}
            className={`rounded-[5px] border px-3 py-2 text-left text-xs font-semibold transition-all ${
              selected
                ? 'cursor-not-allowed border-[#D7D3CF] bg-[#ECEAE7] text-[#888888] opacity-70'
                : 'border-[#D7D3CF] bg-white text-[#111111] hover:-translate-y-0.5 hover:border-[#102326] hover:shadow-sm'
            }`}
          >
            {selected ? '✓ ' : '+ '}{suggestion}
          </button>
        );
      })}
    </div>
  );

  if (currentStep === 'loading') {
    return (
      <div className="flex min-h-[68vh] items-center justify-center pb-10">
        <div
          className="relative overflow-hidden rounded-[8px] border border-[#102326] bg-[#102326] p-8 text-center text-white shadow-[0_24px_70px_rgba(16,35,38,0.18)]"
        >
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/10">
            <Loader size={30} className="animate-spin" aria-hidden="true" />
          </div>
          <h1 className="relative mt-5 text-2xl font-black tracking-tight text-white">Building your career map</h1>
          <p className="relative mt-2 max-w-md text-sm leading-relaxed text-[#D6E0DE]">
            Matching your interests, skills, and experience into practical next moves.
          </p>
        </div>
      </div>
    );
  }

  if (currentStep === 'results' && analysis) {
    return (
      <div className="space-y-6 pb-10">
        <section
          className="relative isolate overflow-hidden rounded-[8px] border border-[#102326] bg-[#071719] p-5 text-white shadow-[0_20px_54px_rgba(16,35,38,0.14)] sm:p-7 lg:p-8"
        >
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,#071719_0%,#102326_58%,#17373B_100%)]" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-px bg-white/15" />

          <div className="grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#D6E0DE]">
                Career Compass
              </div>
              <h1 className="max-w-3xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">Your next chapter has a clearer shape.</h1>
              {motivationalMessage && (
                <p className="mt-5 max-w-3xl border-l-2 border-[#C96A32] pl-4 text-sm font-semibold leading-7 text-[#F7F5F2]">
                  {motivationalMessage}
                </p>
              )}
            </div>

            <div className="rounded-[7px] border border-white/15 bg-white/[0.06] p-5">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#B8C4C2]">Profile summary</p>
                  <p className="mt-2 text-xl font-black text-white">
                    {profile.career_goal ? goalOptions.find((goal) => goal.id === profile.career_goal)?.label : 'Flexible'}
                  </p>
                </div>
                <span className="rounded-full border border-[#F1A76F]/40 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#F1A76F]">
                  {completionScore}% ready
                </span>
              </div>
              <div className="divide-y divide-white/10">
                <div className="flex items-center justify-between py-3">
                  <p className="text-sm text-[#B8C4C2]">Skills added</p>
                  <p className="text-sm font-black text-white">{profile.skills.length || 0}</p>
                </div>
                <div className="flex items-center justify-between py-3">
                  <p className="text-sm text-[#B8C4C2]">Interests added</p>
                  <p className="text-sm font-black text-white">{profile.interests.length || 0}</p>
                </div>
                <div className="flex items-center justify-between pt-3">
                  <p className="text-sm text-[#B8C4C2]">Experience signals</p>
                  <p className="text-sm font-black text-white">{selectedExperienceCount}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {analysis.current_standing && (
          <section className="rounded-[7px] border border-[#D7D3CF] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-3">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#C96A32]">Current standing</p>
                <h2 className="text-xl font-black tracking-tight text-[#111111]">Where you stand right now</h2>
              </div>
            </div>
            <p className="text-base leading-8 text-[#444444]">{analysis.current_standing}</p>
          </section>
        )}

        {analysis.opportunities && analysis.opportunities.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#C96A32]">Recommended routes</p>
                <h2 className="text-2xl font-black tracking-tight text-[#111111]">Opportunities worth exploring</h2>
              </div>
              <span className="inline-flex w-fit rounded-full border border-[#D7D3CF] bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#666666]">
                Prioritized by fit
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {analysis.opportunities.map((opportunity, index) => (
                <article
                  key={`${opportunity.title}-${index}`}
                  className="group overflow-hidden rounded-[7px] border border-[#D7D3CF] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#102326] hover:shadow-[0_18px_46px_rgba(16,35,38,0.10)]"
                >
                  <div className="border-b border-[#D7D3CF] bg-[#FAF9F7] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <div>
                          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#888888]">Path 0{index + 1}</p>
                          <h3 className="mt-1 text-lg font-black text-[#111111]">{opportunity.title}</h3>
                        </div>
                      </div>
                      <ArrowUpRight size={16} className="text-[#C96A32] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-[#555555]">{opportunity.why_for_them}</p>
                  </div>

                  <div className="space-y-4 p-5">
                    {opportunity.timeline && (
                      <div className="rounded-[5px] border border-[#D7D3CF] bg-white p-3">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#666666]">When to explore</p>
                        <p className="mt-1 text-sm text-[#444444]">{opportunity.timeline}</p>
                      </div>
                    )}

                    {opportunity.next_steps && opportunity.next_steps.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm font-black text-[#102326]">Next steps</p>
                        <ul className="space-y-2">
                          {opportunity.next_steps.map((step, stepIndex) => (
                            <li key={stepIndex} className="flex items-start gap-2 text-sm leading-relaxed text-[#444444]">
                              <ChevronRight size={15} className="mt-0.5 shrink-0 text-[#C96A32]" aria-hidden="true" />
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          {analysis.unexplored_areas && analysis.unexplored_areas.length > 0 && (
            <section className="rounded-[7px] border border-[#D7D3CF] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-[#ECEAE7] text-[#102326]">
                  <BookOpen size={18} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#C96A32]">Adjacent bets</p>
                  <h2 className="text-xl font-black tracking-tight text-[#111111]">Areas to explore next</h2>
                </div>
              </div>
              <div className="space-y-3">
                {analysis.unexplored_areas.map((area, index) => (
                  <div key={`${area.area}-${index}`} className="rounded-[6px] border border-[#D7D3CF] bg-[#FAF9F7] p-4">
                    <h3 className="text-base font-black text-[#102326]">{area.area}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#555555]">{area.why_matters}</p>
                    {area.how_to_start && (
                      <p className="mt-3 rounded-[5px] border border-[#D7D3CF] bg-white p-3 text-sm text-[#444444]">
                        <span className="font-bold text-[#111111]">Start here: </span>{area.how_to_start}
                      </p>
                    )}
                    {area.benefit_to_them && <p className="mt-3 text-sm font-bold text-[#102326]">For you: {area.benefit_to_them}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {analysis.suggested_path && (
            <section className="relative overflow-hidden rounded-[7px] border border-[#102326] bg-[#102326] p-5 text-white shadow-sm sm:p-6">
              <div className="relative mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/15 bg-white/10">
                  <Map size={18} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#B8C4C2]">Roadmap</p>
                  <h2 className="text-xl font-black tracking-tight text-white">Your next 6 to 12 months</h2>
                </div>
              </div>
              <p className="relative whitespace-pre-wrap text-sm leading-7 text-[#D6E0DE]">{analysis.suggested_path}</p>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setCurrentStep('form')}
            className="inline-flex items-center justify-center gap-2 rounded-[5px] border border-[#D7D3CF] bg-white px-5 py-3 font-mono text-xs font-black uppercase tracking-wider text-[#111111] transition-all hover:border-[#102326] hover:bg-[#ECEAE7]"
          >
            <Layers3 size={15} aria-hidden="true" /> Update profile
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 rounded-[5px] bg-[#102326] px-5 py-3 font-mono text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-[#0b191c]"
          >
            <Printer size={15} aria-hidden="true" /> Save as PDF
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <section
        className="relative isolate overflow-hidden rounded-[8px] border border-[#102326] bg-[#071719] p-5 text-white shadow-[0_24px_70px_rgba(16,35,38,0.16)] sm:p-7 lg:p-8"
      >
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,#071719_0%,#102326_58%,#17373B_100%)]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-px bg-white/15" />

        <div className="grid gap-8 xl:grid-cols-[1fr_380px] xl:items-center">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#D6E0DE]">
              Career compass
            </div>
            <h1 className="max-w-3xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
              Turn scattered interests into a practical career map.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D6E0DE] sm:text-base">
              Add your goals, interests, skills, and experience. Career Compass converts them into focused opportunities and a next-step roadmap you can act on.
            </p>
            <div className="mt-7 grid max-w-2xl grid-cols-3 gap-2">
              {profileStats.map((stat) => (
                <div key={stat.label} className="rounded-[5px] border border-white/10 bg-white/[0.07] p-3 backdrop-blur">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#B8C4C2]">{stat.label}</p>
                  <p className="mt-1 text-sm font-black text-white sm:text-base">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[8px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#B8C4C2]">Profile strength</p>
                <p className="mt-1 text-3xl font-black text-white">{completionScore}%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[6px] bg-white/10 text-white">
                <Target size={22} aria-hidden="true" />
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#F1A76F] transition-all" style={{ width: `${completionScore}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-[5px] bg-white/[0.08] p-2">
                <p className="text-lg font-black text-white">{profile.interests.length}</p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-[#B8C4C2]">Interests</p>
              </div>
              <div className="rounded-[5px] bg-white/[0.08] p-2">
                <p className="text-lg font-black text-white">{profile.skills.length}</p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-[#B8C4C2]">Skills</p>
              </div>
              <div className="rounded-[5px] bg-white/[0.08] p-2">
                <p className="text-lg font-black text-white">{selectedExperienceCount}</p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-[#B8C4C2]">Signals</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-[8px] border border-[#D7D3CF] bg-white shadow-sm"
      >
        {error && (
          <div className="flex items-start gap-3 border-b border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}
        {saved && !error && (
          <div className="flex items-start gap-3 border-b border-green-200 bg-green-50 p-4 text-green-700">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-sm font-semibold">Profile saved. Loading your analysis.</p>
          </div>
        )}

        <div className="grid gap-0 xl:grid-cols-[1fr_320px]">
          <div className="space-y-7 p-5 sm:p-6 lg:p-7">
            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-[#102326] text-white">
                  <Target size={18} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#C96A32]">Step 01</p>
                  <h2 className="text-xl font-black tracking-tight text-[#111111]">Choose a direction</h2>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {goalOptions.map(({ id, label, description, icon }) => {
                  const selected = profile.career_goal === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setProfile((current) => ({ ...current, career_goal: id }))}
                      className={`group rounded-[7px] border p-4 text-left transition-all ${
                        selected
                          ? 'border-[#102326] bg-[#102326] text-white shadow-[0_16px_40px_rgba(16,35,38,0.14)]'
                          : 'border-[#D7D3CF] bg-[#FAF9F7] text-[#111111] hover:-translate-y-0.5 hover:border-[#102326] hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] ${selected ? 'bg-white/[0.12] text-white' : 'bg-white text-[#102326]'}`}>
                          {React.createElement(icon, { size: 18, 'aria-hidden': true })}
                        </div>
                        <div>
                          <h3 className={`font-black ${selected ? 'text-white' : 'text-[#111111]'}`}>{label}</h3>
                          <p className={`mt-1 text-xs leading-relaxed ${selected ? 'text-[#D6E0DE]' : 'text-[#666666]'}`}>{description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-[7px] border border-[#D7D3CF] bg-[#FAF9F7] p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[5px] bg-white text-[#102326]">
                    <Heart size={17} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#C96A32]">Step 02</p>
                    <h2 className="text-lg font-black text-[#111111]">Interests</h2>
                  </div>
                </div>
                {profile.interests.length > 0 && <div className="mb-3">{renderSelectedChips(profile.interests, 'interests')}</div>}
                <div className="mb-3 flex gap-2">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(event) => setNewInterest(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addInterest();
                      }
                    }}
                    placeholder="Type an interest..."
                    className="min-w-0 flex-1"
                  />
                  <button type="button" onClick={addInterest} className="rounded-[5px] bg-[#102326] px-3 text-white transition-colors hover:bg-[#0b191c]" aria-label="Add interest">
                    <Plus size={18} aria-hidden="true" />
                  </button>
                </div>
                {renderSuggestionGrid(interestSuggestions, 'interests', setNewInterest)}
              </div>

              <div className="rounded-[7px] border border-[#D7D3CF] bg-[#FAF9F7] p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[5px] bg-white text-[#102326]">
                    <Code size={17} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#C96A32]">Step 03</p>
                    <h2 className="text-lg font-black text-[#111111]">Skills</h2>
                  </div>
                </div>
                {profile.skills.length > 0 && <div className="mb-3">{renderSelectedChips(profile.skills, 'skills')}</div>}
                <div className="mb-3 flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(event) => setNewSkill(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder="Type a skill..."
                    className="min-w-0 flex-1"
                  />
                  <button type="button" onClick={addSkill} className="rounded-[5px] bg-[#102326] px-3 text-white transition-colors hover:bg-[#0b191c]" aria-label="Add skill">
                    <Plus size={18} aria-hidden="true" />
                  </button>
                </div>
                {renderSuggestionGrid(skillSuggestions, 'skills', setNewSkill)}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-[#102326] text-white">
                  <Briefcase size={18} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#C96A32]">Step 04</p>
                  <h2 className="text-xl font-black tracking-tight text-[#111111]">Experience signals</h2>
                  <p className="mt-1 text-sm text-[#666666]">Select what you have done. Empty sections are fine; the roadmap will identify what to explore next.</p>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {experienceOptions.map(({ key, icon, label, detail, prompt }) => {
                  const selected = profile.experience[key];
                  return (
                    <div key={key} className={`rounded-[7px] border p-4 transition-all ${selected ? 'border-[#102326] bg-[#FAF9F7]' : 'border-[#D7D3CF] bg-white hover:border-[#102326]'}`}>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleExperience(key)}
                          className={`flex h-10 w-10 items-center justify-center rounded-[5px] border transition-colors ${selected ? 'border-[#102326] bg-[#102326] text-white' : 'border-[#D7D3CF] bg-[#FAF9F7] text-[#102326]'}`}
                          aria-pressed={selected}
                        >
                          {selected ? <CheckCircle2 size={18} aria-hidden="true" /> : React.createElement(icon, { size: 18, 'aria-hidden': true })}
                        </button>
                        <button type="button" onClick={() => toggleExperience(key)} className="min-w-0 flex-1 text-left">
                          <p className="font-bold text-[#111111]">{label}</p>
                          <p className="text-xs text-[#666666]">{selected ? 'Selected. Add detail if useful.' : 'Tap to include this signal.'}</p>
                        </button>
                      </div>
                      {selected && (
                        <textarea
                          value={profile.experience_details[detail]}
                          onChange={(event) => updateExperienceDetail(detail, event.target.value)}
                          placeholder={prompt}
                          className="mt-3 min-h-20 w-full resize-y bg-white text-sm"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="border-t border-[#D7D3CF] bg-[#FAF9F7] p-5 xl:border-l xl:border-t-0">
            <div className="sticky top-5 space-y-4">
              <div className="rounded-[7px] border border-[#D7D3CF] bg-white p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#C96A32]">Readiness</p>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-3xl font-black text-[#111111]">{completionScore}%</p>
                  <Trophy size={24} className="text-[#C96A32]" aria-hidden="true" />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ECEAE7]">
                  <div className="h-full rounded-full bg-[#102326] transition-all" style={{ width: `${completionScore}%` }} />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-[#666666]">A stronger profile gives the analysis more signal, but you can submit with partial details.</p>
              </div>

              <div className="rounded-[7px] border border-[#D7D3CF] bg-white p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">What you’ll get</p>
                <ul className="mt-3 space-y-3 text-sm text-[#444444]">
                  <li className="flex gap-2"><ChevronRight size={15} className="mt-0.5 shrink-0 text-[#C96A32]" aria-hidden="true" /> A clear read on your current standing.</li>
                  <li className="flex gap-2"><ChevronRight size={15} className="mt-0.5 shrink-0 text-[#C96A32]" aria-hidden="true" /> Career opportunities matched to your profile.</li>
                  <li className="flex gap-2"><ChevronRight size={15} className="mt-0.5 shrink-0 text-[#C96A32]" aria-hidden="true" /> A practical 6–12 month direction.</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`flex w-full items-center justify-center gap-2 rounded-[5px] px-5 py-3 font-mono text-xs font-black uppercase tracking-wider transition-all ${
                  loading
                    ? 'cursor-not-allowed bg-[#D7D3CF] text-[#666666]'
                    : 'bg-[#102326] text-white shadow-[0_16px_40px_rgba(16,35,38,0.16)] hover:-translate-y-0.5 hover:bg-[#0b191c]'
                }`}
              >
                {loading ? <Loader size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
                {loading ? 'Analyzing profile' : 'Get my career compass'}
              </button>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
};

export default CareerCompass;
