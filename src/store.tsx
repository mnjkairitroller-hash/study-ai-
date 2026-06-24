import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, getDoc } from 'firebase/firestore';
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
  subjects?: string[];
  dailyLessonsCount?: number;
  currentRoutine?: {
    date: string;
    videos: { id: string; title: string; videoUrl: string; subject: string; duration?: number }[];
  } | null;
  lastRoutinePenaltyDate?: string;
  redemptionHistory?: { id: string; title: string; cost: number; date: string; coupon: string }[];
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
  subjects: ['Math', 'Science', 'English', 'Computer', 'History'],
};

interface AppContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  updateUserData: (data: Partial<UserData>) => Promise<void>;
  addPoints: (amount: number) => Promise<void>;
  redeemReward: (cost: number, rewardId: string, rewardTitle: string) => Promise<void>;
  setTheme: (theme: string) => Promise<void>;
  markLessonComplete: (lessonId: string, pointsEarned: number, durationSeconds?: number) => Promise<void>;
  updateLessonProgress: (lessonId: string, progressSeconds: number) => Promise<void>;
  setDeletePin: (pin: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
  restoreProgressFromEmail: (sourceEmail: string) => Promise<{ success: boolean; backup: any }>;
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
              if (!docSnap.metadata.fromCache) {
                updateDoc(userRef, {
                  ...(missingName ? { displayName: finalName } : {}),
                  ...(missingPhoto ? { photoURL: finalPhoto } : {})
                });
              }
            }

            // Check streak safely without ANY point/XP penalties
            const today = new Date().toDateString();
            const lastActiveDate = new Date(data.lastActive || new Date().toISOString()).toDateString();
            
            let newStreak = data.streak || 1;
            let currentPoints = data.points || 0;
            let currentLevel = data.level || 1;

            if (today !== lastActiveDate) {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              
              const updates: any = { lastActive: new Date().toISOString(), dailyLessonsCount: 0 };
              
              if (lastActiveDate === yesterday.toDateString()) {
                newStreak += 1; // Increment streak
                updates.streak = newStreak;
              } else {
                newStreak = 1; // Reset streak if they missed a day
                updates.streak = newStreak;
              }
              
              // Update last active and streak in background, only if not from cache
              if (!(docSnap as any).metadata?.fromCache) {
                updateDoc(userRef, updates);
              }
            }

            const finalState = { ...data, streak: newStreak, points: currentPoints, level: currentLevel };
            setUserData(finalState);
            setLoading(false);

            // Auto-backup for the 3 specified family accounts
            if (currentUser.email) {
              const emailLower = currentUser.email.toLowerCase();
              const familyEmails = ['mnjkairi1@gmail.com', 'mnjkairitroller@gmail.com', 'pavanffm@gmail.com'];
              if (familyEmails.includes(emailLower)) {
                const backupRef = doc(db, 'family_backups', emailLower);
                setDoc(backupRef, {
                  ...finalState,
                  email: emailLower,
                  lastBackupTime: new Date().toISOString()
                }, { merge: true }).catch(err => {
                  console.error("Auto backup save failed:", err);
                });
              }
            }
          } else {
            // Create initial user data ONLY if we are online and sure it doesn't exist on server
            if (!(docSnap as any).metadata?.fromCache) {
              const initialData: UserData = {
                ...DEFAULT_USER_DATA,
                displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Student',
                photoURL: currentUser.photoURL || ''
              };
              setDoc(userRef, initialData);
              setUserData(initialData);
              setLoading(false);
            } else {
              console.log("Document does not exist in local cache, waiting for server connection...");
              // Do NOT call setDoc or clear user loading
            }
          }
        }, (error) => {
          console.error("Firestore user onSnapshot error:", error);
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
    const newPoints = Math.max(10, userData.points + amount);
    const { level: calculatedLevel } = getLevelInfo(newPoints);
    const finalLevel = Math.max(userData.level, calculatedLevel); // Never decrease level
    await updateUserData({ points: newPoints, level: finalLevel });
  };

  const redeemReward = async (cost: number, rewardId: string, rewardTitle: string) => {
    if (!userData || !user || userData.points < cost) return;
    const couponCode = `SQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${rewardId.substring(0, 3).toUpperCase()}`;
    const newRedemption = {
      id: Math.random().toString(36).substring(2, 9),
      title: rewardTitle,
      cost: cost,
      date: new Date().toISOString(),
      coupon: couponCode,
    };
    const currentHistory = userData.redemptionHistory || [];
    
    // Points go down, but level never goes down
    const newPoints = Math.max(0, userData.points - cost);
    
    await updateUserData({
      points: newPoints,
      rewards: [...userData.rewards, couponCode],
      redemptionHistory: [...currentHistory, newRedemption],
    });
  };

  const setTheme = async (theme: string) => {
    await updateUserData({ theme });
  };

  const markLessonComplete = async (lessonId: string, pointsEarned: number, durationSeconds?: number) => {
    if (!userData || !user) return;
    
    let currentDailyCount = userData.dailyLessonsCount || 0;
    const today = new Date().toDateString();
    const lastActiveDate = new Date(userData.lastActive || new Date().toISOString()).toDateString();
    if (today !== lastActiveDate) {
      currentDailyCount = 0;
    }
    
    // If a video is nearly 2 hours (> 90 mins / 5400 secs), it counts as 2 daily lessons
    const countToAdd = (durationSeconds && durationSeconds >= 5400) ? 2 : 1;
    
    const completedList = userData.completedLessons || [];
    if (!completedList.includes(lessonId)) {
      await updateUserData({
        completedLessons: [...completedList, lessonId],
        dailyLessonsCount: currentDailyCount + countToAdd,
        lastActive: new Date().toISOString()
      });
      await addPoints(pointsEarned);
    } else {
      // Still consider it daily reading if practiced
      await updateUserData({
        dailyLessonsCount: currentDailyCount + countToAdd,
        lastActive: new Date().toISOString()
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

  const refreshUserData = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        setUserData({ ...data, streak: data.streak || 1 });
      }
    } catch (err) {
      console.error("Error refreshing data:", err);
    }
  };

  const restoreProgressFromEmail = async (sourceEmail: string): Promise<{ success: boolean; backup: any }> => {
    if (!user) throw new Error("No user is logged in!");
    try {
      const backupRef = doc(db, 'family_backups', sourceEmail.toLowerCase().trim());
      const backupSnap = await getDoc(backupRef);
      if (!backupSnap.exists()) {
        throw new Error(`Progress backup for ${sourceEmail} does not exist in the cloud yet!`);
      }
      
      const backupData = backupSnap.data() as any;
      const cleanBackup: Partial<UserData> = {
        points: backupData.points ?? 0,
        level: backupData.level ?? 1,
        streak: backupData.streak ?? 1,
        lastActive: backupData.lastActive ?? new Date().toISOString(),
        rewards: backupData.rewards ?? [],
        completedLessons: backupData.completedLessons ?? [],
        lessonProgress: backupData.lessonProgress ?? {},
        deletePin: backupData.deletePin ?? '',
        subjects: backupData.subjects ?? ['Math', 'Science', 'English', 'Computer', 'History'],
        dailyLessonsCount: backupData.dailyLessonsCount ?? 0,
        currentRoutine: backupData.currentRoutine ?? null,
        redemptionHistory: backupData.redemptionHistory ?? [],
      };

      // Write to current user's profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, cleanBackup);

      // Force-write or align the local state as well
      setUserData((prev) => prev ? { ...prev, ...cleanBackup } : (cleanBackup as UserData));

      // Mirror it to this user's email backup slot so they match
      if (user.email) {
        const myEmailLower = user.email.toLowerCase();
        const myBackupRef = doc(db, 'family_backups', myEmailLower);
        await setDoc(myBackupRef, {
          ...cleanBackup,
          email: myEmailLower,
          lastBackupTime: new Date().toISOString()
        }, { merge: true });
      }

      return { success: true, backup: cleanBackup };
    } catch (err: any) {
      console.error("Restore progress error:", err);
      throw new Error(err.message || "Failed to restore progress");
    }
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
      setDeletePin,
      refreshUserData,
      restoreProgressFromEmail
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
