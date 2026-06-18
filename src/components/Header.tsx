import React from 'react';
import { useAppContext } from '../store';
import { Flame, Coins, Trophy, Home, BookOpen, ShoppingBag, Trophy as TrophyIcon, User } from 'lucide-react';
import { motion } from 'motion/react';
import { getLevelInfo } from '../lib/utils';

interface HeaderProps {
  currentTab?: string;
  setTab?: (tab: string) => void;
}

export default function Header({ currentTab, setTab }: HeaderProps) {
  const { userData } = useAppContext();

  if (!userData) return null;

  const { progressPercent } = getLevelInfo(userData.points);

  const desktopTabs = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'study', icon: BookOpen, label: 'Library' },
    { id: 'stats', icon: ShoppingBag, label: 'Rewards Shop' },
    { id: 'achievements', icon: TrophyIcon, label: 'Trophies' },
    { id: 'profile', icon: User, label: 'Profile Settings' }
  ];

  return (
    <header className="app-nav sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3.5 shadow-sm backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Trophy size={16} className="text-amber-500" />
              <span>Level {userData.level}</span>
            </div>
            <div className="w-24 h-1.5 bg-black/10 dark:bg-white/10 rounded-full mt-1 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="h-full bg-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Central inline Navigation Tabs for Desktop */}
        {currentTab && setTab && (
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/60 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/40 dark:border-slate-700/40">
            {desktopTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 scale-[1.02]' 
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        <div className="flex items-center justify-end gap-3 flex-1">
          <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 py-1 px-3 rounded-full hover:scale-105 transition-transform cursor-default">
            <Coins size={16} className="text-yellow-500" />
            <span className="font-bold text-sm">{userData.points}</span>
          </div>
          
          <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 py-1 px-3 rounded-full hover:scale-105 transition-transform cursor-default">
            <Flame size={16} className="text-orange-500" />
            <span className="font-bold text-sm font-mono">{userData.streak}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
