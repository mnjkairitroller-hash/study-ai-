import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Star, Award, Lock, Sparkles, CheckCircle2, ChevronDown, CheckCircle, Zap, Gift, Gamepad2, Lightbulb, PartyPopper, Crown, Backpack, Shirt, Compass } from 'lucide-react';
import { useAppContext } from '../store';
import { cn, LEVEL_THRESHOLDS } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import confetti from 'canvas-confetti';

const MILESTONE_REWARDS: Record<number, { title: string, reward: string, icon: any, color: string, image: string }> = {
  10: { title: "Milestone", reward: "₹100 Cash", icon: Gift, color: "text-emerald-500", image: "https://iili.io/CxcXdoN.png" },
  20: { title: "Milestone", reward: "₹200 Cash", icon: Gift, color: "text-emerald-500", image: "https://iili.io/Cxjp8oQ.png" },
  30: { title: "Milestone", reward: "₹200 Cash", icon: Gift, color: "text-emerald-500", image: "https://iili.io/CxcLZ8b.png" },
  40: { title: "Milestone", reward: "Study Lamp", icon: Lightbulb, color: "text-amber-500", image: "https://iili.io/CxcDUg9.png" },
  50: { title: "Milestone", reward: "₹300 Cash", icon: Gift, color: "text-emerald-500", image: "https://iili.io/Cxl9wMv.png" },
  60: { title: "Milestone", reward: "₹200 Redeem Code", icon: Gift, color: "text-indigo-500", image: "https://iili.io/CxwKBSV.png" },
  70: { title: "Milestone", reward: "₹500 Cash", icon: Gift, color: "text-emerald-500", image: "https://iili.io/CxtxXEl.png" },
  80: { title: "Epic Reward", reward: "Wheel of Luck (₹100 - ₹500)", icon: Sparkles, color: "text-rose-500", image: "https://iili.io/CxHjB6B.png" },
  90: { title: "Epic Reward", reward: "₹500 Cash + Chocolate", icon: PartyPopper, color: "text-pink-500", image: "https://images.unsplash.com/photo-1548907040-4baa42d10919?w=200&h=200&fit=crop" },
  100: { title: "Grand Reward", reward: "₹1000+ Cash", icon: Crown, color: "text-yellow-500", image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&h=200&fit=crop" }
};

const SPIN_WHEEL_SECTORS = [
  { amount: "₹200 Cash", label: "₹200", angle: 36 },
  { amount: "₹500 Cash", label: "₹500", angle: 108 },
  { amount: "₹100 Cash", label: "₹100", angle: 180 },
  { amount: "₹400 Cash", label: "₹400", angle: 252 },
  { amount: "₹300 Cash", label: "₹300", angle: 324 },
];

export default function AchievementsView() {
  const { userData } = useAppContext();
  const [completedTitles, setCompletedTitles] = useState<string[]>([]);
  const currentLevel = userData?.level || 1;

  const [spinModalOpen, setSpinModalOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [spinResult, setSpinResult] = useState<string | null>(() => {
    return localStorage.getItem('lucky_spin_result_level80');
  });

  const handleStartSpin = () => {
    if (isSpinning || spinResult) return;
    setIsSpinning(true);
    
    const sectorCount = 5;
    const randomIndex = Math.floor(Math.random() * sectorCount);
    const selectedSector = SPIN_WHEEL_SECTORS[randomIndex];
    
    const targetAngle = selectedSector.angle;
    const totalRotation = 360 * 7 - targetAngle; 
    
    setRotationDegrees(totalRotation);
    
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      
      const wonReward = selectedSector.amount;
      setSpinResult(wonReward);
      localStorage.setItem('lucky_spin_result_level80', wonReward);
      setIsSpinning(false);
    }, 4000);
  };

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

  // View goes from Level 1 to 100
  const maxLevelShown = 100;
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-32 pt-6">
      <div className="mb-8 text-center max-w-2xl mx-auto">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Recent Milestones */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
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
        </div>

        {/* Right Column: Level Map */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/40 p-3 sm:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/40 overflow-hidden">
          <h3 className="font-black text-xl mb-4 pl-4 sm:pl-2 text-slate-800 dark:text-white flex items-center gap-2">
            <Award className="text-indigo-500" />
            Level Map & Timeline Tracking
          </h3>

          <div 
            className="relative w-full"
            style={{ height: `${(levels.length > 0 ? levels.length - 1 : 0) * 150 + 160}px` }}
          >
            {/* The Background Winding Line */}
            <svg 
              className="absolute inset-0 pointer-events-none" 
              style={{ width: '100%', height: '100%' }}
            >
              <defs>
                <linearGradient id="gradient-line" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Ghost Line (Unfinished parts) */}
              <path
                d={(() => {
                  const X_CENTER = 60;
                  const AMPLITUDE = 25;
                  const Y_STEP = 150;
                  const getPoint = (i: number) => ({
                    x: X_CENTER + Math.sin((i * Math.PI) / 2) * AMPLITUDE,
                    y: i * Y_STEP + 60,
                  });
                  if (levels.length === 0) return '';
                  let d = `M ${getPoint(0).x} ${getPoint(0).y}`;
                  for (let i = 0; i < levels.length - 1; i++) {
                    const p1 = getPoint(i);
                    const p2 = getPoint(i + 1);
                    d += ` C ${p1.x} ${p1.y + Y_STEP / 2}, ${p2.x} ${p2.y - Y_STEP / 2}, ${p2.x} ${p2.y}`;
                  }
                  return d;
                })()}
                fill="none"
                stroke="currentColor" 
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="12"
                strokeLinecap="round"
              />

              {/* Animated Progress Line */}
              <motion.path
                d={(() => {
                  const X_CENTER = 60;
                  const AMPLITUDE = 25;
                  const Y_STEP = 150;
                  const getPoint = (i: number) => ({
                    x: X_CENTER + Math.sin((i * Math.PI) / 2) * AMPLITUDE,
                    y: i * Y_STEP + 60,
                  });
                  if (levels.length === 0) return '';
                  let d = `M ${getPoint(0).x} ${getPoint(0).y}`;
                  for (let i = 0; i < levels.length - 1; i++) {
                    const p1 = getPoint(i);
                    const p2 = getPoint(i + 1);
                    d += ` C ${p1.x} ${p1.y + Y_STEP / 2}, ${p2.x} ${p2.y - Y_STEP / 2}, ${p2.x} ${p2.y}`;
                  }
                  return d;
                })()}
                fill="none"
                stroke="url(#gradient-line)"
                strokeWidth="12"
                strokeLinecap="round"
                filter="url(#glow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: Math.max(0, Math.min(1, (currentLevel - 1) / (levels.length - 1))) }}
                transition={{ duration: 2.5, ease: "easeInOut" }}
              />
            </svg>

            {/* Nodes and Cards */}
            {levels.map((level, i) => {
              const isUnlocked = level <= currentLevel;
              const isCurrent = level === currentLevel;
              const X_CENTER = 60;
              const AMPLITUDE = 25;
              const Y_STEP = 150;
              const p = {
                x: X_CENTER + Math.sin((i * Math.PI) / 2) * AMPLITUDE,
                y: i * Y_STEP + 60,
              };
              
              return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.2 + 0.5, type: 'spring', bounce: 0.5 }}
                  key={level} 
                  className="absolute w-full"
                  style={{ top: p.y - 32 }} // -32 to vertically center the node (which is h-16 = 64px)
                >
                  {/* Floating "YOU" indicator for current level */}
                  {isCurrent && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 2.5 }}
                      className="absolute flex items-center gap-1"
                      style={{ left: p.x - 70, top: '50%', transform: 'translateY(-50%)' }}
                    >
                      <span className="text-xs font-black text-indigo-500 uppercase tracking-widest animate-pulse">You</span>
                      <ChevronDown size={14} className="text-indigo-500 rotate-[-90deg] animate-pulse" />
                    </motion.div>
                  )}

                  {/* Circular Node */}
                  <div 
                    className={cn(
                      "absolute w-16 h-16 rounded-3xl flex items-center justify-center border-4 shadow-xl transition-all duration-700 ease-out z-10",
                      isCurrent ? "bg-indigo-500 border-indigo-200 dark:border-indigo-900 shadow-indigo-500/40 scale-125 rotate-3" :
                      isUnlocked ? "bg-amber-400 dark:bg-amber-500 border-white dark:border-slate-800" :
                      "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 grayscale scale-90"
                    )}
                    style={{ left: p.x - 32 }}
                  >
                    {isCurrent ? (
                      <Trophy className="text-white drop-shadow-md" size={scaleLevelIcon(level) ? 28 : 24} />
                    ) : isUnlocked ? (
                      <CheckCircle2 className="text-white" size={28} />
                    ) : (
                      <Lock className="text-slate-400" size={24} />
                    )}
                    
                    {isCurrent && (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute -inset-3 border-2 border-dashed border-indigo-400 dark:border-indigo-500/50 rounded-[1.8rem] opacity-70 pointer-events-none"
                      ></motion.div>
                    )}
                  </div>

                  {/* Level Info Card */}
                  <div 
                    className="absolute"
                    style={{ left: p.x + 48, right: 16, top: '50%', transform: 'translateY(-50%)' }}
                  >
                    <div className={cn(
                        "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 sm:p-5 rounded-3xl border shadow-lg relative overflow-hidden group",
                        MILESTONE_REWARDS[level] ? "border-amber-200 dark:border-amber-900/50 shadow-amber-500/10" : "border-slate-200/60 dark:border-slate-800/60"
                      )}>
                      {isUnlocked && !isCurrent && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400 opacity-80"></div>
                      )}
                      {isCurrent && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                      )}
                      {MILESTONE_REWARDS[level] && (
                         <div className="absolute top-0 right-0 py-1 px-3 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-bl-xl shadow-sm">
                            {MILESTONE_REWARDS[level].title}
                         </div>
                      )}
                      <h4 className={cn(
                        "font-black text-xl lg:text-2xl mb-1 sm:mb-1.5 transition-colors",
                        isCurrent ? "text-indigo-600 dark:text-indigo-400" : 
                        MILESTONE_REWARDS[level] ? "text-amber-600 dark:text-amber-500" :
                        isUnlocked ? "text-slate-800 dark:text-white" : "text-slate-400"
                      )}>
                        Level {level}
                      </h4>
                      
                      {MILESTONE_REWARDS[level] && (
                        <div className="flex items-center gap-3 my-2.5 p-2 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 shadow-inner">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 overflow-hidden flex items-center justify-center shrink-0 p-1 shadow-md">
                            <img 
                              src={MILESTONE_REWARDS[level].image} 
                              alt={MILESTONE_REWARDS[level].reward} 
                              className="max-w-full max-h-full object-contain transition-transform duration-300 hover:scale-110"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex flex-col min-w-0 text-left">
                            <span className="text-[10px] sm:text-xs font-black uppercase text-amber-500/80 tracking-wider">Milestone Gift</span>
                            <span className={cn("font-black text-sm sm:text-base leading-tight", MILESTONE_REWARDS[level].color)}>
                              {MILESTONE_REWARDS[level].reward}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs sm:text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        {isUnlocked ? (
                          <span className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400">
                           <Sparkles size={14} /> Completed
                          </span>
                        ) : (
                          `Requires ${LEVEL_THRESHOLDS[level - 1] || level * 500} Pts`
                        )}
                      </p>

                      {level === 80 && (
                        <div className="mt-3">
                          {spinResult ? (
                            <div className="bg-emerald-500/10 dark:bg-emerald-950/30 p-3 sm:p-4 rounded-2xl border border-emerald-500/20 text-center">
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 block mb-1">🎯 Spin Wheel Result</span>
                              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                You won {spinResult}!
                              </p>
                              <span className="text-[10px] text-slate-400 block mt-1 font-bold">Our admin will contact you to send your cash rewards. Claimed!</span>
                            </div>
                          ) : (
                            <div>
                              {isUnlocked ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSpinModalOpen(true);
                                  }}
                                  className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black py-2.5 px-4 rounded-2xl shadow-md text-xs sm:text-sm flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 cursor-pointer outline-none border-none"
                                >
                                  🎡 Spin Standard Lucky Wheel!
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-extrabold py-2.5 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed border-none"
                                >
                                  🔐 Unlock at Level 80 to spin!
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Class 9th Next-Year Preview Teaser Box */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, type: "spring" }}
            className="mt-16 p-6 sm:p-8 rounded-[2rem] bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white border border-indigo-500/20 relative overflow-hidden shadow-xl"
          >
            {/* Background ambient glowing details */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-rose-500/5 rounded-full filter blur-2xl pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
              {/* Class 9th Symbol/Icon badge */}
              <div className="relative shrink-0">
                <div className="absolute -inset-1.5 bg-gradient-to-tr from-amber-400 to-indigo-500 rounded-3xl blur opacity-75 animate-pulse" />
                <div className="relative w-24 h-24 rounded-3xl bg-slate-900 border-2 border-amber-400 flex flex-col items-center justify-center text-center p-2 shadow-inner">
                  <Crown size={32} className="text-amber-400 mb-1" />
                  <span className="font-sans font-black text-xs text-slate-100 uppercase tracking-widest leading-none">Class 9</span>
                </div>
              </div>

              {/* Teaser Introduction info */}
              <div className="flex-1 text-center md:text-left space-y-2">
                <div className="inline-flex items-center gap-1.5 bg-amber-400/10 text-amber-300 font-extrabold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md border border-amber-400/20">
                  <Sparkles size={11} className="inline animate-spin-slow" /> Class 9th Early Access
                </div>
                <h3 className="font-black text-2xl tracking-tight text-white flex items-center gap-2 justify-center md:justify-start">
                  Coming Up: Class 9th Roadmap! 🚀
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-xl">
                  Prepare for the ultimate academic transition. Class 9th CBSE introduces powerful new concepts in Science, Maths, and Social Sciences. Master advanced CBSE objectives, high-tier subject chapters, and board layouts!
                </p>
              </div>
            </div>

            {/* Class 9 subjects breakdown panels */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 border-t border-indigo-500/20 pt-6">
              <div className="p-4 bg-white/5 dark:bg-slate-900/40 rounded-2xl border border-white/5 space-y-1">
                <span className="text-xs font-black text-indigo-400 uppercase tracking-wider block">📐 ADVANCED MATHS</span>
                <p className="text-[11px] text-slate-400 font-medium font-semibold">Real Numbers, Polynomials, Coordinate Geometry, Triangles, Quadrilaterals & advanced Statistics.</p>
              </div>
              <div className="p-4 bg-white/5 dark:bg-slate-900/40 rounded-2xl border border-white/5 space-y-1">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider block">🧬 SCIENCE EXPERT</span>
                <p className="text-[11px] text-slate-400 font-medium font-semibold">Matter in Our Surroundings, Atoms & Molecules, Force & Laws of Motion, Gravitation & Cell Biology.</p>
              </div>
              <div className="p-4 bg-white/5 dark:bg-slate-900/40 rounded-2xl border border-white/5 space-y-1">
                <span className="text-xs font-black text-rose-400 uppercase tracking-wider block">🌍 GLOBAL STUDIES</span>
                <p className="text-[11px] text-slate-400 font-medium font-semibold font-bold">The French Revolution, Nazism, Physical Features of India, Electoral Politics & Food Security.</p>
              </div>
            </div>

            <div className="mt-5 text-center bg-indigo-500/5 border border-indigo-500/10 py-2.5 rounded-xl">
              <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">
                🔥 Reach Level 100 to auto-register for Class 9th Early Bird Boosters & exclusive scholarship badges!
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Lucky Spin Wheel Modal */}
      {spinModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-sm w-full relative shadow-2xl text-center overflow-hidden"
          >
            {/* Close button */}
            <button 
              disabled={isSpinning}
              onClick={() => setSpinModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center disabled:opacity-30 cursor-pointer outline-none border-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full">Level 80 Epic Spin</span>
            <h3 className="font-black text-2xl text-slate-800 dark:text-white mt-3">Lucky Wheel Spin</h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 font-semibold mb-6">
              Spin to win real cash prizes of ₹100, ₹200, ₹300, ₹400 or ₹500! Depend on your luck!
            </p>

            {/* Lucky Wheel Canvas/CSS representation */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto my-6 flex items-center justify-center bg-slate-150 dark:bg-slate-950 rounded-full border-4 border-slate-200 dark:border-slate-800 p-4 shadow-xl">
              
              {/* Pointer Arrow */}
              <div className="absolute top-0 z-30 transform -translate-y-2 flex flex-col items-center">
                <div className="w-5 h-7 bg-red-600 rounded-b-full filter drop-shadow-md animate-bounce" />
                <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-red-600" />
              </div>

              {/* Wheel Body */}
              <div 
                className="absolute inset-2 rounded-full overflow-hidden transition-transform ease-out shadow-inner"
                style={{
                  backgroundImage: "conic-gradient(#f43f5e 0deg 72deg, #f59e0b 72deg 144deg, #10b981 144deg 216deg, #3b82f6 216deg 288deg, #8b5cf6 288deg 360deg)",
                  transform: `rotate(${rotationDegrees}deg)`,
                  transition: isSpinning ? 'transform 4s cubic-bezier(0.1, 0.8, 0.2, 1)' : 'none'
                }}
              >
                {SPIN_WHEEL_SECTORS.map((sec, idx) => (
                  <div 
                    key={idx}
                    className="absolute inset-0 flex items-start justify-center"
                    style={{ transform: `rotate(${sec.angle}deg)` }}
                  >
                    <span className="mt-8 font-black text-sm sm:text-base tracking-wider text-white select-none drop-shadow-md">
                      {sec.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Center Circle Hub */}
              <div className="absolute w-12 h-12 rounded-full bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center z-20">
                <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-black text-white text-[10px] select-none">
                  LUCK
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              {spinResult ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/20">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider">CONGRATULATIONS!</p>
                  <h4 className="text-lg font-black text-emerald-600 dark:text-emerald-400">Won {spinResult}!</h4>
                  <button
                    onClick={() => setSpinModalOpen(false)}
                    className="mt-3 w-full bg-slate-800 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs sm:text-sm cursor-pointer outline-none border-none"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartSpin}
                  disabled={isSpinning}
                  className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black py-3 px-6 rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer outline-none border-none"
                >
                  {isSpinning ? "🎡 Spinning..." : "🔥 SPIN THE WHEEL!"}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// simple helper just for icon
function scaleLevelIcon(level: number) {
  return level % 5 === 0;
}
