import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Plus, BookOpen, ChevronRight, Trash2, KeyRound, AlertTriangle, X } from 'lucide-react';
import AddChapterModal from './AddChapterModal';
import { useAppContext } from '../store';
import { getChapterCoverImage } from '../lib/utils';

export default function SubjectsView({ setTab, setSelectedChapter }: { setTab: (tab: string) => void, setSelectedChapter: (chapter: any) => void }) {
  const [chapters, setChapters] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { userData, updateUserData } = useAppContext();
  
  const [deletingChapter, setDeletingChapter] = useState<any | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  
  const [isEditingSubjects, setIsEditingSubjects] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const subjects = ['All', ...(userData?.subjects || ['Math', 'Science', 'English', 'Computer', 'History'])];

  useEffect(() => {
    const q = query(collection(db, 'chapters'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(document => ({ id: document.id, ...document.data() }));
      setChapters(data);
    });
    return () => unsub();
  }, []);

  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    
    if (!userData?.deletePin) {
      if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
        setPinError('Please enter a 6-digit PIN');
        return;
      }
      // Set the new PIN
      await updateUserData({ deletePin: newPin });
      
      // Proceed to delete
      if (deletingChapter?.id) {
        await deleteDoc(doc(db, 'chapters', deletingChapter.id));
      } else if (deletingSubject) {
        const currentSubjects = userData?.subjects || ['Math', 'Science', 'English', 'Computer', 'History'];
        const newSubjects = currentSubjects.filter(s => s !== deletingSubject);
        await updateUserData({ subjects: newSubjects });
        if (filter === deletingSubject) {
          setFilter('All');
        }
      }
      setDeletingChapter(null);
      setDeletingSubject(null);
      setNewPin('');
      setPinInput('');
      return;
    }

    if (pinInput !== userData.deletePin) {
      setPinError('Incorrect PIN');
      return;
    }

    // Success - delete
    if (deletingChapter?.id) {
      await deleteDoc(doc(db, 'chapters', deletingChapter.id));
    } else if (deletingSubject) {
      const currentSubjects = userData?.subjects || ['Math', 'Science', 'English', 'Computer', 'History'];
      const newSubjects = currentSubjects.filter(s => s !== deletingSubject);
      await updateUserData({ subjects: newSubjects });
      if (filter === deletingSubject) {
        setFilter('All');
      }
    }
    setDeletingChapter(null);
    setDeletingSubject(null);
    setPinInput('');
  };

  const closeModal = () => {
    setDeletingChapter(null);
    setDeletingSubject(null);
    setPinInput('');
    setNewPin('');
    setPinError('');
  };

  const filtered = filter === 'All' ? chapters : chapters.filter(c => c.subject === filter);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    
    // Prevent default 'All' override or duplicates
    if (newSubjectName.trim().toLowerCase() === 'all' || subjects.includes(newSubjectName.trim())) {
      setNewSubjectName('');
      return;
    }

    const currentSubjects = userData?.subjects || ['Math', 'Science', 'English', 'Computer', 'History'];
    await updateUserData({
      subjects: [...currentSubjects, newSubjectName.trim()]
    });
    setNewSubjectName('');
    setIsEditingSubjects(false);
  };

  const handleDeleteSubject = (subjectToDelete: string) => {
    setDeletingSubject(subjectToDelete);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-32 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Library</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 app-btn-primary px-4 py-2 rounded-xl text-sm font-semibold shadow-md"
        >
          <Plus size={16} />
          Add Chapter
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide items-center">
        {subjects.map(subj => (
          <div key={subj} className="relative group shrink-0">
            <button
              onClick={() => !isEditingSubjects && setFilter(subj)}
              disabled={isEditingSubjects}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === subj && !isEditingSubjects
                  ? 'app-btn-primary shadow-md' 
                  : isEditingSubjects
                    ? 'app-card border opacity-50 cursor-default'
                    : 'app-card border opacity-70 hover:opacity-100'
              }`}
            >
              {subj}
            </button>
            {isEditingSubjects && subj !== 'All' && (
              <button 
                onClick={() => handleDeleteSubject(subj)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform z-10"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}

        {isEditingSubjects ? (
          <form onSubmit={handleAddSubject} className="shrink-0 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-2 py-1 relative shadow-sm">
             <input
               type="text"
               value={newSubjectName}
               onChange={(e) => setNewSubjectName(e.target.value)}
               placeholder="New Subject"
               className="bg-transparent border-none focus:outline-none focus:ring-0 text-sm px-2 w-28 placeholder:text-slate-400"
               autoFocus
             />
             <button type="submit" className="p-1.5 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors">
               <Plus size={14} />
             </button>
             <button type="button" onClick={() => setIsEditingSubjects(false)} className="p-1.5 bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-full transition-colors ml-1">
               <X size={14} />
             </button>
          </form>
        ) : (
          <button
            onClick={() => setIsEditingSubjects(true)}
            className="shrink-0 whitespace-nowrap px-3 py-2 rounded-full text-sm font-medium border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center gap-1"
          >
            Edit
          </button>
        )}
      </div>

      <div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 app-card rounded-2xl border border-dashed text-slate-500">
            <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="font-bold text-lg mb-1">No chapters found</h3>
            <p className="text-sm opacity-70">Be the first to create a topic.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(chapter => (
              <div 
                key={chapter.id} 
                className="app-card rounded-2xl p-4 border flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all w-full group relative"
              >
                <div 
                  className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 text-indigo-500 flex items-center justify-center shrink-0 cursor-pointer border border-slate-200/50 dark:border-slate-700/50 hover:opacity-90 transition-opacity"
                  onClick={() => {
                    setSelectedChapter(chapter);
                    setTab('chapterDetails');
                  }}
                >
                  <img 
                    src={chapter.coverImage || getChapterCoverImage(chapter.subject, chapter.title)} 
                    alt={chapter.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => {
                    setSelectedChapter(chapter);
                    setTab('chapterDetails');
                  }}
                >
                  <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">
                    {chapter.subject} • {chapter.classLevel}
                  </div>
                  <h3 className="font-bold text-lg leading-tight mb-1 truncate pr-8">{chapter.title}</h3>
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {chapter.videos?.length || 0} {(chapter.videos?.length === 1) ? 'video' : 'videos'}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingChapter(chapter);
                    }}
                    className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                    title="Delete Chapter"
                  >
                    <Trash2 size={20} />
                  </button>
                  <div 
                    onClick={() => {
                      setSelectedChapter(chapter);
                      setTab('chapterDetails');
                    }}
                    className="p-2 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors cursor-pointer"
                  >
                    <ChevronRight size={24} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddChapterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Delete Confirmation PIN Modal */}
      {(deletingChapter || deletingSubject) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/20 text-red-500 flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
              </div>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            
            <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">
              {deletingChapter ? 'Delete Chapter' : 'Delete Subject'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              You are about to delete <strong>{deletingChapter ? deletingChapter.title : deletingSubject}</strong>. This cannot be undone.
            </p>

            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              {!userData?.deletePin ? (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Set a Deletion PIN</label>
                  <p className="text-xs text-slate-500 mb-2">Create a 6-digit PIN to protect against accidental deletions.</p>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      maxLength={6}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 123456"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono tracking-widest text-lg"
                      autoFocus
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Enter PIN to Confirm</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="password"
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-mono tracking-widest text-lg"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {pinError && (
                <p className="text-red-500 text-xs font-bold">{pinError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                  disabled={!userData?.deletePin ? newPin.length !== 6 : pinInput.length !== 6}
                >
                  {!userData?.deletePin ? 'Set PIN & Delete' : 'Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function extractYtId(url: string) {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
  return (match && match[1]) ? match[1] : '';
}
