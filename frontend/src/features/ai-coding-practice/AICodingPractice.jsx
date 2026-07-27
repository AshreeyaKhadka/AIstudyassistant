import React from 'react';
import { ArrowUpRight, Braces, CodeXml, Coffee, Terminal } from 'lucide-react';

const practiceLanguages = [
  {
    name: 'C',
    description: 'Practice C fundamentals and problem solving.',
    href: 'https://www.hackerrank.com/domains/c',
    icon: Terminal,
  },
  {
    name: 'C++',
    description: 'Sharpen modern C++ skills with coding challenges.',
    href: 'https://www.hackerrank.com/domains/cpp',
    icon: Braces,
  },
  {
    name: 'Java',
    description: 'Build confidence with Java programming exercises.',
    href: 'https://www.hackerrank.com/domains/java',
    icon: Coffee,
  },
  {
    name: 'Python',
    description: 'Solve practical Python problems at your own pace.',
    href: 'https://www.hackerrank.com/domains/python',
    icon: CodeXml,
  },
];

const AICodingPractice = () => (
  <div className="flex flex-col gap-6 pb-12">
    <section className="bg-white p-6 border border-[#D7D3CF] rounded-[4px] shadow-2xs">
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#666666] font-semibold mb-1 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#102326]" />
        EXTERNAL PRACTICE HUB
      </div>
      <h1 className="text-2xl font-bold text-[#111111] tracking-tight">AI Coding Practice</h1>
      <p className="text-xs text-[#666666] mt-0.5 max-w-xl">
        Choose a language and continue your coding practice on HackerRank.
      </p>
    </section>

    <section aria-labelledby="language-practice-heading">
      <div className="flex items-center justify-between pb-2 mb-4 border-b border-[#D7D3CF]">
        <h2 id="language-practice-heading" className="text-xs font-mono uppercase tracking-wider text-[#666666] font-semibold">
          Select a language
        </h2>
        <span className="text-[10px] font-mono text-[#666666]">4 practice paths</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {practiceLanguages.map(({ name, description, href, icon: Icon }) => (
          <article
            key={name}
            className="bg-white rounded-[4px] p-5 border border-[#D7D3CF] flex flex-col justify-between min-h-48 shadow-2xs hover:bg-[#FAF9F7] transition-colors"
          >
            <div>
              <div className="w-9 h-9 bg-[#ECEAE7] text-[#102326] rounded-[4px] flex items-center justify-center mb-4">
                <Icon size={19} strokeWidth={2} aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-[#111111]">{name}</h3>
              <p className="text-xs text-[#666666] mt-1 leading-relaxed">{description}</p>
            </div>

            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 w-full flex items-center justify-center gap-2 py-2 bg-[#102326] text-white hover:bg-[#0b191c] rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider transition-colors"
            >
              Start Practicing
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </article>
        ))}
      </div>
    </section>
  </div>
);

export default AICodingPractice;
