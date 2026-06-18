import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../store';
import confetti from 'canvas-confetti';
import { Save, CheckCircle, ArrowLeft, PenTool, Clock } from 'lucide-react';
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

export default function VideoPlayerView({ video, setTab }: { video: any, setTab: (tab: string) => void }) {
  const { markLessonComplete, updateLessonProgress, userData } = useAppContext();
  const [notes, setNotes] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  const playerRef = useRef<any>(null);

  // Load initial progress from Firebase
  const initialWatchedSeconds = userData?.lessonProgress?.[video.id] || 0;
  const [watchedSeconds, setWatchedSeconds] = useState(initialWatchedSeconds);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const isAlreadyCompleted = userData?.completedLessons?.includes(video.id);

  // Refs to handle auto-saving without stale closures or spamming firestore
  const lastSavedProgressRef = useRef<number>(initialWatchedSeconds);
  const saveProgressRef = useRef<(time: number, force?: boolean) => void>(() => {});

  saveProgressRef.current = async (currentTime: number, force = false) => {
    const rounded = Math.floor(currentTime);
    if (rounded <= 0 || isAlreadyCompleted) return;

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
      ticker = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          try {
            const currentTime = playerRef.current.getCurrentTime();
            if (currentTime >= 0) {
              setWatchedSeconds(currentTime);
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
  }, [isPlaying, isAlreadyCompleted, isCompleted]);

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
    const pointsToAward = duration >= 1800 ? 2 : 1;
    await markLessonComplete(video.id, pointsToAward);
  };

  const formatTime = (seconds: number) => {
     const m = Math.floor(seconds / 60);
     const s = Math.floor(seconds % 60);
     return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercentage = duration > 0 ? Math.min((watchedSeconds / duration) * 100, 100) : 0;
  // Require at least 90% watch time to complete
  const canComplete = duration > 0 && (watchedSeconds >= (duration * 0.9)) && !isAlreadyCompleted && !isCompleted;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-slate-50 dark:bg-slate-950 min-h-[100dvh]"
    >
      <div className="bg-slate-900 border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button onClick={() => setTab('chapterDetails')} className="flex items-center gap-2 font-bold hover:opacity-70 transition-opacity text-indigo-400">
            <ArrowLeft size={20} />
            Back to Chapter
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
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold flex items-center gap-2 text-indigo-500">
                  <Clock size={16} /> Progress
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {(isAlreadyCompleted || isCompleted) ? formatTime(duration) : formatTime(watchedSeconds)} / {formatTime(duration)}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                 <motion.div 
                   className="bg-indigo-500 h-full origin-left absolute left-0 top-0 bottom-0 transition-all duration-300"
                   style={{ width: `${(isAlreadyCompleted || isCompleted) ? 100 : progressPercentage}%` }}
                 />
              </div>
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
                 ? `Mark as Completed (+${duration >= 1800 ? 2 : 1} Points)` 
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
