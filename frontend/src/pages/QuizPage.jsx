import React, { useState } from 'react';
import { RefreshCw, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ModernInput } from '../components/ui/ModernInput';
import { InsightCard } from '../components/ui/InsightCard';

const QuizPage = () => {
  const [topic, setTopic] = useState('');
  const [quizState, setQuizState] = useState('idle'); // idle, generating, active
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const mockQuestions = [
    { q: "What is Memory Management?", a: "The process of controlling and coordinating computer memory." },
    { q: "Define Virtual Memory.", a: "A memory management capability that provides an idealized abstraction of the storage resources." }
  ];

  const handleGenerate = () => {
    setQuizState('generating');
    setTimeout(() => setQuizState('active'), 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflowY: 'auto' }}>
      <header>
        <h2 className="headline-md">AI Quiz & Flashcards</h2>
        <p className="body-lg" style={{ color: 'var(--outline-variant)' }}>Generate dynamic study materials based on your syllabus.</p>
      </header>

      {quizState === 'idle' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--surface-container-lowest)', padding: '2rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-ambient)' }}>
           <h3 className="headline-sm">Generate New Quiz</h3>
           <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
             <div style={{ flex: 1 }}>
               <ModernInput placeholder="Enter topic or syllabus unit (e.g., Unit 4 Operating Systems)" value={topic} onChange={(e) => setTopic(e.target.value)} />
             </div>
             <Button onClick={handleGenerate}>Generate</Button>
           </div>
           
           <InsightCard title="Tip">
             For best results, mention the specific semester and subject name. Our AI cross-references the official PU syllabus.
           </InsightCard>
        </section>
      )}

      {quizState === 'generating' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <RefreshCw size={24} color="var(--primary)" />
            <span className="title-sm" style={{ color: 'var(--primary)' }}>Synthesizing Quiz...</span>
          </div>
        </div>
      )}

      {quizState === 'active' && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem', background: 'var(--surface-container-lowest)', padding: '3rem 2rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-ambient)', alignItems: 'center', textAlign: 'center' }}>
           <div className="title-sm" style={{ color: 'var(--outline-variant)' }}>Flashcard {currentQuestion + 1} of {mockQuestions.length}</div>
           <h3 className="headline-md" style={{ margin: '2rem 0' }}>{mockQuestions[currentQuestion].q}</h3>
           
           <div style={{ marginTop: 'auto', display: 'flex', gap: '1rem' }}>
             <Button variant="secondary" onClick={() => alert(mockQuestions[currentQuestion].a)}>Reveal Answer</Button>
             <Button onClick={() => setCurrentQuestion((prev) => (prev + 1) % mockQuestions.length)}>Next Card <ChevronRight size={16} /></Button>
           </div>
        </section>
      )}
    </div>
  );
};

export default QuizPage;
