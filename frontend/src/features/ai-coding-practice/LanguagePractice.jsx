import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Braces, ChevronLeft, ChevronRight, CodeXml, Coffee, Terminal } from 'lucide-react';
import ResourcePanel from './components/ResourcePanel';
import CodeCompiler from './components/CodeCompiler';
import { compilerLanguages } from './data/compilerLanguages';

const languageIcons = { c: Terminal, cpp: Braces, java: Coffee, python: CodeXml };

const LanguagePractice = () => {
  const { language: requestedLanguage } = useParams();
  const navigate = useNavigate();
  const languageId = requestedLanguage in compilerLanguages ? requestedLanguage : 'python';
  const [resourcesVisible, setResourcesVisible] = useState(true);
  const language = { ...compilerLanguages[languageId], Icon: languageIcons[languageId] };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[640px] flex-col overflow-hidden rounded-[4px] border border-[#D7D3CF] bg-white shadow-2xs lg:flex-row">
      {resourcesVisible && <ResourcePanel language={language} />}
      <div className="relative flex min-w-0 flex-1">
        <button type="button" onClick={() => setResourcesVisible((visible) => !visible)} className="absolute left-2 top-2 z-10 hidden rounded-[4px] border border-[#D7D3CF] bg-white p-1.5 text-[#455052] shadow-sm hover:bg-[#ECEAE7] lg:block" aria-label={resourcesVisible ? 'Hide learning resources' : 'Show learning resources'}>
          {resourcesVisible ? <ChevronLeft size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
        </button>
        <CodeCompiler languageId={languageId} onLanguageChange={(nextLanguage) => navigate(`/coding-practice/${nextLanguage}`)} />
      </div>
    </div>
  );
};

export default LanguagePractice;
