import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, deleteDoc, collection, query, where, orderBy } from 'firebase/firestore';
import { ArrowLeft, PlayCircle, Plus, Trash2, Youtube, ListVideo, Lock, MoreVertical, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../store';
import { getChapterCoverImage } from '../lib/utils';

function extractYtId(url: string) {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
  return (match && match[1]) ? match[1] : '';
}

export default function ChapterDetailsView({ chapter, setTab, setPlayingVideo }: { chapter: any, setTab: (t: string) => void, setPlayingVideo: (v: any) => void }) {
  const { userData, user, markLessonComplete } = useAppContext();
  const [chapterData, setChapterData] = useState<any>(chapter);
  const [chapterNumber, setChapterNumber] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);

  useEffect(() => {
    if (!user || !chapterData?.subject) return;
    const q = query(
      collection(db, 'chapters'),
      where('subject', '==', chapterData.subject),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const ids = snap.docs.map(doc => doc.id);
      const index = ids.indexOf(chapter.id);
      if (index !== -1) {
        setChapterNumber(index + 1);
      }
    }, (err) => {
      console.error("Error determining chapter details sequence:", err);
    });
    return () => unsub();
  }, [chapterData?.subject, chapter.id]);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletePin, setDeletePinAttempt] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Manual completion override states
  const [completeVideoWithPin, setCompleteVideoWithPin] = useState<any>(null);
  const [completePin, setCompletePin] = useState('');
  const [completeError, setCompleteError] = useState('');
  const [completeLoading, setCompleteLoading] = useState(false);

  const [pathCoords, setPathCoords] = useState<{ x: number; y: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const updatePathCoords = () => {
    if (!containerRef.current || !chapterData?.videos) return;
    const parentRect = containerRef.current.getBoundingClientRect();
    const coords: { x: number; y: number }[] = [];
    
    chapterData.videos.forEach((video: any) => {
      const el = document.getElementById(`video-part-${video.id}`);
      if (el) {
        const elRect = el.getBoundingClientRect();
        const x = (elRect.left - parentRect.left) + elRect.width / 2;
        const y = (elRect.top - parentRect.top) + elRect.height / 2;
        coords.push({ x, y });
      }
    });
    setPathCoords(coords);
  };

  const getSvgPathString = () => {
    if (pathCoords.length === 0) return "";
    let d = `M ${pathCoords[0].x} ${pathCoords[0].y}`;
    
    for (let i = 0; i < pathCoords.length - 1; i++) {
      const p1 = pathCoords[i];
      const p2 = pathCoords[i + 1];
      
      if (isMobile) {
        // Smooth vertical waving curve on mobile stack
        const cp1_x = p1.x + (i % 2 === 0 ? 30 : -30);
        const cp1_y = p1.y + (p2.y - p1.y) * 0.45;
        const cp2_x = p2.x + (i % 2 === 0 ? -30 : 30);
        const cp2_y = p1.y + (p2.y - p1.y) * 0.55;
        d += ` C ${cp1_x} ${cp1_y}, ${cp2_x} ${cp2_y}, ${p2.x} ${p2.y}`;
      } else {
        const isSameRow = Math.abs(p1.y - p2.y) < 55;
        
        if (isSameRow) {
          // Connect horizontally with a smooth wave (tedha line!)
          const cp1_x = p1.x + (p2.x - p1.x) * 0.45;
          const cp1_y = p1.y + (i % 2 === 0 ? 12 : -12);
          const cp2_x = p1.x + (p2.x - p1.x) * 0.55;
          const cp2_y = p2.y + (i % 2 === 0 ? -12 : 12);
          d += ` C ${cp1_x} ${cp1_y}, ${cp2_x} ${cp2_y}, ${p2.x} ${p2.y}`;
        } else {
          // Moving to next row: sweep outwards to create a connection loop
          if (p1.x > 380) {
            // Right edge loop
            const cp1_x = p1.x + 100;
            const cp1_y = p1.y + 20;
            const cp2_x = p2.x + 100;
            const cp2_y = p2.y - 20;
            d += ` C ${cp1_x} ${cp1_y}, ${cp2_x} ${cp2_y}, ${p2.x} ${p2.y}`;
          } else {
            // Left edge loop
            const cp1_x = p1.x - 100;
            const cp1_y = p1.y + 20;
            const cp2_x = p2.x - 100;
            const cp2_y = p2.y - 20;
            d += ` C ${cp1_x} ${cp1_y}, ${cp2_x} ${cp2_y}, ${p2.x} ${p2.y}`;
          }
        }
      }
    }
    return d;
  };

  useEffect(() => {
    if (chapterData?.videos?.length > 0) {
      const timer = setTimeout(() => {
        updatePathCoords();
      }, 180);

      window.addEventListener('resize', updatePathCoords);
      // Also observe container mutations or scroll changes
      const observer = new ResizeObserver(() => {
        updatePathCoords();
      });
      if (containerRef.current) observer.observe(containerRef.current);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updatePathCoords);
        observer.disconnect();
      };
    }
  }, [chapterData?.videos]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'chapters', chapter.id), (docS) => {
      if (docS.exists()) {
        setChapterData({ id: docS.id, ...docS.data() });
      } else {
        setTab('study'); // Chapter deleted
      }
    }, (error) => {
      console.error("Error receiving onSnapshot updates for Chapter Details:", error);
    });
    return () => unsub();
  }, [chapter.id, setTab]);

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl || !newTitle) return;
    setAddLoading(true);
    try {
      const newVideo = {
        id: Date.now().toString(),
        title: newTitle,
        videoUrl: newUrl,
        createdAt: Date.now()
      };
      await updateDoc(doc(db, 'chapters', chapter.id), {
        videos: arrayUnion(newVideo)
      });
      setNewUrl('');
      setNewTitle('');
      setIsAddOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteChapter = async () => {
    setDeleteError('');
    if (!userData?.deletePin) {
      setDeleteError("Delete PIN is not set in Profile settings.");
      return;
    }
    if (deletePin !== userData.deletePin) {
      setDeleteError("Incorrect PIN.");
      return;
    }
    try {
      await deleteDoc(doc(db, 'chapters', chapter.id));
      setIsDeleteOpen(false);
      // Wait for snapshot to kick us out or manually:
      setTab('study');
    } catch (err) {
      console.error(err);
      setDeleteError("Error deleting chapter.");
    }
  };

  const handleOpenEditModal = (video: any) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditUrl(video.videoUrl);
    setEditPin('');
    setEditError('');
    setEditLoading(false);
    setIsEditOpen(true);
  };

  const handleUpdateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    if (!editTitle.trim() || !editUrl.trim()) {
      setEditError('Please fill in all fields.');
      return;
    }
    if (!userData?.deletePin) {
      setEditError("PIN is not set in Profile settings.");
      return;
    }
    if (editPin !== userData.deletePin) {
      setEditError("Incorrect PIN.");
      return;
    }

    setEditLoading(true);
    try {
      const updatedVideos = (chapterData.videos || []).map((v: any) => {
        if (v.id === editingVideo.id) {
          return { ...v, title: editTitle, videoUrl: editUrl };
        }
        return v;
      });

      await updateDoc(doc(db, 'chapters', chapter.id), {
        videos: updatedVideos
      });
      setIsEditOpen(false);
      setEditingVideo(null);
    } catch (err) {
      console.error(err);
      setEditError("Failed to update video.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteVideo = async () => {
    setEditError('');
    if (!userData?.deletePin) {
      setEditError("PIN is not set in Profile settings.");
      return;
    }
    if (editPin !== userData.deletePin) {
      setEditError("Incorrect PIN.");
      return;
    }

    setEditLoading(true);
    try {
      const updatedVideos = (chapterData.videos || []).filter((v: any) => v.id !== editingVideo.id);

      await updateDoc(doc(db, 'chapters', chapter.id), {
        videos: updatedVideos
      });
      setIsEditOpen(false);
      setEditingVideo(null);
    } catch (err) {
      console.error(err);
      setEditError("Failed to delete video.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleConfirmManualComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompleteError('');
    
    if (!completeVideoWithPin) return;

    if (!userData?.deletePin) {
      setCompleteError("Teacher PIN is not set in Profile settings.");
      return;
    }
    if (completePin !== userData.deletePin) {
      setCompleteError("Incorrect PIN.");
      return;
    }

    setCompleteLoading(true);
    try {
      const vidDuration = completeVideoWithPin.duration || 0;
      const points = vidDuration > 3600 ? 70 : vidDuration < 1800 ? 30 : 40;
      await markLessonComplete(completeVideoWithPin.id, points, vidDuration);
      setCompleteVideoWithPin(null);
      setCompletePin('');
    } catch (err) {
      console.error(err);
      setCompleteError("Failed to update video completion status.");
    } finally {
      setCompleteLoading(false);
    }
  };

  const playVideo = (video: any) => {
    // Pass video into player with a reference back to chapter title
    setPlayingVideo({
      id: video.id,
      title: video.title,
      videoUrl: video.videoUrl,
      chapterTitle: chapterData.title
    });
    setTab('player');
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-[100dvh]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={() => setTab('study')}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={24} className="text-slate-700 dark:text-slate-300" />
          </button>
          <div className="flex flex-col items-center flex-1 mx-4 overflow-hidden">
             <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{chapterData.subject}</div>
             <h1 className="font-bold text-lg truncate w-full flex-1 text-center text-slate-800 dark:text-white leading-tight">
               {chapterData.title}
             </h1>
          </div>
          <button 
            onClick={() => setIsDeleteOpen(true)}
            className="w-10 h-10 -mr-2 rounded-full flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-32">
        {/* Chapter Cover Hero Card */}
        <div className={`w-full h-44 md:h-56 rounded-3xl overflow-hidden relative mb-8 shadow-md border border-slate-200/50 dark:border-slate-800/80 bg-gradient-to-br ${(() => {
          const s = (chapterData.subject || '').toLowerCase();
          if (s.includes('math')) return 'from-blue-600 via-indigo-600 to-cyan-600 dark:from-blue-800 dark:via-indigo-950 dark:to-cyan-800';
          if (s.includes('sci')) return 'from-emerald-600 via-teal-600 to-green-600 dark:from-emerald-800 dark:via-teal-950 dark:to-green-800';
          if (s.includes('eng')) return 'from-violet-600 via-fuchsia-600 to-pink-600 dark:from-violet-800 dark:via-fuchsia-950 dark:to-pink-800';
          if (s.includes('comp') || s.includes('cod')) return 'from-indigo-600 via-purple-600 to-blue-600 dark:from-indigo-800 dark:via-purple-950 dark:to-blue-800';
          if (s.includes('hist') || s.includes('soc')) return 'from-amber-500 via-orange-500 to-yellow-500 dark:from-amber-700 dark:via-orange-950 dark:to-yellow-700';
          return 'from-pink-500 via-rose-500 to-red-500 dark:from-pink-700 dark:via-rose-950 dark:to-red-700';
        })()} flex items-center justify-between p-6 md:p-8 text-white select-none`}>
          {/* Decorative circles */}
          <div className="absolute top-[-20px] right-[-20px] w-40 h-40 rounded-full bg-white/10 blur-xl"></div>
          <div className="absolute bottom-[-20px] left-[-20px] w-48 h-48 rounded-full bg-black/15 blur-xl"></div>
          
          <div className="flex flex-col justify-end h-full z-10 max-w-lg md:max-w-2xl">
            <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-white/80 mb-2">
              {chapterData.subject} • {chapterData.classLevel || 'Class 10'}
            </span>
            <h2 className="text-xl md:text-3xl font-black text-white tracking-tight leading-tight filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]">
              {chapterData.title}
            </h2>
            <div className="mt-3 text-[10px] md:text-xs font-bold bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full inline-flex items-center gap-1 w-max">
              📚 Chapter {chapterNumber}
            </div>
          </div>

          {/* Majestic, Cute Bouncy Sticker Number */}
          <div className="relative z-10 hidden sm:flex flex-col items-center justify-center shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-[1.751rem] bg-white text-indigo-950 shadow-2xl border-[3px] border-white/50 transform rotate-3 hover:scale-105 transition-all">
            {/* Glossy shine */}
            <div className="absolute top-1.5 left-3 w-3 h-3 rounded-full bg-indigo-200/40 blur-[1px]"></div>
            <div className="absolute bottom-1.5 right-3 w-4 h-4 rounded-full bg-slate-100/50 blur-[2px]"></div>
            <span className="text-[8px] md:text-[9.5px] font-black tracking-widest text-slate-400 uppercase">CHAPTER</span>
            <span className="text-4xl md:text-5xl font-black bg-gradient-to-br from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent filter drop-shadow-sm leading-none mt-0.5">
              {chapterNumber}
            </span>
            <div className="absolute -top-2.5 -right-2.5 text-lg animate-bounce">✨</div>
          </div>
        </div>

        {/* Videos List */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
            <ListVideo size={24} className="text-indigo-500" />
            {chapterData.videos?.length || 0} Videos
          </h2>
          <button 
            onClick={() => setIsAddOpen(true)}
            className="text-sm font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
          >
            <Plus size={16} /> Add Part
          </button>
        </div>

        <div>
          {!chapterData.videos || chapterData.videos.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                <Youtube size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
               <p className="font-medium text-slate-500 dark:text-slate-400">No videos in this chapter yet.</p>
            </div>
          ) : (
            <div ref={containerRef} className="relative py-8 px-4 sm:px-6 bg-slate-50/50 dark:bg-slate-950/20 rounded-3xl border border-slate-200/60 dark:border-slate-800/50 overflow-hidden min-h-[300px]">
              {/* Dynamic Wavy Connecting Pathway SVG */}
              {pathCoords.length > 0 && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                   <defs>
                     <linearGradient id="video-grad-serpentine" x1="0%" y1="0%" x2="100%" y2="100%">
                       <stop offset="0%" stopColor="#6366f1" />
                       <stop offset="50%" stopColor="#10b981" />
                       <stop offset="100%" stopColor="#f59e0b" />
                     </linearGradient>
                     <filter id="video-glow-serpentine">
                       <feGaussianBlur stdDeviation="3" result="blur"/>
                       <feMerge>
                         <feMergeNode in="blur"/>
                         <feMergeNode in="SourceGraphic"/>
                       </feMerge>
                     </filter>
                   </defs>
                   
                   {/* Background track line */}
                   <path
                     d={getSvgPathString()}
                     fill="none"
                     stroke="currentColor"
                     className="text-slate-200 dark:text-slate-800"
                     strokeWidth="5"
                     strokeLinecap="round"
                     strokeDasharray="8 8"
                   />
                   
                   {/* Glowing progress line */}
                   <path
                     d={getSvgPathString()}
                     fill="none"
                     stroke="url(#video-grad-serpentine)"
                     strokeWidth="4.5"
                     strokeLinecap="round"
                     filter="url(#video-glow-serpentine)"
                     className="opacity-90"
                   />
                </svg>
              )}

              {/* Grid Layout conforming to Serpentine logic */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-7 relative z-10 max-w-4xl mx-auto">
                {(() => {
                  const itemsPerRow = 3;
                  return chapterData.videos.map((video: any, index: number) => {
                    const isCompleted = userData?.completedLessons?.includes(video.id);
                    const rowIndex = Math.floor(index / itemsPerRow);
                    const isRowReversed = rowIndex % 2 === 1;
                    const colIndex = isRowReversed ? (2 - (index % itemsPerRow)) : (index % itemsPerRow);

                    return (
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        key={video.id} 
                        id={`video-part-${video.id}`}
                        onClick={() => playVideo(video)}
                        style={{
                          gridRow: isMobile ? 'auto' : `${rowIndex + 1}`,
                          gridColumnStart: isMobile ? 'auto' : `${colIndex + 1}`,
                        }}
                         className={`bg-white dark:bg-slate-900 rounded-xl p-2 ${isCompleted ? 'pr-7' : 'pr-13'} border transition-all cursor-pointer flex items-center gap-2 relative w-full max-w-[320px] mx-auto shadow-sm ${
                          isCompleted 
                            ? 'border-emerald-200 dark:border-emerald-950/40 bg-emerald-50/5 dark:bg-emerald-950/5' 
                            : 'border-slate-200/95 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md'
                        }`}
                      >
                        {!isCompleted && (
                          <button
                            id={`manual-complete-btn-${video.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompleteVideoWithPin(video);
                              setCompletePin('');
                              setCompleteError('');
                              setCompleteLoading(false);
                            }}
                            title="Mark completed"
                            className="absolute top-1.5 right-7.5 w-6 h-6 rounded-full text-slate-400 dark:text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 flex items-center justify-center transition-colors z-20 border border-slate-100 dark:border-slate-800/80"
                          >
                            <Check size={12} strokeWidth={3} />
                          </button>
                        )}

                        <button
                          id={`edit-video-btn-${video.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(video);
                          }}
                          className="absolute top-1.5 right-1 w-6 h-6 rounded-full text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors z-20"
                        >
                          <MoreVertical size={14} />
                        </button>

                        <div className="relative aspect-video w-[6rem] sm:w-[6.8rem] bg-slate-800 rounded-lg overflow-hidden shrink-0 shadow-inner">
                          <img 
                            src={`https://img.youtube.com/vi/${extractYtId(video.videoUrl)}/hqdefault.jpg`} 
                            className={`w-full h-full object-cover transition-all duration-500 ${isCompleted ? 'opacity-90' : 'opacity-80 group-hover:opacity-100 group-hover:scale-105'}`} 
                            alt="Thumbnail" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                              <PlayCircle size={22} className={`text-white drop-shadow-lg ${isCompleted ? 'opacity-0' : 'opacity-100'}`} fill="rgba(0,0,0,0.4)" strokeWidth={1.5} />
                          </div>
                          <div className="absolute bottom-1 right-1 bg-black/75 backdrop-blur-sm px-1 py-0.5 rounded text-[8px] font-black tracking-wider text-white border border-white/10 uppercase">
                            PART {index + 1}
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0 py-0.5">
                          <h3 className={`font-bold text-[0.88rem] leading-snug line-clamp-2 transition-colors mb-1 ${isCompleted ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                            {video.title}
                          </h3>
                          {isCompleted ? (
                            <div className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Completed
                            </div>
                          ) : userData?.lessonProgress?.[video.id] ? (
                            <div className="text-xs font-bold text-amber-500 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Resume
                            </div>
                          ) : (
                            <div className="text-xs font-bold text-indigo-500 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                              Up Next
                            </div>
                          )}
                        </div>
 
                        <div className="pr-1 flex items-center justify-center shrink-0">
                          {/* Circular Progress Indicator */}
                          <div className="relative w-8 h-8 flex items-center justify-center">
                            {isCompleted ? (
                              <>
                                 <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-emerald-100 dark:stroke-emerald-900/30" strokeWidth="4.5"></circle>
                                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-emerald-500" strokeWidth="4.5" strokeDasharray="100 100" strokeDashoffset="0"></circle>
                                 </svg>
                                 <div className="absolute inset-0 flex items-center justify-center text-emerald-500">
                                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                 </div>
                              </>
                            ) : (
                              <>
                                 <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="4"></circle>
                                    {userData?.lessonProgress?.[video.id] && (
                                      <circle cx="18" cy="18" r="16" fill="none" className="stroke-amber-500" strokeWidth="4" strokeDasharray="100 100" strokeDashoffset="50"></circle>
                                    )}
                                 </svg>
                                 <div className={`absolute inset-0 flex items-center justify-center ${userData?.lessonProgress?.[video.id] ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>
                                   <PlayCircle size={13} strokeWidth={2.5} />
                                 </div>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Video Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsAddOpen(false)}
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 relative shadow-2xl z-10 bottom-0 pb-safe"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6 sm:hidden"></div>
              <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Add Video Part</h2>
              <form onSubmit={handleAddVideo} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">YouTube URL</label>
                  <div className="relative">
                    <Youtube className="absolute left-3 top-3 text-red-500" size={20} />
                    <input
                      type="url"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      required
                      placeholder="https://youtu.be/..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">Part Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    placeholder="e.g. Introduction"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 py-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                  <button type="submit" disabled={addLoading} className="flex-1 py-3 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-70">
                    {addLoading ? 'Adding...' : 'Add Video'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Video Modal */}
        {isEditOpen && editingVideo && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }} { ...({ animate: { opacity: 1 }, exit: { opacity: 0 } } as any) }
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsEditOpen(false)}
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 relative shadow-2xl z-10 bottom-0 pb-safe border border-slate-100 dark:border-slate-800"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6 sm:hidden"></div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Edit Video Card</h2>
                <button 
                  type="button"
                  onClick={handleDeleteVideo}
                  disabled={editLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/40 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  Delete Card
                </button>
              </div>
              
              <form onSubmit={handleUpdateVideo} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">YouTube URL</label>
                  <div className="relative">
                    <Youtube className="absolute left-3 top-3 text-red-500" size={20} />
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      required
                      placeholder="https://youtu.be/..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">Part Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    placeholder="e.g. Introduction"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/85">
                  <label className="block text-xs font-black text-rose-500 dark:text-rose-400 mb-1 flex items-center gap-1">
                    <Lock size={12} /> ENTER PROFILE PASSWORD / PIN (6 DIGITS) TO UPDATE OR DELETE
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                      type="password"
                      maxLength={6}
                      value={editPin}
                      onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))}
                      required
                      placeholder="••••••"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm font-bold font-mono tracking-widest text-lg"
                    />
                  </div>
                  {editError && <p className="text-red-500 text-xs mt-2 font-bold text-center">{editError}</p>}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                  <button type="submit" disabled={editLoading} className="flex-1 py-3 font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-70">
                    {editLoading ? 'Updating...' : 'Update Card'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Chapter Modal */}
        {isDeleteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsDeleteOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 relative shadow-2xl z-10 border border-red-100 dark:border-red-900/50"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h2 className="text-xl font-bold mb-2 text-center text-slate-800 dark:text-white">Delete Chapter?</h2>
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">
                This will permanently delete "{chapterData.title}" and all its videos. Enter your PIN to confirm.
              </p>
              
              <div className="mb-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                  <input
                    type="password"
                    maxLength={6}
                    value={deletePin}
                    onChange={(e) => setDeletePinAttempt(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono tracking-widest text-lg"
                  />
                </div>
                {deleteError && <p className="text-red-500 text-xs mt-2 font-bold text-center">{deleteError}</p>}
              </div>

              <div className="flex gap-3">
                 <button onClick={() => setIsDeleteOpen(false)} className="flex-1 py-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                 <button 
                   onClick={handleDeleteChapter} 
                   disabled={deletePin.length !== 6}
                   className="flex-1 py-3 font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50"
                 >
                   Yes, Delete
                 </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Manual Complete Modal */}
        {completeVideoWithPin && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setCompleteVideoWithPin(null)}
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 relative shadow-2xl z-10 bottom-0 pb-safe border border-slate-100 dark:border-slate-800"
            >
              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-6 sm:hidden"></div>
              <h2 className="text-xl font-black mb-2 text-slate-800 dark:text-white flex items-center gap-2">
                <Check className="text-emerald-500" size={24} strokeWidth={3} />
                Mark as Completed?
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed text-left">
                Manually bypass execution metrics for "<strong className="text-slate-700 dark:text-slate-200 font-bold">{completeVideoWithPin.title}</strong>". Please enter the Teacher PIN to authorize.
              </p>

              <form onSubmit={handleConfirmManualComplete} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="block text-xs font-black text-rose-500 dark:text-rose-400 mb-1 flex items-center gap-1">
                    <Lock size={12} /> ENTER PROFILE PASSWORD / PIN (6 DIGITS)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                      type="password"
                      maxLength={6}
                      value={completePin}
                      onChange={(e) => {
                        setCompleteError('');
                        setCompletePin(e.target.value.replace(/\D/g, ''));
                      }}
                      required
                      placeholder="••••••"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold font-mono tracking-widest text-lg"
                      autoFocus
                    />
                  </div>
                  {completeError && <p className="text-red-500 text-xs mt-2 font-bold text-center">{completeError}</p>}
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setCompleteVideoWithPin(null)} 
                    className="flex-1 py-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={completeLoading || completePin.length !== 6} 
                    className="flex-1 py-3 font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {completeLoading ? 'Updating...' : 'Confirm'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
