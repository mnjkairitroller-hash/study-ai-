import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../store';
import confetti from 'canvas-confetti';
import { Save, CheckCircle, ArrowLeft, PenTool, Clock, Brain, Sparkles, Check, X, Award, AlertCircle, RotateCcw, ChevronRight, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

function getCleanVideoUrl(url: string) {
  if (!url) return '';
  // Check if it's an iframe tag
  const iframeMatch = url.match(/src=["']([^"']+)["']/);
  if (iframeMatch) {
    return iframeMatch[1];
  }
  return url;
}

function extractYtId(url: string) {
  if (!url) return '';
  const cleanUrl = getCleanVideoUrl(url);
  const match = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
  if (match && match[1]) {
    return match[1];
  }
  // Try fallback split
  if (cleanUrl.includes('v=')) {
    const parts = cleanUrl.split('v=');
    if (parts[1]) {
      const id = parts[1].substring(0, 11);
      if (id.length === 11) return id;
    }
  }
  if (cleanUrl.includes('embed/')) {
    const parts = cleanUrl.split('embed/');
    if (parts[1]) {
      const id = parts[1].substring(0, 11);
      if (id.length === 11) return id;
    }
  }
  if (cleanUrl.includes('youtu.be/')) {
    const parts = cleanUrl.split('youtu.be/');
    if (parts[1]) {
      const id = parts[1].substring(0, 11);
      if (id.length === 11) return id;
    }
  }
  // If it's just an 11-character token, return it
  if (cleanUrl.trim().length === 11 && !cleanUrl.includes('/') && !cleanUrl.includes('.')) {
    return cleanUrl.trim();
  }
  return '';
}

export default function VideoPlayerView({ video, setTab, hasActiveChapter }: { video: any, setTab: (tab: string) => void, hasActiveChapter?: boolean }) {
  const { markLessonComplete, updateLessonProgress, userData, addPoints, user } = useAppContext();
  const [notes, setNotes] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  const playerRef = useRef<any>(null);
  const userId = user?.uid || '';

  // Quiz-specific states
  const [quizQuestions, setQuizQuestions] = useState<any[]>(() => {
    try {
      const prefix = userId ? `${userId}_` : '';
      const saved = localStorage.getItem(`${prefix}quiz_questions_${video.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  
  const [currentQuizStep, setCurrentQuizStep] = useState(0); // 0 = Intro, 1 = Active quiz, 2 = Completed
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);
  
  // Track claim points
  const [pointsClaimed, setPointsClaimed] = useState<boolean>(() => {
    const prefix = userId ? `${userId}_` : '';
    return localStorage.getItem(`${prefix}quiz_claimed_${video.id}`) === 'true';
  });

  const handleGenerateQuiz = async () => {
    setIsLoadingQuiz(true);
    setQuizError(null);
    try {
      const res = await fetch('/api/gemini/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: video.title,
          description: video.description || ""
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate study quiz');
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.questions)) {
        setQuizQuestions(data.questions);
        const prefix = userId ? `${userId}_` : '';
        localStorage.setItem(`${prefix}quiz_questions_${video.id}`, JSON.stringify(data.questions));
        setCurrentQuizStep(1); // Go to Active quiz directly
      } else {
        throw new Error('Invalid quiz response from server');
      }
    } catch (err: any) {
      console.error(err);
      setQuizError(err.message || 'Error creating study quiz');
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  // Load initial progress from Firebase
  const initialWatchedSeconds = userData?.lessonProgress?.[video.id] || 0;
  const [watchedSeconds, setWatchedSeconds] = useState(initialWatchedSeconds);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [actualSecondsWatched, setActualSecondsWatched] = useState<number>(() => {
    try {
      const prefix = userId ? `${userId}_` : '';
      const saved = localStorage.getItem(`${prefix}actual_seconds_watched_${video.id}`);
      if (saved) {
        return Number(saved);
      }
    } catch {}
    return initialWatchedSeconds;
  });

  // Limit/cap actual seconds watched at video duration
  useEffect(() => {
    if (duration > 0 && actualSecondsWatched > duration) {
      setActualSecondsWatched(duration);
    }
  }, [duration, actualSecondsWatched]);

  useEffect(() => {
    // Reset local state when video or user changes
    const prefix = userId ? `${userId}_` : '';
    setNotes('');
    setIsCompleted(false);
    
    // Sync pointsClaimed
    const claimedSaved = localStorage.getItem(`${prefix}quiz_claimed_${video.id}`) === 'true';
    setPointsClaimed(claimedSaved);

    // Sync quiz questions
    let qs: any[] = [];
    try {
      const qsSaved = localStorage.getItem(`${prefix}quiz_questions_${video.id}`);
      if (qsSaved) qs = JSON.parse(qsSaved);
    } catch {}
    setQuizQuestions(qs);
    setCurrentQuizStep(0); 
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setQuizScore(0);
    setHasAnsweredCurrent(false);

    // Sync actual seconds watched
    const initProg = userData?.lessonProgress?.[video.id] || 0;
    setWatchedSeconds(initProg);
    lastSavedProgressRef.current = initProg;
    lastPlayheadRef.current = initProg;

    let actualSec = initProg;
    try {
      const savedActual = localStorage.getItem(`${prefix}actual_seconds_watched_${video.id}`);
      if (savedActual) {
        actualSec = Number(savedActual);
      }
    } catch {}
    setActualSecondsWatched(actualSec);
  }, [video.id, userId]);

  const isAlreadyCompleted = userData?.completedLessons?.includes(video.id);

  // Refs to handle auto-saving without stale closures or spamming firestore
  const lastSavedProgressRef = useRef<number>(initialWatchedSeconds);
  const lastPlayheadRef = useRef<number>(initialWatchedSeconds);
  const saveProgressRef = useRef<(time: number, force?: boolean) => void>(() => {});

  saveProgressRef.current = async (currentTime: number, force = false) => {
    const rounded = Math.floor(currentTime);
    if (rounded <= 0 || isAlreadyCompleted) return;

    // Only setWatchedSeconds if it's a real update from the player
    setWatchedSeconds(currentTime);

    const diff = Math.abs(rounded - lastSavedProgressRef.current);
    // Speed limits: Save if changed by 20+ seconds, or forced on pause/unmount, or reached end of video
    if (force || diff >= 20 || (duration > 0 && rounded >= Math.floor(duration))) {
      lastSavedProgressRef.current = rounded;
      try {
        await updateLessonProgress(video.id, rounded);
      } catch (err) {
        console.error("Auto-save lesson progress error:", err);
      }
    }
  };

  // Setup the official window.YT.Player on the iframe to capture real status only
  useEffect(() => {
    let ytPlayer: any = null;
    let destroyed = false;

    const initPlayer = () => {
      if (destroyed) return;
      try {
        const elementId = `yt-player-${video.id}`;
        const element = document.getElementById(elementId);
        if (!element) {
          setTimeout(initPlayer, 100);
          return;
        }

        ytPlayer = new window.YT.Player(elementId, {
          events: {
            onReady: (event: any) => {
              if (destroyed) return;
              try {
                const d = event.target.getDuration();
                if (d > 0) {
                  setDuration(d);
                }
                if (initialWatchedSeconds > 0) {
                  event.target.seekTo(initialWatchedSeconds, true);
                  lastPlayheadRef.current = initialWatchedSeconds;
                }
              } catch (e) {
                console.error("Error in onReady:", e);
              }
            },
            onStateChange: (event: any) => {
              if (destroyed) return;
              try {
                if (event.data === 1) { // PLAYING (1)
                  setIsPlaying(true);
                  if (event.target && typeof event.target.getCurrentTime === 'function') {
                    lastPlayheadRef.current = event.target.getCurrentTime();
                  }
                } else if (event.data === 0) { // ENDED (0)
                  setIsPlaying(false);
                  setIsCompleted(true);
                  if (!isAlreadyCompleted) {
                    markLessonComplete(video.id, duration >= 1800 ? 70 : 50);
                    confetti({
                      particleCount: 100,
                      spread: 80,
                      origin: { y: 0.8 }
                    });
                  }
                } else {
                  setIsPlaying(false);
                  if (event.target && typeof event.target.getCurrentTime === 'function') {
                    const currentTime = event.target.getCurrentTime();
                    saveProgressRef.current(currentTime, true);
                  }
                }
              } catch (e) {
                console.error("Error in onStateChange:", e);
              }
            }
          }
        });
        playerRef.current = ytPlayer;
      } catch (err) {
        console.error("Error building YT Player:", err);
      }
    };

    // Script Injector
    if (!window.YT) {
      if (!document.getElementById('yt-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-script';
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }
    }

    // Checking Loop
    const checking = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(checking);
        initPlayer();
      }
    }, 100);

    return () => {
      destroyed = true;
      clearInterval(checking);
      if (ytPlayer && typeof ytPlayer.destroy === 'function') {
        try {
          if (typeof ytPlayer.getCurrentTime === 'function') {
            const lastTime = ytPlayer.getCurrentTime();
            saveProgressRef.current(lastTime, true);
          }
          ytPlayer.destroy();
        } catch (e) {}
      }
    };
  }, [video.id]);

  // Interval for updating watch progress ONLY when the video is active and playing
  useEffect(() => {
    let ticker: any = null;
    if (isPlaying && !isAlreadyCompleted && !isCompleted) {
      // Re-align on starts
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          lastPlayheadRef.current = playerRef.current.getCurrentTime();
        } catch (e) {}
      }

      ticker = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          try {
            const currentTime = playerRef.current.getCurrentTime();
            if (currentTime >= 0) {
              const prevPlayhead = lastPlayheadRef.current;
              const diff = currentTime - prevPlayhead;

              // Only increase verified watch score if they played sequentially (e.g. 0 to 3 seconds forward per tick)
              if (diff > 0 && diff < 3) {
                setActualSecondsWatched(prev => {
                  const updated = Math.min(prev + diff, duration || Infinity);
                  const prefix = userId ? `${userId}_` : '';
                  localStorage.setItem(`${prefix}actual_seconds_watched_${video.id}`, String(Math.floor(updated)));
                  return updated;
                });
              }

              // Keep syncing the last known playhead pos
              lastPlayheadRef.current = currentTime;

              // Save the playhead position so that they resume where they paused
              saveProgressRef.current(currentTime, false);
            }
          } catch (e) {
            console.error("Error updating player ticker:", e);
          }
        }
      }, 1000);
    }
    return () => {
      if (ticker) clearInterval(ticker);
    };
  }, [isPlaying, isAlreadyCompleted, isCompleted, video.id, duration]);

  const handleComplete = async () => {
    if (isCompleted || isAlreadyCompleted) return;
    
    // Confetti!
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#3b82f6', '#eab308', '#22c55e']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#3b82f6', '#eab308', '#22c55e']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    setIsCompleted(true);
    const pointsToAward = duration >= 1800 ? 70 : 50;
    await markLessonComplete(video.id, pointsToAward);
  };

  const formatTime = (seconds: number) => {
     const m = Math.floor(seconds / 60);
     const s = Math.floor(seconds % 60);
     return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercentage = duration > 0 ? Math.min((actualSecondsWatched / duration) * 100, 100) : 0;
  // Require at least 90% watch time to complete
  const canComplete = duration > 0 && (actualSecondsWatched >= (duration * 0.9)) && !isAlreadyCompleted && !isCompleted;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-slate-50 dark:bg-slate-950 min-h-[100dvh]"
    >
      <div className="bg-slate-900 border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button 
            onClick={() => {
              if (hasActiveChapter) {
                setTab('chapterDetails');
              } else {
                setTab('dashboard');
              }
            }} 
            className="flex items-center gap-2 font-bold hover:opacity-70 transition-opacity text-indigo-400"
          >
            <ArrowLeft size={20} />
            {hasActiveChapter ? 'Back to Chapter' : 'Back to Dashboard'}
          </button>
          <div className="font-bold text-xs tracking-widest uppercase opacity-50 truncate max-w-[250px]">{video.chapterTitle || 'Chapter'}</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 sm:p-6 lg:p-8 items-start pb-32">
        {/* Left layout col: Video Player */}
        <div className="lg:col-span-7 space-y-4">
          <div className="w-full aspect-video bg-black relative rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
            <iframe
              id={`yt-player-${video.id}`}
              src={`https://www.youtube.com/embed/${extractYtId(video.videoUrl)}?rel=0&autoplay=1&controls=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
              className="absolute top-0 left-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="flex items-center gap-2 bg-indigo-50/50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-indigo-100/50 dark:border-slate-800/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Secured Native Player Online Streaming Mode Active</p>
          </div>
          <div className="flex flex-col space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white leading-tight hidden lg:block">{video.title}</h1>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Online Only
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Downloading is not supported
              </span>
            </div>
          </div>

          {/* AI Concept Quiz Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-md space-y-4 mt-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-violet-600 text-white rounded-2xl shadow-md shadow-indigo-100 dark:shadow-none">
                  <Brain size={22} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5 leading-none">
                    AI Video Concept Quiz
                    <span className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-0.5 animate-bounce">
                      <Sparkles size={10} /> 10 Questions
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Review core topics precisely explained in this video</p>
                </div>
              </div>
              
              {quizQuestions.length > 0 && currentQuizStep === 0 && (
                <button
                  onClick={() => setCurrentQuizStep(1)}
                  className="text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 px-3.5 py-2 rounded-xl transition-all"
                >
                  Resume Quiz
                </button>
              )}
            </div>

            {/* ERROR DISPLAY */}
            {quizError && (
              <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3.5 rounded-2xl border border-red-100 dark:border-red-900/50 text-xs font-semibold">
                <AlertCircle size={18} className="shrink-0 text-red-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Generation failed</p>
                  <p className="opacity-90">{quizError}</p>
                </div>
              </div>
            )}

            {/* STEP 0: Quiz Intro or Setup */}
            {currentQuizStep === 0 && (
              <div className="space-y-4 pt-2">
                {quizQuestions.length === 0 ? (
                  <>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-semibold">
                      Think you master the material from this video? Generate a 10-question review quiz powered by Gemini AI!
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Mastery checklist:</h4>
                      <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2 font-medium">
                        <li className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-emerald-500 animate-pulse" />
                          Generates 10 intelligent multiple-choice questions matching video content
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-emerald-500 animate-pulse" />
                          Instant educational review feedback on every selection
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-emerald-500 animate-pulse" />
                          Earn <span className="text-amber-500 dark:text-amber-400 font-bold">+10 Mastery Points</span> for scoring 80% or more!
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={handleGenerateQuiz}
                      disabled={isLoadingQuiz}
                      className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                      {isLoadingQuiz ? (
                        <>
                          <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          Generating concept questions...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          Generate Lesson Review Quiz (+10 Points Challenge)
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-900/40">
                      <CheckCircle size={32} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-slate-800 dark:text-white">AI Concept Quiz Ready</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
                        A 10-question concepts matching quiz is prepared for this video. Test your understanding and solidify your skills!
                      </p>
                    </div>
                    <div className="flex gap-3 justify-center max-w-xs mx-auto">
                      <button
                        onClick={() => setCurrentQuizStep(1)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                      >
                        Start Practicing
                      </button>
                      <button
                        onClick={handleGenerateQuiz}
                        disabled={isLoadingQuiz}
                        className="flex-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RotateCcw size={12} /> Regenerate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LOADING STATE - DETAILED SHIMMER / TEXTS */}
            {isLoadingQuiz && (
              <div className="space-y-4 py-8 text-center">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-950 animate-pulse" />
                  <div className="absolute inset-x-0 top-0 bottom-0 rounded-full border-4 border-t-indigo-600 border-r-indigo-600 border-b-transparent border-l-transparent animate-spin" />
                  <div className="absolute inset-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                    <Sparkles size={20} className="text-indigo-600 dark:text-indigo-400 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Synthesizing Educational Content...</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto font-semibold">
                    Gemini AI is examining titles and lesson topics to design 10 perfectly matched review questions...
                  </p>
                </div>
              </div>
            )}

            {/* STEP 1: ACTIVE QUIZ */}
            {currentQuizStep === 1 && quizQuestions.length > 0 && (
              <div className="space-y-4">
                {/* Quiz progress header */}
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Question {currentQuestionIdx + 1} of 10</span>
                  <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full">Score: {quizScore}/10</span>
                </div>
                
                {/* Horizontal Progress Bar */}
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-505 transition-all duration-300"
                    style={{ width: `${((currentQuestionIdx + 1) / 10) * 100}%` }}
                  />
                </div>

                {/* The Question */}
                <div className="pt-2">
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-white leading-relaxed">
                    {quizQuestions[currentQuestionIdx]?.question}
                  </h3>
                </div>

                {/* Multiple Choice Options */}
                <div className="grid grid-cols-1 gap-3">
                  {quizQuestions[currentQuestionIdx]?.options.map((option: string, opIdx: number) => {
                    const isSelected = selectedOption === opIdx;
                    const isCorrectOp = quizQuestions[currentQuestionIdx]?.correct === opIdx;
                    
                    let cardStyle = "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 active:scale-[0.99] cursor-pointer";
                    let prefixCircleStyle = "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700";

                    if (hasAnsweredCurrent) {
                      if (isCorrectOp) {
                        cardStyle = "bg-emerald-500/10 border-emerald-500 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold";
                        prefixCircleStyle = "bg-emerald-500 text-white";
                      } else if (isSelected) {
                        cardStyle = "bg-red-500/10 border-red-500 dark:border-red-500/40 text-red-800 dark:text-red-300 font-bold";
                        prefixCircleStyle = "bg-red-500 text-white";
                      } else {
                        cardStyle = "border-slate-150 dark:border-slate-850 opacity-40 text-slate-500 dark:text-slate-500 cursor-not-allowed";
                      }
                    } else if (isSelected) {
                      cardStyle = "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 font-semibold";
                      prefixCircleStyle = "bg-indigo-600 text-white";
                    }

                    return (
                      <button
                        key={opIdx}
                        disabled={hasAnsweredCurrent}
                        onClick={() => setSelectedOption(opIdx)}
                        className={`group w-full max-w-full text-left p-4 rounded-xl border font-semibold flex items-start gap-3.5 transition-all text-sm outline-none ${cardStyle}`}
                      >
                        <span className={`w-6 h-6 rounded-full shrink-0 text-xs font-extrabold flex items-center justify-center transition-colors ${prefixCircleStyle}`}>
                          {hasAnsweredCurrent ? (
                            isCorrectOp ? <Check size={14} /> : (isSelected ? <X size={14} /> : String.fromCharCode(65 + opIdx))
                          ) : (
                            String.fromCharCode(65 + opIdx)
                          )}
                        </span>
                        <span className="flex-1 pt-0.5 whitespace-normal break-words leading-relaxed">{option}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Immediate Answer Submission */}
                {!hasAnsweredCurrent && selectedOption !== null && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      setHasAnsweredCurrent(true);
                      const correctIdx = quizQuestions[currentQuestionIdx]?.correct;
                      if (selectedOption === correctIdx) {
                        setQuizScore(prev => prev + 1);
                        if (currentQuestionIdx === 9) {
                          // Award passing sounds/celebration
                          confetti({
                            particleCount: 50,
                            spread: 45
                          });
                        }
                      }
                    }}
                    className="w-full bg-slate-800 dark:bg-slate-150 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-black font-extrabold py-3 rounded-xl transition-all text-sm shadow-md cursor-pointer"
                  >
                    Check Answer
                  </motion.button>
                )}

                {/* Explanation block once answered */}
                {hasAnsweredCurrent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-indigo-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-indigo-100/50 dark:border-slate-850/60 space-y-2 mt-4"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase text-indigo-700 dark:text-indigo-300 tracking-wider">
                      <HelpCircle size={14} /> Concept Explanation
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      {quizQuestions[currentQuestionIdx]?.explanation}
                    </p>
                  </motion.div>
                )}

                {/* Navigation Button */}
                {hasAnsweredCurrent && (
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        const isLast = currentQuestionIdx === 9;
                        if (isLast) {
                          setCurrentQuizStep(2); // Go to finished page
                        } else {
                          setCurrentQuestionIdx(prev => prev + 1);
                          setSelectedOption(null);
                          setHasAnsweredCurrent(false);
                        }
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-md cursor-pointer"
                    >
                      {currentQuestionIdx === 9 ? 'Complete Challenge & View Score' : 'Next Concept Question'}
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: COMPLETED VIEW */}
            {currentQuizStep === 2 && (
              <div className="space-y-6 text-center py-6">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 bg-yellow-500/10 rounded-full animate-ping opacity-25" />
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center border border-yellow-200">
                    <Award size={48} className="text-white drop-shadow-md" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Lesson Mastered!</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-bold">
                    You answered <span className="text-indigo-600 dark:text-indigo-400 font-black">{quizScore} of 10</span> questions correctly
                  </p>
                  
                  {/* Mastery Badge / Performance Level */}
                  <div className="pt-1">
                    {quizScore === 10 ? (
                      <span className="inline-block bg-emerald-105 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
                        Perfect Score Master 🌟
                      </span>
                    ) : quizScore >= 8 ? (
                      <span className="inline-block bg-indigo-100 text-indigo-800 dark:bg-indigo-950/45 dark:text-indigo-300 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
                        Concept Specialist Gold Medal 🥇
                      </span>
                    ) : quizScore >= 6 ? (
                      <span className="inline-block bg-orange-100 text-orange-850 dark:bg-orange-950/45 dark:text-orange-300 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
                        Conceptual Learner Silver Medal 🥈
                      </span>
                    ) : (
                      <span className="inline-block bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
                        Study Apprentice 🎯
                      </span>
                    )}
                  </div>
                </div>

                {/* Score commentary */}
                <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-850 max-w-sm mx-auto text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  {quizScore === 10 ? (
                    "Stellar work! You clearly absorbed the core nuances, equations, and exact instructions explained in the streaming lesson."
                  ) : quizScore >= 8 ? (
                    "Impressive output! You have successfully mastered almost all concepts with great critical clarity."
                  ) : quizScore >= 6 ? (
                    "Good foundational attempt. Review the private notes you made or rewind to specific parts in the YT stream to master the rest!"
                  ) : (
                    "Mastery takes practice. Rewatch the key segments in the original video player above, and retry the quiz to claim your points!"
                  )}
                </div>

                {/* Points Reward Challenge Block */}
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-900/40 dark:to-slate-900/60 p-5 rounded-3xl border border-indigo-100/50 dark:border-slate-800/80 max-w-sm mx-auto space-y-4">
                  <div className="flex items-center gap-2 justify-center text-sm font-extrabold text-indigo-700 dark:text-indigo-300">
                    <Sparkles size={18} /> Mastery Challenge Reward
                  </div>
                  
                  {pointsClaimed ? (
                    <div className="bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-extrabold py-3 px-4 rounded-2xl border border-emerald-500/30 text-xs flex items-center justify-center gap-2">
                      <Check size={16} /> Concept points claimed (+10 Points)
                    </div>
                  ) : quizScore >= 8 ? (
                    <button
                      onClick={async () => {
                        try {
                          await addPoints(10);
                          setPointsClaimed(true);
                          const prefix = userId ? `${userId}_` : '';
                          localStorage.setItem(`${prefix}quiz_claimed_${video.id}`, 'true');
                          confetti({
                            particleCount: 150,
                            spread: 80,
                            origin: { y: 0.6 }
                          });
                        } catch (err) {
                          console.error("Failed to claim concept score:", err);
                        }
                      }}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold py-3 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 text-xs animate-bounce cursor-pointer"
                    >
                      <Award size={16} /> Claim +10 Mastery Points!
                    </button>
                  ) : (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-extrabold leading-snug">
                      Score at least 8/10 to unlock the +10 Mastery Points challenge reward for this video!
                    </p>
                  )}
                </div>

                {/* Retry or Reset options */}
                <div className="flex gap-3 justify-center pt-2 max-w-xs mx-auto">
                  <button
                    onClick={() => {
                      setCurrentQuestionIdx(0);
                      setSelectedOption(null);
                      setHasAnsweredCurrent(false);
                      setQuizScore(0);
                      setCurrentQuizStep(1); // Set directly to step 1
                    }}
                    className="flex-1 bg-slate-800 dark:bg-slate-100 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-black font-extrabold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} /> Retry Quiz
                  </button>
                  
                  <button
                    onClick={() => {
                      handleGenerateQuiz();
                    }}
                    disabled={isLoadingQuiz}
                    className="flex-1 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    {isLoadingQuiz ? (
                      <>
                        <span className="w-3 h-3 rounded-full border border-slate-400 border-t-transparent animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} /> Regenerate
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right layout col: Action controls & Notes */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex flex-col space-y-2 lg:hidden">
            <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">{video.title}</h1>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Online Only
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Downloading is not supported
              </span>
            </div>
          </div>
          
          {/* Actual Progress Tracker */}
          {(duration > 0 || isAlreadyCompleted || isCompleted) && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  <Clock size={14} /> Verified Watch-time
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {(isAlreadyCompleted || isCompleted) ? formatTime(duration) : formatTime(actualSecondsWatched)} / {formatTime(duration)}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                 <motion.div 
                   className="bg-indigo-500 h-full origin-left absolute left-0 top-0 bottom-0 transition-all duration-300"
                   style={{ width: `${(isAlreadyCompleted || isCompleted) ? 100 : progressPercentage}%` }}
                 />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold leading-snug">
                ⚠️ skipping forward does not count toward progress. You must actively study the lesson sequentially to complete it!
              </p>
            </div>
          )}

          <button
            onClick={handleComplete}
            disabled={(!isAlreadyCompleted && !isCompleted && !canComplete) || (isAlreadyCompleted || isCompleted)}
            className={`w-full rounded-2xl py-4 font-bold flex items-center justify-center gap-3 transition-all shadow-lg ${
              isAlreadyCompleted || isCompleted 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-not-allowed shadow-none'
                : canComplete
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-700 shadow-none'
            }`}
          >
            <CheckCircle size={24} />
            {isAlreadyCompleted || isCompleted 
               ? 'Completed' 
               : canComplete 
                 ? `Mark as Completed (+${duration >= 1800 ? 70 : 50} Points)` 
                 : 'Keep Watching to Complete...'}
          </button>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                <PenTool size={18} className="text-indigo-500" />
                Private Notes
              </h3>
              <button className="text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all">
                <Save size={14} />
                Save
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Type your important equations or notes here..."
              className="w-full h-80 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-medium leading-relaxed text-slate-800 dark:text-white"
            ></textarea>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
