import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import QuizPage from './pages/QuizPage';
import AdminDashboard from './pages/AdminDashboard';
import OnboardingPage from './pages/OnboardingPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/onboard" element={<OnboardingPage />} />
        
        <Route path="/dashboard" element={<Dashboard />}>
           <Route index element={
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              <DashboardCard title="Recent Chats" stat="0" subtitle="Active sessions" />
              <DashboardCard title="Uploaded Notes" stat="0" subtitle="Total files" />
              <DashboardCard title="Quiz Performance" stat="--" subtitle="Average score" />
             </div>
           } />
           <Route path="upload" element={<UploadPage />} />
           <Route path="quizzes" element={<QuizPage />} />
        </Route>

        <Route path="/system-core-admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

const DashboardCard = ({ title, stat, subtitle }) => {
  return (
    <div style={{ background: 'var(--surface-container-lowest)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-ambient)', cursor: 'default' }}>
      <div className="title-sm" style={{ color: 'var(--outline-variant)', marginBottom: '1rem' }}>{title}</div>
      <div className="display-lg" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{stat}</div>
      <div className="body-sm" style={{ color: 'var(--outline-variant)' }}>{subtitle}</div>
    </div>
  );
};

export default App;
