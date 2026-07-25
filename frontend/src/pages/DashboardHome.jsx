import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import WelcomeSection from '../components/dashboard/WelcomeSection';
import StatCards from '../components/dashboard/StatCards';
import RecentQueries from '../components/dashboard/RecentQueries';
import UploadedMaterials from '../components/dashboard/UploadedMaterials';
import SharedResources from '../components/dashboard/SharedResources';
import FlashcardPreview from '../components/dashboard/FlashcardPreview';
import NotesPreview from '../components/dashboard/NotesPreview';
import ProgressTracker from '../components/dashboard/ProgressTracker';
import ExamTools from '../components/dashboard/ExamTools';
import RecommendedMaterials from '../components/dashboard/RecommendedMaterials';
import RevisionWidget from '../components/dashboard/RevisionWidget';
import FocusWidget from '../components/dashboard/FocusWidget';
import { Loader2 } from 'lucide-react';

const DashboardHome = () => {
  const { user } = useOutletContext();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/user/dashboard', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setDashboardData(data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-[#102326]" size={36} />
      </div>
    );
  }

  if (!dashboardData) return null;

  const { studentData, recentQueries, uploadedMaterials, sharedResources, flashcards, generatedNotes } = dashboardData;

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Top Header Grid (Welcome Section) */}
      <WelcomeSection data={studentData} user={user} />

      {/* 2. Quick Metric Bar (6 stats in 1 row) */}
      <StatCards stats={studentData?.stats} />

      {/* 3. Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column (2/3 width on desktop) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Flashcards Review Card */}
          <FlashcardPreview flashcards={flashcards} />

          {/* Sub grid: Recent Queries & AI Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RecentQueries queries={recentQueries} />
            <NotesPreview notes={generatedNotes} />
          </div>

          {/* Uploaded Materials Table Card */}
          <UploadedMaterials materials={uploadedMaterials} />

          {/* Global Shared Resources */}
          <SharedResources resources={sharedResources} />
        </div>

        {/* Right Column (1/3 width on desktop) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Smart Focus Mode (Dark Card) */}
          <FocusWidget />

          {/* Revision Schedule (Light Card) */}
          <RevisionWidget />

          {/* Academic Progress Card */}
          <ProgressTracker />

          {/* Exam Prep Tools */}
          <ExamTools />

          {/* Recommended Materials */}
          <RecommendedMaterials />
        </div>

      </div>
    </div>
  );
};

export default DashboardHome;
