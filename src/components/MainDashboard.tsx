import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { useAppContext } from '../store';
import { Flame, PlayCircle, Target, CheckCircle2, Trophy, Sparkles, BookHeart, BrainCircuit, Award, Users, Calendar, HelpCircle, Check, AlertCircle } from 'lucide-react';
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

const BRAIN_BOOSTERS = [
  {
    question: "If 4x + 12 = 36, what is the value of x?",
    options: ["4", "6", "8", "12"],
    correct: 1, // "6"
    explanation: "Subtract 12 from both sides to get 4x = 24. Then, divide by 4 to get x = 6!"
  },
  {
    question: "Which organelle is widely known as the powerhouse of the cell?",
    options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi body"],
    correct: 2, // "Mitochondria"
    explanation: "Mitochondria convert glucose into ATP, supplying energy for cellular processes!"
  },
  {
    question: "What is the square root of 225?",
    options: ["13", "14", "15", "16"],
    correct: 2, // "15"
    explanation: "15 multiplied by 15 is exactly 225!"
  },
  {
    question: "Which gas is vital for plants during photosynthesis?",
    options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"],
    correct: 1, // "Carbon Dioxide"
    explanation: "Plants absorb Carbon Dioxide (CO2) and release Oxygen (O2) during photosynthesis."
  },
  {
    question: "What is the value of Pi (π) rounded to two decimal places?",
    options: ["3.12", "3.14", "3.16", "3.18"],
    correct: 1, // "3.14"
    explanation: "Pi is a ratio of circumference to diameter, universally valued at approximately 3.14."
  },
  {
    question: "What is the smallest prime number?",
    options: ["0", "1", "2", "3"],
    correct: 2, // "2"
    explanation: "2 is the smallest prime number and also the only even prime number!"
  },
  {
    question: "How many bones are there in an adult human body?",
    options: ["186", "206", "306", "216"],
    correct: 1, // "206"
    explanation: "An adult human skeleton has exactly 206 bones, while babes have around 270!"
  }
];

