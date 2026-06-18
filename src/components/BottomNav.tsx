import React from 'react';
import { Home, BookOpen, ShoppingBag, Trophy, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface BottomNavProps {
  currentTab: string;
  setTab: (tab: string) => void;
}

export default function BottomNav({ currentTab, setTab }: BottomNavProps) {
  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Dash' },
    { id: 'study', icon: BookOpen, label: 'Library' },
    { id: 'stats', icon: ShoppingBag, label: 'Shop' },
    { id: 'achievements', icon: Trophy, label: 'Trophies' },
    { id: 'profile', icon: User, label: 'Profile' }
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4 md:hidden">
      <nav className="pointer-events-auto flex items-center justify-between p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-[2rem] shadow-2xl shadow-indigo-500/10 support-backdrop-blur:bg-white/60 w-full max-w-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={cn(
                "relative flex items-center justify-center gap-2 px-4 py-3 rounded-full transition-all duration-300",
                isActive ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bubble"
                  className="absolute inset-0 bg-indigo-100 dark:bg-indigo-500/20 rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <motion.div 
                animate={isActive ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative z-10"
              >
                <Icon size={isActive ? 22 : 24} strokeWidth={isActive ? 2.5 : 2} />
              </motion.div>
              {isActive && (
                <motion.span 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  className="relative z-10 text-sm overflow-hidden whitespace-nowrap"
                >
                  {tab.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
