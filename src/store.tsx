import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getLevelInfo } from './lib/utils';

export interface UserData {
  displayName?: string;
  photoURL?: string;
  points: number;
  level: number;
  streak: number;
  lastActive: string;
  theme: string;
  rewards: string[]; // List of coupon codes
  completedLessons: string[]; // List of lesson IDs
  lessonProgress?: Record<string, number>; // Maps lesson ID to seconds watched
  deletePin?: string;
}

const DEFAULT_USER_DATA: UserData = {
  displayName: '',
  photoURL: '',
  points: 0,
  level: 1,
  streak: 1,
  lastActive: new Date().toISOString(),
  theme: 'slate',
  rewards: [],
  completedLessons: [],
  lessonProgress: {},
  deletePin: '',
};

interface AppContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  updateUserData: (data: Partial<UserData>) => Promise<void>;
  addPoints: (amount: number) => Promise<void>;
  redeemReward: (cost: number, rewardName: string) => Promise<void>;
  setTheme: (theme: string) => Promise<void>;
  markLessonComplete: (lessonId: string, pointsEarned: number) => Promise<void>;
  updateLessonProgress: (lessonId: string, progressSeconds: number) => Promise<void>;
  setDeletePin: (pin: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Subscribe to user data
        const userRef = doc(db, 'users', currentUser.uid);
        const unsubDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserData;
            
            // Backport displayName or photoURL if missing in Firestore doc
            const missingName = !data.displayName;
            const missingPhoto = !data.photoURL;
            if (missingName || missingPhoto) {
              const finalName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Student';
              const finalPhoto = currentUser.photoURL || '';
              updateDoc(userRef, {
                ...(missingName ? { displayName: finalName } : {}),
                ...(missingPhoto ? { photoURL: finalPhoto } : {})
              });
            }

            // Check streak
            const today = new Date().toDateString();
            const lastActiveDate = new Date(data.lastActive || new Date().toISOString()).toDateString();
            
            let newStreak = data.streak;
            if (today !== lastActiveDate) {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              if (lastActiveDate === yesterday.toDateString()) {
                newStreak += 1; // Increment streak
              } else {
                newStreak = 1; // Reset streak
              }
              // Update last active in background
              updateDoc(userRef, { lastActive: new Date().toISOString(), streak: newStreak });
            }
            
            setUserData({ ...data, streak: newStreak });
          } else {
            // Create initial user data
            const initialData: UserData = {
              ...DEFAULT_USER_DATA,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Student',
              photoURL: currentUser.photoURL || ''
            };
            setDoc(userRef, initialData);
            setUserData(initialData);
          }
          setLoading(false);
        });
        return () => unsubDoc();
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Apply theme to body
    if (userData?.theme) {
      document.body.className = `theme-${userData.theme}`;
    }
  }, [userData?.theme]);

  const updateUserData = async (data: Partial<UserData>) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, data);
  };

  const addPoints = async (amount: number) => {
    if (!userData || !user) return;
    const newPoints = userData.points + amount;
    const { level: newLevel } = getLevelInfo(newPoints);
    await updateUserData({ points: newPoints, level: newLevel });
  };

  const redeemReward = async (cost: number, rewardName: string) => {
    if (!userData || !user || userData.points < cost) return;
    const couponCode = `SQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${rewardName.substring(0, 3).toUpperCase()}`;
    await updateUserData({
      points: userData.points - cost,
      rewards: [...userData.rewards, couponCode],
    });
  };

  const setTheme = async (theme: string) => {
    await updateUserData({ theme });
  };

  const markLessonComplete = async (lessonId: string, pointsEarned: number) => {
    if (!userData || !user) return;
    if (!userData.completedLessons.includes(lessonId)) {
      await updateUserData({
        completedLessons: [...userData.completedLessons, lessonId],
      });
      await addPoints(pointsEarned);
    }
  };

  const updateLessonProgress = async (lessonId: string, progressSeconds: number) => {
    if (!userData || !user) return;
    const currentProgress = userData.lessonProgress || {};
    // Only update if progress is at least 5 seconds greater to avoid spamming
    if (!currentProgress[lessonId] || progressSeconds - currentProgress[lessonId] > 5 || currentProgress[lessonId] - progressSeconds > 5) {
       await updateUserData({
         lessonProgress: {
           ...currentProgress,
           [lessonId]: progressSeconds
         }
       });
    }
  };

  const setDeletePin = async (pin: string) => {
    await updateUserData({ deletePin: pin });
  };

  return (
    <AppContext.Provider value={{
      user,
      userData,
      loading,
      updateUserData,
      addPoints,
      redeemReward,
      setTheme,
      markLessonComplete,
      updateLessonProgress,
      setDeletePin
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