export default function MainDashboard({ setTab, setPlayingVideo }: { setTab: (tab: string) => void, setPlayingVideo?: (vid: any) => void }) {
  const { userData, user, addPoints } = useAppContext();
  const [chapters, setChapters] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Daily brain booster states
  const dayIndex = new Date().getDay() % BRAIN_BOOSTERS.length;
  const currentBooster = BRAIN_BOOSTERS[dayIndex];
  
  const boosterKey = `booster_idx_${user?.uid || 'guest'}_${new Date().toDateString()}`;
  const [boosterSolved, setBoosterSolved] = useState<boolean>(() => {
    return localStorage.getItem(boosterKey) === 'answered';
  });
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);

  useEffect(() => {
    const q = query(collection(db, 'chapters'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChapters(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const qUsers = query(collection(db, 'users'), orderBy('points', 'desc'), limit(10));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const list = snap.docs.map(doc => {
        const val = doc.data();
        return {
          id: doc.id,
          displayName: val.displayName || val.email?.split('@')[0] || 'Student',
          points: val.points || 0,
          level: val.level || 1,
          streak: val.streak || 1
        };
      });
      setLeaderboard(list);
    }, (error) => {
      console.error("Leaderboard loading error", error);
    });
    return () => unsubUsers();
  }, []);

  const handleBoosterAnswer = async (optIdx: number) => {
    if (boosterSolved) return;
    setSelectedOpt(optIdx);
    setShowExplanation(true);
    if (optIdx === currentBooster.correct) {
      setClaiming(true);
      try {
        await addPoints(1);
        setBoosterSolved(true);
        localStorage.setItem(boosterKey, 'answered');
      } catch (err) {
        console.error(err);
      } finally {
        setClaiming(false);
      }
    }
  };

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

  const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayDayNum = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
  const activeWeekIndex = todayDayNum === 0 ? 6 : todayDayNum - 1;

  // Leaderboard rendering setup: combine real with fallback mock contenders if DB has few users
  const mockCompetitors = [
    { id: 'mock1', displayName: 'Priya Sharma', points: Math.max((userData?.points || 0) + 70, 240), level: Math.max((userData?.level || 1) + 1, 2), streak: 5 },
    { id: 'mock2', displayName: 'Rohan Gupta', points: Math.max((userData?.points || 0) + 30, 160), level: userData?.level || 1, streak: 3 },
    { id: 'mock3', displayName: 'Aanya Sen', points: Math.max((userData?.points || 10) - 20, 90), level: Math.max((userData?.level || 1) - 1, 1), streak: 2 },
    { id: 'mock4', displayName: 'Kabir Dev', points: Math.max((userData?.points || 20) - 40, 45), level: 1, streak: 1 }
  ];

  let displayLeaderboard = [...leaderboard];
  const seenIds = new Set(displayLeaderboard.map(u => u.id));
  
  // Add mocks to pad leaderboard up to 5 users
  mockCompetitors.forEach(mock => {
    if (displayLeaderboard.length < 5 && !seenIds.has(mock.id)) {
      displayLeaderboard.push(mock);
    }
  });

  // Sort and assign ranks
  displayLeaderboard.sort((a, b) => b.points - a.points);

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-32 overflow-x-hidden"
    >
      {/* Dynamic Grid Layout for Responsive Screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Greeting, Brain Booster, Progress Graph, and Routine */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Profile Section */}
          <motion.div variants={item} className="flex items-center gap-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900 shadow-sm relative overflow-hidden">
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
              <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-sans">
                Hello, {user?.displayName?.split(' ')[0] || 'Student'}! 👋
              </h2>
              <p className="text-indigo-600 dark:text-indigo-400 font-medium text-sm flex items-center gap-1 mt-0.5">
                <Sparkles size={14} /> Ready to learn today?
              </p>
            </div>
          </motion.div>

          {/* Tuition Videos Section */}
          <motion.div variants={item} className="bg-slate-50/50 dark:bg-slate-900/10 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/40">
            <div className="flex items-center justify-between mb-5 px-1">
              <h3 className="font-bold text-xl flex items-center gap-2 text-slate-800 dark:text-white">
                <PlayCircle className="text-indigo-500" size={26} />
                Tuition Videos <span className="text-xs font-bold text-slate-500 ml-2 hidden sm:inline">(Online Only)</span>
              </h3>
              <button onClick={() => setTab('study')} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 rounded-full uppercase tracking-widest">
                All Library
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {todayRoutine.length === 0 ? (
                <div className="col-span-full app-card rounded-[2rem] border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center bg-white dark:bg-slate-900/50">
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
                      <div className="h-44 bg-slate-800 relative overflow-hidden">
                        <div className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700 ease-in-out opacity-80" style={{ backgroundImage: `url('https://img.youtube.com/vi/${extractId}/mqdefault.jpg')` }}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent"></div>
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
                      <div className="p-5">
                        <h4 className="font-bold text-slate-800 dark:text-white leading-tight line-clamp-2 text-[16px]">{video.title}</h4>
                        <p className="text-xs text-slate-500 mt-2 line-clamp-1">{video.chapterTitle}</p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* New Brain Booster of the Day (Trivia Challenge) */}
          <motion.div variants={item} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-5 opacity-5 pointer-events-none">
              <HelpCircle size={100} />
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center font-bold">
                🧠
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Daily Challenge</span>
                <h3 className="font-extrabold text-lg text-slate-800 dark:text-white flex items-center gap-1.5 leading-none">
                  Brain Booster of the Day
                </h3>
              </div>
            </div>

            <p className="text-[17px] font-bold text-slate-800 dark:text-slate-100 mb-4 px-1">
              {currentBooster.question}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {currentBooster.options.map((opt, oIdx) => {
                const isSelected = selectedOpt === oIdx;
                const isCorrect = oIdx === currentBooster.correct;
                const showSuccess = boosterSolved && isCorrect;
                const showFailure = showExplanation && isSelected && !isCorrect;

                return (
                  <button
                    key={oIdx}
                    disabled={boosterSolved}
                    onClick={() => handleBoosterAnswer(oIdx)}
                    className={`p-3.5 rounded-2xl border text-left font-bold text-sm transition-all flex items-center justify-between ${
                      showSuccess
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                        : showFailure
                        ? 'bg-red-50 dark:bg-red-950/20 border-red-500 text-red-700 dark:text-red-400'
                        : isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <span>{opt}</span>
                    {showSuccess && <Check size={16} className="text-emerald-500" />}
                    {showFailure && <AlertCircle size={16} className="text-red-500" />}
                  </button>
                );
              })}
            </div>

            {showExplanation && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }} 
                className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold border ${
                  boosterSolved 
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/50 text-emerald-800 dark:text-emerald-400'
                    : 'bg-red-50/30 dark:bg-red-950/10 border-red-200/50 text-red-800 dark:text-red-400'
                }`}
              >
                <div className="font-extrabold flex items-center gap-1.5 mb-1 text-slate-800 dark:text-white uppercase tracking-wider text-[11px]">
                  <span>{boosterSolved ? '🎉 Correct Answer! (+1 Point Granted)' : '❌ Incorrect choice'}</span>
                </div>
                <div>{currentBooster.explanation}</div>
              </motion.div>
            )}
          </motion.div>

          {/* Interactive Weekly Micro Calendar Streak tracker */}
          <motion.div variants={item} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="text-indigo-500" size={22} />
                Weekly Study Progress
              </h3>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Stardust Routine
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2.5 sm:gap-4 text-center">
              {WEEK_DAYS.map((day, dIdx) => {
                const isActive = dIdx <= activeWeekIndex;
                const isToday = dIdx === activeWeekIndex;

                return (
                  <div key={dIdx} className="flex flex-col items-center">
                    <span className={`text-[11px] font-black tracking-wider uppercase mb-2 ${isToday ? 'text-indigo-500' : 'text-slate-400'}`}>
                      {day}
                    </span>
                    <div className="w-full relative h-[60px] bg-slate-150 dark:bg-slate-800/40 rounded-2xl overflow-hidden flex flex-col justify-end border border-slate-200/30 dark:border-slate-805/30">
                      {isActive ? (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: isToday ? '75%' : '100%' }}
                          transition={{ delay: dIdx * 0.05, duration: 0.8 }}
                          className={`w-full rounded-2xl ${
                            isToday 
                              ? 'bg-gradient-to-t from-orange-500 to-amber-400' 
                              : 'bg-gradient-to-t from-indigo-500 to-indigo-400'
                          }`}
                        />
                      ) : (
                        <div className="w-full h-2 rounded-full bg-slate-300 dark:bg-slate-700/60 opacity-30 mx-auto mb-2" />
                      )}
                      
                      {isToday && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-bold text-slate-800 dark:text-amber-300 animate-pulse bg-white/90 dark:bg-slate-900/90 px-1.5 py-0.5 rounded-md shadow-sm border border-slate-100 dark:border-slate-800">
                            Now
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Right Column: Mascot, Daily Missions, Live Leaderboard (Sticky on Desktop) */}
        <div className="space-y-6 lg:sticky lg:top-24">
          {/* Mascot & Streak Banner */}
          <motion.div variants={item} className="relative bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 shadow-xl shadow-orange-500/20 overflow-hidden text-white flex gap-4 items-center border border-orange-400/50">
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
              <div className="w-full bg-black/20 rounded-full h-3 backdrop-blur-sm overflow-hidden p-0.5">
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
              className="relative z-10 w-24 h-24 flex-shrink-0 drop-shadow-2xl rounded-[2rem] overflow-hidden border-4 border-white/20 shadow-inner"
            >
               <img src={mascotImg} alt="Mascot" className="w-full h-full object-cover" />
            </motion.div>
          </motion.div>

          {/* Daily Quests Layout */}
          <motion.div variants={item} className="bg-slate-50/50 dark:bg-slate-900/10 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/40">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
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

          {/* Gamified Real-Time Competitive Leaderboard */}
          <motion.div variants={item} className="bg-slate-50/50 dark:bg-slate-900/10 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/40">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                <Users className="text-indigo-500" size={24} />
                Student Leaderboard
              </h3>
              <span className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Live
              </span>
            </div>

            <div className="space-y-2">
              {displayLeaderboard.slice(0, 5).map((player, index) => {
                const isCurrentUser = player.id === user?.uid;
                const position = index + 1;

                // Rank design details
                let rankBg = 'bg-slate-100 dark:bg-slate-800 text-slate-500';
                if (position === 1) rankBg = 'bg-yellow-500 text-white';
                if (position === 2) rankBg = 'bg-slate-300 text-slate-800';
                if (position === 3) rankBg = 'bg-amber-600 text-white';

                return (
                  <motion.div
                    key={player.id}
                    className={`p-3 rounded-2xl border transition-all duration-300 flex items-center gap-3 ${
                      isCurrentUser
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 border-indigo-400 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-xs flex-shrink-0 ${rankBg}`}>
                      {position}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-sm truncate ${isCurrentUser ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                          {player.displayName}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-white text-indigo-600 px-1.5 py-0.5 rounded-md leading-none">
                            You
                          </span>
                        )}
                      </div>
                      <span className={`text-[11px] font-medium block leading-none mt-0.5 ${isCurrentUser ? 'text-indigo-100' : 'text-slate-400'}`}>
                        Level {player.level} • {player.streak}d streak
                      </span>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className={`font-extrabold text-sm ${isCurrentUser ? 'text-white' : 'text-indigo-500'}`}>
                        {player.points} Pts
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

      </div>
    </motion.div>
  );
}
