import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../store';
import confetti from 'canvas-confetti';
import { Save, CheckCircle, ArrowLeft, PenTool, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import ReactPlayer from 'react-player';

export default function VideoPlayerView({ video, setTab }: { video: any, setTab: (tab: string) => void }) {
  const { markLessonComplete, updateLessonProgress, userData } = useAppContext();
  const [notes, setNotes] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  const playerRef = useRef<ReactPlayer>(null);

  // Load initial progress from Firebase
  const initialWatchedSeconds = userData?.lessonProgress?.[video.id] || 0;
  const [watchedSeconds, setWatchedSeconds] = useState(initialWatchedSeconds);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasSeeked, setHasSeeked] = useState(false);

  const isAlreadyCompleted = userData?.completedLessons?.includes(video.id);

  // Sync progress back to firebase periodically
  useEffect(() => {
    if (watchedSeconds > 0 && !isAlreadyCompleted) {
      updateLessonProgress(video.id, Math.floor(watchedSeconds));
    }
  }, [watchedSeconds, video.id, isAlreadyCompleted, updateLessonProgress]);

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
      className="max-w-3xl mx-auto bg-black min-h-[100dvh]"
    >
      <div className="bg-black/90 px-4 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md border-b border-white/10 text-white">
        <button onClick={() => setTab('chapterDetails')} className="flex items-center gap-2 font-bold hover:opacity-70 transition-opacity text-indigo-400">
          <ArrowLeft size={20} />
          Back to Chapter
        </button>
        <div className="font-bold text-xs tracking-widest uppercase opacity-50 truncate max-w-[150px]">{video.chapterTitle || 'Chapter'}</div>
      </div>

      <div className="w-full aspect-video bg-black relative">
        <ReactPlayer
          ref={playerRef}
          url={video.videoUrl}
          width="100%"
          height="100%"
          controls
          onReady={() => {
            if (initialWatchedSeconds > 0 && !hasSeeked) {
              playerRef.current?.seekTo(initialWatchedSeconds, 'seconds');
              setHasSeeked(true);
            }
          }}
          onProgress={({ playedSeconds }) => {
             // Only update if playedSeconds is greater to not lose progress
             if (playedSeconds > watchedSeconds && playedSeconds - watchedSeconds < 5) {
                // If they didn't skip massively
                setWatchedSeconds(playedSeconds);
             } else if (playedSeconds < watchedSeconds) {
                // They seeked backwards, just let it be or update it depending on logic.
                // Let's just track highest watched point:
                // setWatchedSeconds((prev) => Math.max(prev, playedSeconds));
             } else if (playedSeconds - watchedSeconds >= 5) {
                // They seeked forward. Optionally ignore, or accept. Let's just accept for simplicity of resume
                setWatchedSeconds(playedSeconds);
             }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onBuffer={() => setIsPlaying(false)}
          onBufferEnd={() => setIsPlaying(true)}
          onDuration={(d: number) => setDuration(d)}
          config={{
             youtube: {
               playerVars: { rel: 0 }
             }
          }}
        />
      </div>

      <div className="p-4 bg-slate-50 dark:bg-slate-950 mt-0 pb-24 text-slate-800 dark:text-slate-100 min-h-[50vh]">
        <h1 className="text-2xl font-bold mb-4 pt-4 leading-tight">{video.title}</h1>
        
        {/* Actual Progress Tracker */}
        {(duration > 0 || isAlreadyCompleted || isCompleted) && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm mb-6">
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
          className={`w-full rounded-2xl py-4 font-bold flex items-center justify-center gap-3 transition-all mb-8 shadow-lg ${
            isAlreadyCompleted || isCompleted 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-not-allowed'
              : canComplete
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-700'
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
            <h3 className="font-bold flex items-center gap-2">
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
            className="w-full h-40 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-medium leading-relaxed"
          ></textarea>
        </div>
      </div>
    </motion.div>
  );
}

function extractYtId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
  return (match && match[1]) ? match[1] : '';
}
