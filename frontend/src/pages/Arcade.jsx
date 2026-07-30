import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Loader2,
  RadioTower,
  Send,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

const MotionDiv = motion.div;

const MODE_META = {
  scoreboard: {
    title: 'Scoreboard Mode',
    description: 'Solo 10-question run. Submit once and bank XP.',
    icon: Trophy,
  },
  fff: {
    title: 'Fastest Finger First',
    description: 'Live 10 rounds. First correct buzz locks each round.',
    icon: RadioTower,
  },
};

const getSubjectKey = (subject) => String(subject?.subject_id ?? `name:${subject?.name ?? ''}`);
const parseJsonSafe = async (res) => {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
};

const Arcade = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedByMode, setSelectedByMode] = useState({ scoreboard: '', fff: '' });
  const [activeMode, setActiveMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardWindow, setLeaderboardWindow] = useState('weekly');
  const [leaderboardMode, setLeaderboardMode] = useState('all');

  const subjectsByKey = useMemo(
    () => Object.fromEntries(subjects.map((subject) => [getSubjectKey(subject), subject])),
    [subjects]
  );

  const leaderboardSubject = subjectsByKey[selectedByMode.scoreboard] || subjects[0] || null;
  const scoreboardSubject = subjectsByKey[selectedByMode.scoreboard] || null;
  const fffSubject = subjectsByKey[selectedByMode.fff] || null;

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/arcade/subjects', { credentials: 'include' });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setError(data.error || `Failed to load Arcade subjects (HTTP ${res.status}).`);
        return;
      }
      setSubjects(data);
      if (data.length) {
        const first = getSubjectKey(data[0]);
        setSelectedByMode({
          scoreboard: first,
          fff: first,
        });
      }
    } catch {
      setError('Network error loading Arcade. Ensure backend API is running on port 5000.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    const params = new URLSearchParams({ window: leaderboardWindow, mode: leaderboardMode });
    if (leaderboardSubject?.name) params.set('subject', leaderboardSubject.name);
    try {
      const res = await fetch(`/api/arcade/leaderboard?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) {
        setLeaderboard([]);
        return;
      }
      const data = await res.json();
      setLeaderboard(data.leaders || []);
    } catch {
      setLeaderboard([]);
    }
  }, [leaderboardMode, leaderboardSubject, leaderboardWindow]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    if (subjects.length) fetchLeaderboard();
  }, [fetchLeaderboard, subjects.length]);

  if (activeMode === 'scoreboard' && scoreboardSubject) {
    return (
      <ScoreboardMode
        subject={scoreboardSubject}
        onExit={() => {
          setActiveMode(null);
          fetchLeaderboard();
        }}
      />
    );
  }

  if (activeMode === 'fff' && fffSubject) {
    return (
      <FastestFingerMode
        subject={fffSubject}
        onExit={() => {
          setActiveMode(null);
          fetchLeaderboard();
        }}
      />
    );
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="min-h-[calc(100vh-8rem)] space-y-4 rounded-[4px] border border-[#D7D3CF] bg-white p-5"
    >
      <header className="space-y-2">
        <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#666666]">Arcade</p>
        <h1 className="text-2xl font-bold text-[#111111]">Play & Learn</h1>
        <p className="max-w-3xl text-sm text-[#666666]">
          Pick a mode, choose a subject, and earn XP. Fastest Finger First is live multiplayer with 10 rounds and
          10-second round timers.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
          {Object.entries(MODE_META).map(([mode, meta]) => (
            <ModeCard
              key={mode}
              mode={mode}
              meta={meta}
              loading={loading}
              subjects={subjects}
              selectedSubject={selectedByMode[mode]}
              onSubjectChange={(value) => setSelectedByMode((prev) => ({ ...prev, [mode]: value }))}
              onPlay={() => setActiveMode(mode)}
            />
          ))}
        </div>

        <div className="space-y-3 rounded-[4px] border border-[#D7D3CF] bg-[#F7F5F2] p-4">
          <h2 className="text-sm font-semibold text-[#111111]">How to play</h2>
          <ol className="space-y-2 text-xs text-[#444444]">
            <li>1. Pick a subject from the built-in Arcade question bank.</li>
            <li>2. Choose mode: Scoreboard (solo) or Fastest Finger First (live).</li>
            <li>3. Scoreboard: finish all 10 questions and submit.</li>
            <li>4. FFF: buzz fast; first correct answer locks the round.</li>
            <li>5. Leaderboard updates by mode and weekly/all-time filters.</li>
          </ol>
        </div>
      </div>

      {loading ? (
        <div className="flex h-28 items-center justify-center rounded-[4px] border border-[#D7D3CF] bg-[#F7F5F2]">
          <Loader2 size={24} className="animate-spin text-[#102326]" />
        </div>
      ) : error || subjects.length === 0 ? (
        <div className="rounded-[4px] border border-[#C96A32] bg-[#FFF8F3] p-4 text-xs text-[#C96A32]">
          {error || 'No Arcade subjects yet. Generate MCQs from uploaded materials first.'}
        </div>
      ) : (
        <Leaderboard
          leaders={leaderboard}
          window={leaderboardWindow}
          mode={leaderboardMode}
          onWindowChange={setLeaderboardWindow}
          onModeChange={setLeaderboardMode}
        />
      )}
    </MotionDiv>
  );
};

const ModeCard = ({ mode, meta, loading, subjects, selectedSubject, onSubjectChange, onPlay }) => {
  const Icon = meta.icon;
  return (
    <div className="rounded-[4px] border border-[#D7D3CF] bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-[#102326] text-white">
          <Icon size={16} />
        </div>
        <h3 className="text-sm font-semibold text-[#111111]">{meta.title}</h3>
      </div>
      <p className="mb-4 text-xs text-[#666666]">{meta.description}</p>
      <label className="mb-1 block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#666666]">
        Subject
      </label>
      <select
        value={selectedSubject}
        onChange={(event) => onSubjectChange(event.target.value)}
        disabled={loading || !subjects.length}
        className="mb-3 w-full"
      >
        {subjects.map((subject) => (
          <option key={getSubjectKey(subject)} value={getSubjectKey(subject)}>
            {subject.name} ({subject.question_count})
          </option>
        ))}
      </select>
      <button
        onClick={onPlay}
        disabled={!selectedSubject || loading || !subjects.length}
        className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        Play {mode === 'fff' ? 'Live' : 'Solo'}
      </button>
    </div>
  );
};

const ScoreboardMode = ({ subject, onExit }) => {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/arcade/scoreboard/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ subject_id: subject?.subject_id, subject: subject?.name }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'No questions available.');
          return;
        }
        setQuestions(data.questions || []);
      } catch {
        setError('Network error loading quiz.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [subject]);

  const question = questions[index];
  const selected = question ? answers[String(question.id)] : '';
  const isLast = index === questions.length - 1;

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const payloadAnswers = {};
      questions.forEach((q) => {
        const answer = answers[String(q.id)];
        if (answer) payloadAnswers[String(q.id)] = answer;
      });

      const res = await fetch('/api/arcade/scoreboard/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject_id: subject?.subject_id,
          subject: subject?.name,
          answers: payloadAnswers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit score.');
        return;
      }
      setResult(data.entry);
    } catch {
      setError('Network error while submitting score.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ModeShell title="Scoreboard Mode" onExit={onExit}>
        <div className="flex h-40 items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[#102326]" />
        </div>
      </ModeShell>
    );
  }

  if (error && !questions.length && !result) {
    return (
      <ModeShell title="Scoreboard Mode" onExit={onExit}>
        <p className="text-sm text-[#C96A32]">{error}</p>
      </ModeShell>
    );
  }

  if (result) {
    return (
      <ModeShell title="Scoreboard Mode" onExit={onExit}>
        <div className="mx-auto max-w-md rounded-[4px] border border-[#D7D3CF] bg-white p-6 text-center">
          <Trophy size={28} className="mx-auto text-[#102326]" />
          <h2 className="mt-3 text-2xl font-bold text-[#111111]">{result.points} XP</h2>
          <p className="mt-1 text-sm text-[#666666]">
            {result.score} / {result.total_questions} correct in {result.subject}
          </p>
          <button onClick={onExit} className="btn-primary mt-5">Back to Arcade</button>
        </div>
      </ModeShell>
    );
  }

  return (
    <ModeShell title="Scoreboard Mode" onExit={onExit}>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-[4px] border border-[#D7D3CF] bg-[#F7F5F2] p-3 text-xs text-[#444444]">
          Answer all 10 questions. You can move back and forward before final submit.
        </div>

        <div className="flex items-center justify-between rounded-[4px] border border-[#D7D3CF] bg-white p-3">
          <span className="text-xs font-mono text-[#666666]">Question {index + 1} / {questions.length}</span>
          <span className="text-xs font-mono uppercase text-[#102326]">{question?.difficulty}</span>
        </div>

        <div className="rounded-[4px] border border-[#D7D3CF] bg-white p-5">
          <h3 className="text-base font-semibold text-[#111111]">{question?.question}</h3>
          <div className="mt-4 space-y-2">
            {Object.entries(question?.options || {}).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setAnswers((prev) => ({ ...prev, [String(question.id)]: key }))}
                className={`w-full rounded-[4px] border p-3 text-left text-sm transition-colors ${
                  selected === key
                    ? 'border-[#102326] bg-[#102326] text-white'
                    : 'border-[#D7D3CF] bg-white text-[#111111] hover:bg-[#F7F5F2]'
                }`}
              >
                <span className="font-mono font-semibold">{key}.</span> {value}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-[#C96A32]">{error}</p>}

        <div className="flex items-center justify-between">
          <button
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0}
            className="btn-secondary disabled:opacity-40"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <button
            onClick={() => (isLast ? submit() : setIndex((value) => value + 1))}
            disabled={!selected || submitting}
            className="btn-primary disabled:opacity-40"
          >
            {isLast ? 'Submit Score' : 'Next'}
            {isLast ? <Send size={14} /> : null}
          </button>
        </div>
      </div>
    </ModeShell>
  );
};

const FastestFingerMode = ({ subject, onExit }) => {
  const socketRef = useRef(null);
  const countdownRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [round, setRound] = useState(null);
  const [locked, setLocked] = useState(null);
  const [gameOver, setGameOver] = useState(null);
  const [status, setStatus] = useState('Connecting...');
  const [timeLeft, setTimeLeft] = useState(10);
  const [buzzFeedback, setBuzzFeedback] = useState('');

  const clearCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  useEffect(() => {
    const socket = io('/', {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('arcade:join_fff', { subject_id: subject?.subject_id, subject: subject?.name });
      setStatus('Waiting for round...');
    });

    socket.on('disconnect', () => setStatus('Disconnected'));
    socket.on('connect_error', () => setStatus('Connection error'));

    socket.on('arcade:room_state', (payload) => setRoom(payload));
    socket.on('arcade:round_started', (payload) => {
      clearCountdown();
      setRound(payload);
      setLocked(null);
      setBuzzFeedback('');
      setStatus('Round live');
      setRoom((prev) => ({ ...(prev || {}), players: payload.players, current_round: payload.round }));
      setTimeLeft(10);
      countdownRef.current = setInterval(() => {
        setTimeLeft((value) => {
          if (value <= 1) {
            clearCountdown();
            return 0;
          }
          return value - 1;
        });
      }, 1000);
    });

    socket.on('arcade:buzz_result', (payload) => {
      if (payload.accepted) {
        setBuzzFeedback(`Correct buzz accepted. +${payload.points} XP`);
        return;
      }
      if (payload.reason === 'incorrect') {
        setBuzzFeedback('Incorrect buzz. You can still try next rounds.');
      } else if (payload.reason === 'round_locked') {
        setBuzzFeedback('Too late. Round is already locked.');
      }
    });

    socket.on('arcade:round_locked', (payload) => {
      clearCountdown();
      setTimeLeft(0);
      setLocked(payload);
      setRoom((prev) => ({ ...(prev || {}), players: payload.players }));
      setStatus(payload.reason === 'timeout' ? 'Round timeout' : 'Round locked');
    });

    socket.on('arcade:game_over', (payload) => {
      clearCountdown();
      setGameOver(payload);
      setStatus('Game complete');
      setRoom((prev) => ({ ...(prev || {}), players: payload.players, status: 'completed' }));
    });

    socket.on('arcade:error', (payload) => {
      setStatus(payload.error || 'Arcade error');
    });

    return () => {
      clearCountdown();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [subject]);

  const buzz = (option) => {
    if (!socketRef.current || !round || locked) return;
    socketRef.current.emit('arcade:buzz', { round_id: round.round_id, selected_option: option });
  };

  if (gameOver) {
    return (
      <ModeShell title="Fastest Finger First" onExit={onExit}>
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="rounded-[4px] border border-[#D7D3CF] bg-[#F7F5F2] p-4 text-sm text-[#444444]">
            Game complete. Final rankings are below.
          </div>
          <Rankings players={gameOver.players || []} />
          <button onClick={onExit} className="btn-primary">Back to Arcade</button>
        </div>
      </ModeShell>
    );
  }

  return (
    <ModeShell title="Fastest Finger First" onExit={onExit}>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4 rounded-[4px] border border-[#D7D3CF] bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#666666]">{status}</p>
            <div className="inline-flex items-center gap-2 rounded-[4px] border border-[#D7D3CF] bg-[#F7F5F2] px-2 py-1 text-xs font-mono text-[#102326]">
              <Clock3 size={13} />
              {timeLeft}s
            </div>
          </div>

          <div className="rounded-[4px] border border-[#D7D3CF] bg-[#F7F5F2] p-3 text-xs text-[#444444]">
            10 rounds total. Each round auto-locks in 10 seconds if no correct buzz.
          </div>

          {!round ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 size={24} className="animate-spin text-[#102326]" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono uppercase text-[#666666]">
                  Round {round.round} / 10
                </p>
                <p className="text-xs font-mono uppercase text-[#102326]">{round.question?.difficulty}</p>
              </div>
              <h3 className="text-base font-semibold text-[#111111]">{round.question?.question}</h3>
              <div className="space-y-2">
                {Object.entries(round.question?.options || {}).map(([key, value]) => (
                  <button
                    key={key}
                    disabled={!!locked}
                    onClick={() => buzz(key)}
                    className="w-full rounded-[4px] border border-[#D7D3CF] bg-white p-3 text-left text-sm text-[#111111] transition-colors hover:bg-[#F7F5F2] disabled:opacity-50"
                  >
                    <span className="font-mono font-semibold">{key}.</span> {value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {buzzFeedback ? (
            <div className="flex items-center gap-2 rounded-[4px] border border-[#D7D3CF] bg-[#F7F5F2] p-3 text-xs text-[#444444]">
              <Zap size={14} />
              {buzzFeedback}
            </div>
          ) : null}

          {locked ? (
            <div className="flex items-center gap-2 rounded-[4px] border border-[#D7D3CF] bg-[#F7F5F2] p-3 text-xs text-[#444444]">
              {locked.reason === 'timeout' ? <CircleAlert size={14} /> : <CheckCircle2 size={14} />}
              {locked.reason === 'timeout'
                ? 'No correct buzz in time. Next round is loading.'
                : `Round locked. Winner got ${locked.points} XP.`}
            </div>
          ) : null}
        </div>

        <Rankings players={room?.players || []} />
      </div>
    </ModeShell>
  );
};

const ModeShell = ({ title, onExit, children }) => (
  <MotionDiv
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.18 }}
    className="min-h-[calc(100vh-8rem)] space-y-4 rounded-[4px] border border-[#D7D3CF] bg-white p-5"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-wider text-[#666666]">Arcade</p>
        <h1 className="text-xl font-bold text-[#111111]">{title}</h1>
      </div>
      <button onClick={onExit} className="btn-secondary">
        <ArrowLeft size={14} />
        Exit
      </button>
    </div>
    {children}
  </MotionDiv>
);

const Leaderboard = ({ leaders, window, mode, onWindowChange, onModeChange }) => (
  <div className="rounded-[4px] border border-[#D7D3CF] bg-white p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-[#111111]">Leaderboard</h3>
      <div className="flex gap-2">
        <Segment value={window} options={['weekly', 'all-time']} onChange={onWindowChange} />
        <Segment value={mode} options={['all', 'scoreboard', 'fff']} onChange={onModeChange} />
      </div>
    </div>
    <div className="space-y-2">
      {leaders.length === 0 ? (
        <p className="py-4 text-center text-xs text-[#666666]">No ranked plays yet.</p>
      ) : leaders.map((row) => (
        <div key={row.user_id} className="flex items-center justify-between rounded-[4px] border border-[#D7D3CF] bg-[#F7F5F2] px-3 py-2">
          <p className="text-sm text-[#111111]">
            <span className="font-mono text-xs text-[#666666]">#{row.rank}</span> {row.name}
          </p>
          <p className="text-xs font-mono text-[#102326]">{row.points} XP</p>
        </div>
      ))}
    </div>
  </div>
);

const Rankings = ({ players = [] }) => (
  <div className="rounded-[4px] border border-[#D7D3CF] bg-white p-4">
    <div className="mb-3 flex items-center gap-2">
      <Users size={14} className="text-[#102326]" />
      <h3 className="text-sm font-semibold text-[#111111]">Rankings</h3>
    </div>
    <div className="space-y-2">
      {players.length === 0 ? (
        <p className="py-4 text-xs text-[#666666]">Waiting for players.</p>
      ) : players.map((player, index) => (
        <div key={player.user_id} className="flex items-center justify-between rounded-[4px] border border-[#D7D3CF] bg-[#F7F5F2] px-3 py-2">
          <span className="text-sm text-[#111111]">{index + 1}. {player.display_name}</span>
          <span className="text-xs font-mono text-[#102326]">{player.score} XP</span>
        </div>
      ))}
    </div>
  </div>
);

const Segment = ({ value, options, onChange }) => (
  <div className="flex rounded-[4px] border border-[#D7D3CF] bg-white p-0.5">
    {options.map((option) => (
      <button
        key={option}
        onClick={() => onChange(option)}
        className={`px-2 py-1 text-[10px] font-mono uppercase ${
          value === option ? 'bg-[#102326] text-white' : 'text-[#666666]'
        }`}
      >
        {option}
      </button>
    ))}
  </div>
);

export default Arcade;
