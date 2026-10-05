import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
  Calendar,
  ExternalLink,
} from 'lucide-react';

interface Application {
  id: string;
  role: string;
  company: string;
  appliedDate: string;
  ctc: string;
  currentStep: number; // 0 to 4
  status: 'active' | 'selected' | 'rejected';
  nextRound?: string;
  location: string;
}

const pipelineSteps = [
  'Applied',
  'Resume Screened',
  'Online Assessment',
  'Technical Interview',
  'Final Offer',
];

const mockApplications: Application[] = [
  {
    id: 'app-1',
    role: 'SDE Intern',
    company: 'Microsoft',
    appliedDate: '12 Sep 2026',
    ctc: '22.0 LPA',
    currentStep: 3, // Technical Interview
    status: 'active',
    nextRound: 'Round 2: System Design & Coding (Tomorrow at 2:00 PM)',
    location: 'Bengaluru / Hybrid',
  },
  {
    id: 'app-2',
    role: 'Product Engineer',
    company: 'Razorpay',
    appliedDate: '08 Sep 2026',
    ctc: '19.5 LPA',
    currentStep: 4, // Selected
    status: 'selected',
    nextRound: 'Offer Letter Dispatched to College Placement Cell',
    location: 'Bengaluru, KA',
  },
  {
    id: 'app-3',
    role: 'Cloud Infrastructure Associate',
    company: 'Oracle Cloud',
    appliedDate: '02 Sep 2026',
    ctc: '16.0 LPA',
    currentStep: 1, // Resume Screened (Rejected)
    status: 'rejected',
    location: 'Hyderabad, TS',
  },
  {
    id: 'app-4',
    role: 'Frontend Developer',
    company: 'Atlassian',
    appliedDate: '18 Sep 2026',
    ctc: '28.5 LPA',
    currentStep: 2, // Online Assessment
    status: 'active',
    nextRound: 'HackerRank OA link valid until 25 Sep 11:59 PM',
    location: 'Remote',
  },
];

export const ApplicationTracker: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'active' | 'selected' | 'rejected'>('all');

  const filteredApps = mockApplications.filter((app) => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header & Filter Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Application Pipeline
          </h2>
          <p className="text-sm text-slate-500">
            Track stage-by-stage progression of your active campus placement candidatures.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
          {(['all', 'active', 'selected', 'rejected'] as const).map((statusKey) => (
            <button
              key={statusKey}
              onClick={() => setFilter(statusKey)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
                filter === statusKey
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {statusKey === 'all' ? 'All Drives' : statusKey}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List with Visual Timelines */}
      <div className="space-y-4">
        {filteredApps.map((app) => {
          return (
            <motion.div
              key={app.id}
              whileHover={{ y: -2 }}
              className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-lg transition-all duration-300"
            >
              {/* Top Row: Company & Status */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-sm">
                    <Building2 className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-base">{app.role}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="font-medium text-slate-700">{app.company}</span>
                      <span>•</span>
                      <span>Applied {app.appliedDate}</span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-600">{app.ctc}</span>
                      <span>•</span>
                      <span>{app.location}</span>
                    </div>
                  </div>
                </div>

                {/* Status Pill */}
                <div>
                  {app.status === 'selected' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Offer Extended
                    </span>
                  ) : app.status === 'rejected' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Not Shortlisted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                      <Clock className="h-3.5 w-3.5" />
                      In Progress ({pipelineSteps[app.currentStep]})
                    </span>
                  )}
                </div>
              </div>

              {/* Step Timeline Indicator */}
              <div className="mt-8 px-2">
                <div className="relative flex items-center justify-between">
                  {/* Background Track */}
                  <div className="absolute left-0 top-1/2 h-1 w-full -translate-y-1/2 bg-slate-100 rounded-full" />
                  {/* Active Colored Track */}
                  <div
                    className={`absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full transition-all duration-500 ${
                      app.status === 'rejected' ? 'bg-rose-400' : 'bg-indigo-600'
                    }`}
                    style={{
                      width: `${(app.currentStep / (pipelineSteps.length - 1)) * 100}%`,
                    }}
                  />

                  {/* Steps Indicators */}
                  {pipelineSteps.map((step, idx) => {
                    const isCompleted = idx < app.currentStep;
                    const isCurrent = idx === app.currentStep;

                    return (
                      <div key={step} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all shadow-xs ${
                            isCompleted
                              ? 'bg-indigo-600 text-white'
                              : isCurrent
                              ? app.status === 'rejected'
                                ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                                : 'bg-white text-indigo-600 border-2 border-indigo-600 ring-4 ring-indigo-50'
                              : 'bg-white text-slate-400 border border-slate-300'
                          }`}
                        >
                          {isCompleted ? <CheckCircle className="h-4 w-4" /> : idx + 1}
                        </div>
                        <span
                          className={`mt-2 hidden sm:block text-[11px] font-medium text-center ${
                            isCurrent
                              ? 'text-slate-900 font-semibold'
                              : isCompleted
                              ? 'text-slate-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Next Action Callout (if active) */}
              {app.nextRound && app.status === 'active' && (
                <div className="mt-6 flex items-center justify-between rounded-xl bg-indigo-50/70 border border-indigo-100/80 p-3.5">
                  <div className="flex items-center gap-2.5 text-xs text-indigo-900">
                    <Calendar className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>
                      <strong>Next Up:</strong> {app.nextRound}
                    </span>
                  </div>
                  <button className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer">
                    <span>Instructions</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ApplicationTracker;
