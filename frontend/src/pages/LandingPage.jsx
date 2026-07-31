import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Show } from '@clerk/react';
import { Library } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    sessionStorage.removeItem('onboarded_session');
    navigate('/signin');
  };

  return (
    <div className="min-h-screen bg-[#F7F5F2] font-sans text-[#111111] relative selection:bg-[#102326] selection:text-white"
      style={{
        backgroundImage: 'radial-gradient(#D7D3CF 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        backgroundPosition: '-12px -12px'
      }}
    >
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#D7D3CF] bg-[#F7F5F2]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Library size={20} className="text-[#102326]" />
          <span className="font-bold tracking-tight text-lg">AiStudy</span>
        </div>
        <Show when="signed-out">
          <button 
            onClick={handleSignIn}
            className="px-6 py-2 bg-[#102326] text-white text-xs font-mono font-semibold uppercase tracking-wider rounded-[4px] hover:bg-[#0b191c] transition-colors"
          >
            Sign in
          </button>
        </Show>
        <Show when="signed-in">
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-[#102326] text-white text-xs font-mono font-semibold uppercase tracking-wider rounded-[4px] hover:bg-[#0b191c] transition-colors"
          >
            Dashboard
          </button>
        </Show>
      </nav>

      <main className="max-w-[1400px] mx-auto px-6 pt-6 pb-24">
        {/* Information Banner */}
        <div className="flex flex-col md:flex-row border border-[#D7D3CF] bg-[#F7F5F2] rounded-[4px] mb-24 overflow-hidden text-xs">
          <div className="flex-1 p-3 border-b md:border-b-0 md:border-r border-[#D7D3CF]">
            <span className="text-[10px] font-mono text-[#666666] uppercase tracking-wider block mb-1">Built For</span>
            <span className="font-semibold">B.E. Computer Engineering <span className="text-[#666666] font-normal">&middot; Pokhara University</span></span>
          </div>
          <div className="w-full md:w-32 p-3 border-b md:border-b-0 md:border-r border-[#D7D3CF]">
            <span className="text-[10px] font-mono text-[#666666] uppercase tracking-wider block mb-1">Cost</span>
            <span className="font-semibold">Free</span>
          </div>
          <div className="w-full md:w-48 p-3 border-b md:border-b-0 md:border-r border-[#D7D3CF]">
            <span className="text-[10px] font-mono text-[#666666] uppercase tracking-wider block mb-1">Coverage</span>
            <span className="font-semibold">180+ syllabus units</span>
          </div>
          <div className="w-full md:w-40 p-3">
            <span className="text-[10px] font-mono text-[#666666] uppercase tracking-wider block mb-1">Status</span>
            <span className="font-semibold text-[#102326]">Open access</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-8 items-center mb-24">
          <div className="flex-1 max-w-2xl">
            <p className="text-[10px] font-mono text-[#666666] uppercase tracking-wider mb-6 font-semibold">
              A Study Companion, Not A Chatbot
            </p>
            <h1 className="text-5xl md:text-6xl font-bold text-[#111111] tracking-tight leading-[1.1] mb-6">
              Hello, future<br />engineer.
            </h1>
            <p className="text-[#666666] text-lg leading-relaxed mb-10 max-w-xl">
              You're going to build things that matter. Right now, though, there's a syllabus, a stack of PDFs, and an exam coming up. Upload what you have and we'll connect the dots between your notes, your syllabus, and what you actually need to revise.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button 
                onClick={handleSignIn}
                className="px-8 py-3.5 bg-[#102326] text-white text-xs font-mono font-semibold uppercase tracking-wider rounded-[4px] hover:bg-[#0b191c] transition-colors"
              >
                Sign in to begin
              </button>
              <button className="px-8 py-3.5 bg-transparent border border-[#D7D3CF] text-[#111111] text-xs font-mono font-semibold uppercase tracking-wider rounded-[4px] hover:bg-[#ECEAE7] transition-colors">
                See how it works
              </button>
            </div>
          </div>

          <div className="flex-1 w-full flex justify-center lg:justify-end">
            <div className="w-full max-w-md aspect-square relative">
              <svg width="100%" height="100%" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="200" y1="200" x2="200" y2="80" stroke="#D7D3CF" strokeWidth="1"/>
                <line x1="200" y1="200" x2="320" y2="120" stroke="#D7D3CF" strokeWidth="1"/>
                <line x1="200" y1="200" x2="320" y2="280" stroke="#D7D3CF" strokeWidth="1"/>
                <line x1="200" y1="200" x2="200" y2="320" stroke="#D7D3CF" strokeWidth="1"/>
                <line x1="200" y1="200" x2="80" y2="280" stroke="#D7D3CF" strokeWidth="1"/>
                <line x1="200" y1="200" x2="80" y2="120" stroke="#D7D3CF" strokeWidth="1"/>

                <circle cx="200" cy="80" r="4" fill="#666666"/>
                <circle cx="320" cy="120" r="4" fill="#666666"/>
                <circle cx="320" cy="280" r="4" fill="#666666"/>
                <circle cx="200" cy="320" r="4" fill="#666666"/>
                <circle cx="80" cy="280" r="4" fill="#666666"/>
                <circle cx="80" cy="120" r="4" fill="#666666"/>
                <circle cx="200" cy="200" r="6" fill="#102326"/>

                <text x="200" y="65" fill="#666666" fontSize="10" fontFamily="monospace" textAnchor="middle">Data Structures</text>
                <text x="320" y="105" fill="#666666" fontSize="10" fontFamily="monospace" textAnchor="middle">Digital Logic</text>
                <text x="340" y="283" fill="#666666" fontSize="10" fontFamily="monospace" textAnchor="start">Operating Systems</text>
                <text x="200" y="340" fill="#666666" fontSize="10" fontFamily="monospace" textAnchor="middle">Networks</text>
                <text x="65" y="283" fill="#666666" fontSize="10" fontFamily="monospace" textAnchor="end">AI</text>
                <text x="65" y="123" fill="#666666" fontSize="10" fontFamily="monospace" textAnchor="end">Calculus</text>
                
                <text x="200" y="185" fill="#102326" fontSize="10" fontFamily="monospace" textAnchor="middle" fontWeight="bold">YOU</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Statistics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 border border-[#D7D3CF] bg-[#F7F5F2] rounded-[4px] mb-24">
          <div className="p-8 text-center border-b md:border-b-0 md:border-r border-[#D7D3CF]">
            <div className="text-2xl font-bold text-[#102326] mb-1">180+</div>
            <div className="text-[10px] font-mono text-[#666666] uppercase tracking-wider">Units Mapped</div>
          </div>
          <div className="p-8 text-center border-b md:border-b-0 md:border-r border-[#D7D3CF]">
            <div className="text-2xl font-bold text-[#102326] mb-1">Rs 0</div>
            <div className="text-[10px] font-mono text-[#666666] uppercase tracking-wider">To You</div>
          </div>
          <div className="p-8 text-center border-r border-[#D7D3CF]">
            <div className="text-2xl font-bold text-[#102326] mb-1">24/7</div>
            <div className="text-[10px] font-mono text-[#666666] uppercase tracking-wider">Ask Anything</div>
          </div>
          <div className="p-8 text-center">
            <div className="text-2xl font-bold text-[#102326] mb-1">1 tap</div>
            <div className="text-[10px] font-mono text-[#666666] uppercase tracking-wider">Doc to Flashcards</div>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] font-mono text-[#666666] uppercase tracking-wider mb-4 font-semibold">
            How It Starts
          </p>
          <h2 className="text-3xl font-bold text-[#111111] tracking-tight leading-snug mb-16 max-w-xl">
            Three steps between an uploaded PDF and knowing exactly what to revise.
          </h2>

          <div className="space-y-12">
            <div className="flex gap-8 items-start">
              <div className="text-2xl font-bold text-[#102326] font-mono pt-1">01</div>
              <div>
                <h3 className="text-lg font-bold text-[#111111] mb-2">Add your notes, slides, or a past paper</h3>
                <p className="text-[#666666] leading-relaxed">
                  Upload your documents into the Study Vault. The system reads the content and prepares it for processing.
                </p>
              </div>
            </div>

            <div className="flex gap-8 items-start">
              <div className="text-2xl font-bold text-[#102326] font-mono pt-1">02</div>
              <div>
                <h3 className="text-lg font-bold text-[#111111] mb-2">Syllabus synchronization</h3>
                <p className="text-[#666666] leading-relaxed">
                  Your document is cross-referenced with the official syllabus structure to categorize topics accurately and identify gaps.
                </p>
              </div>
            </div>

            <div className="flex gap-8 items-start">
              <div className="text-2xl font-bold text-[#102326] font-mono pt-1">03</div>
              <div>
                <h3 className="text-lg font-bold text-[#111111] mb-2">Generate revision material</h3>
                <p className="text-[#666666] leading-relaxed">
                  Extract flashcards, summary notes, and multiple choice questions scoped exactly to what you need to study.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
