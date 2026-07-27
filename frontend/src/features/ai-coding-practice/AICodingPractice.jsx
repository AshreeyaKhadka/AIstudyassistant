import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  Braces,
  CheckCircle2,
  Code2,
  CodeXml,
  Coffee,
  Cpu,
  Flame,
  Keyboard,
  Layers3,
  Play,
  Sparkles,
  Terminal,
  Trophy,
  Zap,
} from 'lucide-react';

const practiceLanguages = [
  {
    name: 'C',
    description: 'Master memory, pointers, arrays, loops, and procedural problem solving from first principles.',
    slug: 'c',
    icon: Terminal,
    accent: 'Systems basics',
    gradient: 'from-[#102326] via-[#18383C] to-[#315255]',
    preview: '#include <stdio.h>',
    level: 'Foundation',
    goal: 'Build low-level confidence',
  },
  {
    name: 'C++',
    description: 'Practice STL, classes, algorithms, and competitive-programming style implementation.',
    slug: 'cpp',
    icon: Braces,
    accent: 'DSA ready',
    gradient: 'from-[#152433] via-[#203F54] to-[#416B7A]',
    preview: 'vector<int> nums;',
    level: 'Intermediate',
    goal: 'Think in algorithms',
  },
  {
    name: 'Java',
    description: 'Build fluency with OOP, collections, input handling, and structured coding patterns.',
    slug: 'java',
    icon: Coffee,
    accent: 'OOP practice',
    gradient: 'from-[#2A1D19] via-[#5A3321] to-[#C96A32]',
    preview: 'public class Main',
    level: 'Structured',
    goal: 'Write cleaner programs',
  },
  {
    name: 'Python',
    description: 'Solve practical scripting and algorithm problems with fast feedback and readable code.',
    slug: 'python',
    icon: CodeXml,
    accent: 'Fast iteration',
    gradient: 'from-[#13261F] via-[#23503D] to-[#6A8F6B]',
    preview: 'def solve():',
    level: 'Beginner friendly',
    goal: 'Move fast and debug faster',
  },
];

const workflowSteps = [
  { title: 'Choose your path', description: 'Start from the language you are learning or revising today.', icon: BookOpen },
  { title: 'Code in the lab', description: 'Write, reset, copy, download, and run code directly in the browser.', icon: Keyboard },
  { title: 'Use real input', description: 'Open stdin when problems require multiple lines or custom test cases.', icon: Terminal },
  { title: 'Debug the result', description: 'See compile errors, runtime output, status, and execution feedback quickly.', icon: CheckCircle2 },
];

const metrics = [
  { label: 'Practice paths', value: '04' },
  { label: 'Free resources', value: '12+' },
  { label: 'Compiler flow', value: 'Live' },
];

