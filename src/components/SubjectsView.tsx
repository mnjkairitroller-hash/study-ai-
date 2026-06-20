import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, where } from 'firebase/firestore';
import { Plus, BookOpen, ChevronRight, Trash2, KeyRound, AlertTriangle, X } from 'lucide-react';
import AddChapterModal from './AddChapterModal';
import { useAppContext } from '../store';
import { getChapterCoverImage } from '../lib/utils';

interface CuteChapterIconProps {
  subject: string;
  num: number;
}

export function CuteChapterIcon({ subject, num }: CuteChapterIconProps) {
  const { userData } = useAppContext();
  const activeTheme = userData?.theme || 'slate';

  const getColors = (subj: string, theme: string) => {
    const s = subj?.toLowerCase() || '';
    const t = theme?.toLowerCase() || 'slate';

    // Dark-oriented vibrant themes (Classic Slate, Cyberpunk, Cosmic Dream Nebula)
    if (t === 'slate' || t === 'cyberpunk' || t === 'nebula') {
      if (s.includes('math')) {
        return {
          bg: 'from-blue-500 to-cyan-400 dark:from-blue-600 dark:to-cyan-600',
          text: 'text-white',
          border: 'border-blue-400 dark:border-blue-500',
          shadow: 'shadow-blue-500/20'
        };
      }
      if (s.includes('sci')) {
        return {
          bg: 'from-emerald-500 to-teal-400 dark:from-emerald-600 dark:to-teal-600',
          text: 'text-white',
          border: 'border-emerald-400 dark:border-emerald-500',
          shadow: 'shadow-emerald-500/20'
        };
      }
      if (s.includes('eng')) {
        return {
          bg: 'from-violet-500 to-fuchsia-400 dark:from-violet-600 dark:to-fuchsia-600',
          text: 'text-white',
          border: 'border-violet-400 dark:border-violet-500',
          shadow: 'shadow-violet-500/20'
        };
      }
      if (s.includes('comp') || s.includes('cod')) {
        return {
          bg: 'from-indigo-500 to-purple-400 dark:from-indigo-600 dark:to-purple-600',
          text: 'text-white',
          border: 'border-indigo-400 dark:border-indigo-500',
          shadow: 'shadow-indigo-500/20'
        };
      }
      if (s.includes('hist') || s.includes('soc')) {
        return {
          bg: 'from-amber-500 to-orange-400 dark:from-amber-600 dark:to-orange-500',
          text: 'text-stone-950 dark:text-white',
          border: 'border-amber-400 dark:border-amber-500',
          shadow: 'shadow-amber-500/20'
        };
      }
      return {
        bg: 'from-pink-500 to-rose-450 dark:from-pink-600 dark:to-rose-600',
        text: 'text-white',
        border: 'border-pink-400 dark:border-pink-500',
        shadow: 'shadow-pink-500/20'
      };
    }

    // Sakura Pink theme (Sweet dreamy pastels)
    if (t === 'sakura') {
      if (s.includes('math')) {
        return {
          bg: 'from-sky-250 to-indigo-300',
          text: 'text-indigo-950',
          border: 'border-sky-150',
          shadow: 'shadow-pink-100'
        };
      }
      if (s.includes('sci')) {
        return {
          bg: 'from-teal-200 to-emerald-250',
          text: 'text-emerald-950',
          border: 'border-teal-150',
          shadow: 'shadow-pink-100'
        };
      }
      if (s.includes('eng')) {
        return {
          bg: 'from-pink-300 to-rose-300',
          text: 'text-pink-950',
          border: 'border-pink-200',
          shadow: 'shadow-pink-100'
        };
      }
      if (s.includes('comp') || s.includes('cod')) {
        return {
          bg: 'from-purple-250 to-pink-300',
          text: 'text-purple-950',
          border: 'border-purple-200',
          shadow: 'shadow-pink-100'
        };
      }
      if (s.includes('hist') || s.includes('soc')) {
        return {
          bg: 'from-orange-200 to-pink-250',
          text: 'text-orange-950',
          border: 'border-orange-150',
          shadow: 'shadow-pink-100'
        };
      }
      return {
        bg: 'from-pink-200 to-rose-200',
        text: 'text-pink-950',
        border: 'border-pink-150',
        shadow: 'shadow-pink-100'
      };
    }

    // Emerald dynamic theme (botanical/fresh)
    if (t === 'emerald') {
      if (s.includes('math')) {
        return {
          bg: 'from-cyan-200 to-emerald-300',
          text: 'text-emerald-950',
          border: 'border-cyan-150',
          shadow: 'shadow-emerald-50'
        };
      }
      if (s.includes('sci')) {
        return {
          bg: 'from-emerald-350 to-teal-350',
          text: 'text-emerald-950',
          border: 'border-emerald-200',
          shadow: 'shadow-emerald-100'
        };
      }
      if (s.includes('eng')) {
        return {
          bg: 'from-teal-200 to-fuchsia-350',
          text: 'text-emerald-950',
          border: 'border-teal-150',
          shadow: 'shadow-emerald-50'
        };
      }
      if (s.includes('comp') || s.includes('cod')) {
        return {
          bg: 'from-emerald-250 to-sky-300',
          text: 'text-emerald-950',
          border: 'border-emerald-150',
          shadow: 'shadow-emerald-50'
        };
      }
      if (s.includes('hist') || s.includes('soc')) {
        return {
          bg: 'from-lime-200 to-emerald-350',
          text: 'text-emerald-950',
          border: 'border-lime-150',
          shadow: 'shadow-emerald-50'
        };
      }
      return {
        bg: 'from-teal-200 to-emerald-250',
        text: 'text-teal-950',
        border: 'border-teal-150',
        shadow: 'shadow-emerald-50'
      };
    }

    // Sunset theme (Orange/Warm evening glow)
    if (t === 'sunset') {
      if (s.includes('math')) {
        return {
          bg: 'from-orange-350 to-amber-450',
          text: 'text-orange-950',
          border: 'border-orange-250',
          shadow: 'shadow-amber-100/40'
        };
      }
      if (s.includes('sci')) {
        return {
          bg: 'from-yellow-350 to-amber-450',
          text: 'text-amber-950',
          border: 'border-yellow-250',
          shadow: 'shadow-amber-100/40'
        };
      }
      if (s.includes('eng')) {
        return {
          bg: 'from-rose-350 to-orange-355',
          text: 'text-rose-950',
          border: 'border-rose-250',
          shadow: 'shadow-orange-100/40'
        };
      }
      if (s.includes('comp') || s.includes('cod')) {
        return {
          bg: 'from-amber-350 to-red-400',
          text: 'text-orange-950',
          border: 'border-amber-250',
          shadow: 'shadow-orange-100/40'
        };
      }
      if (s.includes('hist') || s.includes('soc')) {
        return {
          bg: 'from-amber-250 to-orange-350',
          text: 'text-amber-950',
          border: 'border-amber-150',
          shadow: 'shadow-amber-100/30'
        };
      }
      return {
        bg: 'from-orange-300 to-amber-350',
        text: 'text-orange-950',
        border: 'border-orange-200',
        shadow: 'shadow-orange-100/30'
      };
    }

    // Lavender theme (Sweet purple fields)
    if (t === 'lavender') {
      if (s.includes('math')) {
        return {
          bg: 'from-sky-200 to-violet-300',
          text: 'text-violet-950',
          border: 'border-sky-150',
          shadow: 'shadow-violet-100'
        };
      }
      if (s.includes('sci')) {
        return {
          bg: 'from-teal-150 to-violet-250',
          text: 'text-violet-950',
          border: 'border-teal-100',
          shadow: 'shadow-violet-100'
        };
      }
      if (s.includes('eng')) {
        return {
          bg: 'from-violet-300 to-fuchsia-300',
          text: 'text-violet-950',
          border: 'border-violet-200',
          shadow: 'shadow-violet-100'
        };
      }
      if (s.includes('comp') || s.includes('cod')) {
        return {
          bg: 'from-indigo-250 to-purple-355',
          text: 'text-purple-950',
          border: 'border-indigo-150',
          shadow: 'shadow-violet-100'
        };
      }
      if (s.includes('hist') || s.includes('soc')) {
        return {
          bg: 'from-purple-200 to-pink-250',
          text: 'text-purple-950',
          border: 'border-purple-150',
          shadow: 'shadow-violet-100'
        };
      }
      return {
        bg: 'from-violet-200 to-purple-250',
        text: 'text-violet-950',
        border: 'border-violet-150',
        shadow: 'shadow-violet-100'
      };
    }

    // Honey theme (Cozy warm caramelized tones)
    if (t === 'honey') {
      if (s.includes('math')) {
        return {
          bg: 'from-amber-250 to-yellow-350',
          text: 'text-amber-950',
          border: 'border-amber-150',
          shadow: 'shadow-amber-100'
        };
      }
      if (s.includes('sci')) {
        return {
          bg: 'from-yellow-250 to-amber-350',
          text: 'text-amber-950',
          border: 'border-yellow-200',
          shadow: 'shadow-amber-100'
        };
      }
      if (s.includes('eng')) {
        return {
          bg: 'from-orange-300 to-amber-350',
          text: 'text-amber-950',
          border: 'border-orange-200',
          shadow: 'shadow-amber-100'
        };
      }
      if (s.includes('comp') || s.includes('cod')) {
        return {
          bg: 'from-amber-350 to-orange-355',
          text: 'text-amber-950',
          border: 'border-amber-250',
          shadow: 'shadow-amber-100'
        };
      }
      if (s.includes('hist') || s.includes('soc')) {
        return {
          bg: 'from-yellow-250 to-amber-300',
          text: 'text-amber-950',
          border: 'border-yellow-150',
          shadow: 'shadow-amber-100'
        };
      }
      return {
        bg: 'from-amber-250 to-yellow-250',
        text: 'text-amber-950',
        border: 'border-amber-150',
        shadow: 'shadow-amber-100'
      };
    }

    // Ocean theme (Minty crisp teal waves)
    if (t === 'ocean') {
      if (s.includes('math')) {
        return {
          bg: 'from-cyan-250 to-teal-350',
          text: 'text-cyan-950',
          border: 'border-cyan-200',
          shadow: 'shadow-teal-100'
        };
      }
      if (s.includes('sci')) {
        return {
          bg: 'from-teal-300 to-emerald-350',
          text: 'text-teal-950',
          border: 'border-teal-200',
          shadow: 'shadow-teal-100'
        };
      }
      if (s.includes('eng')) {
        return {
          bg: 'from-teal-150 to-indigo-250',
          text: 'text-indigo-950',
          border: 'border-teal-100',
          shadow: 'shadow-teal-100'
        };
      }
      if (s.includes('comp') || s.includes('cod')) {
        return {
          bg: 'from-cyan-350 to-blue-355',
          text: 'text-blue-950',
          border: 'border-cyan-250',
          shadow: 'shadow-teal-100'
        };
      }
      if (s.includes('hist') || s.includes('soc')) {
        return {
          bg: 'from-teal-200 to-amber-150',
          text: 'text-teal-950',
          border: 'border-teal-150',
          shadow: 'shadow-teal-50'
        };
      }
      return {
        bg: 'from-teal-250 to-cyan-300',
        text: 'text-teal-950',
        border: 'border-teal-200',
        shadow: 'shadow-teal-100'
      };
    }

    // Peach theme (Creamy sweet apricot)
    if (t === 'peach') {
      if (s.includes('math')) {
        return {
          bg: 'from-orange-200 to-pink-200',
          text: 'text-orange-950',
          border: 'border-orange-100',
          shadow: 'shadow-orange-50'
        };
      }
      if (s.includes('sci')) {
        return {
          bg: 'from-emerald-150 to-orange-150',
          text: 'text-orange-950',
          border: 'border-emerald-100',
          shadow: 'shadow-orange-50'
        };
      }
      if (s.includes('eng')) {
        return {
          bg: 'from-pink-250 to-orange-250',
          text: 'text-orange-950',
          border: 'border-pink-150',
          shadow: 'shadow-orange-50'
        };
      }
      if (s.includes('comp') || s.includes('cod')) {
        return {
          bg: 'from-rose-250 to-orange-200',
          text: 'text-orange-950',
          border: 'border-rose-150',
          shadow: 'shadow-orange-50'
        };
      }
      if (s.includes('hist') || s.includes('soc')) {
        return {
          bg: 'from-amber-250 to-orange-250',
          text: 'text-orange-950',
          border: 'border-amber-155',
          shadow: 'shadow-orange-50'
        };
      }
      return {
        bg: 'from-orange-200 to-pink-200',
        text: 'text-orange-950',
        border: 'border-orange-150',
        shadow: 'shadow-orange-50'
      };
    }

    // Default safety return
    return {
      bg: 'from-pink-400 to-rose-450',
      text: 'text-white',
      border: 'border-pink-300',
      shadow: 'shadow-pink-200/50'
    };
  };

  const style = getColors(subject, activeTheme);

  return (
    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${style.bg} ${style.border} border-2 flex flex-col items-center justify-center relative shadow-md ${style.shadow} overflow-hidden font-sans select-none transition-all duration-300 hover:scale-105 active:scale-95`}>
      {/* Glossy radial shine */}
      <div className="absolute top-[-8px] right-[-8px] w-6 h-6 rounded-full bg-white/20 blur-[1px]"></div>
      <div className="absolute bottom-[-10px] left-[-10px] w-8 h-8 rounded-full bg-white/10 blur-[1px]"></div>
      
      {/* Tiny star sticker badge decor */}
      <div className="absolute top-1 right-2 text-[7px] opacity-75">✨</div>

      {/* Stamp text */}
      <div className="text-[8.5px] font-black tracking-widest opacity-80 uppercase mt-0.5 scale-90 text-white/80 filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]">
        CH
      </div>
      
      {/* Glossy Bubbly count */}
      <span className={`text-2xl font-black ${style.text} tracking-tighter filter drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.19)] -mt-1`}>
        {num}
      </span>
      
      {/* Cute shiny circle glass spot */}
      <div className="absolute top-1 left-2.5 w-1.5 h-1.5 rounded-full bg-white/70"></div>
    </div>
  );
}

export default function SubjectsView({ setTab, setSelectedChapter }: { setTab: (tab: string) => void, setSelectedChapter: (chapter: any) => void }) {
  const [chapters, setChapters] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { userData, user, updateUserData } = useAppContext();
  
  const [deletingChapter, setDeletingChapter] = useState<any | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  
  const [isEditingSubjects, setIsEditingSubjects] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const subjects = ['All', ...(userData?.subjects || ['Math', 'Science', 'English', 'Computer', 'History'])];

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chapters'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(document => ({ id: document.id, ...document.data() }));
      setChapters(data);
    });
    return () => unsub();
  }, [user]);

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

  const getChapterNumber = (chapterId: string, subject: string) => {
    const subjectChapters = chapters.filter(c => c.subject === subject);
    const index = subjectChapters.findIndex(c => c.id === chapterId);
    return index !== -1 ? index + 1 : 1;
  };

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
                  className="shrink-0 cursor-pointer"
                  onClick={() => {
                    setSelectedChapter(chapter);
                    setTab('chapterDetails');
                  }}
                >
                  <CuteChapterIcon 
                    subject={chapter.subject} 
                    num={getChapterNumber(chapter.id, chapter.subject)} 
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
