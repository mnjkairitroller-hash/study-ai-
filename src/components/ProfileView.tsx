import React, { useState, useEffect } from 'react';
import { useAppContext } from '../store';
import { auth, db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, where, doc, getDoc } from 'firebase/firestore';
import { LogOut, Palette, Ticket, Shield, Lock, Calendar, CheckCircle2, Clock3, AlertTriangle, Sparkles, PlayCircle, Star, GraduationCap, RefreshCcw } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { getLevelInfo } from '../lib/utils';

export default function ProfileView() {
  const { userData, user, setTheme, setDeletePin, refreshUserData, updateUserData, restoreProgressFromEmail } = useAppContext();
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinSaved, setPinSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);
  const [activeDayTab, setActiveDayTab] = useState<'today' | 'tomorrow' | 'dayAfter'>('today');

  // Multi-Account Progress Swap & Recovery States
  const [backupsDetail, setBackupsDetail] = useState<Record<string, any>>({});
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');
  const [isRestoring, setIsRestoring] = useState<string | null>(null);

  // Points Adjustment States
  const [adjustPointsPinInput, setAdjustPointsPinInput] = useState('');
  const [pointsAmountInput, setPointsAmountInput] = useState('');
  const [adjustAction, setAdjustAction] = useState<'increase' | 'decrease'>('increase');
  const [adjustError, setAdjustError] = useState('');
  const [adjustSuccess, setAdjustSuccess] = useState('');

  const themes = [
    { id: 'slate', name: 'Classic Slate', color: 'bg-slate-900 border-slate-700' },
    { id: 'sakura', name: 'Sakura Pink', color: 'bg-pink-100 border-pink-300' },
    { id: 'emerald', name: 'Emerald', color: 'bg-emerald-100 border-emerald-300' },
    { id: 'sunset', name: 'Sunset', color: 'bg-orange-100 border-orange-300' },
    { id: 'cyberpunk', name: 'Cyberpunk', color: 'bg-zinc-900 border-yellow-500' },
    { id: 'lavender', name: 'Sweet Lavender', color: 'bg-violet-100 border-violet-300' },
    { id: 'honey', name: 'Cozy Honey', color: 'bg-amber-100 border-amber-300' },
    { id: 'ocean', name: 'Minty Ocean', color: 'bg-teal-100 border-teal-300' },
    { id: 'peach', name: 'Sweet Peach', color: 'bg-orange-100 border-orange-200' },
    { id: 'nebula', name: 'Cosmic Dream', color: 'bg-indigo-950 border-purple-500' },
  ];

  // Subscribe to all chapters so we have real subjects, topics, and video parts
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chapters'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChapters(list);
    }, (err) => {
      console.error("Error fetching chapters for Timetable:", err);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch the latest backups of family accounts
  const fetchBackups = async () => {
    if (!user) return;
    const familyEmails = ['mnjkairi1@gmail.com', 'mnjkairitroller@gmail.com', 'pavanffm@gmail.com'];
    const details: Record<string, any> = {};
    try {
      for (const email of familyEmails) {
        const docRef = doc(db, 'family_backups', email);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          details[email] = snap.data();
        } else {
          details[email] = null;
        }
      }
      setBackupsDetail(details);
    } catch (err) {
      console.error("Error prefetching family backups:", err);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, [user, userData?.points]);

  if (!userData) return null;

  // Subjects styling helper
  const getSubjectStyles = (subject: string) => {
    const s = subject?.toLowerCase() || '';
    if (s.includes('math')) {
      return 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30';
    }
    if (s.includes('sci')) {
      return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30';
    }
    if (s.includes('eng')) {
      return 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30';
    }
    if (s.includes('comp') || s.includes('cod')) {
      return 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30';
    }
    if (s.includes('hist') || s.includes('soc')) {
      return 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
    }
    return 'bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800/30';
  };

  // Automated 3-day scheduling generator based on all available chapter material in the database
  const getTimelineLessons = () => {
    if (!chapters.length) return { today: [], tomorrow: [], dayAfter: [] };

    const completed = userData.completedLessons || [];

    // Group chapters by subject
    const chaptersBySubject: Record<string, any[]> = {};
    chapters.forEach(chapter => {
      const subject = chapter.subject || 'Other';
      if (!chaptersBySubject[subject]) {
        chaptersBySubject[subject] = [];
      }
      chaptersBySubject[subject].push(chapter);
    });

    // Sort subjects by priority
    const sortedSubjects = Object.keys(chaptersBySubject).sort((a, b) => {
      const priorities: Record<string, number> = { 'Math': 1, 'Science': 2, 'English': 3 };
      const prioA = priorities[a] || 99;
      const prioB = priorities[b] || 99;
      if (prioA !== prioB) return prioA - prioB;
      return a.localeCompare(b);
    });

    // For each subject, flat-map all video parts in chronological sequence (respects chronological chapter unlocked sequence)
    const subjectQueues: Record<string, any[]> = {};
    sortedSubjects.forEach(subject => {
      const subjectChapters = [...chaptersBySubject[subject]].sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeA - timeB;
      });

      const queue: any[] = [];
      subjectChapters.forEach(ch => {
        if (ch.videos && ch.videos.length > 0) {
          ch.videos.forEach((vid: any, vidIdx: number) => {
            queue.push({
              ...vid,
              subject,
              chapterTitle: ch.title,
              chapterId: ch.id,
              partNumber: vidIdx + 1
            });
          });
        }
      });
      subjectQueues[subject] = queue;
    });

    // Establish Today's active learning list
    const todayStr = new Date().toDateString();
    let todayLessons: any[] = [];

    const getWeekdayForOffset = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return d.getDay();
    };

    if (userData.currentRoutine && userData.currentRoutine.date === todayStr) {
      // Keep today's assigned videos stable based on dashboard routine
      todayLessons = userData.currentRoutine.videos || [];
    } else {
      // Dynamic fallback
      const todayDay = new Date().getDay();
      const isEnglishDay = todayDay === 1 || todayDay === 4;

      sortedSubjects.forEach(subject => {
        const isEnglish = (subject?.toLowerCase() || '').includes('eng');
        if (isEnglish && !isEnglishDay) return;

        const isMath = (subject?.toLowerCase() || '').includes('math');
        const requiredVideos = (isMath && !isEnglishDay) ? 2 : 1;

        const queue = subjectQueues[subject] || [];
        const uncompleted = queue.filter(vid => !completed.includes(vid.id));
        
        for (let i = 0; i < Math.min(requiredVideos, uncompleted.length); i++) {
          todayLessons.push(uncompleted[i]);
        }
      });
    }

    // Project Tomorrow's list (sequentially next videos!)
    const tomorrowLessons: any[] = [];
    const dayAfterLessons: any[] = [];

    sortedSubjects.forEach(subject => {
      const isEnglish = (subject?.toLowerCase() || '').includes('eng');
      const isMath = (subject?.toLowerCase() || '').includes('math');
      const queue = subjectQueues[subject] || [];
      
      const todayVids = todayLessons.filter(v => v.subject === subject);
      let lastViewedIdx = -1;
      
      if (todayVids.length > 0) {
        lastViewedIdx = queue.findIndex(v => v.id === todayVids[todayVids.length - 1].id);
      } else {
         const firstUncompleted = queue.findIndex(v => !completed.includes(v.id));
         lastViewedIdx = firstUncompleted === -1 ? -1 : firstUncompleted - 1;
      }

      // Calculate Tomorrow
      const tomorrowDay = getWeekdayForOffset(1);
      const tomorrowEnglishDay = tomorrowDay === 1 || tomorrowDay === 4;
      if (!isEnglish || tomorrowEnglishDay) {
        const requiredTomorrow = (isMath && !tomorrowEnglishDay) ? 2 : 1;
        for (let i = 1; i <= requiredTomorrow; i++) {
           if (lastViewedIdx + i < queue.length) {
             tomorrowLessons.push(queue[lastViewedIdx + i]);
           }
        }
        lastViewedIdx += requiredTomorrow; // advance cursor
      }

      // Calculate Day After
      const dayAfterDay = getWeekdayForOffset(2);
      const dayAfterEnglishDay = dayAfterDay === 1 || dayAfterDay === 4;
      if (!isEnglish || dayAfterEnglishDay) {
        const requiredDayAfter = (isMath && !dayAfterEnglishDay) ? 2 : 1;
        for (let i = 1; i <= requiredDayAfter; i++) {
          if (lastViewedIdx + i < queue.length) {
            dayAfterLessons.push(queue[lastViewedIdx + i]);
          }
        }
      }
    });

    return {
      today: todayLessons,
      tomorrow: tomorrowLessons,
      dayAfter: dayAfterLessons
    };
  };

  const timetable = getTimelineLessons();
  const currentDaysList = 
    activeDayTab === 'today' ? timetable.today : 
    activeDayTab === 'tomorrow' ? timetable.tomorrow : 
    timetable.dayAfter;

  const handleSavePin = () => {
    setErrorMessage('');
    const newPinClean = pinInput.trim();

    if (userData.deletePin) {
      if (currentPinInput.trim() !== userData.deletePin) {
        setErrorMessage('Incorrect current PIN ❌');
        return;
      }
      if (!newPinClean) {
        setErrorMessage('Please enter a new PIN');
        return;
      }
      if (newPinClean.length !== 6 || !/^\d+$/.test(newPinClean)) {
        setErrorMessage('New PIN must be exactly 6 digits');
        return;
      }
      setDeletePin(newPinClean);
      setCurrentPinInput('');
      setPinInput('');
      setPinSaved(true);
      setTimeout(() => setPinSaved(false), 3000);
    } else {
      if (!newPinClean) {
        setErrorMessage('Please enter a PIN');
        return;
      }
      if (newPinClean.length !== 6 || !/^\d+$/.test(newPinClean)) {
        setErrorMessage('PIN must be exactly 6 digits');
        return;
      }
      setDeletePin(newPinClean);
      setPinInput('');
      setPinSaved(true);
      setTimeout(() => setPinSaved(false), 3000);
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      await refreshUserData();
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setIsSyncing(false), 800); // Small delay for UX
    }
  };

  const handleRestore = async (sourceEmail: string) => {
    if (!window.confirm(`Kya aap sach me "${sourceEmail}" ka complete progress is account me copy karna chahte hain?`)) {
      return;
    }
    setIsRestoring(sourceEmail);
    setRestoreError('');
    setRestoreSuccess('');
    try {
      if (restoreProgressFromEmail) {
        const res = await restoreProgressFromEmail(sourceEmail);
        if (res.success) {
          setRestoreSuccess(`Success! "${sourceEmail}" ka progress is account me safely clone ho gaya hai. Level ${res.backup.level} (XP: ${res.backup.points}) set ho chuka hai! 🎉`);
          fetchBackups(); // Reload state
        }
      } else {
        throw new Error("Oops! Restore function active nahi hai.");
      }
    } catch (err: any) {
      setRestoreError(err.message || "Progress copy karne me error aaya.");
    } finally {
      setIsRestoring(null);
    }
  };

  const getDayCompletedCount = (items: any[]) => {
    const completed = userData.completedLessons || [];
    return items.filter(v => completed.includes(v.id)).length;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-32 space-y-8 text-left">
      {/* Profile Header */}
      <div className="flex flex-col items-center mt-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white text-4xl font-bold shadow-xl mb-4 border-4 border-white/10">
          {user?.displayName?.charAt(0) || 'U'}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-center">{user?.displayName || 'Student'}</h2>
        <p className="app-text-muted text-center">{user?.email}</p>
        <div className="mt-2 text-sm font-bold bg-black/10 dark:bg-white/10 px-3 py-1 rounded-full uppercase tracking-wider">
          Level {userData.level} Explorer
        </div>
      </div>

      {/* 📅 Cute Personalized 3-Day Study Timetable */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="font-black text-xl flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Calendar className="text-indigo-500 animate-pulse" size={24} />
              Personalized 3-Day Study Planner
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Your automated study schedule computed dynamically from uploaded topics. Study daily to win streaks!
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 p-1 bg-slate-50 dark:bg-slate-950 rounded-xl self-start border border-slate-100/50 dark:border-slate-800/80">
            <button
              onClick={() => setActiveDayTab('today')}
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                activeDayTab === 'today'
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              🗓️ Today
              {timetable.today.length > 0 && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  getDayCompletedCount(timetable.today) === timetable.today.length
                    ? 'bg-emerald-500 text-white border border-emerald-400/20'
                    : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                }`}>
                  {getDayCompletedCount(timetable.today)}/{timetable.today.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveDayTab('tomorrow')}
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                activeDayTab === 'tomorrow'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              🌅 Tomorrow
              {timetable.tomorrow.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black bg-slate-500/15 text-slate-600 dark:text-slate-400">
                  {timetable.tomorrow.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveDayTab('dayAfter')}
              className={`px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                activeDayTab === 'dayAfter'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              🚀 Next Day
              {timetable.dayAfter.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black bg-slate-500/15 text-slate-600 dark:text-slate-400">
                  {timetable.dayAfter.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* List of lessons */}
        {currentDaysList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-850 px-4">
            <GraduationCap className="text-indigo-400/50 mb-3" size={48} />
            <h4 className="font-bold text-slate-700 dark:text-slate-300">All Caught Up!</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1 whitespace-pre-wrap leading-relaxed text-center">
              No lessons scheduled for this day, or all materials have been fully mastered. Ask your parents/teachers to upload chapters to study! 📚
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentDaysList.map((video: any) => {
              const isCompleted = userData.completedLessons?.includes(video.id);
              const durationMin = video.duration ? Math.round(video.duration / 60) : 20;

              return (
                <div 
                  key={video.id}
                  className={`p-4 rounded-2xl transition-all border flex flex-col justify-between h-40 ${
                    isCompleted 
                      ? 'border-emerald-300 dark:border-emerald-900 bg-emerald-500/5 dark:bg-emerald-950/10 shadow-sm relative overflow-hidden' 
                      : activeDayTab === 'today'
                        ? 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/5 dark:bg-indigo-950/5 hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-md'
                        : 'border-slate-100 dark:border-slate-800/85 hover:border-slate-300 bg-slate-50/40'
                  }`}
                >
                  {isCompleted && (
                    <div className="absolute right-[-15px] top-[15px] bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest px-5 py-1 rotate-45 shadow-sm">
                      Done ✨
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-1">
                      <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full ${getSubjectStyles(video.subject)}`}>
                        {video.subject}
                      </span>
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/20 shadow-sm">
                          <CheckCircle2 size={10} strokeWidth={3} className="text-emerald-500" /> Completed
                        </span>
                      ) : activeDayTab === 'today' ? (
                        <span className="flex items-center gap-1 text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/10">
                          <Clock3 size={10} /> Active Today
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/20">
                          <Lock size={10} /> Upcoming
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-1 pr-6">
                        {video.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 font-medium">
                        Chapter: {video.chapterTitle || 'Lessons'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/45">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock3 size={12} /> {durationMin} Mins
                    </span>

                    {isCompleted ? (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={13} strokeWidth={3} /> +50 XP Complete
                      </span>
                    ) : activeDayTab === 'today' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase text-pink-500 bg-pink-100/30 px-1.5 py-0.5 rounded">
                          +50 XP
                        </span>
                        <span className="text-xs font-black text-indigo-500 flex items-center gap-1 select-none animate-pulse">
                          Start on Dashboard <PlayCircle size={14} />
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 select-none font-medium">
                        Unlocks tomorrow <Lock size={11} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rollover Warning notice */}
        <div className="bg-rose-50/30 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/40 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={18} />
          <div className="space-y-1 text-left">
            <h5 className="text-xs font-black text-rose-500 uppercase tracking-wide flex items-center gap-1.5">
              Study Streak & discipline policy
            </h5>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
              Missed lessons are rolled over to the next day's active list with a minor study penalty (-30 to -40 XP deducted) to help you stay on track! Finish today's tasks to keep your daily streak glowing! 💖
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column on Desktop */}
        <div className="space-y-6">
          <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/10 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800/40">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Palette className="text-pink-500" />
              Theme Customization
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    userData.theme === t.id ? 'border-primary shadow-md scale-[1.02]' : 'border-transparent app-card opacity-70 hover:opacity-100 hover:scale-[1.01]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full border shadow-inner ${t.color}`}></div>
                  <span className="text-xs font-bold leading-tight text-center">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 🪙 Parent Points Controller Card */}
          <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/10 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800/40">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Sparkles className="text-yellow-500 animate-pulse text-left animate-duration-1000" />
              Parent/Teacher Points Controller
            </h3>
            <div className="app-card rounded-2xl p-4 border space-y-4 text-left">
              <p className="text-sm app-text-muted">
                Increase or decrease student's points directly. The student's explorer levels will automatically update on the dashboard and system.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustAction('increase')}
                  className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    adjustAction === 'increase'
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  ➕ Increase Points
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustAction('decrease')}
                  className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    adjustAction === 'decrease'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  ➖ Decrease Points
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Points Amount
                  </label>
                  <input
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="e.g. 100"
                    min={1}
                    value={pointsAmountInput}
                    onChange={(e) => {
                      setAdjustError('');
                      setAdjustSuccess('');
                      setPointsAmountInput(e.target.value.replace(/\D/g, ''));
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Teacher PIN
                  </label>
                  <input
                    type="password"
                    placeholder="••••• •"
                    maxLength={6}
                    value={adjustPointsPinInput}
                    onChange={(e) => {
                      setAdjustError('');
                      setAdjustSuccess('');
                      setAdjustPointsPinInput(e.target.value.replace(/\D/g, ''));
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest text-sm"
                  />
                </div>
              </div>

              <button
                onClick={async () => {
                  setAdjustError('');
                  setAdjustSuccess('');
                  if (!userData?.deletePin) {
                    setAdjustError('Please set a Teacher PIN first in the form below! 🔒');
                    return;
                  }
                  if (adjustPointsPinInput !== userData.deletePin) {
                    setAdjustError('Incorrect Teacher PIN / Password! ❌');
                    return;
                  }
                  const amount = parseInt(pointsAmountInput, 10);
                  if (isNaN(amount) || amount <= 0) {
                    setAdjustError('Please specify a valid positive points amount! 🔢');
                    return;
                  }

                  try {
                    const adjustment = adjustAction === 'increase' ? amount : -amount;
                    const newPoints = Math.max(0, (userData.points || 0) + adjustment);
                    const { level: newLevel } = getLevelInfo(newPoints);

                    await updateUserData({
                      points: newPoints,
                      level: newLevel
                    });

                    setAdjustSuccess(`Successfully ${adjustAction === 'increase' ? 'added' : 'subtracted'} ${amount} points! New Level: ${newLevel} 🎉`);
                    setPointsAmountInput('');
                    setAdjustPointsPinInput('');
                  } catch (err) {
                    console.error(err);
                    setAdjustError('Failed to update points.');
                  }
                }}
                className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold rounded-xl transition text-xs shadow-md shadow-indigo-650/10 cursor-pointer font-sans"
              >
                Apply Points Adjustment
              </button>

              {adjustError && (
                <p className="text-red-500 text-xs font-bold text-center bg-red-50 dark:bg-red-950/20 py-2 rounded-xl border border-red-100 dark:border-red-900/40">
                  {adjustError}
                </p>
              )}
              {adjustSuccess && (
                <p className="text-emerald-500 text-xs font-bold text-center bg-emerald-50 dark:bg-emerald-950/20 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  {adjustSuccess}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/10 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800/40">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Lock className="text-indigo-500" />
              Teacher PIN (For Deletions)
            </h3>
            <div className="app-card rounded-2xl p-4 border space-y-4 text-left">
               <p className="text-sm app-text-muted">Choose a 6-digit PIN to authorize deletion of chapters and subjects or to bypass video quest completions.</p>
               
               {userData.deletePin ? (
                 <div className="space-y-3">
                   <div>
                     <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Current PIN</label>
                     <input
                        type="password"
                        placeholder="••••••"
                        maxLength={6}
                        value={currentPinInput}
                        onChange={(e) => {
                          setErrorMessage('');
                          setCurrentPinInput(e.target.value.replace(/\D/g, ''));
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest text-base"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">New PIN</label>
                     <input
                        type="password"
                        placeholder="••••••"
                        maxLength={6}
                        value={pinInput}
                        onChange={(e) => {
                          setErrorMessage('');
                          setPinInput(e.target.value.replace(/\D/g, ''));
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest text-base"
                     />
                   </div>
                 </div>
               ) : (
                 <div>
                   <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Set New PIN (6 Digits)</label>
                   <input
                      type="password"
                      placeholder="••••••"
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => {
                        setErrorMessage('');
                        setPinInput(e.target.value.replace(/\D/g, ''));
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest text-base"
                   />
                 </div>
               )}

               <div className="pt-2">
                 <button 
                    onClick={handleSavePin}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold rounded-xl transition"
                 >
                    {userData.deletePin ? "Reset PIN Key" : "Save PIN Key"}
                 </button>
               </div>

               {errorMessage && (
                 <p className="text-red-500 text-xs font-bold text-center bg-red-50 dark:bg-red-950/20 py-2 rounded-xl border border-red-100 dark:border-red-900/40">
                   {errorMessage}
                 </p>
               )}
               {pinSaved && (
                 <p className="text-green-500 text-xs font-bold text-center bg-green-50 dark:bg-green-950/20 py-2 rounded-xl border border-green-100 dark:border-green-900/40">
                   PIN reset & updated successfully! 🎉
                 </p>
               )}
            </div>
          </div>
        </div>

        {/* Right Column on Desktop */}
        <div className="space-y-6 text-left">
          <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/10 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800/40">
            <h3 className="font-bold text-lg flex items-center gap-2 text-left">
              <Ticket className="text-yellow-500" />
              My Coupons
            </h3>
            {userData.rewards.length === 0 ? (
              <div className="text-center py-8 app-card rounded-2xl border border-dashed opacity-50">
                <p className="text-sm font-medium">No coupons yet. Head to the store!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {userData.rewards.map((code, idx) => (
                  <div key={idx} className="app-card border rounded-xl p-4 flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <Shield className="text-green-500 opacity-50" size={20} />
                      <code className="font-mono font-bold tracking-wider">{code}</code>
                    </div>
                    <button className="text-xs font-bold app-text-muted hover:opacity-100 uppercase">Copy</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🔄 Data Sync & Rescue Section */}
          <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/10 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800/40">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <RefreshCcw className={`text-blue-500 ${isSyncing ? 'animate-spin' : ''}`} />
              Data Synchronization
            </h3>
            <div className="app-card rounded-2xl p-4 border space-y-3 text-left">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manually force-reload your stats from the cloud database if things look out of sync.
              </p>
              <button 
                onClick={handleSyncData}
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 active:scale-[0.99] text-blue-700 dark:text-blue-400 font-black rounded-xl transition text-xs border border-blue-100 dark:border-blue-900/30 cursor-pointer"
              >
                <RefreshCcw size={14} className={isSyncing ? 'animate-spin' : ''} />
                {isSyncing ? "Syncing stats..." : "Check & Sync Active Profile"}
              </button>
            </div>
          </div>

          <div className="space-y-4 bg-indigo-50/10 dark:bg-indigo-950/5 p-5 rounded-[2rem] border border-indigo-100/50 dark:border-indigo-950/50">
            <h3 className="font-bold text-lg flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="text-indigo-500 animate-pulse" />
              Progress Swap & Recovery Panel
            </h3>
            <div className="app-card rounded-2xl p-4 border bg-white dark:bg-slate-900 space-y-4 text-left">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                SikhQuest account disaster protection active! ⚙️ <br />
                Aap logged-in accounts ya niche diye gaye family keys se saved progress ko is active account me safely clone (copy) kar sakte hain, taaki aapka levels, points, and streak kabhi lost na ho.
              </p>

              {/* Recovery Status Messages */}
              {restoreSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30 rounded-xl text-xs font-bold leading-normal">
                  {restoreSuccess}
                </div>
              )}
              {restoreError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30 rounded-xl text-xs font-bold leading-normal">
                  {restoreError}
                </div>
              )}

              <div className="space-y-3">
                {['mnjkairi1@gmail.com', 'mnjkairitroller@gmail.com', 'pavanffm@gmail.com'].map((familyEmail) => {
                  const backup = backupsDetail[familyEmail];
                  const isActive = user?.email?.toLowerCase() === familyEmail;
                  
                  return (
                    <div 
                      key={familyEmail} 
                      className={`p-3 rounded-xl border transition-all ${
                        isActive 
                          ? 'bg-indigo-50/20 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900' 
                          : 'bg-slate-50/40 dark:bg-slate-900/10 border-slate-150 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className="font-mono text-[11px] font-black text-slate-700 dark:text-slate-300 break-all select-all">
                          {familyEmail}
                        </span>
                        {isActive && (
                          <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded bg-indigo-500 text-white animate-pulse">
                            Active User
                          </span>
                        )}
                      </div>

                      {backup ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-950/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                              🏆 Level {backup.level} Explorer ({backup.points} XP)
                            </p>
                            <p className="text-[9px] text-slate-400 font-semibold">
                              🔥 {backup.streak} Days Streak • Completed: {backup.completedLessons?.length || 0} tasks
                            </p>
                          </div>

                          <button
                            onClick={() => handleRestore(familyEmail)}
                            disabled={!!isRestoring}
                            className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition-all shadow-sm ${
                              isRestoring === familyEmail
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-500 to-semibold text-white hover:opacity-90 active:scale-[0.98] cursor-pointer bg-indigo-600'
                            }`}
                          >
                            {isRestoring === familyEmail ? "Copying..." : "Clone to ID 🔄"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-950/20 p-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-850">
                          <span className="text-[10px] text-slate-400 font-semibold italic">No backup on Cloud yet</span>
                          <button
                            onClick={async () => {
                              try {
                                if (isActive) {
                                  // Trigger immediate update
                                  await updateUserData({ lastActive: new Date().toISOString() });
                                  fetchBackups();
                                } else {
                                  alert(`Backup is automatic when logged in as ${familyEmail}. Log in with that email to save its status first!`);
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-600 dark:text-slate-400 rounded-md font-bold text-[9px] uppercase cursor-pointer"
                          >
                            {isActive ? "Backup Now ⬆️" : "Info"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={() => signOut(auth)}
              className="w-full py-4 rounded-xl border border-red-500/30 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-sm"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
