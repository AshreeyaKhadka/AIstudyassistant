import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthenticateWithRedirectCallback } from '@clerk/react';

// Layout
import DashboardLayout from '../layouts/DashboardLayout';

// Pages
import LandingPage from '../pages/LandingPage';
import ProfileSetupPage from '../pages/ProfileSetupPage';
import SignIn from '../pages/sign_in';
import SignUp from '../pages/signup';
import AdminDashboard from '../pages/AdminDashboard';

// Dashboard Pages
import DashboardHome from '../pages/DashboardHome';
import AIChat from '../pages/AIChat';
import Notes from '../pages/Notes';
import Flashcards from '../pages/Flashcards';
import UploadedMaterials from '../pages/UploadedMaterials';
import ExamPreparation from '../pages/ExamPreparation';
import MCQPractice from '../pages/MCQPractice';
import ProgressTracker from '../pages/ProgressTracker';
import RevisionPlanner from '../pages/RevisionPlanner';
import Settings from '../pages/Settings';
import ProfilePage from '../pages/ProfilePage';
import SyllabusExplorer from '../pages/SyllabusExplorer';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/profile-setup" element={<ProfileSetupPage />} />
        <Route path="/onboard" element={<Navigate to="/profile-setup" replace />} />
        <Route path="/signin/*" element={<SignIn />} />
        <Route path="/signup/*" element={<SignUp />} />
        <Route
          path="/sso-callback"
          element={
            <AuthenticateWithRedirectCallback
              signInFallbackRedirectUrl="/profile-setup"
              signUpFallbackRedirectUrl="/profile-setup"
            />
          }
        />

        {/* Protected Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="chat" element={<AIChat />} />
          <Route path="notes" element={<Notes />} />
          <Route path="flashcards" element={<Flashcards />} />
          <Route path="upload" element={<UploadedMaterials />} />
          <Route path="syllabus" element={<SyllabusExplorer />} />
          <Route path="exam-prep" element={<ExamPreparation />} />
          <Route path="mcq" element={<MCQPractice />} />
          <Route path="progress" element={<ProgressTracker />} />
          <Route path="revision" element={<RevisionPlanner />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Admin Route */}
        <Route path="/system-core-admin" element={<AdminDashboard />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
