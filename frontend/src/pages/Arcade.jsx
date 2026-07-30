import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { io } from 'socket.io-client';
import {
  Activity,
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  Copy,
  Crown,
  Flame,
  Gauge,
  GitBranch,
  Hexagon,
  Play,
  RadioTower,
  RotateCcw,
  Shield,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Terminal,
  Trophy,
  UserPlus,
  Users,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import './ArcadeGame.css';

const MotionButton = motion.button;
const MotionDiv = motion.div;
const MotionI = motion.i;
const ROUND_SECONDS = 22;
const MAX_PLAYER_HP = 100;
const MAX_BOSS_HP = 150;

const SUBJECTS = [
  {
    id: 'web',
    name: 'Web Development',
    shortName: 'WEB',
    icon: Code2,
    arena: '/arcade-assets/arena-web-dev.webp',
    accent: '#25d8ff',
    accentRgb: '37, 216, 255',
    boss: 'DOMINION',
    bossTitle: 'Sovereign of the Broken DOM',
    difficulty: 'VANGUARD',
    description: 'Breach the ruined interface cathedral and restore the rendering core.',
    topics: ['DOM & Events', 'CSS Systems', 'Network Runtime'],
    questions: [
      {
        type: 'mcq',
        topic: 'CSS Systems',
        title: 'Cascade Breach',
        prompt: 'Which selector has the highest specificity?',
        options: [
          ['A', '.panel .title'],
          ['B', '#app .title'],
          ['C', 'section h2'],
          ['D', '[data-title]'],
        ],
        answer: 'B',
        intel: 'An ID selector outweighs any number of class and type selectors in this set.',
      },
      {
        type: 'fill',
        topic: 'DOM & Events',
        title: 'Core Invocation',
        prompt: 'Complete the DOM method used to select the first matching element.',
        code: 'document.________(".target")',
        placeholder: 'method name',
        accepted: ['queryselector'],
        answerLabel: 'querySelector',
        intel: 'querySelector returns the first element matching a valid CSS selector.',
      },
      {
        type: 'fix',
        topic: 'Network Runtime',
        title: 'Repair Protocol',
        prompt: 'Replace the comparison operator so this check does not coerce types.',
        code: 'if (status == "ready") {\n  launch();\n}',
        placeholder: 'correct operator',
        accepted: ['==='],
        answerLabel: '===',
        intel: 'Strict equality compares both value and type, preventing coercion surprises.',
      },
      {
        type: 'mcq',
        topic: 'Network Runtime',
        title: 'Cache Sentinel',
        prompt: 'Which HTTP status means a cached resource is still valid?',
        options: [
          ['A', '201 Created'],
          ['B', '304 Not Modified'],
          ['C', '401 Unauthorized'],
          ['D', '503 Unavailable'],
        ],
        answer: 'B',
        intel: '304 tells the client to reuse its cached representation.',
      },
      {
        type: 'problem',
        topic: 'DOM & Events',
        title: 'Event Relay',
        prompt: 'Name the pattern where one ancestor handles events for many descendants.',
        placeholder: 'pattern name',
        accepted: ['event delegation', 'delegation'],
        answerLabel: 'Event delegation',
        intel: 'Event delegation relies on propagation to avoid binding a listener to every child.',
      },
      {
        type: 'mcq',
        topic: 'CSS Systems',
        title: 'Final Render',
        prompt: 'Which layout system is purpose-built for two-dimensional rows and columns?',
        options: [
          ['A', 'Floats'],
          ['B', 'Positioning'],
          ['C', 'CSS Grid'],
          ['D', 'Inline blocks'],
        ],
        answer: 'C',
        intel: 'CSS Grid controls rows and columns together as a two-dimensional system.',
      },
    ],
  },
  {
    id: 'dsa',
    name: 'Data Structures',
    shortName: 'DSA',
    icon: GitBranch,
    arena: '/arcade-assets/arena-dsa.webp',
    accent: '#ffb12b',
    accentRgb: '255, 177, 43',
    boss: 'GRAPH GOLEM',
    bossTitle: 'The Cyclic Colossus',
    difficulty: 'ELITE',
    description: 'Break the golem’s dependency lattice before the foundry collapses.',
    topics: ['Trees & Graphs', 'Complexity', 'Core Structures'],
    questions: [
      {
        type: 'mcq',
        topic: 'Core Structures',
        title: 'Memory Stack',
        prompt: 'Which structure follows last-in, first-out order?',
        options: [['A', 'Queue'], ['B', 'Heap'], ['C', 'Stack'], ['D', 'Graph']],
        answer: 'C',
        intel: 'A stack removes the most recently inserted item first.',
      },
      {
        type: 'fill',
        topic: 'Complexity',
        title: 'Search Signature',
        prompt: 'Enter the average time complexity of binary search.',
        code: 'T(n) = ________',
        placeholder: 'complexity',
        accepted: ['o(log n)', 'ologn', 'log n', 'logn'],
        answerLabel: 'O(log n)',
        intel: 'Binary search halves the remaining search space on every comparison.',
      },
      {
        type: 'mcq',
        topic: 'Trees & Graphs',
        title: 'Frontier Protocol',
        prompt: 'Which structure powers a standard breadth-first search frontier?',
        options: [['A', 'Queue'], ['B', 'Stack'], ['C', 'Min heap'], ['D', 'Hash set only']],
        answer: 'A',
        intel: 'A FIFO queue explores all nodes at the current depth before moving deeper.',
      },
      {
        type: 'fix',
        topic: 'Complexity',
        title: 'Boundary Fault',
        prompt: 'Repair the loop condition so the final binary-search candidate is checked.',
        code: 'while (left < right) {\n  const mid = (left + right) >> 1;\n}',
        placeholder: 'replacement condition',
        accepted: ['left <= right', 'left<=right'],
        answerLabel: 'left <= right',
        intel: 'The equality case represents one remaining candidate and must still be evaluated.',
      },
      {
        type: 'problem',
        topic: 'Trees & Graphs',
        title: 'Weighted Route',
        prompt: 'Which shortest-path algorithm is valid when every edge weight is non-negative?',
        placeholder: 'algorithm',
        accepted: ['dijkstra', "dijkstra's", 'dijkstras'],
        answerLabel: 'Dijkstra’s algorithm',
        intel: 'Dijkstra greedily settles the nearest unvisited vertex under non-negative weights.',
      },
      {
        type: 'mcq',
        topic: 'Core Structures',
        title: 'Sparse Matrix',
        prompt: 'Which graph representation is usually more space-efficient for sparse graphs?',
        options: [['A', 'Adjacency matrix'], ['B', 'Adjacency list'], ['C', 'Dense tensor'], ['D', 'Complete table']],
        answer: 'B',
        intel: 'Adjacency lists store existing edges rather than every possible vertex pair.',
      },
    ],
  },
  {
    id: 'cyber',
    name: 'Cybersecurity',
    shortName: 'CYBER',
    icon: ShieldCheck,
    arena: '/arcade-assets/arena-cybersecurity.webp',
    accent: '#b783ff',
    accentRgb: '183, 131, 255',
    boss: 'FIREWALL WRAITH',
    bossTitle: 'Keeper of the Zero-Day Gate',
    difficulty: 'NIGHTMARE',
    description: 'Enter the breached vault and seal the wraith behind a hardened perimeter.',
    topics: ['Identity', 'Application Defense', 'Network Security'],
    questions: [
      {
        type: 'mcq',
        topic: 'Identity',
        title: 'Credential Vault',
        prompt: 'What should be added before hashing passwords to resist rainbow tables?',
        options: [['A', 'A salt'], ['B', 'Base64'], ['C', 'A username'], ['D', 'Compression']],
        answer: 'A',
        intel: 'A unique random salt prevents identical passwords from producing identical stored hashes.',
      },
      {
        type: 'fill',
        topic: 'Identity',
        title: 'Access Doctrine',
        prompt: 'Name the principle that grants only the permissions required for a task.',
        placeholder: 'security principle',
        accepted: ['least privilege', 'principle of least privilege'],
        answerLabel: 'Least privilege',
        intel: 'Least privilege limits both accidental damage and the blast radius of compromise.',
      },
      {
        type: 'fix',
        topic: 'Application Defense',
        title: 'Injection Seal',
        prompt: 'Replace string concatenation with the database feature that blocks SQL injection.',
        code: 'query("SELECT * FROM users WHERE id=" + id)',
        placeholder: 'defense technique',
        accepted: ['parameterized query', 'parameterized queries', 'prepared statement', 'prepared statements'],
        answerLabel: 'Parameterized query',
        intel: 'Parameters keep untrusted data separate from the SQL instruction stream.',
      },
      {
        type: 'mcq',
        topic: 'Network Security',
        title: 'Transport Barrier',
        prompt: 'Which protocol secures normal web traffic in transit?',
        options: [['A', 'FTP'], ['B', 'TLS'], ['C', 'ARP'], ['D', 'ICMP']],
        answer: 'B',
        intel: 'TLS provides confidentiality, integrity, and server authentication for HTTPS.',
      },
      {
        type: 'problem',
        topic: 'Identity',
        title: 'Second Factor',
        prompt: 'What control requires a second, independent proof of identity?',
        placeholder: 'control name',
        accepted: ['mfa', 'multi factor authentication', 'multifactor authentication', 'two factor authentication', '2fa'],
        answerLabel: 'Multi-factor authentication',
        intel: 'MFA combines independent factors so a stolen password is not enough.',
      },
      {
        type: 'mcq',
        topic: 'Application Defense',
        title: 'Script Purge',
        prompt: 'What is the primary output-side defense against reflected XSS?',
        options: [['A', 'HTML encoding'], ['B', 'Longer sessions'], ['C', 'DNS caching'], ['D', 'Port forwarding']],
        answer: 'A',
        intel: 'Context-aware output encoding stops untrusted text from becoming executable markup.',
      },
    ],
  },
  {
    id: 'python',
    name: 'Python Programming',
    shortName: 'PY',
    icon: Terminal,
    arena: '/arcade-assets/arena-web-dev.webp',
    accent: '#65e6a5',
    accentRgb: '101, 230, 165',
    boss: 'RUNTIME SERPENT',
    bossTitle: 'The Interpreter Below',
    difficulty: 'VANGUARD',
    description: 'Trace the serpent through a corrupted runtime and restore deterministic execution.',
    topics: ['Syntax', 'Collections', 'Control Flow'],
    questions: [
      { type: 'mcq', topic: 'Collections', title: 'Immutable Core', prompt: 'Which Python collection is immutable?', options: [['A', 'list'], ['B', 'dictionary'], ['C', 'tuple'], ['D', 'set']], answer: 'C', intel: 'Tuples cannot be modified after they are created.' },
      { type: 'mcq', topic: 'Syntax', title: 'Function Gate', prompt: 'Which keyword begins a normal Python function definition?', options: [['A', 'func'], ['B', 'def'], ['C', 'function'], ['D', 'method']], answer: 'B', intel: 'Python defines named functions with the def keyword.' },
      { type: 'fill', topic: 'Collections', title: 'Sequence Scan', prompt: 'Name the built-in function that returns the number of items in a sequence.', placeholder: 'function name', accepted: ['len', 'len()'], answerLabel: 'len()', intel: 'len returns the size of a Python collection or sequence.' },
      { type: 'mcq', topic: 'Control Flow', title: 'Loop Signal', prompt: 'Which statement immediately exits the current loop?', options: [['A', 'skip'], ['B', 'return-only'], ['C', 'break'], ['D', 'pass']], answer: 'C', intel: 'break exits the nearest enclosing loop.' },
      { type: 'problem', topic: 'Collections', title: 'Unique Cache', prompt: 'Which built-in collection stores unique unordered values?', placeholder: 'collection type', accepted: ['set', 'a set'], answerLabel: 'set', intel: 'Sets automatically maintain unique members.' },
      { type: 'mcq', topic: 'Syntax', title: 'Safe Cleanup', prompt: 'Which block runs whether an exception occurs or not?', options: [['A', 'except'], ['B', 'finally'], ['C', 'raise'], ['D', 'assert']], answer: 'B', intel: 'finally is used for cleanup that must always execute.' },
    ],
  },
  {
    id: 'software',
    name: 'Software Engineering',
    shortName: 'SE',
    icon: GitBranch,
    arena: '/arcade-assets/arena-cybersecurity.webp',
    accent: '#ff6f7f',
    accentRgb: '255, 111, 127',
    boss: 'ENTROPY ARCHITECT',
    bossTitle: 'Breaker of Release Trains',
    difficulty: 'ELITE',
    description: 'Stabilize the release lattice before the architect fractures every dependency.',
    topics: ['Process', 'Requirements', 'Quality'],
    questions: [
      { type: 'mcq', topic: 'Process', title: 'Iteration Cycle', prompt: 'Which approach delivers software in short cycles with frequent feedback?', options: [['A', 'Agile'], ['B', 'Big bang'], ['C', 'No planning'], ['D', 'Code only']], answer: 'A', intel: 'Agile methods use iterative delivery and regular feedback.' },
      { type: 'fill', topic: 'Requirements', title: 'Specification Seal', prompt: 'What does SRS stand for?', placeholder: 'full form', accepted: ['software requirements specification', 'software requirement specification'], answerLabel: 'Software Requirements Specification', intel: 'An SRS documents the expected system requirements.' },
      { type: 'mcq', topic: 'Quality', title: 'Review Matrix', prompt: 'What is a key benefit of peer code review?', options: [['A', 'It removes all testing'], ['B', 'Early defect detection'], ['C', 'It guarantees no bugs'], ['D', 'It replaces design']], answer: 'B', intel: 'Reviews catch defects early and share knowledge across the team.' },
      { type: 'mcq', topic: 'Requirements', title: 'Validation Check', prompt: 'Validation primarily asks which question?', options: [['A', 'Are we building the right product?'], ['B', 'Is the server powered?'], ['C', 'Who typed fastest?'], ['D', 'Is every file large?']], answer: 'A', intel: 'Validation checks whether the product meets real user needs.' },
      { type: 'problem', topic: 'Process', title: 'Version Control', prompt: 'Name the practice where developers frequently integrate small changes into a shared branch.', placeholder: 'practice', accepted: ['continuous integration', 'ci', 'trunk based development', 'trunk-based development'], answerLabel: 'Continuous integration', intel: 'Frequent integration keeps changes small and catches conflicts early.' },
      { type: 'mcq', topic: 'Quality', title: 'Test Frontier', prompt: 'What is the primary purpose of software testing?', options: [['A', 'Prove perfection'], ['B', 'Find defects and verify behavior'], ['C', 'Avoid requirements'], ['D', 'Replace users']], answer: 'B', intel: 'Testing reveals defects and checks behavior against expectations.' },
    ],
  },
  {
    id: 'management',
    name: 'Engineering Management',
    shortName: 'EM',
    icon: Crown,
    arena: '/arcade-assets/arena-dsa.webp',
    accent: '#f0c65a',
    accentRgb: '240, 198, 90',
    boss: 'DEADLINE TYRANT',
    bossTitle: 'Keeper of the Critical Path',
    difficulty: 'VANGUARD',
    description: 'Recover the project timeline and break the tyrant’s hold over the critical path.',
    topics: ['Planning', 'Risk', 'Leadership'],
    questions: [
      { type: 'mcq', topic: 'Planning', title: 'Scope Boundary', prompt: 'What does a project scope statement define?', options: [['A', 'Boundaries and deliverables'], ['B', 'Only holidays'], ['C', 'Password rules'], ['D', 'CPU speed']], answer: 'A', intel: 'Scope establishes what the project includes and excludes.' },
      { type: 'mcq', topic: 'Planning', title: 'Timeline Grid', prompt: 'Which chart commonly displays project tasks across time?', options: [['A', 'Pie chart'], ['B', 'Gantt chart'], ['C', 'Scatter plot'], ['D', 'Truth table']], answer: 'B', intel: 'A Gantt chart visualizes tasks, durations, and scheduling relationships.' },
      { type: 'fill', topic: 'Risk', title: 'Threat Ledger', prompt: 'Name the document used to track project risks, owners, and responses.', placeholder: 'document name', accepted: ['risk register', 'a risk register'], answerLabel: 'Risk register', intel: 'The risk register records and monitors identified project risks.' },
      { type: 'mcq', topic: 'Leadership', title: 'Team Signal', prompt: 'Which behavior best supports a skilled autonomous team?', options: [['A', 'Clear outcomes and coaching'], ['B', 'No goals'], ['C', 'Constant interruption'], ['D', 'Hidden priorities']], answer: 'A', intel: 'Autonomy works best with clear outcomes, trust, and timely coaching.' },
      { type: 'problem', topic: 'Planning', title: 'Path Analysis', prompt: 'What is the sequence of tasks that determines the shortest project duration called?', placeholder: 'term', accepted: ['critical path', 'the critical path'], answerLabel: 'Critical path', intel: 'Delay on the critical path directly delays the overall project.' },
      { type: 'mcq', topic: 'Risk', title: 'Early Warning', prompt: 'Why are leading indicators useful?', options: [['A', 'They allow earlier intervention'], ['B', 'They only describe the past'], ['C', 'They remove all uncertainty'], ['D', 'They replace planning']], answer: 'A', intel: 'Leading indicators provide warning before final outcomes deteriorate.' },
    ],
  },
];

const HEROES = [
  { id: 'kai', name: 'Kai Ren', className: 'Code Vanguard', position: '0% 0%', affinity: 'WEB', bonus: 'Precision +5%' },
  { id: 'lyra', name: 'Lyra Voss', className: 'Graph Tactician', position: '100% 0%', affinity: 'DSA', bonus: 'Combo +1' },
  { id: 'noctis', name: 'Noctis Vale', className: 'Vault Guardian', position: '0% 100%', affinity: 'CYBER', bonus: 'Armor +8' },
  { id: 'mira', name: 'Mira Chen', className: 'Data Architect', position: '100% 100%', affinity: 'DB', bonus: 'Insight +5%' },
];

const normalize = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[’']/g, "'")
  .replace(/\s+/g, ' ');

const heroStyle = (hero) => ({
  backgroundImage: 'url("/arcade-assets/hero-roster.webp")',
  backgroundPosition: hero.position,
});

const Arcade = () => {
  const [screen, setScreen] = useState('command');
  const [subjectId, setSubjectId] = useState(SUBJECTS[0].id);
  const [heroId, setHeroId] = useState(HEROES[0].id);
  const [runId, setRunId] = useState(0);
  const subject = SUBJECTS.find((item) => item.id === subjectId) || SUBJECTS[0];
  const hero = HEROES.find((item) => item.id === heroId) || HEROES[0];

  const deploy = () => {
    setRunId((value) => value + 1);
    setScreen('battle');
  };

  if (screen === 'battle') {
    return (
      <Battle key={runId} subject={subject} hero={hero} onExit={() => setScreen('command')} onReplay={deploy} />
    );
  }
  if (screen === 'party') {
    return <PartyDuel subject={subject} hero={hero} onExit={() => setScreen('command')} />;
  }

  return (
    <CommandDeck
      subject={subject}
      hero={hero}
      onSubject={setSubjectId}
      onHero={setHeroId}
      onDeploy={deploy}
      onParty={() => setScreen('party')}
    />
  );
};

const CommandDeck = ({ subject, hero, onSubject, onHero, onDeploy, onParty }) => (
  <div className="arcade-game arcade-command" style={{ '--accent': subject.accent, '--accent-rgb': subject.accentRgb }}>
    <div className="arcade-grid-noise" />
    <header className="command-header">
      <div className="arcade-brand">
        <span className="brand-mark"><Hexagon size={25} /><Swords size={15} /></span>
        <div>
          <p>ACADEMY COMBAT NETWORK</p>
          <h1>ARCADE</h1>
        </div>
      </div>
      <div className="command-status">
        <span><Activity size={14} /> SYSTEM ONLINE</span>
        <span><Shield size={14} /> SOLO PROTOCOL</span>
        <span className="rank-chip"><Crown size={14} /> RANK 07</span>
      </div>
    </header>

    <main className="command-layout">
      <section className="campaign-visual">
        <img src="/arcade-assets/campaign-map.webp" alt="Three-realm Arcade campaign map" />
        <div className="campaign-vignette" />
        <div className="campaign-copy">
          <p className="game-eyebrow"><Target size={14} /> ACTIVE CAMPAIGN</p>
          <h2>THE KNOWLEDGE<br />FRACTURE</h2>
          <p>Six corrupted curriculum domains. Six raid-class enemies. One attempt to restore the Academy Core.</p>
          <div className="campaign-stats">
            <span><strong>06</strong> DOMAINS</span>
            <span><strong>36</strong> ENCOUNTERS</span>
            <span><strong>S</strong> MAX RANK</span>
          </div>
        </div>
        <div className="map-scanline" />
      </section>

      <section className="loadout-panel metal-panel">
        <PanelHeading kicker="01 / DOMAIN" title="Select Raid Target" icon={<Target size={18} />} />
        <div className="subject-list">
          {SUBJECTS.map((item) => {
            const active = item.id === subject.id;
            return (
              <button
                key={item.id}
                className={`subject-raid ${active ? 'active' : ''}`}
                onClick={() => onSubject(item.id)}
                style={{ '--item-accent': item.accent, '--item-rgb': item.accentRgb }}
              >
                <span className="subject-icon">{React.createElement(item.icon, { size: 22 })}</span>
                <span className="subject-copy">
                  <small>{item.difficulty} RAID</small>
                  <strong>{item.name}</strong>
                  <em>{item.boss}</em>
                </span>
                <span className="subject-arrow"><ChevronRight size={18} /></span>
              </button>
            );
          })}
        </div>

        <PanelHeading kicker="02 / OPERATIVE" title="Choose Your Vanguard" icon={<Shield size={18} />} />
        <div className="hero-grid">
          {HEROES.map((item) => (
            <button
              key={item.id}
              className={`hero-select ${item.id === hero.id ? 'active' : ''}`}
              onClick={() => onHero(item.id)}
            >
              <span className="hero-crop" style={heroStyle(item)} />
              <span className="hero-meta">
                <small>{item.affinity}</small>
                <strong>{item.name}</strong>
                <em>{item.className}</em>
              </span>
            </button>
          ))}
        </div>

        <div className="deployment-brief">
          <div>
            <small>MISSION</small>
            <strong>{subject.bossTitle}</strong>
            <p>{subject.description}</p>
          </div>
          <div className="brief-rewards">
            <span><Award size={15} /> 1,500 XP</span>
            <span><Sparkles size={15} /> EPIC CACHE</span>
          </div>
        </div>

        <div className="mode-actions">
          <button className="deploy-button" onClick={onDeploy}>
            <span><Play size={18} fill="currentColor" /> SOLO RAID</span>
            <small>{subject.shortName} · {hero.name}</small>
          </button>
          <button className="party-deploy-button" onClick={onParty}>
            <span><Users size={18} /> PARTY DUEL</span>
            <small>PRIVATE 1V1 · ROOM CODE</small>
          </button>
        </div>
      </section>
    </main>
  </div>
);

const readResponse = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
};

const PartyDuel = ({ subject, hero, onExit }) => {
  const [chosenHeroId, setChosenHeroId] = useState(hero.id);
  const [joinCode, setJoinCode] = useState('');
  const [party, setParty] = useState(null);
  const [socketStatus, setSocketStatus] = useState('offline');
  const [countdown, setCountdown] = useState(0);
  const [roundData, setRoundData] = useState(null);
  const [selected, setSelected] = useState('');
  const [answered, setAnswered] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameResult, setGameResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef(null);

  const chosenHero = HEROES.find((item) => item.id === chosenHeroId) || HEROES[0];
  const selfUserId = party?.self_user_id;
  const selfPlayer = party?.players?.find((player) => player.user_id === selfUserId);
  const opponent = party?.players?.find((player) => player.user_id !== selfUserId);

  const submitPartyRequest = async (endpoint, body) => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || 'Party request failed.');
      setParty(data);
    } catch (requestError) {
      setError(requestError.message || 'Party request failed.');
    } finally {
      setBusy(false);
    }
  };

  const createParty = () => submitPartyRequest('/api/arcade/party/create', {
    subject: subject.name,
    avatar_id: chosenHeroId,
  });

  const joinParty = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError('Enter the six-character party code.');
      return;
    }
    submitPartyRequest('/api/arcade/party/join', { code, avatar_id: chosenHeroId });
  };

  useEffect(() => {
    if (!party?.code) return undefined;
    const socket = io('/', {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      setSocketStatus('online');
      socket.emit('arcade:party_connect', { code: party.code });
    });
    socket.on('disconnect', () => setSocketStatus('reconnecting'));
    socket.on('connect_error', () => setSocketStatus('reconnecting'));
    socket.on('arcade:party_state', (state) => {
      setParty((previous) => ({
        ...state,
        self_user_id: previous?.self_user_id,
      }));
      if (state.status === 'abandoned' || state.status === 'expired') {
        setError('The host closed this party. Return to the command deck or create a new room.');
      }
    });
    socket.on('arcade:party_countdown', ({ seconds }) => {
      setCountdown(seconds || 3);
      setError('');
    });
    socket.on('arcade:party_round_started', (payload) => {
      setCountdown(0);
      setRoundData(payload);
      setParty((previous) => previous ? { ...previous, status: 'active', players: payload.players } : previous);
      setSelected('');
      setAnswered(false);
      setRoundResult(null);
      setTimeLeft(payload.timeout_seconds || 10);
    });
    socket.on('arcade:party_answer_result', (payload) => {
      setParty((previous) => previous ? { ...previous, players: payload.players || previous.players } : previous);
      if (payload.player_user_id === selfUserId) setAnswered(true);
      if (payload.locked || payload.player_user_id === selfUserId) setRoundResult(payload);
    });
    socket.on('arcade:party_game_over', (payload) => {
      setParty((previous) => previous ? { ...previous, status: 'completed', players: payload.players } : previous);
      setGameResult(payload);
      setRoundData(null);
    });
    socket.on('arcade:party_error', (payload) => setError(payload.error || 'Party connection error.'));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [party?.code, selfUserId]);

  useEffect(() => {
    if (!countdown) return undefined;
    const timer = window.setInterval(() => {
      setCountdown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (!roundData || roundResult?.locked) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [roundData, roundResult?.locked]);

  const toggleReady = () => {
    socketRef.current?.emit('arcade:party_ready', {
      code: party.code,
      ready: !selfPlayer?.ready,
    });
  };

  const answer = (option) => {
    if (!roundData || answered || roundResult?.locked) return;
    setSelected(option);
    setAnswered(true);
    socketRef.current?.emit('arcade:party_answer', {
      round_id: roundData.round_id,
      selected_option: option,
    });
  };

  const leaveParty = () => {
    if (party?.code) socketRef.current?.emit('arcade:party_leave', { code: party.code });
    socketRef.current?.disconnect();
    onExit();
  };

  if (gameResult) {
    return (
      <PartyResult
        subject={subject}
        party={party}
        selfUserId={selfUserId}
        onExit={leaveParty}
      />
    );
  }

  if (roundData) {
    return (
      <PartyBattle
        subject={subject}
        party={party}
        selfUserId={selfUserId}
        roundData={roundData}
        selected={selected}
        answered={answered}
        roundResult={roundResult}
        timeLeft={timeLeft}
        onAnswer={answer}
        onExit={leaveParty}
      />
    );
  }

  return (
    <div className="arcade-game party-shell" style={{ '--accent': subject.accent, '--accent-rgb': subject.accentRgb }}>
      <div className="arcade-grid-noise" />
      <header className="party-header">
        <button className="hud-back" onClick={leaveParty}><ArrowLeft size={19} /></button>
        <div className="arcade-brand">
          <span className="brand-mark"><Hexagon size={25} /><Users size={15} /></span>
          <div><p>AUTHENTICATED PRIVATE MATCH</p><h1>PARTY DUEL</h1></div>
        </div>
        <div className={`party-network ${socketStatus}`}>
          <RadioTower size={15} />
          {party ? socketStatus.toUpperCase() : 'SECURE LOBBY'}
        </div>
      </header>

      {!party ? (
        <main className="party-setup">
          <section className="party-intro">
            <div className="party-intro-art">
              <div className="versus-hero left" style={heroStyle(chosenHero)} />
              <div className="versus-core"><span>1</span><Swords size={34} /><span>1</span></div>
              <div className="versus-unknown"><UserPlus size={48} /></div>
            </div>
            <p className="game-eyebrow"><Users size={14} /> PRIVATE FASTEST-FINGER COMBAT</p>
            <h2>CHALLENGE A REAL<br />ACADEMY OPERATIVE</h2>
            <p>
              Both signed-in players receive the same question. The server locks the first correct strike,
              awards the winner, and deducts points from missed or incorrect attacks.
            </p>
            <div className="duel-rules">
              <span><Zap size={16} /><strong>+100</strong> FIRST CORRECT</span>
              <span><X size={16} /><strong>−20</strong> WRONG STRIKE</span>
              <span><Clock3 size={16} /><strong>−10</strong> TIMEOUT</span>
            </div>
          </section>

          <section className="party-console metal-panel">
            <PanelHeading kicker="01 / OPERATIVE" title="Select Your Duel Avatar" icon={<Shield size={18} />} />
            <div className="party-avatar-grid">
              {HEROES.map((item) => (
                <button
                  key={item.id}
                  className={`party-avatar ${item.id === chosenHeroId ? 'active' : ''}`}
                  onClick={() => setChosenHeroId(item.id)}
                >
                  <span style={heroStyle(item)} />
                  <strong>{item.name}</strong>
                  <small>{item.className}</small>
                </button>
              ))}
            </div>

            <div className="party-subject-lock">
              <span>{React.createElement(subject.icon, { size: 20 })}</span>
              <div><small>LOCKED DUEL DOMAIN</small><strong>{subject.name}</strong></div>
              <CheckCircle2 size={18} />
            </div>

            <button className="create-party-button" disabled={busy} onClick={createParty}>
              <Users size={18} />
              <span><strong>CREATE PRIVATE PARTY</strong><small>Generate a secure invite code</small></span>
            </button>

            <div className="party-divider"><span /> OR JOIN AN OPERATIVE <span /></div>

            <div className="join-code-box">
              <label>
                <small>PARTY CODE</small>
                <input
                  value={joinCode}
                  maxLength={6}
                  placeholder="K7M4QX"
                  onChange={(event) => setJoinCode(event.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') joinParty();
                  }}
                />
              </label>
              <button disabled={busy || joinCode.length !== 6} onClick={joinParty}>
                <UserPlus size={17} /> JOIN
              </button>
            </div>
            {error ? <p className="party-error">{error}</p> : null}
          </section>
        </main>
      ) : (
        <main className="party-lobby">
          <section className="lobby-stage">
            <div className="lobby-stage-bg" style={{ backgroundImage: `url("${subject.arena}")` }} />
            <div className="lobby-stage-shade" />
            <div className="lobby-title">
              <p className="game-eyebrow"><RadioTower size={14} /> DUEL CHANNEL ESTABLISHED</p>
              <h2>{countdown ? `DEPLOYING IN ${countdown}` : opponent ? 'BOTH OPERATIVES CONNECTED' : 'AWAITING CHALLENGER'}</h2>
              <p>{opponent ? 'Ready both operatives to synchronize the first round.' : 'Share the secure party code with another signed-in player.'}</p>
            </div>
            <div className="lobby-combatants">
              <LobbyPlayer player={selfPlayer} label="YOU" />
              <div className="lobby-vs"><Swords size={30} /><span>VERSUS</span></div>
              <LobbyPlayer player={opponent} label="CHALLENGER" emptyLabel="WAITING FOR PLAYER" />
            </div>
          </section>

          <aside className="lobby-sidebar metal-panel">
            <PanelHeading kicker="PRIVATE CHANNEL" title="Party Access" icon={<LockKeyholeIcon />} />
            <button
              className="party-code-display"
              onClick={() => navigator.clipboard?.writeText(party.code)}
            >
              <small>CLICK TO COPY</small>
              <strong>{party.code}</strong>
              <Copy size={17} />
            </button>
            <div className="lobby-checklist">
              <LobbyCheck complete={Boolean(selfPlayer?.connected)} label="Your connection verified" />
              <LobbyCheck complete={Boolean(opponent?.connected)} label="Opponent connection verified" />
              <LobbyCheck complete={Boolean(selfPlayer?.avatar_id && opponent?.avatar_id && selfPlayer.avatar_id !== opponent.avatar_id)} label="Distinct avatars locked" />
              <LobbyCheck complete={Boolean(selfPlayer?.ready && opponent?.ready)} label="Both operatives ready" />
            </div>
            <button
              className={`ready-button ${selfPlayer?.ready ? 'ready' : ''}`}
              disabled={!opponent || countdown > 0}
              onClick={toggleReady}
            >
              {selfPlayer?.ready ? <Check size={18} /> : <Swords size={18} />}
              {selfPlayer?.ready ? 'READY — CANCEL' : 'READY FOR COMBAT'}
            </button>
            <p className="lobby-security"><ShieldCheck size={14} /> Every player action is verified against the signed Google session.</p>
            {error ? <p className="party-error">{error}</p> : null}
          </aside>
        </main>
      )}
    </div>
  );
};

const LockKeyholeIcon = () => (
  <span className="lock-keyhole-shape"><Shield size={15} /></span>
);

const LobbyPlayer = ({ player, label, emptyLabel }) => {
  const avatar = HEROES.find((item) => item.id === player?.avatar_id);
  if (!player || !avatar) {
    return (
      <div className="lobby-player empty">
        <div className="lobby-player-art"><UserPlus size={50} /></div>
        <small>{label}</small>
        <strong>{emptyLabel}</strong>
        <em>Invite code required</em>
      </div>
    );
  }
  return (
    <div className={`lobby-player ${player.ready ? 'ready' : ''}`}>
      <div className="lobby-player-art" style={heroStyle(avatar)}><i /></div>
      <small>{label} · {player.is_host ? 'HOST' : 'GUEST'}</small>
      <strong>{player.display_name}</strong>
      <em>{avatar.name} · {player.ready ? 'COMBAT READY' : 'NOT READY'}</em>
    </div>
  );
};

const LobbyCheck = ({ complete, label }) => (
  <div className={complete ? 'complete' : ''}>
    <span>{complete ? <Check size={13} /> : null}</span>
    <p>{label}</p>
  </div>
);

const PartyBattle = ({ subject, party, selfUserId, roundData, selected, answered, roundResult, timeLeft, onAnswer, onExit }) => {
  const players = party?.players || roundData.players || [];
  const selfPlayer = players.find((player) => player.user_id === selfUserId);
  const opponent = players.find((player) => player.user_id !== selfUserId);
  const winner = roundResult?.winner_user_id;
  return (
    <div className="arcade-game party-battle" style={{ '--accent': subject.accent, '--accent-rgb': subject.accentRgb }}>
      <div className="arcade-grid-noise" />
      <header className="party-battle-top">
        <button className="hud-back" onClick={onExit}><ArrowLeft size={19} /></button>
        <DuelHudPlayer player={selfPlayer} side="self" />
        <div className="duel-round-core">
          <small>ROUND {roundData.round} / {roundData.total_rounds}</small>
          <strong>FASTEST FINGER</strong>
        </div>
        <div className={`duel-timer ${timeLeft <= 3 ? 'danger' : ''}`}><Clock3 size={17} />00:{String(timeLeft).padStart(2, '0')}</div>
        <DuelHudPlayer player={opponent} side="opponent" />
      </header>

      <main className="party-battle-layout">
        <section className="duel-arena">
          <div className="duel-arena-bg" style={{ backgroundImage: 'url("/arcade-assets/campaign-map.webp")' }} />
          <div className="duel-arena-grid" />
          <DuelFighter player={selfPlayer} side="left" winner={winner === selfPlayer?.user_id} delta={roundResult?.deltas?.[selfPlayer?.user_id]} />
          <div className="duel-center-mark"><Swords size={36} /><span>VS</span></div>
          <DuelFighter player={opponent} side="right" winner={winner === opponent?.user_id} delta={roundResult?.deltas?.[opponent?.user_id]} />
        </section>

        <section className="duel-question metal-panel">
          <div className="duel-question-head">
            <div><p className="game-eyebrow"><Zap size={14} /> SYNCHRONIZED CHALLENGE</p><h2>{roundData.question.question}</h2></div>
            <span>{roundData.question.difficulty}</span>
          </div>
          <div className="duel-options">
            {Object.entries(roundData.question.options || {}).map(([key, value], index) => {
              const correct = roundResult?.locked && key === roundResult.correct_option;
              const wrong = roundResult?.locked && selected === key && key !== roundResult.correct_option;
              return (
                <button
                  key={key}
                  disabled={answered || roundResult?.locked}
                  className={`${selected === key ? 'selected' : ''} ${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}`}
                  onClick={() => onAnswer(key)}
                >
                  <span>{key}</span>
                  <div><small>STRIKE {index + 1}</small><strong>{value}</strong></div>
                </button>
              );
            })}
          </div>
          <div className={`duel-feedback ${roundResult ? (winner === selfUserId ? 'win' : roundResult.locked ? 'loss' : 'wrong') : ''}`}>
            {!roundResult ? (
              <><Activity size={15} /><span>{answered ? 'ANSWER LOCKED — WAITING FOR OPPONENT' : 'SELECT ONE STRIKE · FIRST CORRECT ANSWER WINS'}</span></>
            ) : (
              <>
                {winner === selfUserId ? <Trophy size={17} /> : roundResult.locked ? <Shield size={17} /> : <X size={17} />}
                <span>
                  {winner === selfUserId
                    ? `ROUND WON · +${roundResult.points} POINTS`
                    : roundResult.locked
                      ? winner ? 'OPPONENT WON THE ROUND' : 'ROUND CLOSED WITHOUT A WINNER'
                      : 'WRONG STRIKE · −20 POINTS'}
                </span>
                {roundResult.locked && roundResult.explanation ? <small>{roundResult.explanation}</small> : null}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

const DuelHudPlayer = ({ player, side }) => {
  const avatar = HEROES.find((item) => item.id === player?.avatar_id) || HEROES[0];
  return (
    <div className={`duel-hud-player ${side}`}>
      <span style={heroStyle(avatar)} />
      <div><small>{side === 'self' ? 'YOU' : 'OPPONENT'}</small><strong>{player?.display_name || 'Connecting'}</strong></div>
      <b>{player?.score || 0}</b>
    </div>
  );
};

const DuelFighter = ({ player, side, winner, delta }) => {
  const avatar = HEROES.find((item) => item.id === player?.avatar_id) || HEROES[0];
  return (
    <MotionDiv
      className={`duel-fighter ${side} ${winner ? 'winner' : ''}`}
      animate={winner ? { x: side === 'left' ? [0, 18, 0] : [0, -18, 0], scale: [1, 1.03, 1] } : {}}
    >
      <div className="duel-fighter-art" style={heroStyle(avatar)} />
      <small>{avatar.className}</small>
      <strong>{player?.display_name}</strong>
      {typeof delta === 'number' ? <MotionI className={delta >= 0 ? 'positive' : 'negative'} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: -10 }}>{delta > 0 ? '+' : ''}{delta}</MotionI> : null}
    </MotionDiv>
  );
};

const PartyResult = ({ subject, party, selfUserId, onExit }) => {
  const players = [...(party?.players || [])].sort((a, b) => b.score - a.score);
  const winner = players[0];
  const tied = players.length > 1 && players[0].score === players[1].score;
  const selfWon = winner?.user_id === selfUserId;
  return (
    <div className="arcade-game party-result-shell" style={{ '--accent': subject.accent, '--accent-rgb': subject.accentRgb }}>
      <div className="party-result-bg" style={{ backgroundImage: `url("${subject.arena}")` }} />
      <div className="party-result-shade" />
      <MotionDiv className="party-result-card metal-panel" initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="result-emblem">{selfWon && !tied ? <Trophy size={42} /> : <Shield size={42} />}</div>
        <p>{tied ? 'SCORES EQUAL' : selfWon ? 'DUEL VICTORY' : 'DUEL COMPLETE'}</p>
        <h2>{tied ? 'TACTICAL DRAW' : selfWon ? 'SUPERIOR RESPONSE' : 'OPPONENT PREVAILED'}</h2>
        <div className="party-final-ranks">
          {players.map((player, index) => {
            const avatar = HEROES.find((item) => item.id === player.avatar_id) || HEROES[0];
            return (
              <div key={player.user_id} className={index === 0 && !tied ? 'winner' : ''}>
                <b>#{index + 1}</b>
                <span style={heroStyle(avatar)} />
                <p><small>{player.user_id === selfUserId ? 'YOU' : 'OPPONENT'}</small><strong>{player.display_name}</strong></p>
                <em>{player.score} PTS</em>
              </div>
            );
          })}
        </div>
        <button className="deploy-button" onClick={onExit}><span><ArrowLeft size={17} /> RETURN TO COMMAND DECK</span></button>
      </MotionDiv>
    </div>
  );
};

const Battle = ({ subject, hero, onExit, onReplay }) => {
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState('');
  const [input, setInput] = useState('');
  const [playerHp, setPlayerHp] = useState(MAX_PLAYER_HP);
  const [bossHp, setBossHp] = useState(MAX_BOSS_HP);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [damage, setDamage] = useState(null);
  const [shake, setShake] = useState('');
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const resolveRef = useRef(null);
  const actionLockRef = useRef(false);

  const question = subject.questions[round];
  const isChoice = question?.type === 'mcq';
  const answerValue = isChoice ? selected : input;

  const advance = useCallback(() => {
    actionLockRef.current = false;
    setRound((value) => value + 1);
    setSelected('');
    setInput('');
    setFeedback(null);
    setDamage(null);
    setLocked(false);
    setTimeLeft(ROUND_SECONDS);
  }, []);

  const resolveAttack = useCallback((timedOut = false) => {
    if (actionLockRef.current || locked || result || !question) return;
    const value = isChoice ? selected : input;
    if (!timedOut && !String(value).trim()) return;
    actionLockRef.current = true;

    const correct = !timedOut && (
      isChoice
        ? value === question.answer
        : question.accepted.some((accepted) => normalize(accepted) === normalize(value))
    );
    const nextStreak = correct ? streak + 1 : 0;
    const bossDamage = correct ? 26 + Math.min(streak * 3, 12) : 0;
    const playerDamage = correct ? 0 : timedOut ? 14 : 22;
    const isFinalRound = round >= subject.questions.length - 1;
    const nextBossHp = correct
      ? Math.max(isFinalRound ? 0 : 1, bossHp - bossDamage)
      : bossHp;
    const nextPlayerHp = Math.max(0, playerHp - playerDamage);
    const gainedXp = correct ? 110 + (streak * 25) + Math.max(0, timeLeft * 2) : 0;
    const record = { correct, timedOut, topic: question.topic, damage: correct ? bossDamage : playerDamage };

    setLocked(true);
    setBossHp(nextBossHp);
    setPlayerHp(nextPlayerHp);
    setXp((valueXp) => valueXp + gainedXp);
    setStreak(nextStreak);
    setBestStreak((valueStreak) => Math.max(valueStreak, nextStreak));
    setHistory((items) => [...items, record]);
    setFeedback({ correct, timedOut, gainedXp, bossDamage, playerDamage });
    setDamage({ target: correct ? 'boss' : 'player', value: correct ? bossDamage : playerDamage, id: Date.now() });
    setShake(correct ? 'boss-hit' : 'player-hit');
    window.setTimeout(() => setShake(''), 520);

    window.setTimeout(() => {
      if (nextPlayerHp <= 0) {
        setResult({ type: 'defeat', reason: 'OPERATIVE DOWN', xp: xp + gainedXp });
      } else if (nextBossHp <= 0) {
        setResult({ type: 'victory', reason: 'TARGET ELIMINATED', xp: xp + gainedXp });
      } else if (isFinalRound) {
        setResult({ type: 'defeat', reason: 'TARGET ESCAPED', xp: xp + gainedXp });
      } else {
        advance();
      }
    }, 1450);
  }, [advance, bossHp, input, isChoice, locked, playerHp, question, result, round, selected, streak, subject.questions.length, timeLeft, xp]);

  useEffect(() => {
    resolveRef.current = resolveAttack;
  }, [resolveAttack]);

  useEffect(() => {
    if (locked || result) return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          window.setTimeout(() => resolveRef.current?.(true), 0);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [locked, result, round]);

  useEffect(() => {
    const handler = (event) => {
      if (!isChoice || locked || result) return;
      const index = Number(event.key) - 1;
      if (index >= 0 && index < question.options.length) setSelected(question.options[index][0]);
      if (event.key === 'Enter') resolveRef.current?.(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isChoice, locked, question, result]);

  const playerPercent = (playerHp / MAX_PLAYER_HP) * 100;
  const bossPercent = (bossHp / MAX_BOSS_HP) * 100;
  const stagePercent = ((round + (locked ? 1 : 0)) / subject.questions.length) * 100;
  const accuracy = history.length ? Math.round((history.filter((item) => item.correct).length / history.length) * 100) : 100;

  return (
    <div
      className={`arcade-game battle-shell ${shake}`}
      style={{ '--accent': subject.accent, '--accent-rgb': subject.accentRgb }}
    >
      <div className="arcade-grid-noise" />
      <BattleTopbar
        hero={hero}
        subject={subject}
        round={round}
        total={subject.questions.length}
        timeLeft={timeLeft}
        xp={xp}
        streak={streak}
        onExit={onExit}
      />

      <main className="battle-layout">
        <section className="challenge-panel metal-panel">
          <div className="challenge-heading">
            <div>
              <p className="game-eyebrow"><Zap size={14} /> ATTACK SEQUENCE {String(round + 1).padStart(2, '0')}</p>
              <h2>{question.title}</h2>
            </div>
            <span className={`type-badge ${question.type}`}>{question.type.replace('-', ' ')}</span>
          </div>

          <div className="topic-strip">
            <span><BookOpen size={14} /> {question.topic}</span>
            <span>THREAT LV. {Math.min(9, round + 3)}</span>
          </div>

          <div className="prompt-frame">
            <span className="frame-corner top-left" />
            <span className="frame-corner top-right" />
            <span className="frame-corner bottom-left" />
            <span className="frame-corner bottom-right" />
            <small>COMBAT INTEL</small>
            <h3>{question.prompt}</h3>
            {question.code ? <pre>{question.code}</pre> : null}
          </div>

          <div className="answer-zone">
            {isChoice ? (
              <div className="attack-grid">
                {question.options.map(([key, label], index) => (
                  <button
                    key={key}
                    disabled={locked}
                    onClick={() => setSelected(key)}
                    className={`attack-card ${selected === key ? 'active' : ''} ${
                      feedback && key === question.answer ? 'correct' : ''
                    } ${feedback && selected === key && key !== question.answer ? 'wrong' : ''}`}
                  >
                    <span className="attack-key">{key}</span>
                    <span>
                      <small>STRIKE {index + 1}</small>
                      <strong>{label}</strong>
                    </span>
                    <Swords size={18} className="card-blade" />
                  </button>
                ))}
              </div>
            ) : (
              <label className="console-input">
                <span><Terminal size={15} /> RESPONSE CONSOLE</span>
                <input
                  autoFocus
                  value={input}
                  disabled={locked}
                  placeholder={question.placeholder}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') resolveAttack(false);
                  }}
                />
                <i />
              </label>
            )}
          </div>

          <AnimatePresence mode="wait">
            {feedback ? (
              <MotionDiv
                key="feedback"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`combat-feedback ${feedback.correct ? 'success' : 'failure'}`}
              >
                <span className="feedback-icon">
                  {feedback.correct ? <Check size={21} /> : <X size={21} />}
                </span>
                <div>
                  <strong>
                    {feedback.correct
                      ? `CRITICAL HIT · +${feedback.gainedXp} XP`
                      : feedback.timedOut ? 'DEFENSE BREACHED · TIME EXPIRED' : 'ATTACK REJECTED'}
                  </strong>
                  <p>{question.intel}</p>
                  {!feedback.correct ? <small>Correct response: {question.answerLabel || question.answer}</small> : null}
                </div>
              </MotionDiv>
            ) : (
              <MotionButton
                key="attack"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="attack-button"
                disabled={!String(answerValue).trim() || locked}
                onClick={() => resolveAttack(false)}
              >
                <span><Swords size={19} /> EXECUTE ATTACK</span>
                <small>ENTER</small>
              </MotionButton>
            )}
          </AnimatePresence>

          <div className="combat-readout">
            <span><Target size={14} /> ACCURACY {accuracy}%</span>
            <span><Gauge size={14} /> DAMAGE POTENTIAL {26 + Math.min(streak * 3, 12)}</span>
            <span><Shield size={14} /> ARMOR {playerHp > 50 ? 'STABLE' : 'COMPROMISED'}</span>
          </div>
        </section>

        <section className="battle-viewport">
          <div className="arena-image" style={{ backgroundImage: `url("${subject.arena}")` }}>
            <div className="arena-shade" />
            <div className="arena-particles" />

            <div className="player-unit unit-frame">
              <div className="unit-label">
                <span className="unit-portrait" style={heroStyle(hero)} />
                <div><small>VANGUARD</small><strong>{hero.name}</strong></div>
                <b>LV. 07</b>
              </div>
              <HealthBar value={playerPercent} current={playerHp} max={MAX_PLAYER_HP} kind="player" />
            </div>

            <div className="boss-unit unit-frame">
              <div className="unit-label boss-label">
                <div><small>RAID TARGET</small><strong>{subject.boss}</strong></div>
                <b>Ω</b>
              </div>
              <HealthBar value={bossPercent} current={bossHp} max={MAX_BOSS_HP} kind="boss" />
            </div>

            <AnimatePresence>
              {damage ? (
                <MotionDiv
                  key={damage.id}
                  initial={{ opacity: 0, scale: 0.4, y: 16 }}
                  animate={{ opacity: 1, scale: 1.2, y: -24 }}
                  exit={{ opacity: 0, y: -60 }}
                  transition={{ duration: 0.72 }}
                  className={`damage-number ${damage.target}`}
                >
                  <small>{damage.target === 'boss' ? 'CRITICAL' : 'DAMAGE'}</small>
                  -{damage.value}
                </MotionDiv>
              ) : null}
            </AnimatePresence>

            {feedback?.correct ? <div className="energy-slash" /> : null}
            {feedback && !feedback.correct ? <div className="impact-flare" /> : null}

            <div className="arena-location">
              <Wifi size={13} />
              <span>INSTANCE 0{round + 1}</span>
              <i />
              <span>{subject.name.toUpperCase()} DOMAIN</span>
            </div>
          </div>

          <StageTrack subject={subject} round={round} locked={locked} history={history} progress={stagePercent} />
        </section>
      </main>

      <AnimatePresence>
        {result ? (
          <ResultOverlay
            result={result}
            subject={subject}
            hero={hero}
            xp={result.xp}
            history={history}
            bestStreak={bestStreak}
            onExit={onExit}
            onReplay={onReplay}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
};

const BattleTopbar = ({ hero, subject, round, total, timeLeft, xp, streak, onExit }) => (
  <header className="battle-topbar">
    <button className="hud-back" onClick={onExit} aria-label="Return to command deck"><ArrowLeft size={19} /></button>
    <div className="hud-operative">
      <span className="hud-portrait" style={heroStyle(hero)} />
      <div><small>{hero.className}</small><strong>{hero.name}</strong></div>
      <span className="subject-chip">{subject.shortName}</span>
    </div>
    <div className="stage-banner">
      <span />
      <div><small>STAGE {round + 1} / {total}</small><strong>{subject.boss}</strong></div>
      <span />
    </div>
    <div className="hud-metrics">
      <div className={`timer-core ${timeLeft <= 6 ? 'danger' : ''}`}>
        <Clock3 size={16} /><span>00:{String(timeLeft).padStart(2, '0')}</span>
      </div>
      <div className="xp-core">
        <small>COMBAT XP</small><strong>{xp.toLocaleString()}</strong>
        <i><b style={{ width: `${Math.min(100, (xp % 1000) / 10)}%` }} /></i>
      </div>
      <div className={`combo-core ${streak ? 'active' : ''}`}>
        <Flame size={18} /><span><small>COMBO</small><strong>x{streak}</strong></span>
      </div>
    </div>
  </header>
);

const HealthBar = ({ value, current, max, kind }) => {
  const healthClass = value <= 25 ? 'critical' : value <= 55 ? 'warning' : 'stable';
  return (
    <div className={`game-health ${kind} ${healthClass}`}>
      <div className="health-track">
        <MotionI animate={{ width: `${value}%` }} transition={{ type: 'spring', stiffness: 95, damping: 18 }} />
        <span className="health-sheen" />
        <span className="health-ticks" />
      </div>
      <strong>{current}<small> / {max} HP</small></strong>
    </div>
  );
};

const StageTrack = ({ subject, round, locked, history, progress }) => (
  <div className="stage-track metal-panel">
    <div className="track-heading">
      <span><GitBranch size={15} /> RAID ROUTE</span>
      <strong>{Math.round(progress)}% SYNC</strong>
    </div>
    <div className="node-route">
      <div className="route-line"><i style={{ width: `${progress}%` }} /></div>
      {subject.questions.map((item, index) => {
        const record = history[index];
        const current = index === round;
        const complete = index < round || (current && locked);
        return (
          <div key={`${item.topic}-${index}`} className={`stage-node ${current ? 'current' : ''} ${complete ? 'complete' : ''} ${record && !record.correct ? 'failed' : ''}`}>
            <span>{record ? (record.correct ? <Check size={14} /> : <X size={14} />) : index + 1}</span>
            <small>{index === subject.questions.length - 1 ? 'CORE' : item.topic.split(' ')[0]}</small>
          </div>
        );
      })}
    </div>
  </div>
);

const ResultOverlay = ({ result, subject, hero, xp, history, bestStreak, onExit, onReplay }) => {
  const victory = result.type === 'victory';
  const correct = history.filter((item) => item.correct).length;
  const accuracy = history.length ? Math.round((correct / history.length) * 100) : 0;
  return (
    <MotionDiv className="result-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <MotionDiv
        className={`result-card ${victory ? 'victory' : 'defeat'}`}
        initial={{ opacity: 0, scale: 0.88, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 19 }}
      >
        <div className="result-rays" />
        <div className="result-emblem">{victory ? <Trophy size={42} /> : <Shield size={42} />}</div>
        <p>{result.reason}</p>
        <h2>{victory ? 'RAID COMPLETE' : 'MISSION FAILED'}</h2>
        <span className="result-subtitle">
          {victory ? `${subject.boss} has been neutralized.` : `${subject.boss} still controls the domain.`}
        </span>
        <div className="result-operative">
          <span style={heroStyle(hero)} />
          <div><small>OPERATIVE</small><strong>{hero.name}</strong><em>{hero.className}</em></div>
          <b>{victory ? 'S' : 'C'}</b>
        </div>
        <div className="result-stats">
          <ResultStat label="TOTAL XP" value={xp.toLocaleString()} icon={<Zap size={16} />} />
          <ResultStat label="ACCURACY" value={`${accuracy}%`} icon={<Target size={16} />} />
          <ResultStat label="BEST COMBO" value={`x${bestStreak}`} icon={<Flame size={16} />} />
          <ResultStat label="CLEARED" value={`${correct}/${history.length}`} icon={<Check size={16} />} />
        </div>
        <div className="result-actions">
          <button onClick={onExit}><ArrowLeft size={17} /> COMMAND DECK</button>
          <button className="primary" onClick={onReplay}><RotateCcw size={17} /> REDEPLOY</button>
        </div>
      </MotionDiv>
    </MotionDiv>
  );
};

const ResultStat = ({ label, value, icon }) => (
  <div>{icon}<small>{label}</small><strong>{value}</strong></div>
);

const PanelHeading = ({ kicker, title, icon }) => (
  <div className="panel-heading">
    <span>{icon}</span>
    <div><small>{kicker}</small><h3>{title}</h3></div>
    <i />
  </div>
);

export default Arcade;
