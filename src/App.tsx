import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './store';
import AuthScreen from './components/AuthScreen';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import MainDashboard from './components/MainDashboard';
import SubjectsView from './components/SubjectsView';
import VideoPlayerView from './components/VideoPlayerView';
import StatsView from './components/StatsView';
import ProfileView from './components/ProfileView';
import ChapterDetailsView from './components/ChapterDetailsView';
import AchievementsView from './components/AchievementsView';
import { motion } from 'motion/react';
import { ShieldAlert, KeyRound, WifiOff, RefreshCw } from 'lucide-react';

function MainApp() {
  const { user, userData, loading, setDeletePin } = useAppContext();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [playingVideo, setPlayingVideo] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  
  // States for PIN upgrading
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleUpgradePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      setErrorMsg('PIN must be exactly 6 digits! 🔐');
      return;
    }
    if (newPin !== confirmPin) {
      setErrorMsg('PINs do not match! ❌');
      return;
    }
    setIsUpgrading(true);
    try {
      await setDeletePin(newPin);
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      setErrorMsg('Failed to update PIN. Try again!');
    } finally {
      setIsUpgrading(false);
    }
  };

  if (!isOnline) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
        >
          <div className="w-20 h-20 bg-rose-950/50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
            <WifiOff size={40} />
          </div>
          <h2 className="text-2xl font-black mb-3 text-slate-100 tracking-tight leading-none">Connection Required 📡</h2>
          <p className="text-base font-bold text-rose-400 mb-4 px-2">Aap abhi offline hain!</p>
          <p className="text-sm text-slate-400 mb-8 leading-relaxed">
            StudyQuest ek online website ki tarah behave karta hai. Please internet connect karein to continue learning without losing progress!
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} className="animate-spin-slow" />
            Check Connection & Retry
          </button>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen transition-colors duration-300">

      {/* Force upgrade of legacy non-6-digit PINs */}
      {userData?.deletePin && userData.deletePin.length !== 6 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-6 sm:p-8 relative shadow-2xl border border-rose-100/40 dark:border-rose-950/45 text-center flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-500 flex items-center justify-center mb-6 shadow-inner">
              <ShieldAlert size={32} className="animate-pulse" />
            </div>
            
            <h2 className="text-2xl font-black mb-2 text-slate-800 dark:text-white tracking-tight leading-none">Upgrade PIN</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              To keep your dashboard details and deletions secure, Teacher PIN code is now required to be exactly <strong className="text-rose-500 font-bold">6 digits</strong>.
            </p>
            
            <form onSubmit={handleUpgradePin} className="w-full space-y-4">
              <div className="space-y-1 text-left">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 pl-1">New 6-Digit PIN</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => {
                      setErrorMsg('');
                      setNewPin(e.target.value.replace(/\D/g, ''));
                    }}
                    placeholder="••••••"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all font-mono tracking-widest text-lg font-black"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 pl-1">Confirm PIN</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => {
                      setErrorMsg('');
                      setConfirmPin(e.target.value.replace(/\D/g, ''));
                    }}
                    placeholder="••••••"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all font-mono tracking-widest text-lg font-black"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-rose-500 text-xs font-extrabold text-center bg-rose-50/50 dark:bg-rose-950/20 py-2 rounded-xl border border-rose-100 dark:border-rose-900/40">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isUpgrading || newPin.length !== 6 || confirmPin.length !== 6}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-2xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-2"
              >
                {isUpgrading ? "Upgrading PIN..." : "Save PIN & Continue"}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {currentTab !== 'player' && currentTab !== 'chapterDetails' && (
        <Header currentTab={currentTab} setTab={setCurrentTab} />
      )}
      
      <main>
        {currentTab === 'dashboard' && <MainDashboard setTab={setCurrentTab} setPlayingVideo={setPlayingVideo} />}
        {currentTab === 'study' && <SubjectsView setTab={setCurrentTab} setSelectedChapter={setSelectedChapter} />}
        {currentTab === 'chapterDetails' && selectedChapter && (
          <ChapterDetailsView chapter={selectedChapter} setTab={setCurrentTab} setPlayingVideo={setPlayingVideo} />
        )}
        {currentTab === 'stats' && <StatsView />}
        {currentTab === 'achievements' && <AchievementsView />}
        {currentTab === 'profile' && <ProfileView />}
        {currentTab === 'player' && playingVideo && (
          <VideoPlayerView video={playingVideo} setTab={setCurrentTab} hasActiveChapter={!!selectedChapter} />
        )}
      </main>

      {currentTab !== 'player' && currentTab !== 'chapterDetails' && (
        <BottomNav currentTab={currentTab} setTab={setCurrentTab} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
