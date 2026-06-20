import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { X, Book, GraduationCap, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../store';
import { getChapterCoverImage } from '../lib/utils';

export default function AddChapterModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('Class 10');
  const [loading, setLoading] = useState(false);
  const { userData } = useAppContext();
  
  const subjects = userData?.subjects || ['Math', 'Science', 'English', 'Computer', 'History'];

  useEffect(() => {
    if (subjects.length > 0 && !subject) {
      setSubject(subjects[0]);
    }
  }, [subjects, subject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'chapters'), {
        title,
        subject,
        classLevel,
        videos: [],
        coverImage: getChapterCoverImage(subject, title),
        createdBy: auth.currentUser?.uid,
        userId: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });
      onClose();
      setTitle('');
    } catch (err) {
      console.error("Error adding doc: ", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="app-card w-full max-w-md rounded-2xl p-6 relative shadow-2xl border"
          >
            <button onClick={onClose} className="absolute right-4 top-4 opacity-50 hover:opacity-100">
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold mb-6 tracking-tight">Add New Chapter</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 app-text-muted">Chapter Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g. Gravity and Motion"
                  className="w-full bg-transparent border app-card rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 border-slate-300 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 app-text-muted font-bold flex items-center gap-1"><Book size={14}/> Subject</label>
                  <select 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-transparent border app-card rounded-xl py-2.5 px-3 focus:outline-none font-medium [&>option]:bg-slate-800 [&>option]:text-white border-slate-300 dark:border-slate-700"
                  >
                    {subjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 app-text-muted font-bold flex items-center gap-1"><GraduationCap size={14}/> Class</label>
                  <select 
                    value={classLevel} 
                    onChange={(e) => setClassLevel(e.target.value)}
                    className="w-full bg-transparent border app-card rounded-xl py-2.5 px-3 focus:outline-none font-medium [&>option]:bg-slate-800 [&>option]:text-white border-slate-300 dark:border-slate-700"
                  >
                    {['Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white rounded-xl py-3 mt-4 font-bold tracking-wide flex items-center justify-center gap-2 hover:bg-indigo-700"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                Create Chapter
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
