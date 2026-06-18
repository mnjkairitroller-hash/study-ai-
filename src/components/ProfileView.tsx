import React, { useState } from 'react';
import { useAppContext } from '../store';
import { auth } from '../lib/firebase';
import { LogOut, Palette, Ticket, Shield, Lock } from 'lucide-react';
import { signOut } from 'firebase/auth';

export default function ProfileView() {
  const { userData, user, setTheme, setDeletePin } = useAppContext();
  const [pinInput, setPinInput] = useState('');
  const [pinSaved, setPinSaved] = useState(false);

  const themes = [
    { id: 'slate', name: 'Classic Slate', color: 'bg-slate-900 border-slate-700' },
    { id: 'sakura', name: 'Sakura Pink', color: 'bg-pink-100 border-pink-300' },
    { id: 'emerald', name: 'Emerald', color: 'bg-emerald-100 border-emerald-300' },
    { id: 'sunset', name: 'Sunset', color: 'bg-orange-100 border-orange-300' },
    { id: 'cyberpunk', name: 'Cyberpunk', color: 'bg-zinc-900 border-yellow-500' },
  ];

  if (!userData) return null;

  const handleSavePin = () => {
    if (pinInput.trim()) {
      setDeletePin(pinInput.trim());
      setPinInput('');
      setPinSaved(true);
      setTimeout(() => setPinSaved(false), 3000);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24 space-y-8">
      <div className="flex flex-col items-center mt-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white text-4xl font-bold shadow-xl mb-4 border-4 border-white/10">
          {user?.displayName?.charAt(0) || 'U'}
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{user?.displayName || 'Student'}</h2>
        <p className="app-text-muted">{user?.email}</p>
        <div className="mt-2 text-sm font-bold bg-black/10 dark:bg-white/10 px-3 py-1 rounded-full uppercase tracking-wider">
          Level {userData.level} Explorer
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Palette className="text-pink-500" />
          Theme Customization
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

      <div className="space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Lock className="text-indigo-500" />
          Teacher PIN (For Deleting Chapters)
        </h3>
        <div className="app-card rounded-2xl p-4 border space-y-3">
           <p className="text-sm app-text-muted">Set a PIN to prevent accidental deletion of chapters.</p>
           <div className="flex gap-2">
             <input
                type="password"
                placeholder={userData.deletePin ? "••••••••" : "Enter new PIN"}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="flex-1 bg-transparent border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
             />
             <button 
                onClick={handleSavePin}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
             >
                Save
             </button>
           </div>
           {pinSaved && <p className="text-green-500 text-xs font-bold">PIN updated successfully.</p>}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Ticket className="text-yellow-500" />
          My Coupons
        </h3>
        {userData.rewards.length === 0 ? (
          <div className="text-center py-6 app-card rounded-2xl border border-dashed opacity-50">
            <p className="text-sm font-medium">No coupons yet. Head to the store!</p>
          </div>
        ) : (
          <div className="space-y-2">
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

      <div className="pt-4">
        <button 
          onClick={() => signOut(auth)}
          className="w-full py-4 rounded-xl border border-red-500/30 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-all"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </div>
  );
}
