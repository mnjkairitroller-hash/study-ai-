import React, { useState } from 'react';
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
import PWAInstall from './components/PWAInstall';

function MainApp() {
  const { user, loading } = useAppContext();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [playingVideo, setPlayingVideo] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);

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
      <PWAInstall />
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
