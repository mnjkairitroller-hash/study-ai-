import React from 'react';
import { useAppContext } from '../store';
import { Flame, Coins, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { getLevelInfo } from '../lib/utils';

export default function Header() {
  const { userData } = useAppContext();

  if (!userData) return null;

  const { progressPercent } = getLevelInfo(userData.points);

  return (
    <header className="app-nav sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Trophy size={16} className="text-amber-500" />
            <span>Lvl {userData.level}</span>
          </div>
          <div className="w-24 h-1.5 bg-black/10 dark:bg-white/10 rounded-full mt-1 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="h-full bg-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 flex-1">
        <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 py-1 px-3 rounded-full">
          <Coins size={16} className="text-yellow-500" />
          <span className="font-bold text-sm">{userData.points}</span>
        </div>
        
        <div className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 py-1 px-3 rounded-full">
          <Flame size={16} className="text-orange-500" />
          <span className="font-bold text-sm">{userData.streak}</span>
        </div>
      </div>
    </header>
  );
}
