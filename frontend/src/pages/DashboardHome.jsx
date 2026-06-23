import React from 'react';
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

import { useState, useEffect } from 'react';
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
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (!dashboardData) return null;

  const { studentData, recentQueries, uploadedMaterials, sharedResources, flashcards, generatedNotes } = dashboardData;

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10">
      {/* 1. Welcome Section */}
      <WelcomeSection data={studentData} user={user} />

      {/* 2. Quick Stats */}
      <StatCards stats={studentData.stats} />

      {/* 3. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (Main Content) - Takes up 2/3 width */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Personalized Flashcards Preview */}
          <FlashcardPreview flashcards={flashcards} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Queries */}
            <RecentQueries queries={recentQueries} />

            {/* Notes Preview */}
            <NotesPreview notes={generatedNotes} />
          </div>

          {/* Uploaded Materials */}
          <UploadedMaterials materials={uploadedMaterials} />

          {/* Global Shared Resources */}
          <SharedResources resources={sharedResources} />
        </div>

        {/* Right Column (Sidebar Content) - Takes up 1/3 width */}
        <div className="flex flex-col gap-6">
          {/* Revision Planner Dashboard Widget */}
          <RevisionWidget />

          {/* Progress Tracking */}
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