const AICodingPractice = () => (
  <div className="space-y-6 pb-6">
    <section className="relative isolate overflow-hidden rounded-[6px] border border-[#102326] bg-[#071719] p-4 shadow-[0_24px_70px_rgba(16,35,38,0.16)] sm:p-6 lg:p-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(201,106,50,0.24),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(105,143,107,0.22),transparent_32%),linear-gradient(135deg,#071719_0%,#102326_54%,#18383C_100%)]" />
      <div className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full border border-white/10 bg-white/5 blur-[1px]" />
      <div className="absolute bottom-0 left-0 -z-10 h-32 w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:34px_34px] opacity-30" />

      <div className="grid items-center gap-8 xl:grid-cols-[1fr_440px]">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D6E0DE] shadow-sm backdrop-blur">
            <Sparkles size={13} className="text-[#F1A76F]" aria-hidden="true" /> AI coding practice lab
          </div>

          <h1 className="max-w-3xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
            Practice code like a real developer, not like a checklist.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#D6E0DE] sm:text-base">
            Pick a language, learn from curated free resources, write code in a focused editor, run it, debug it, and repeat. Short sessions. Real output. Better habits.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/coding-practice/python"
              className="group inline-flex items-center gap-2 rounded-[5px] bg-[#F7F5F2] px-5 py-3 text-xs font-black uppercase tracking-wider text-[#102326] shadow-[0_16px_40px_rgba(0,0,0,0.22)] transition-all hover:-translate-y-0.5 hover:bg-white"
            >
              Start coding now
              <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </Link>
            <Link
              to="/coding-practice/cpp"
              className="inline-flex items-center gap-2 rounded-[5px] border border-white/15 bg-white/5 px-5 py-3 text-xs font-black uppercase tracking-wider text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10"
            >
              Open DSA path <Code2 size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-8 grid max-w-xl grid-cols-3 gap-2">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-[5px] border border-white/10 bg-white/[0.07] p-3 backdrop-blur">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-[#B8C4C2]">{metric.label}</p>
                <p className="mt-1 text-xl font-black text-white">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative hidden xl:block">
          <div className="absolute -left-5 -top-5 h-24 w-24 rounded-full bg-[#C96A32]/25 blur-2xl" />
          <div className="overflow-hidden rounded-[8px] border border-white/12 bg-[#081214] shadow-[0_28px_70px_rgba(0,0,0,0.36)]">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF6B6B]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#F6C85F]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#6A8F6B]" />
              </div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#B8C4C2]">practice.py</span>
            </div>
            <div className="p-5 font-mono text-[12px] leading-6 text-[#D6E0DE]">
              <p><span className="text-[#7BC9B2]">def</span> <span className="text-[#F1A76F]">solve</span>():</p>
              <p className="pl-5 text-[#B8C4C2]">numbers = list(map(int, input().split()))</p>
              <p className="pl-5"><span className="text-[#7BC9B2]">return</span> sum(numbers)</p>
              <p className="mt-4"><span className="text-[#7BC9B2]">print</span>(solve())</p>
            </div>
            <div className="border-t border-white/10 bg-[#0D2023] p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#B8C4C2]">Output</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#6A8F6B]/15 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-[#BFE5C0]">
                  <Zap size={10} aria-hidden="true" /> 42ms
                </span>
              </div>
              <div className="rounded-[5px] border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-white">Program completed successfully.</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section aria-labelledby="language-practice-heading" className="rounded-[6px] border border-[#D7D3CF] bg-[#FAF9F7] p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex flex-col gap-3 border-b border-[#D7D3CF] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#C96A32]">Choose your arena</p>
          <h2 id="language-practice-heading" className="mt-1 text-xl font-black tracking-tight text-[#111111]">
            Select a language and start building momentum
          </h2>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#D7D3CF] bg-white px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#666666]">
          <Flame size={13} className="text-[#C96A32]" aria-hidden="true" /> 15 minutes is enough
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {practiceLanguages.map(({ name, description, slug, icon: Icon, accent, gradient, preview, level, goal }, index) => (
          <article
            key={name}
            className="group relative flex min-h-[310px] flex-col overflow-hidden rounded-[7px] border border-[#D7D3CF] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#102326] hover:shadow-[0_20px_50px_rgba(16,35,38,0.12)]"
          >
            <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} p-5 text-white`}>
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full border border-white/15 bg-white/10" />
              <div className="absolute bottom-0 right-0 h-16 w-28 bg-white/5 blur-2xl" />
              <div className="relative flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-[6px] border border-white/15 bg-white/12 backdrop-blur">
                  {React.createElement(Icon, { size: 22, strokeWidth: 2, "aria-hidden": true })}
                </div>
                <span className="font-mono text-[10px] font-bold tracking-wider text-white/60">0{index + 1}</span>
              </div>
              <p className="relative mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">{accent}</p>
              <h3 className="relative mt-1 text-2xl font-black tracking-tight text-white">{name}</h3>
              <div className="relative mt-4 rounded-[5px] border border-white/10 bg-black/18 px-3 py-2 font-mono text-[11px] text-white/80">
                {preview}
              </div>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#ECEAE7] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[#455052]">{level}</span>
                <span className="rounded-full bg-[#F4E7DD] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[#9A4E24]">Compiler ready</span>
              </div>
              <p className="text-sm leading-relaxed text-[#555555]">{description}</p>
              <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#102326]">
                <Trophy size={14} className="text-[#C96A32]" aria-hidden="true" /> {goal}
              </p>

              <Link
                to={`/coding-practice/${slug}`}
                className="mt-auto flex items-center justify-between rounded-[5px] border border-[#D7D3CF] bg-[#FAF9F7] px-3 py-3 font-mono text-xs font-black uppercase tracking-wider text-[#102326] transition-all group-hover:border-[#102326] group-hover:bg-[#102326] group-hover:text-white"
              >
                Start practicing
                <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="rounded-[6px] border border-[#D7D3CF] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#C96A32]">Practice workflow</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-[#111111]">Everything points toward one useful loop</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#666666]">
              The page is designed to remove friction: open a path, learn only what you need, execute code, and use the output as feedback.
            </p>
          </div>
          <div className="hidden h-12 w-12 items-center justify-center rounded-[6px] bg-[#102326] text-white sm:flex">
            <Layers3 size={22} aria-hidden="true" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {workflowSteps.map(({ title, description, icon: Icon }, index) => (
            <div key={title} className="relative rounded-[6px] border border-[#D7D3CF] bg-[#FAF9F7] p-4 transition-colors hover:border-[#102326] hover:bg-white">
              <span className="absolute right-3 top-3 font-mono text-[10px] font-bold text-[#B8B2AA]">0{index + 1}</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-[5px] bg-[#102326] text-white">
                {React.createElement(Icon, { size: 16, "aria-hidden": true })}
              </div>
              <h3 className="mt-4 text-sm font-bold text-[#111111]">{title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#666666]">{description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[6px] border border-[#102326] bg-[#102326] p-5 text-white shadow-sm sm:p-6">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#C96A32]/25 blur-2xl" />
        <p className="relative font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#B8C4C2]">Today’s target</p>
        <h2 className="relative mt-2 text-2xl font-black tracking-tight text-white">Write one small program and run it twice.</h2>
        <p className="relative mt-3 text-sm leading-relaxed text-[#D6E0DE]">
          First run confirms the idea. Second run uses custom input or a cleaner implementation. Keep the loop short enough that you come back tomorrow.
        </p>
        <Link
          to="/coding-practice/python"
          className="relative mt-5 inline-flex items-center gap-2 rounded-[5px] bg-white px-4 py-2.5 font-mono text-xs font-black uppercase tracking-wider text-[#102326] transition-all hover:-translate-y-0.5"
        >
          Do today’s run <Play size={14} fill="currentColor" aria-hidden="true" />
        </Link>
      </div>
    </section>
  </div>
);

export default AICodingPractice;
