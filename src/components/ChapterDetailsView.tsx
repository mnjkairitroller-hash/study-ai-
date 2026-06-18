import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { ArrowLeft, PlayCircle, Plus, Trash2, Youtube, ListVideo, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../store';

function extractYtId(url: string) {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
  return (match && match[1]) ? match[1] : '';
}

export default function ChapterDetailsView({ chapter, setTab, setPlayingVideo }: { chapter: any, setTab: (t: string) => void, setPlayingVideo: (v: any) => void }) {
  const { userData } = useAppContext();
  const [chapterData, setChapterData] = useState<any>(chapter);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletePin, setDeletePinAttempt] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'chapters', chapter.id), (docS) => {
      if (docS.exists()) {
        setChapterData({ id: docS.id, ...docS.data() });
      } else {
        setTab('study'); // Chapter deleted
      }
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
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
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

      <div className="max-w-2xl mx-auto p-4 pb-24">
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

        <div className="space-y-3">
          {!chapterData.videos || chapterData.videos.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                <Youtube size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
               <p className="font-medium text-slate-500 dark:text-slate-400">No videos in this chapter yet.</p>
            </div>
          ) : (
            chapterData.videos.map((video: any, index: number) => {
              const isCompleted = userData?.completedLessons?.includes(video.id);
              
              return (
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  key={video.id} 
                  onClick={() => playVideo(video)}
                  className={`bg-white dark:bg-slate-900 rounded-3xl p-3 border transition-all cursor-pointer flex items-center gap-4 ${isCompleted ? 'border-emerald-200 dark:border-emerald-900/50 shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md'}`}
                >
                  <div className="relative w-32 h-24 bg-slate-800 rounded-2xl overflow-hidden shrink-0 shadow-inner">
                    <img src={`https://img.youtube.com/vi/${extractYtId(video.videoUrl)}/mqdefault.jpg`} className={`w-full h-full object-cover transition-all duration-500 ${isCompleted ? 'opacity-90' : 'opacity-80 group-hover:opacity-100 group-hover:scale-110'}`} alt="Thumbnail" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <PlayCircle size={32} className={`text-white drop-shadow-lg ${isCompleted ? 'opacity-0' : 'opacity-100'}`} fill="rgba(0,0,0,0.4)" strokeWidth={1.5} />
                    </div>
                    <div className="absolute bottom-2 left-2 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-white tracking-wide border border-white/20">
                      PART {index + 1}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 py-1">
                    <h3 className={`font-bold text-[1.05rem] leading-snug line-clamp-2 transition-colors mb-2 ${isCompleted ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-white'}`}>
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

                  <div className="pr-3 pl-1 flex items-center justify-center">
                    {/* Circular Progress Indicator */}
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      {isCompleted ? (
                        <>
                           <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="16" fill="none" className="stroke-emerald-100 dark:stroke-emerald-900/30" strokeWidth="4"></circle>
                              <circle cx="18" cy="18" r="16" fill="none" className="stroke-emerald-500" strokeWidth="4" strokeDasharray="100 100" strokeDashoffset="0"></circle>
                           </svg>
                           <div className="absolute inset-0 flex items-center justify-center text-emerald-500">
                             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
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
                             <PlayCircle size={18} strokeWidth={2.5} />
                           </div>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
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
                    value={deletePin}
                    onChange={(e) => setDeletePinAttempt(e.target.value)}
                    placeholder="Enter Delete PIN"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                {deleteError && <p className="text-red-500 text-xs mt-2 font-bold text-center">{deleteError}</p>}
              </div>

              <div className="flex gap-3">
                 <button onClick={() => setIsDeleteOpen(false)} className="flex-1 py-3 font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                 <button onClick={handleDeleteChapter} className="flex-1 py-3 font-bold text-white bg-red-500 rounded-xl hover:bg-red-600">Yes, Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
