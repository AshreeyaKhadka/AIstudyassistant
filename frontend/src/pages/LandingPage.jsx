import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles, BrainCircuit, Library, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';

const GoogleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const LandingPage = () => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate('/signin');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Decorative background elements */}
      <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '80vw', height: '80vw', background: 'radial-gradient(circle, rgba(235, 240, 255, 1) 0%, rgba(255,255,255,0) 70%)', zIndex: -1, borderRadius: '50%' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '-20%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(255, 217, 228, 0.4) 0%, rgba(255,255,255,0) 70%)', zIndex: -1, borderRadius: '50%' }} />

      {/* Navigation */}
      <nav style={{ padding: '2rem 4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
            <Library color="white" size={24} />
          </div>
          <span className="headline-sm" style={{ letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>
            CE Study Assistant
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="#" className="title-sm" style={{ color: 'var(--outline-variant)', textDecoration: 'none', transition: 'color 0.2s' }}>Features</a>
          <a href="#" className="title-sm" style={{ color: 'var(--outline-variant)', textDecoration: 'none', transition: 'color 0.2s' }}>Syllabus</a>
          <Button variant="secondary" onClick={handleSignIn}>
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero Section - Asymmetrical Design */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 4rem', zIndex: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '4rem', alignItems: 'center', width: '100%', maxWidth: '1440px', margin: '0 auto' }}>
          
          {/* Left Content */}
          <motion.div variants={containerVariants} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <motion.div variants={itemVariants}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-container-lowest)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', boxShadow: 'var(--shadow-ambient)', marginBottom: '1rem' }}>
                <Sparkles size={16} color="var(--primary)" />
                <span className="title-sm" style={{ color: 'var(--primary)' }}>Pokhara University Custom Edition</span>
              </div>
              <h1 className="display-lg" style={{ color: 'var(--on-surface)', letterSpacing: '-0.03em', marginTop: '0.5rem' }}>
                The Intellectual Architect <br/>
                <span style={{ color: 'var(--outline-variant)' }}>For Computer Engineers.</span>
              </h1>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <p className="body-lg" style={{ color: 'var(--outline-variant)', maxWidth: '90%', lineHeight: 1.6 }}>
                Move beyond the utility of a standard notebook into a deeply curated digital workspace. 
                Syllabus-aware AI, elegant document parsing, and high-level synthesis tailored exclusively for the PU curriculum.
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants} style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem' }}>
              <Button style={{ padding: '1rem 2.5rem', fontSize: '1.125rem', display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'var(--surface-container-lowest)', color: 'var(--on-surface)', border: '1px solid var(--outline-variant)' }} onClick={handleSignIn}>
                Sign in to your account
                <ArrowRight size={20} color="var(--primary)" style={{ marginLeft: '0.5rem' }} />
              </Button>
            </motion.div>
          </motion.div>

          {/* Right Content - Visual 'Glass' Display */}
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            style={{ position: 'relative', height: '600px' }}
          >
            {/* Main Glass Card */}
            <div className="glassmorphism" style={{ 
              position: 'absolute', 
              top: '5%', 
              right: '5%', 
              width: '90%', 
              height: '90%', 
              borderRadius: 'var(--radius-xl)', 
              boxShadow: 'var(--shadow-ambient)',
              border: '1px solid var(--ghost-border)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              {/* Fake UI Element inside glass card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="title-sm" style={{ color: 'var(--primary-container)' }}>AI Assistant Session</div>
                <BrainCircuit size={20} color="var(--outline-variant)" />
              </div>
              <div style={{ background: 'var(--surface-container-low)', padding: '1.5rem', borderRadius: 'var(--radius-default)' }}>
                 <p className="body-sm" style={{ color: 'var(--on-surface)', lineHeight: 1.6 }}>
                   "Can you summarize the principles of Operating Systems from Unit 4 of the syllabus?"
                 </p>
              </div>
              <div style={{ background: 'var(--surface-container-lowest)', padding: '1.5rem', borderRadius: 'var(--radius-default)', borderLeft: '4px solid var(--tertiary)', boxShadow: 'var(--shadow-ambient)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Sparkles size={16} color="var(--tertiary)" />
                    <span className="title-sm" style={{ color: 'var(--tertiary)' }}>Synthesizing...</span>
                 </div>
                 <p className="body-sm" style={{ color: 'var(--on-surface)', lineHeight: 1.6 }}>
                   According to the designated PU syllabus, Unit 4 focuses on Memory Management. Key concepts include Paging, Segmentation, and Virtual Memory...
                 </p>
              </div>
            </div>

            {/* Overlapping small glass decoration */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="glassmorphism" 
              style={{ position: 'absolute', bottom: '15%', left: '-10%', padding: '1.5rem', borderRadius: 'var(--radius-default)', boxShadow: '0 24px 48px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid var(--ghost-border)' }}
            >
              <div style={{ background: 'var(--secondary-container)', padding: '0.75rem', borderRadius: '50%' }}>
                <BookOpen size={24} color="var(--on-secondary-container)" />
              </div>
              <div>
                <h4 className="title-sm">Syllabus Synced</h4>
                <p className="body-sm" style={{ color: 'var(--outline-variant)', marginTop: '0.25rem' }}>All 8 Semesters Available</p>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </main>
    </div>
  );
};

export default LandingPage;
