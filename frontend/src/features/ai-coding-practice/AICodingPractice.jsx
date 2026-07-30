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
  Flame,
  Keyboard,
  Layers3,
  Play,
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
    panel: 'bg-[#F7F5F2]',
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
    panel: 'bg-[#F7F5F2]',
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
    panel: 'bg-[#F7F5F2]',
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
    panel: 'bg-[#F7F5F2]',
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
    <section className="overflow-hidden rounded-[6px] border border-[#D7D3CF] bg-white p-4 shadow-sm sm:p-6 lg:p-8">
      <div className="grid items-center gap-8 xl:grid-cols-[1fr_440px]">
        <div className="max-w-3xl">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">Coding practice</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-[#111111] sm:text-4xl lg:text-5xl">
            Practice code with a focused editor and real output.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#555555] sm:text-base">
            Pick a language, learn from curated free resources, write code in a focused editor, run it, debug it, and repeat. Short sessions. Real output. Better habits.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/coding-practice/python"
              className="group inline-flex items-center gap-2 rounded-[5px] bg-[#102326] px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-[#0b191c]"
            >
              Start coding now
              <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </Link>
            <Link
              to="/coding-practice/cpp"
              className="inline-flex items-center gap-2 rounded-[5px] border border-[#D7D3CF] bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-[#102326] transition-all hover:bg-[#FAF9F7]"
            >
              Open DSA path <Code2 size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-8 grid max-w-xl grid-cols-3 gap-2">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-[5px] border border-[#D7D3CF] bg-[#FAF9F7] p-3">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-[#666666]">{metric.label}</p>
                <p className="mt-1 text-xl font-black text-[#111111]">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative hidden xl:block">
          <div className="overflow-hidden rounded-[8px] border border-[#D7D3CF] bg-[#111111] shadow-sm">
            <div className="flex items-center justify-between border-b border-white/10 bg-[#1E1E1E] px-4 py-3">
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
        {practiceLanguages.map(({ name, description, slug, icon: Icon, accent, panel, preview, level, goal }, index) => (
          <article
            key={name}
            className="group relative flex min-h-[310px] flex-col overflow-hidden rounded-[7px] border border-[#D7D3CF] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#102326] hover:shadow-[0_20px_50px_rgba(16,35,38,0.12)]"
          >
            <div className={`relative overflow-hidden ${panel} border-b border-[#D7D3CF] p-5 text-[#111111]`}>
              <div className="relative flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-[6px] border border-[#D7D3CF] bg-white">
                  {React.createElement(Icon, { size: 22, strokeWidth: 2, "aria-hidden": true })}
                </div>
                <span className="font-mono text-[10px] font-bold tracking-wider text-[#999999]">0{index + 1}</span>
              </div>
              <p className="relative mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">{accent}</p>
              <h3 className="relative mt-1 text-2xl font-black tracking-tight text-[#111111]">{name}</h3>
              <div className="relative mt-4 rounded-[5px] border border-[#D7D3CF] bg-white px-3 py-2 font-mono text-[11px] text-[#444444]">
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

      <div className="rounded-[6px] border border-[#D7D3CF] bg-white p-5 text-[#111111] shadow-sm sm:p-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">Today’s target</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-[#111111]">Write one small program and run it twice.</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#666666]">
          First run confirms the idea. Second run uses custom input or a cleaner implementation. Keep the loop short enough that you come back tomorrow.
        </p>
        <Link
          to="/coding-practice/python"
          className="mt-5 inline-flex items-center gap-2 rounded-[5px] bg-[#102326] px-4 py-2.5 font-mono text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-[#0b191c]"
        >
          Do today’s run <Play size={14} fill="currentColor" aria-hidden="true" />
        </Link>
      </div>
    </section>
  </div>
);

export default AICodingPractice;
