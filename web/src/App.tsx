import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { DotGridBackground } from './components/DotGridBackground';
import { Sidebar } from './components/Sidebar';
import { JobFeed } from './components/JobFeed';
import { ApplicationTracker } from './components/ApplicationTracker';
import { StudentProfileBuilder } from './components/StudentProfileBuilder';
import { PlacementDriveModal } from './components/PlacementDriveModal';
import { Bell, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('jobs');
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);

  const handleDrivePublished = (driveData: any) => {
    console.log('New drive published:', driveData);
    setShowNotificationToast(true);
    setTimeout(() => setShowNotificationToast(false), 4000);
  };

  return (
    <div className="relative flex min-h-screen bg-slate-50/60 font-sans text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-800">
      {/* React Bits Subtle Dot Grid Canvas */}
      <DotGridBackground />

      {/* Collapsible Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewDrive={() => setIsDriveModalOpen(true)}
      />

      {/* Main Viewport Content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/85 px-8 backdrop-blur-md">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              Campus Placement Portal
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              {activeTab === 'jobs' && 'Drive Feed'}
              {activeTab === 'tracker' && 'Applications Pipeline'}
              {activeTab === 'profile' && 'Student Profile'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Stats Pill */}
            <div className="hidden md:flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1.5 text-xs text-emerald-800 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Drive Season 2026 Live</span>
            </div>

            <button
              onClick={() => setShowNotificationToast(!showNotificationToast)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-xs hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" />
            </button>
          </div>
        </header>

        {/* Notification Toast */}
        {showNotificationToast && (
          <div className="mx-8 mt-4 flex items-center justify-between rounded-xl bg-indigo-600 p-3 text-xs text-white shadow-lg shadow-indigo-100">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span>New drive announcement posted to the placement feed!</span>
            </div>
            <button
              onClick={() => setShowNotificationToast(false)}
              className="rounded-md bg-indigo-700 px-2 py-0.5 text-[11px] font-semibold hover:bg-indigo-800 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Content with Framer Motion Page Transition */}
        <main className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'jobs' && <JobFeed key="jobs" />}
            {activeTab === 'tracker' && <ApplicationTracker key="tracker" />}
            {activeTab === 'profile' && <StudentProfileBuilder key="profile" />}
          </AnimatePresence>
        </main>
      </div>

      {/* Admin Placement Drive Modal */}
      <PlacementDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onDrivePublished={handleDrivePublished}
      />
    </div>
  );
};

export default App;
