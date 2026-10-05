import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Clock,
  CheckCircle2,
  GraduationCap,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  ctc: string;
  minCgpa: number;
  branches: string[];
  daysLeft: number;
  applicantsCount: number;
}

const mockJobs: Job[] = [
  {
    id: '1',
    title: 'Software Development Engineer I',
    company: 'Atlassian',
    location: 'Bengaluru / Hybrid',
    ctc: '28.5 LPA',
    minCgpa: 8.0,
    branches: ['CSE', 'IT', 'ECE'],
    daysLeft: 3,
    applicantsCount: 142,
  },
  {
    id: '2',
    title: 'Frontend Platform Engineer',
    company: 'Stripe',
    location: 'Hyderabad, TS',
    ctc: '24.0 LPA',
    minCgpa: 7.5,
    branches: ['CSE', 'IT'],
    daysLeft: 5,
    applicantsCount: 98,
  },
  {
    id: '3',
    title: 'Embedded Systems Engineer',
    company: 'Qualcomm',
    location: 'Noida / Hyderabad',
    ctc: '18.2 LPA',
    minCgpa: 7.0,
    branches: ['ECE', 'EE', 'CSE'],
    daysLeft: 8,
    applicantsCount: 65,
  },
  {
    id: '4',
    title: 'Cloud Infrastructure Associate',
    company: 'Amazon Web Services',
    location: 'Bengaluru, KA',
    ctc: '22.0 LPA',
    minCgpa: 7.8,
    branches: ['CSE', 'IT', 'ECE'],
    daysLeft: 4,
    applicantsCount: 110,
  },
  {
    id: '5',
    title: 'Data & Analytics Engineer',
    company: 'Fractal Analytics',
    location: 'Mumbai / Remote',
    ctc: '14.5 LPA',
    minCgpa: 7.2,
    branches: ['CSE', 'IT', 'ECE', 'EE'],
    daysLeft: 10,
    applicantsCount: 78,
  },
  {
    id: '6',
    title: 'Fintech Backend Engineer',
    company: 'Zerodha',
    location: 'Bengaluru, KA',
    ctc: '21.0 LPA',
    minCgpa: 8.0,
    branches: ['CSE', 'IT'],
    daysLeft: 2,
    applicantsCount: 134,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 350, damping: 25 } },
};

export const JobFeed: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('All');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);

  const branches = ['All', 'CSE', 'IT', 'ECE', 'EE'];

  const filteredJobs = mockJobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch =
      selectedBranch === 'All' || job.branches.includes(selectedBranch);
    return matchesSearch && matchesBranch;
  });

  const handleApply = (id: string) => {
    setApplyingId(id);
    setTimeout(() => {
      setApplyingId(null);
      setAppliedJobs((prev) => [...prev, id]);
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Open Placement Drives
          </h2>
          <p className="text-sm text-slate-500">
            Explore curated campus recruitment drives matching your academic eligibility.
          </p>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search roles or companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
            {branches.map((branch) => (
              <button
                key={branch}
                onClick={() => setSelectedBranch(branch)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  selectedBranch === branch
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {branch}
              </button>
            ))}
          </div>

          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-xs hover:bg-slate-50 transition-colors cursor-pointer">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid of Job Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
      >
        {filteredJobs.map((job) => {
          const isApplied = appliedJobs.includes(job.id);
          const isApplying = applyingId === job.id;

          return (
            <motion.div
              key={job.id}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs hover:shadow-xl hover:border-indigo-200 transition-all duration-300"
            >
              <div>
                {/* Header: Company & CTC */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50/80 border border-indigo-100 font-bold text-indigo-700 text-sm">
                      {job.company.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors text-base">
                        {job.title}
                      </h3>
                      <p className="text-xs font-medium text-slate-500">{job.company}</p>
                    </div>
                  </div>

                  {/* CTC Badge */}
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60 shrink-0">
                    {job.ctc}
                  </span>
                </div>

                {/* Meta details */}
                <div className="mt-5 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Min CGPA: <strong className="text-slate-800">{job.minCgpa}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="font-medium text-amber-700">
                      {job.daysLeft} days left to apply
                    </span>
                  </div>
                </div>

                {/* Branches Chips */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {job.branches.map((b) => (
                    <span
                      key={b}
                      className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer: Action */}
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-[11px] text-slate-400 font-medium">
                  {job.applicantsCount} students applied
                </span>

                <motion.button
                  whileHover={{ scale: isApplied ? 1 : 1.03 }}
                  whileTap={{ scale: isApplied ? 1 : 0.97 }}
                  disabled={isApplied || isApplying}
                  onClick={() => handleApply(job.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                    isApplied
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                  }`}
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : isApplied ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Applied</span>
                    </>
                  ) : (
                    <>
                      <span>Apply Now</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};

export default JobFeed;
