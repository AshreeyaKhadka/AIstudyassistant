import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Library, LogOut, MessageSquare, LayoutDashboard, BrainCircuit, Search, FileUp, Shield } from 'lucide-react';
import { ModernInput } from '../components/ui/ModernInput';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/auth/me', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Not logged in');
        return res.json();
      })
      .then(data => {
        if (!data.college || !data.semester) {
          navigate('/onboard');
        } else {
          setUser(data);
        }
      })
      .catch((err) => {
        console.error(err);
        navigate('/');
      });
  }, [navigate]);

  const handleNav = (path) => {
    navigate(path);
  };

  if (!user) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--surface-container-low)' }}>
      {/* Sidebar - Transitioning out using tone instead of box borders */}
      <aside style={{ width: '280px', background: 'var(--surface)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div 
          onClick={(e) => {
            if (e.detail === 3 && user?.role === 'admin') {
              handleNav('/system-core-admin');
            }
          }}
          title={user?.role === 'admin' ? "Secret: Triple click for Admin" : ""}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: user?.role === 'admin' ? 'pointer' : 'default' }}
        >
          <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
            <Library color="white" size={24} />
          </div>
          <span className="headline-sm" style={{ fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>
            Workspace
          </span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          <NavItem icon={<LayoutDashboard size={20} />} label="Overview" active={location.pathname === '/dashboard'} onClick={() => handleNav('/dashboard')} />
          <NavItem icon={<FileUp size={20} />} label="Syllabus & Uploads" active={location.pathname.includes('/upload')} onClick={() => handleNav('/dashboard/upload')} />
          <NavItem icon={<MessageSquare size={20} />} label="AI Chat Sessions" active={location.pathname.includes('/chat')} onClick={() => handleNav('/dashboard/chat')} />
          <NavItem icon={<BrainCircuit size={20} />} label="Quizzes & Flashcards" active={location.pathname.includes('/quizzes')} onClick={() => handleNav('/dashboard/quizzes')} />
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <NavItem icon={<LogOut size={20} />} label="Sign Out" />
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '3rem 4rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="headline-md">Welcome, Engineer</h2>
          <div style={{ width: '300px' }}>
             <ModernInput placeholder="Global syllabus search..." />
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }) => {
  return (
    <div onClick={onClick} style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '1rem', 
      padding: '0.75rem 1rem', 
      borderRadius: 'var(--radius-default)', 
      background: active ? 'var(--surface-container-low)' : 'transparent',
      color: active ? 'var(--primary)' : 'var(--outline-variant)',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'all 0.2s'
    }}>
      {icon}
      <span className="title-sm">{label}</span>
    </div>
  );
};

export default Dashboard;
