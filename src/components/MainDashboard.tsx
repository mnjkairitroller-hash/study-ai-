import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useAppContext } from '../store';
import { Flame, PlayCircle, Target, CheckCircle2, Trophy, Sparkles, BookHeart, BrainCircuit } from 'lucide-react';
import { motion } from 'motion/react';
import mascotImg from '../assets/images/cute_study_mascot_1781752313835.jpg';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function MainDashboard({ setTab, setPlayingVideo }: { setTab: (tab: string) => void, setPlayingVideo?: (vid: any) => void }) {
  const { userData, user } = useAppContext();
  const [chapters, setChapters] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'chapters'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChapters(data);
    });
    return () => unsub();
  }, []);

  const generateRoutine = () => {
    if (!chapters.length || !userData) return [];

    // Process oldest chapters first so sequence is strictly maintained
    const chronoChapters = [...chapters].reverse();
    const pendingBySubject: Record<string, any[]> = {};
    
    chronoChapters.forEach(chapter => {
      const subject = chapter.subject || 'Other';
      if (!pendingBySubject[subject]) pendingBySubject[subject] = [];
      
      if (chapter.videos) {
        chapter.videos.forEach((video: any, index: number) => {
          if (!userData.completedLessons?.includes(video.id)) {
            pendingBySubject[subject].push({
              ...video,
              subject: chapter.subject,
              chapterTitle: chapter.title,
              partNumber: index + 1
            });
          }
        });
      }
    });

    // Prioritize rotating 2 subjects daily
    const dayOfYear = Math.floor(new Date().getTime() / 86400000);
    const primarySubjects = ['Math', 'Science', 'English'];
    const subjectA = primarySubjects[dayOfYear % 3];
    const subjectB = primarySubjects[(dayOfYear + 1) % 3];

    let routineVideos: any[] = [];
    
    // Attempt to pull first available videos from the prioritized subjects
    if (pendingBySubject[subjectA]) routineVideos.push(...pendingBySubject[subjectA]);
    if (pendingBySubject[subjectB]) routineVideos.push(...pendingBySubject[subjectB]);

    // Fill with any other subjects if we don't have 3
    if (routineVideos.length < 3) {
      for (const sub of Object.keys(pendingBySubject)) {
        if (sub !== subjectA && sub !== subjectB) {
          routineVideos.push(...pendingBySubject[sub]);
        }
      }
    }
    
    // Return max 3 chronological pending videos for today's routine
    return routineVideos.slice(0, 3);
  };

  const todayRoutine = generateRoutine();

  const quests = todayRoutine.length > 0 
    ? todayRoutine.map((video, idx) => ({
        id: video.id || `quest-${idx}`,
        title: `Complete: ${video.subject} - Part ${video.partNumber}`,
        reward: '1-2', // Will be 1 or 2 depending on length when completed
        video: video,
        done: false,
        icon: BookHeart,
        color: 'text-indigo-500',
        bg: 'bg-indigo-100'
      }))
    : [
        { id: 1, title: 'All Caught Up!', reward: 0, video: null, done: true, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100' }
      ];

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="p-4 space-y-6 max-w-2xl mx-auto pb-32 overflow-x-hidden"
    >
      {/* Header Profile Section */}
      <motion.div variants={item} className="flex items-center gap-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 p-4 rounded-3xl border border-indigo-100 dark:border-indigo-900 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none">
            <Sparkles size={120} className="text-indigo-400" />
        </div>
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-indigo-500/30 overflow-hidden border-2 border-white dark:border-slate-800 z-10"
        >
          {user?.displayName?.charAt(0) || 'U'}
        </motion.div>
        <div className="z-10">
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-sans">
            Hello, {user?.displayName?.split(' ')[0] || 'Student'}! 👋
          </h2>
          <p className="text-indigo-600 dark:text-indigo-400 font-medium text-sm flex items-center gap-1 mt-0.5">
            <Sparkles size={14} /> Ready to learn today?
          </p>
        </div>
      </motion.div>

      {/* Mascot & Streak Banner */}
      <motion.div variants={item} className="relative bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-5 sm:p-6 shadow-xl shadow-orange-500/20 overflow-hidden text-white flex gap-4 items-center border border-orange-400/50">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-600/30 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
              <Flame className="text-yellow-200" size={20} fill="currentColor" />
            </div>
            <h3 className="font-bold text-2xl drop-shadow-sm">On Fire!</h3>
          </div>
          <p className="text-orange-50 font-medium text-sm mb-4">
            {userData?.streak} Day Streak. Way to go!
          </p>
          <div className="w-full max-w-[200px] bg-black/20 rounded-full h-3 backdrop-blur-sm overflow-hidden p-0.5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '75%' }}
              transition={{ delay: 0.5, duration: 1, type: "spring" }}
              className="bg-white h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
            />
          </div>
        </div>
        
        <motion.div 
          animate={{ y: [-4, 4, -4], rotate: [-2, 2, -2] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="relative z-10 w-28 h-28 hidden sm:block flex-shrink-0 drop-shadow-2xl rounded-[2rem] overflow-hidden border-4 border-white/20 shadow-inner"
        >
           <img src={mascotImg} alt="Mascot" className="w-full h-full object-cover" />
        </motion.div>
      </motion.div>

      {/* Daily Quests Layout */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="font-bold text-[1.1rem] flex items-center gap-2 text-slate-800 dark:text-white">
            <Target className="text-indigo-500" size={24} />
            Today's Missions
          </h3>
        </div>
        
        <div className="space-y-3">
          {quests.map((quest) => {
            const QuestIcon = quest.icon;
            return (
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={quest.id} 
                className={`app-card relative rounded-3xl p-4 border transition-all duration-300 flex items-center gap-4 ${quest.done ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/50' : 'hover:border-indigo-300 dark:hover:border-indigo-600 shadow-sm'}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${quest.done ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500' : `${quest.bg} ${quest.color} dark:bg-opacity-10`}`}>
                  {quest.done ? <CheckCircle2 size={28} className="text-indigo-600 dark:text-indigo-400" /> : <QuestIcon size={28} />}
                </div>
                
                <div className="flex-1">
                  <h4 className={`font-bold text-[1.05rem] ${quest.done ? 'text-indigo-900/60 dark:text-indigo-200/50 line-through' : 'text-slate-800 dark:text-white'}`}>
                    {quest.title}
                  </h4>
                  {!quest.done && (
                    <div className="flex items-center gap-1.5 mt-1 opacity-90">
                      <Trophy size={14} className="text-amber-500" />
                      <span className="text-sm font-bold text-amber-500">+{quest.reward} Points</span>
                    </div>
                  )}
                </div>

                {!quest.done && (
                  <button 
                    onClick={() => {
                      if (quest.video && setPlayingVideo) {
                        setPlayingVideo(quest.video);
                        setTab('player');
                      }
                    }}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-full text-sm font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-colors shadow-sm"
                  >
                    Go
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* AI Smart Routine Section */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4 px-2 mt-4">
          <h3 className="font-bold text-[1.1rem] flex items-center gap-2 text-slate-800 dark:text-white">
            <BrainCircuit className="text-indigo-500" size={24} />
            Today's AI Routine <span className="text-xs font-bold text-slate-500 ml-2">(~2 Hrs Goal)</span>
          </h3>
          <button onClick={() => setTab('study')} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full uppercase tracking-widest">
            All Library
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {todayRoutine.length === 0 ? (
            <div className="col-span-full app-card rounded-[2rem] border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center bg-white dark:bg-slate-900/50">
               <br />
               <Sparkles className="mx-auto text-yellow-500 mb-3" size={32} />
               <h4 className="font-bold text-slate-700 dark:text-slate-300">You're all caught up!</h4>
               <p className="text-sm text-slate-500 mt-1">Awesome job completing your lessons.</p>
               <br />
            </div>
          ) : (
            todayRoutine.map((video, idx) => {
              // Extract YT ID for thumbnail
              const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
              const match = video.videoUrl?.match(regExp);
              const extractId = match && match[2].length === 11 ? match[2] : null;

              return (
                <motion.div 
                  key={video.id || idx}
                  whileHover={{ y: -4 }}
                  onClick={() => {
                     if (setPlayingVideo) setPlayingVideo(video);
                     setTab('player');
                  }}
                  className="app-card rounded-[2rem] border border-slate-200 dark:border-slate-800/60 overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 group bg-white dark:bg-slate-900/50"
                >
                  <div className="h-36 bg-slate-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700 ease-in-out opacity-80" style={{ backgroundImage: `url('https://img.youtube.com/vi/${extractId}/mqdefault.jpg')` }}></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white scale-90 group-hover:scale-100 group-hover:bg-indigo-500/80 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                        <PlayCircle size={32} className="ml-1" fill="currentColor" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-3 text-[10px] font-bold text-white bg-indigo-500/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg uppercase tracking-widest shadow-lg border border-indigo-400/50">
                      {video.subject} • Part {video.partNumber}
                    </div>
                    <div className="absolute top-3 right-3 text-[10px] font-bold text-slate-800 dark:text-white bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm border border-slate-200 dark:border-slate-700">
                      {userData?.lessonProgress?.[video.id] ? 'Resume' : 'Up Next'}
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-slate-800 dark:text-white leading-tight line-clamp-2 text-[15px]">{video.title}</h4>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-1">{video.chapterTitle}</p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
