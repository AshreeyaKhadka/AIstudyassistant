import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { ModernInput } from '../components/ui/ModernInput';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const OnboardingPage = () => {
  const [formData, setFormData] = useState({ name: '', college: '', semester: '' });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5000/auth/me', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Not logged in');
        return res.json();
      })
      .then(user => {
        setFormData({ name: user.name || '', college: user.college || '', semester: user.semester || '' });
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        navigate('/'); 
      });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        navigate('/dashboard');
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Failed to complete onboarding');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', padding: '2rem' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '440px', background: 'var(--surface-container-lowest)', padding: '3rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-ambient)', border: '1px solid var(--outline-variant)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
            <Sparkles color="white" size={24} />
          </div>
          <span className="headline-sm" style={{ letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>
            Welcome to the Workspace
          </span>
        </div>
        
        <p className="body-sm" style={{ color: 'var(--outline-variant)', marginBottom: '2rem', lineHeight: '1.5' }}>
          Let's tailor your experience. We need just a few details to synchronize your specific curriculum context.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
             <label className="title-sm" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--on-surface)' }}>Full Name</label>
             <ModernInput 
               required 
               value={formData.name} 
               onChange={e => setFormData({...formData, name: e.target.value})} 
               placeholder="Jane Doe" 
             />
          </div>
          <div>
             <label className="title-sm" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--on-surface)' }}>College Name</label>
             <ModernInput 
               required 
               value={formData.college} 
               onChange={e => setFormData({...formData, college: e.target.value})} 
               placeholder="Example: Pokhara University" 
             />
          </div>
          <div>
             <label className="title-sm" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--on-surface)' }}>Current Semester</label>
             <ModernInput 
               required 
               type="number" 
               min="1" 
               max="8" 
               value={formData.semester} 
               onChange={e => setFormData({...formData, semester: e.target.value})} 
               placeholder="e.g. 5" 
             />
          </div>
          <Button style={{ padding: '1rem', marginTop: '1rem', width: '100%' }} type="submit">
            Complete Setup
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;
