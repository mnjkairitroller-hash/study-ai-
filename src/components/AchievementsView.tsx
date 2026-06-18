import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Star, Award, Lock, Sparkles, CheckCircle2, ChevronDown, CheckCircle, Zap } from 'lucide-react';
import { useAppContext } from '../store';
import { cn, LEVEL_THRESHOLDS } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export default function AchievementsView() {
  const { userData } = useAppContext();
  const [completedTitles, setCompletedTitles] = useState<string[]>([]);
  const currentLevel = userData?.level || 1;

  useEffect(() => {
    const fetchHistory = async () => {
      if (!userData?.completedLessons?.length) return;
      try {
        const q = query(collection(db, 'chapters'));
        const snap = await getDocs(q);
        const titles: string[] = [];
        snap.docs.forEach(doc => {
          const data = doc.data();
          if (data.videos) {
            data.videos.forEach((v: any) => {
              if (userData.completedLessons.includes(v.id)) {
                titles.push(`${data.subject}: ${v.title}`);
              }
            });
          }
        });
        setCompletedTitles(titles);
      } catch (err) {
        console.error(err);
      }
    };
    fetchHistory();
  }, [userData?.completedLessons]);

  // Generate levels data up to currentLevel + 2
  const maxLevelShown = Math.max(currentLevel + 2, 5);
  const levels = Array.from({ length: maxLevelShown }, (_, i) => i + 1);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.4 } }
  };

  return (
    <div className="p-4 max-w-sm mx-auto pb-28 pt-6">
      <div className="mb-8 text-center">
        <motion.div 
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-yellow-400 to-amber-500 shadow-xl shadow-amber-500/30 text-white mb-4"
        >
          <Trophy size={32} />
        </motion.div>
        <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">Player Journey</h2>
        <p className="text-slate-500 font-medium mt-2">Level up by earning Points!</p>
      </div>

      <div className="mb-10 p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <CheckCircle2 className="text-indigo-500" />
          Recent Milestones
        </h3>
        {completedTitles.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No lessons completed yet. Start learning!</p>
        ) : (
          <div className="space-y-3">
            {completedTitles.slice(-5).reverse().map((title, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i} 
                className="flex items-start gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl"
              >
                <div className="mt-0.5 text-emerald-500">
                  <CheckCircle size={16} />
                </div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {title}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <h3 className="font-black text-xl mb-6 pl-2 text-slate-800 dark:text-white flex items-center gap-2">
        <Award className="text-indigo-500" />
        Level Map
      </h3>

      <div className="relative pl-6">
        {/* Animated line connecting levels */}
        <div className="absolute left-[33px] top-6 bottom-6 w-1 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
        <motion.div 
          initial={{ height: 0 }}
          animate={{ height: `${((currentLevel - 1) / (maxLevelShown - 1)) * 100}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute left-[33px] top-6 w-1 bg-gradient-to-b from-indigo-500 to-amber-500 rounded-full origin-top"
        ></motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-12"
        >
          {levels.map((level, i) => {
            const isUnlocked = level <= currentLevel;
            const isCurrent = level === currentLevel;
            
            return (
              <motion.div key={level} variants={itemVariants} className="relative flex items-center gap-6">
                <div className="absolute -left-10 w-24 text-right">
                  {isCurrent && (
                     <div className="absolute right-14 top-1/2 -translate-y-1/2 flex items-center">
                        <span className="text-xs font-black text-indigo-500 mr-2 uppercase tracking-whider animate-pulse">You</span>
                     </div>
                  )}
                </div>

                <div className={cn(
                  "relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center border-4 shadow-lg transition-all duration-500",
                  isCurrent ? "bg-indigo-500 border-indigo-200 dark:border-indigo-900 shadow-indigo-500/40 scale-125 rotate-3" :
                  isUnlocked ? "bg-white dark:bg-slate-800 border-indigo-500 dark:border-indigo-400" :
                  "bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 grayscale"
                )}>
                  {isCurrent ? (
                    <Trophy className="text-white drop-shadow-md" size={28} />
                  ) : isUnlocked ? (
                    <Star className="text-indigo-500" size={24} fill="currentColor" />
                  ) : (
                    <Lock className="text-slate-400" size={24} />
                  )}
                  
                  {isCurrent && (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="absolute -inset-2 border-2 border-dashed border-indigo-400 dark:border-indigo-500/50 rounded-[1.4rem] opacity-50 pointer-events-none"
                    ></motion.div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    {isUnlocked && !isCurrent && (
                      <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
                    )}
                     {isCurrent && (
                      <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-amber-500"></div>
                    )}
                    <h4 className={cn(
                      "font-black text-xl mb-1",
                      isCurrent ? "text-amber-500" : isUnlocked ? "text-slate-800 dark:text-white" : "text-slate-400"
                    )}>
                      Level {level}
                    </h4>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {isUnlocked ? 'Completed' : `Requires ${LEVEL_THRESHOLDS[level - 1] || level * 500} Pts`}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

    </div>
  );
}
