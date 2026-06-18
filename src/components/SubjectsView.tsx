import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Plus, BookOpen, ChevronRight } from 'lucide-react';
import AddChapterModal from './AddChapterModal';

export default function SubjectsView({ setTab, setSelectedChapter }: { setTab: (tab: string) => void, setSelectedChapter: (chapter: any) => void }) {
  const [chapters, setChapters] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const subjects = ['All', 'Math', 'Science', 'English', 'Computer', 'History'];

  useEffect(() => {
    const q = query(collection(db, 'chapters'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChapters(data);
    });
    return () => unsub();
  }, []);

  const filtered = filter === 'All' ? chapters : chapters.filter(c => c.subject === filter);

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24 space-y-6">
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

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {subjects.map(subj => (
          <button
            key={subj}
            onClick={() => setFilter(subj)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === subj 
                ? 'app-btn-primary shadow-md' 
                : 'app-card border opacity-70 hover:opacity-100'
            }`}
          >
            {subj}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 app-card rounded-2xl border border-dashed text-slate-500">
            <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="font-bold text-lg mb-1">No chapters found</h3>
            <p className="text-sm opacity-70">Be the first to create a topic.</p>
          </div>
        ) : (
          filtered.map(chapter => (
            <div 
              key={chapter.id} 
              className="app-card rounded-2xl p-4 border flex items-center gap-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all w-full group"
              onClick={() => {
                setSelectedChapter(chapter);
                setTab('chapterDetails');
              }}
            >
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 flex items-center justify-center shrink-0">
                <BookOpen size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">
                  {chapter.subject} • {chapter.classLevel}
                </div>
                <h3 className="font-bold text-lg leading-tight mb-1 truncate">{chapter.title}</h3>
                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {chapter.videos?.length || 0} {(chapter.videos?.length === 1) ? 'video' : 'videos'}
                </div>
              </div>
              <div className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors">
                <ChevronRight size={24} />
              </div>
            </div>
          ))
        )}
      </div>

      <AddChapterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

function extractYtId(url: string) {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
  return (match && match[1]) ? match[1] : '';
}
