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
import { RefreshCw, AlertCircle } from 'lucide-react';

const DashboardHome = () => {
  const { user } = useOutletContext();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/user/dashboard', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      } else {
        setError('Failed to load dashboard data from server.');
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Network error while connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 pb-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-24 bg-white border border-[#D7D3CF] rounded-[4px]"></div>
        {/* Stat Cards Skeleton */}
        <div className="h-20 bg-white border border-[#D7D3CF] rounded-[4px]"></div>
        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-48 bg-white border border-[#D7D3CF] rounded-[4px]"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-44 bg-white border border-[#D7D3CF] rounded-[4px]"></div>
              <div className="h-44 bg-white border border-[#D7D3CF] rounded-[4px]"></div>
            </div>
            <div className="h-48 bg-white border border-[#D7D3CF] rounded-[4px]"></div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-20 bg-[#102326] rounded-[4px]"></div>
            <div className="h-20 bg-white border border-[#D7D3CF] rounded-[4px]"></div>
            <div className="h-32 bg-white border border-[#D7D3CF] rounded-[4px]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-white border border-[#D7D3CF] rounded-[4px] text-center space-y-3 max-w-md mx-auto my-12">
        <AlertCircle size={32} className="text-[#C96A32] mx-auto" />
        <h3 className="text-sm font-bold text-[#111111]">Dashboard Load Error</h3>
        <p className="text-xs font-mono text-[#666666]">{error}</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-[#102326] text-white rounded-[4px] text-xs font-mono font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-[#0b191c] transition-colors"
        >
          <RefreshCw size={14} />
          <span>RETRY</span>
        </button>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { studentData, recentQueries, uploadedMaterials, sharedResources, flashcards, generatedNotes, recommendations } = dashboardData;

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
          <ProgressTracker progress={studentData?.academicProgress} />

          {/* Exam Prep Tools */}
          <ExamTools />

          {/* Recommended Materials */}
          <RecommendedMaterials recommendations={recommendations} />
        </div>

      </div>
    </div>
  );
};

export default DashboardHome;
