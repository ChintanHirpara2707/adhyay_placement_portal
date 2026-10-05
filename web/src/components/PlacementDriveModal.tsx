import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check } from 'lucide-react';

interface PlacementDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDrivePublished?: (driveData: any) => void;
}

const availableBranches = ['CSE', 'IT', 'ECE', 'ME', 'CE', 'EE'];

export const PlacementDriveModal: React.FC<PlacementDriveModalProps> = ({
  isOpen,
  onClose,
  onDrivePublished,
}) => {
  const [selectedBranches, setSelectedBranches] = useState<string[]>(['CSE', 'IT']);
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [ctc, setCtc] = useState('');
  const [minCgpa, setMinCgpa] = useState('7.5');
  const [deadline, setDeadline] = useState('2026-10-15');

  const toggleBranch = (b: string) => {
    if (selectedBranches.includes(b)) {
      setSelectedBranches(selectedBranches.filter((item) => item !== b));
    } else {
      setSelectedBranches([...selectedBranches, b]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onDrivePublished) {
      onDrivePublished({
        title,
        company,
        ctc: `${ctc} LPA`,
        minCgpa: parseFloat(minCgpa) || 7.0,
        branches: selectedBranches,
        deadline,
      });
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-xl rounded-2xl border border-slate-200/90 bg-white p-7 shadow-2xl z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-bold">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Post Placement Drive</h3>
                  <p className="text-xs text-slate-400">Launch a new campus recruitment drive.</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Fields */}
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Google / Microsoft"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Role Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Graduate Software Engineer"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Annual CTC (in LPA)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="18.5"
                    required
                    value={ctc}
                    onChange={(e) => setCtc(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Min CGPA Criterion</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="7.50"
                    required
                    value={minCgpa}
                    onChange={(e) => setMinCgpa(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Branch Multi-select */}
              <div>
                <label className="text-xs font-semibold text-slate-700">Eligible Branches</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {availableBranches.map((branch) => {
                    const isSelected = selectedBranches.includes(branch);
                    return (
                      <button
                        type="button"
                        key={branch}
                        onClick={() => toggleBranch(branch)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                        {branch}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="text-xs font-semibold text-slate-700">Application Deadline</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Modal Buttons */}
              <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all cursor-pointer"
                >
                  Publish Drive
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PlacementDriveModal;
