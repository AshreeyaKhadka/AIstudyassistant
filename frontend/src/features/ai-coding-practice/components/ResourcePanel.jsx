import React from 'react';
import { BookOpen, ExternalLink, FileText, PlayCircle } from 'lucide-react';
import { languageResources } from '../data/resources';

const typeDetails = {
  video: { label: 'Video', Icon: PlayCircle },
  article: { label: 'Article', Icon: FileText },
  docs: { label: 'Docs', Icon: BookOpen },
};

const ResourcePanel = ({ language }) => {
  const resources = languageResources[language.id] || [];

  return (
    <aside className="w-full shrink-0 border-b border-[#D7D3CF] bg-[#FAF9F7] lg:w-[320px] lg:border-b-0 lg:border-r">
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-3 border-b border-[#D7D3CF] pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-[#ECEAE7] text-[#102326]">
            <language.Icon size={19} aria-hidden="true" />
          </div>
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#666666]">Learning resources</p>
            <h1 className="text-base font-bold text-[#111111]">Learn {language.name} for free</h1>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {resources.map((resource) => {
            const { label, Icon } = typeDetails[resource.type];
            return (
              <article key={resource.title} className="rounded-[4px] border border-[#D7D3CF] bg-white p-3 shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold leading-snug text-[#111111]">{resource.title}</h2>
                    <p className="mt-1 text-xs text-[#666666]">{resource.source}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-[3px] bg-[#ECEAE7] px-1.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wide text-[#455052]">
                    <Icon size={11} aria-hidden="true" />
                    {label}
                  </span>
                </div>
                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#102326] underline underline-offset-2 hover:text-[#C96A32]">
                  Open resource <ExternalLink size={12} aria-hidden="true" />
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default ResourcePanel;
