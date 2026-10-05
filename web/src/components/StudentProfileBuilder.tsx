import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  GraduationCap,
  FileUp,
  Award,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
} from 'lucide-react';

const steps = [
  { id: 1, title: 'Personal Info', icon: User },
  { id: 2, title: 'Academics', icon: GraduationCap },
  { id: 3, title: 'Resume PDF', icon: FileUp },
  { id: 4, title: 'Skills & Badges', icon: Award },
];

export const StudentProfileBuilder: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [skills, setSkills] = useState(['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Tailwind CSS', 'Docker']);
  const [newSkill, setNewSkill] = useState('');
  const [uploadedResume, setUploadedResume] = useState<string | null>('John_Doe_Resume_2026.pdf');
  const [isSaved, setIsSaved] = useState(false);

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleFinish = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-3xl space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Student Profile Builder
        </h2>
        <p className="text-sm text-slate-500">
          Keep your academic credentials and verified resume current for real-time drive shortlisting.
        </p>
      </div>

      {/* Stepper Header */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          {steps.map((step) => {
            const Icon = step.icon;
            const isDone = currentStep > step.id;
            const isActive = currentStep === step.id;

            return (
              <div key={step.id} className="flex flex-1 items-center">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold transition-colors ${
                      isDone
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span
                    className={`hidden sm:inline text-xs font-medium ${
                      isActive ? 'text-slate-900 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {step.id !== steps.length && (
                  <div className="mx-3 flex-1 border-t border-dashed border-slate-200" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content Area */}
      <div className="relative min-h-[360px] rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-slate-900">Personal Information</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-700">Full Name</label>
                  <input
                    type="text"
                    defaultValue="John Doe"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Official College Email</label>
                  <input
                    type="email"
                    defaultValue="john.doe@university.edu"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700">Phone Number</label>
                  <input
                    type="tel"
                    defaultValue="+91 98765 43210"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-slate-900">Academic Standing</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-slate-700">Engineering Branch</label>
                  <select className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                    <option>Computer Science & Engineering (CSE)</option>
                    <option>Information Technology (IT)</option>
                    <option>Electronics & Communication (ECE)</option>
                    <option>Mechanical Engineering (ME)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Cumulative CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue="8.74"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Active Backlogs Count</label>
                  <input
                    type="number"
                    defaultValue="0"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-slate-900">Upload Resume (PDF)</h3>
              <div
                onClick={() => setUploadedResume('Updated_Campus_Resume_2026.pdf')}
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center transition-colors hover:border-indigo-300 cursor-pointer"
              >
                <FileUp className="h-10 w-10 text-indigo-500 mb-3" />
                <p className="text-sm font-semibold text-slate-800">
                  Click to browse or drag & drop your PDF resume
                </p>
                <p className="text-xs text-slate-400 mt-1">Recommended: ATS-friendly, single page PDF (Max 5MB)</p>
              </div>

              {uploadedResume && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                  <div className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                    <FileUp className="h-4 w-4 text-indigo-600" />
                    <span>{uploadedResume}</span>
                  </div>
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Uploaded & Linked
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-slate-900">Technical Skills & Badges</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a skill (e.g. Next.js, Go) and press Enter or Add"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Add Skill
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {skills.map((skill) => (
                  <motion.span
                    layout
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 border border-indigo-100"
                  >
                    <span>{skill}</span>
                    <button onClick={() => removeSkill(skill)} className="cursor-pointer">
                      <X className="h-3 w-3 text-indigo-400 hover:text-indigo-600" />
                    </button>
                  </motion.span>
                ))}
              </div>

              {isSaved && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-medium"
                >
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span>Profile updated successfully! All drive match filters will use this data.</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Controls */}
        <div className="mt-8 flex justify-between border-t border-slate-100 pt-5">
          <button
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => prev - 1)}
            className="flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <button
            onClick={() => {
              if (currentStep < 4) {
                setCurrentStep((prev) => prev + 1);
              } else {
                handleFinish();
              }
            }}
            className="flex items-center gap-1 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-xs shadow-indigo-200 hover:bg-indigo-700 transition-all cursor-pointer"
          >
            {currentStep === 4 ? 'Save Profile' : 'Next Step'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default StudentProfileBuilder;
