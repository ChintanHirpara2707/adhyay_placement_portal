import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Layers,
  UserCheck,
  PlusCircle,
  ChevronLeft,
  GraduationCap,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewDrive: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewDrive,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { id: 'jobs', label: 'Job Feed', icon: Briefcase, badge: '12 New' },
    { id: 'tracker', label: 'Applications', icon: Layers, badge: '4 Active' },
    { id: 'profile', label: 'Student Profile', icon: UserCheck },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="sticky top-0 flex h-screen flex-col border-r border-slate-200/80 bg-white/95 backdrop-blur-md z-30"
    >
      {/* Brand Header */}
      <div className="flex h-20 items-center justify-between px-5 border-b border-slate-100">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-100 text-white font-bold">
            <GraduationCap className="h-5 w-5" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="whitespace-nowrap"
              >
                <h1 className="font-semibold text-slate-900 tracking-tight leading-tight">
                  Placement<span className="text-indigo-600">Porter</span>
                </h1>
                <p className="text-[11px] font-medium text-slate-400">Campus Drive v2.0</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }}>
            <ChevronLeft className="h-4 w-4" />
          </motion.div>
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 space-y-1.5 px-3 py-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors cursor-pointer ${
                isActive ? 'text-indigo-600 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {/* Floating Active Pill */}
              {isActive && (
                <motion.div
                  layoutId="activeNavPill"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-xl bg-indigo-50/80 border border-indigo-100/60 shadow-xs"
                />
              )}

              <Icon className={`relative z-10 h-5 w-5 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative z-10 truncate flex-1 text-left"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {!collapsed && item.badge && (
                <span className="relative z-10 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Post Job Quick Action */}
        <div className="pt-4 mt-4 border-t border-slate-100">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenNewDrive}
            className={`flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200/50 hover:bg-indigo-700 transition-all cursor-pointer ${
              collapsed ? 'p-2.5' : ''
            }`}
          >
            <PlusCircle className="h-4 w-4 shrink-0" />
            {!collapsed && <span>New Drive</span>}
          </motion.button>
        </div>
      </div>

      {/* User Footer */}
      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-200/80 font-bold text-slate-700 text-sm">
            JD
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          {!collapsed && (
            <div className="flex-1 truncate">
              <p className="truncate text-xs font-semibold text-slate-900">John Doe</p>
              <p className="truncate text-[11px] text-slate-400">B.Tech CSE '26</p>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
