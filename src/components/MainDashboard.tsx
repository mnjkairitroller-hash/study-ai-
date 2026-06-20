import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { useAppContext } from '../store';
import { getLevelInfo } from '../lib/utils';
import { Flame, PlayCircle, Target, CheckCircle2, Trophy, Sparkles, BookHeart, BrainCircuit, Award, Users, Calendar, HelpCircle, Check, AlertCircle, X, RotateCcw, ChevronRight, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import mascotImg from '../assets/images/cute_study_mascot_1781752313835.jpg';
import confetti from 'canvas-confetti';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const BRAIN_BOOSTERS = [
  {
    question: "If 4x + 12 = 36, what is the value of x?",
    options: ["4", "6", "8", "12"],
    correct: 1, // "6"
    explanation: "Subtract 12 from both sides to get 4x = 24. Then, divide by 4 to get x = 6!"
  },
  {
    question: "Which organelle is widely known as the powerhouse of the cell?",
    options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi body"],
    correct: 2, // "Mitochondria"
    explanation: "Mitochondria convert glucose into ATP, supplying energy for cellular processes!"
  },
  {
    question: "What is the square root of 225?",
    options: ["13", "14", "15", "16"],
    correct: 2, // "15"
    explanation: "15 multiplied by 15 is exactly 225!"
  },
  {
    question: "Which gas is vital for plants during photosynthesis?",
    options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"],
    correct: 1, // "Carbon Dioxide"
    explanation: "Plants absorb Carbon Dioxide (CO2) and release Oxygen (O2) during photosynthesis."
  },
  {
    question: "What is the value of Pi (π) rounded to two decimal places?",
    options: ["3.12", "3.14", "3.16", "3.18"],
    correct: 1, // "3.14"
    explanation: "Pi is a ratio of circumference to diameter, universally valued at approximately 3.14."
  },
  {
    question: "What is the smallest prime number?",
    options: ["0", "1", "2", "3"],
    correct: 2, // "2"
    explanation: "2 is the smallest prime number and also the only even prime number!"
  },
  {
    question: "How many bones are there in an adult human body?",
    options: ["186", "206", "306", "216"],
    correct: 1, // "206"
    explanation: "An adult human skeleton has exactly 206 bones, while babes have around 270!"
  }
];

const CLASS_8_DAILY_QUESTIONS = [
  {
    question: "Which of the following is present only in plant cells and not in animal cells?",
    options: ["Cell membrane", "Cytoplasm", "Cell wall", "Mitochondria"],
    correct: 2,
    explanation: "Plant cells have a rigid outer cell wall outside the cell membrane, which provides structural support. Animal cells do not have cell walls."
  },
  {
    question: "What is the additive inverse of -7/19?",
    options: ["-19/7", "7/19", "19/7", "-7/19"],
    correct: 1,
    explanation: "The additive inverse of a number is the number that, when added to it, yields zero. Thus, -7/19 + 7/19 = 0."
  },
  {
    question: "Friction can be increased by which of the following actions?",
    options: ["Using lubricants", "Using ball bearings", "Making the surface rougher", "Polishing the surface"],
    correct: 2,
    explanation: "Making a surface rougher increases interlocking between microscopic irregularities, thereby increasing friction."
  },
  {
    question: "Solve for x: 3x - 7 = 8.",
    options: ["x = 3", "x = 4", "x = 5", "x = 6"],
    correct: 2,
    explanation: "Adding 7 to both sides gives 3x = 15. Dividing by 3 gives x = 5."
  },
  {
    question: "Which of the following gases supports combustion?",
    options: ["Carbon Dioxide", "Nitrogen", "Oxygen", "Hydrogen"],
    correct: 2,
    explanation: "Oxygen is necessary for combustion to take place; it supports burning."
  },
  {
    question: "Which of the following is a perfect square?",
    options: ["32", "48", "64", "72"],
    correct: 2,
    explanation: "64 is a perfect square because 8 × 8 = 64."
  },
  {
    question: "Which bacterium is responsible for the formation of curd from milk?",
    options: ["Lactobacillus", "Rhizobium", "Vibrio", "E. coli"],
    correct: 0,
    explanation: "Lactobacillus bacteria promote the conversion of milk into curd by fermenting lactose into lactic acid."
  },
  {
    question: "What is the value of (2^3) × (2^2)?",
    options: ["12", "16", "32", "64"],
    correct: 2,
    explanation: "According to exponent laws, 2^3 × 2^2 = 2^(3+2) = 2^5 = 32."
  },
  {
    question: "Which high-reactivity metal is stored in kerosene to prevent reaction with atmospheric air and moisture?",
    options: ["Iron", "Sodium", "Copper", "Gold"],
    correct: 1,
    explanation: "Sodium is highly reactive and reacts vigorously with oxygen and moisture, so it is stored safely in kerosene."
  },
  {
    question: "The area of a trapezium is given by which formula?",
    options: ["Base × Height", "1/2 × (sum of parallel sides) × height", "Length × Breadth", "Side × Side"],
    correct: 1,
    explanation: "The area of a trapezium is half the sum of its parallel sides multiplied by the perpendicular height between them."
  }
];

const STUDY_TOPICS = [
  "Linear Equations",
  "Cell Biology",
  "Polynomials",
  "English Grammar",
  "French Revolution",
  "Matter in our surroundings",
  "Electoral Politics",
  "Atoms & Molecules"
];

const STUDY_STATUSES = [
  "Solving MCQ Booster Quiz 🧠",
  "Watching Science Expert Lecture 🧬",
  "Studying Advanced Maths 📐",
  "Practicing Subject Chapter Exercises 📝",
  "Analyzing Worksheet Solutions 📖",
  "Reviewing Revision Notes 📑"
];

export default function MainDashboard({ setTab, setPlayingVideo }: { setTab: (tab: string) => void, setPlayingVideo?: (vid: any) => void }) {
  const { userData, user, addPoints, updateUserData, markLessonComplete } = useAppContext();
  const [chapters, setChapters] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [checkingRoutine, setCheckingRoutine] = useState(false);
  const [penaltyDetails, setPenaltyDetails] = useState<{
    date: string;
    pointsDeducted: number;
    missedLessons: { id: string; title: string; duration: number; subject: string }[];
  } | null>(null);

  const [aiCompetitors, setAiCompetitors] = useState<any[]>([]);
  const [aiNotification, setAiNotification] = useState<{ message: string; subMessage: string; timestamp: number } | null>(null);

  // Parent Override Video States
  const [overrideTargetQuest, setOverrideTargetQuest] = useState<any | null>(null);
  const [overridePinInput, setOverridePinInput] = useState('');
  const [overrideError, setOverrideError] = useState('');

  // Load and initialize 9 realistic Indian classmate AI Competitors from localStorage
  useEffect(() => {
    if (!user) return;
    const storageKey = 'gamified_study_ai_opponents_v4_9ai';
    const saved = localStorage.getItem(storageKey);
    let list = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (err) {
        console.error(err);
      }
    }

    const DEFAULT_OPPONENTS = [
      { id: 'ai_opp_1', displayName: 'Aditya Joshi', pointsOffset: 120, streak: 7, status: 'Reviewing Math Shortcuts 📐' },
      { id: 'ai_opp_2', displayName: 'Priya Sharma', pointsOffset: 85, streak: 6, status: 'Online • Solving Physics MCQs ⚡' },
      { id: 'ai_opp_3', displayName: 'Rohan Gupta', pointsOffset: 55, streak: 5, status: 'Solving Chemistry equations 🧪' },
      { id: 'ai_opp_4', displayName: 'Sneha Patel', pointsOffset: 25, streak: 4, status: 'Reading English summaries 📖' },
      { id: 'ai_opp_5', displayName: 'Vikram Malhotra', pointsOffset: -15, streak: 3, status: 'Active studying 📚' },
      { id: 'ai_opp_6', displayName: 'Aanya Sen', pointsOffset: -45, streak: 3, status: 'Online • Ready to study ⚡' },
      { id: 'ai_opp_7', displayName: 'Riya Verma', pointsOffset: -80, streak: 2, status: 'Completing Computer science worksheet 💻' },
      { id: 'ai_opp_8', displayName: 'Kabir Dev', pointsOffset: -120, streak: 1, status: 'Solving Daily Brain Booster 🧠' },
      { id: 'ai_opp_9', displayName: 'Ishaan Choudhury', pointsOffset: -170, streak: 1, status: 'Reading customized history notes 📜' }
    ];

    if (!list || list.length < 9) {
      const userPts = userData?.points || 0;
      list = DEFAULT_OPPONENTS.map(opp => {
        const startPoints = Math.max(15, userPts + opp.pointsOffset);
        const { level: calculatedLevel } = getLevelInfo(startPoints);
        return {
          id: opp.id,
          displayName: opp.displayName,
          points: startPoints,
          level: calculatedLevel,
          streak: opp.streak,
          status: opp.status,
          lastActive: Date.now() - Math.floor(Math.random() * 600000)
        };
      });
      localStorage.setItem(storageKey, JSON.stringify(list));
    }
    setAiCompetitors(list);
  }, [user]);

  // AI Classmates learning simulator (every 40 seconds, 1-2 random students finish study tasks and gain points)
  useEffect(() => {
    if (aiCompetitors.length === 0) return;

    const interval = setInterval(() => {
      // Pick 1 or 2 random AI competitors to study / do activities
      const countToUpdate = Math.random() < 0.45 ? 2 : 1;
      const targetIndices = new Set<number>();
      while (targetIndices.size < countToUpdate && targetIndices.size < aiCompetitors.length) {
        targetIndices.add(Math.floor(Math.random() * aiCompetitors.length));
      }

      const updatedList = aiCompetitors.map((comp, idx) => {
        if (!targetIndices.has(idx)) return comp;

        const roll = Math.random();
        const copy = { ...comp };

        if (roll < 0.3) {
          // Update learning status / topic only
          const rollStatus = Math.random();
          if (rollStatus < 0.25) {
            copy.status = 'Offline • Taking a quick rest 🍎';
          } else if (rollStatus < 0.5) {
            copy.status = 'Online • Navigating Chapter Parts 🗺️';
          } else {
            const topic = STUDY_TOPICS[Math.floor(Math.random() * STUDY_TOPICS.length)];
            const activeType = STUDY_STATUSES[Math.floor(Math.random() * STUDY_STATUSES.length)];
            copy.status = `${activeType.replace('🧠', '').replace('🧬', '').replace('📐', '').replace('📝', '').replace('📖', '').trim()} on ${topic}`;
          }
        } else if (roll < 0.82) {
          // Completed task / quiz to gain points
          const pointsGainedPool = [10, 20, 30, 50]; 
          const gained = pointsGainedPool[Math.floor(Math.random() * pointsGainedPool.length)];
          const newPts = copy.points + gained;
          const { level: newLevel } = getLevelInfo(newPts);

          const levelUpOccurred = newLevel > copy.level;
          
          copy.points = newPts;
          copy.level = newLevel;
          copy.lastActive = Date.now();
          copy.status = `Completed study quiz successfully! +${gained} Pts ⚡`;

          if (Math.random() < 0.15) {
            copy.streak += 1;
          }

          // Trigger a beautiful live screen notification toast
          if (gained >= 35) {
            setAiNotification({
              message: `${copy.displayName} completed a mission! 🎉`,
              subMessage: `Gained +${gained} Points! Current rank reshuffled. ` + (levelUpOccurred ? `Promoted to Level ${newLevel}! 🚀` : ''),
              timestamp: Date.now()
            });
          }
        } else {
          copy.status = 'Online • Ready to compete';
        }

        return copy;
      });

      setAiCompetitors(updatedList);
      localStorage.setItem('gamified_study_ai_opponents_v4_9ai', JSON.stringify(updatedList));
    }, 40000);

    return () => clearInterval(interval);
  }, [aiCompetitors]);

  // Clear live notification toast automatically
  useEffect(() => {
    if (aiNotification) {
      const timer = setTimeout(() => {
        setAiNotification(null);
      }, 5505);
      return () => clearTimeout(timer);
    }
  }, [aiNotification]);

  // Daily brain booster states
  const dayIndex = new Date().getDay() % BRAIN_BOOSTERS.length;
  const currentBooster = BRAIN_BOOSTERS[dayIndex];
  
  const boosterKey = `booster_idx_${user?.uid || 'guest'}_${new Date().toDateString()}`;
  const [boosterSolved, setBoosterSolved] = useState<boolean>(() => {
    return localStorage.getItem(boosterKey) === 'answered';
  });
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);

  useEffect(() => {
    setBoosterSolved(localStorage.getItem(boosterKey) === 'answered');
    setSelectedOpt(null);
    setShowExplanation(false);
  }, [boosterKey]);

  // Daily Class 8 MCQ states
  const class8QuizKey = `class8_quiz_${user?.uid || 'guest'}_${new Date().toDateString()}`;
  const [class8QuizSolvedToday, setClass8QuizSolvedToday] = useState<boolean>(() => {
    return localStorage.getItem(class8QuizKey) === 'completed';
  });
  const [class8QuizStarted, setClass8QuizStarted] = useState<boolean>(false);
  const [class8QuizIdx, setClass8QuizIdx] = useState<number>(0);
  const [class8QuizCorrectScore, setClass8QuizCorrectScore] = useState<number>(0);
  const [class8QuizIncorrectScore, setClass8QuizIncorrectScore] = useState<number>(0);
  const [class8QuizSelectedOpt, setClass8QuizSelectedOpt] = useState<number | null>(null);
  const [class8QuizAnswered, setClass8QuizAnswered] = useState<boolean>(false);
  const [class8PointsNet, setClass8PointsNet] = useState<number>(0);

  const [activeQuizQuestions, setActiveQuizQuestions] = useState<any[]>(() => {
    try {
      const qKey = `class8_questions_${user?.uid || 'guest'}_${new Date().toDateString()}`;
      const saved = localStorage.getItem(qKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loadingQuiz, setLoadingQuiz] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const generatePersonalizedQuiz = async () => {
    setLoadingQuiz(true);
    setLoadError(null);
    try {
      // Find relevant chapters (completed or in-progress)
      const relevant = chapters.filter((chapter: any) => {
        const videos = chapter.videos || [];
        if (videos.length === 0) return false;
        const completedCount = videos.filter((v: any) => 
          userData?.completedLessons?.includes(v.id)
        ).length;
        return completedCount > 0;
      });

      let selectedChapters = relevant;
      // Fallback: If no chapters are started, take active routine chapters
      if (selectedChapters.length === 0) {
        if (todayRoutine && todayRoutine.length > 0) {
          const routineChapterIds = todayRoutine.map(v => v.chapterId);
          selectedChapters = chapters.filter(ch => routineChapterIds.includes(ch.id));
        }
      }
      // Fallback 2: Any chapters at all
      if (selectedChapters.length === 0 && chapters.length > 0) {
        selectedChapters = [chapters[0]];
      }

      // If we have some chapters listed, trigger Gemini API
      if (selectedChapters.length > 0) {
        const listToPost = selectedChapters.slice(0, 5).map(ch => ({
          title: ch.title,
          subject: ch.subject
        }));

        const res = await fetch('/api/gemini/quiz/chapters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chaptersList: listToPost })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.questions) && data.questions.length === 10) {
            const qKey = `class8_questions_${user?.uid || 'guest'}_${new Date().toDateString()}`;
            localStorage.setItem(qKey, JSON.stringify(data.questions));
            setActiveQuizQuestions(data.questions);
            setClass8QuizStarted(true);
            return;
          }
        }
      }

      // Default fallback if no chapters added or API failed
      const qKey = `class8_questions_${user?.uid || 'guest'}_${new Date().toDateString()}`;
      localStorage.setItem(qKey, JSON.stringify(CLASS_8_DAILY_QUESTIONS));
      setActiveQuizQuestions(CLASS_8_DAILY_QUESTIONS);
      setClass8QuizStarted(true);
    } catch (err: any) {
      console.error("Quiz loaded with fallback questions: ", err);
      const qKey = `class8_questions_${user?.uid || 'guest'}_${new Date().toDateString()}`;
      localStorage.setItem(qKey, JSON.stringify(CLASS_8_DAILY_QUESTIONS));
      setActiveQuizQuestions(CLASS_8_DAILY_QUESTIONS);
      setClass8QuizStarted(true);
    } finally {
      setLoadingQuiz(false);
    }
  };

  useEffect(() => {
    setClass8QuizSolvedToday(localStorage.getItem(class8QuizKey) === 'completed');
    setClass8QuizStarted(false);
    setClass8QuizIdx(0);
    setClass8QuizCorrectScore(0);
    setClass8QuizIncorrectScore(0);
    setClass8QuizSelectedOpt(null);
    setClass8QuizAnswered(false);
    setClass8PointsNet(0);
  }, [class8QuizKey]);

  const handleClass8QuizAnswer = async (optIdx: number) => {
    if (class8QuizAnswered) return;
    setClass8QuizSelectedOpt(optIdx);
    setClass8QuizAnswered(true);
    
    const quizPool = activeQuizQuestions.length === 10 ? activeQuizQuestions : CLASS_8_DAILY_QUESTIONS;
    const correctIdx = quizPool[class8QuizIdx].correct;
    if (optIdx === correctIdx) {
      setClass8QuizCorrectScore(prev => prev + 1);
      setClass8PointsNet(prev => prev + 1);
      await addPoints(1);
    } else {
      setClass8QuizIncorrectScore(prev => prev + 1);
      setClass8PointsNet(prev => prev - 1);
      await addPoints(-1);
    }
  };

  const handleClass8QuizNext = () => {
    if (class8QuizIdx < 9) {
      setClass8QuizIdx(prev => prev + 1);
      setClass8QuizSelectedOpt(null);
      setClass8QuizAnswered(false);
    } else {
      localStorage.setItem(class8QuizKey, 'completed');
      setClass8QuizSolvedToday(true);
      setClass8QuizStarted(false);
      if (class8PointsNet > 0) {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.6 }
        });
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chapters'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChapters(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'chapters');
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const qUsers = query(collection(db, 'users'), orderBy('points', 'desc'), limit(10));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const list = snap.docs.map(doc => {
        const val = doc.data();
        return {
          id: doc.id,
          displayName: val.displayName || val.email?.split('@')[0] || 'Student',
          points: val.points || 0,
          level: val.level || 1,
          streak: val.streak || 1
        };
      });
      setLeaderboard(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });
    return () => unsubUsers();
  }, [user]);

  const handleBoosterAnswer = async (optIdx: number) => {
    if (boosterSolved) return;
    setSelectedOpt(optIdx);
    setShowExplanation(true);
    if (optIdx === currentBooster.correct) {
      setClaiming(true);
      try {
        await addPoints(1);
        setBoosterSolved(true);
        localStorage.setItem(boosterKey, 'answered');
      } catch (err) {
        console.error(err);
      } finally {
        setClaiming(false);
      }
    }
  };

  const generateRoutine = () => {
    if (!chapters.length || !userData) return [];

    // 1. Group chapters by subject
    const chaptersBySubject: Record<string, any[]> = {};
    chapters.forEach(chapter => {
      const subject = chapter.subject || 'Other';
      if (!chaptersBySubject[subject]) {
        chaptersBySubject[subject] = [];
      }
      chaptersBySubject[subject].push(chapter);
    });

    const routineVideos: any[] = [];
    const todayDay = new Date().getDay();
    const isEnglishDay = todayDay === 1 || todayDay === 4;

    // 2. Sort subjects dynamically so we have a consistent priority listing (Math, Science, English, etc.)
    const sortedSubjects = Object.keys(chaptersBySubject).sort((a, b) => {
      const priorities: Record<string, number> = { 'Math': 1, 'Science': 2, 'English': 3 };
      const prioA = priorities[a] || 99;
      const prioB = priorities[b] || 99;
      if (prioA !== prioB) return prioA - prioB;
      return a.localeCompare(b);
    });

    sortedSubjects.forEach(subject => {
      // English is scheduled only on Monday (1) and Thursday (4)
      const isEnglish = (subject?.toLowerCase() || '').includes('eng');
      if (isEnglish && !isEnglishDay) {
        return; // Skip English on non-Mon/Thu days
      }

      const isMath = (subject?.toLowerCase() || '').includes('math');

      // Sort chapters of this subject oldest first (by createdAt ascending)
      const subjectChapters = [...chaptersBySubject[subject]].sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeA - timeB;
      });

      const activeVideos = [];
      const requiredVideos = (isMath && !isEnglishDay) ? 2 : 1;

      for (const chapter of subjectChapters) {
        if (chapter.videos && chapter.videos.length > 0) {
          const uncompletedVideos = chapter.videos.map((v: any, idx: number) => ({ ...v, partIdx: idx })).filter((video: any) => 
            !userData.completedLessons?.includes(video.id)
          );

          for (const video of uncompletedVideos) {
            if (activeVideos.length < requiredVideos) {
              activeVideos.push({
                ...video,
                subject: subject,
                chapterTitle: chapter.title,
                partNumber: video.partIdx + 1,
                chapterId: chapter.id
              });
            } else {
              break;
            }
          }

          if (activeVideos.length >= requiredVideos) {
            break;
          }
        }
      }

      routineVideos.push(...activeVideos);
    });

    // Return the list of unique-subject videos for the tuition routine
    return routineVideos;
  };

  const resolveVideoDurations = async (videos: any[]) => {
    return await Promise.all(
      videos.map(async (v) => {
        if (v.duration) return v;
        try {
          const res = await fetch('/api/youtube/duration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoUrl: v.videoUrl })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.duration > 0) {
              return { ...v, duration: data.duration };
            }
          }
        } catch (err) {
          console.error("Error resolving duration: ", err);
        }
        return { ...v, duration: 1200 }; // 20m default template
      })
    );
  };

  useEffect(() => {
    if (!user || !userData || chapters.length === 0 || checkingRoutine) return;

    const runRoutineCheck = async () => {
      setCheckingRoutine(true);
      const todayStr = new Date().toDateString();
      const currentRoutine = userData.currentRoutine;

      // 1. If user doesn't have a currentRoutine, initialize it for today:
      if (!currentRoutine) {
        const initialRoutine = generateRoutine();
        const resolved = await resolveVideoDurations(initialRoutine);
        await updateUserData({
          currentRoutine: {
            date: todayStr,
            videos: resolved
          }
        });
        return;
      }

      // If routine is already for today, do nothing:
      if (currentRoutine.date === todayStr) {
        return;
      }

      // 2. The day has changed! Let's check for uncompleted lessons from the previous routine
      const completed = userData.completedLessons || [];
      const missed: any[] = [];
      let totalDeduction = 0;

      for (const v of currentRoutine.videos) {
        if (!completed.includes(v.id)) {
          const duration = v.duration || 1200;
          // Apply penalty rule:
          // Less than 30 minutes video incomplete -> -30 points
          // More than 30 minutes video incomplete -> -40 points
          const penalty = duration >= 1800 ? 40 : 30;
          missed.push({
            id: v.id,
            title: v.title,
            duration: duration,
            subject: v.subject || 'Subject'
          });
          totalDeduction += penalty;
        }
      }

      // 3. Generate today's new routine with shift rules:
      // Carry over any uncompleted (missed) lessons from yesterday's routine
      const shiftedVideos = currentRoutine.videos.filter(v => !completed.includes(v.id));
      const shiftedSubjects = shiftedVideos.map(v => v.subject);

      // Generate next uncompleted lessons from the database
      const freshRoutine = generateRoutine();

      // Combine shifted lessons and fresh lessons for fully completed subjects
      const combinedRoutine = [...shiftedVideos];
      freshRoutine.forEach(freshVid => {
        if (!shiftedSubjects.includes(freshVid.subject)) {
          combinedRoutine.push(freshVid);
        }
      });

      // Resolve durations for the combined list
      const resolvedNext = await resolveVideoDurations(combinedRoutine);

      const updatePayload: any = {
        currentRoutine: {
          date: todayStr,
          videos: resolvedNext
        }
      };

      if (totalDeduction > 0) {
        const newPoints = Math.max(0, userData.points - totalDeduction);
        const { level: newLevel } = getLevelInfo(newPoints);
        updatePayload.points = newPoints;
        updatePayload.level = newLevel;

        setPenaltyDetails({
          date: currentRoutine.date,
          pointsDeducted: totalDeduction,
          missedLessons: missed
        });
      }

      await updateUserData(updatePayload);
    };

    runRoutineCheck();
  }, [user, userData, chapters, checkingRoutine]);

  const todayRoutine = generateRoutine().filter(video => !userData?.completedLessons?.includes(video.id));

  const activeRoutineVideos = ((userData?.currentRoutine && userData.currentRoutine.date === new Date().toDateString())
    ? userData.currentRoutine.videos
    : todayRoutine).filter(video => !userData?.completedLessons?.includes(video.id));

  const quests = activeRoutineVideos.length > 0 
    ? activeRoutineVideos.map((video, idx) => {
        const isDone = userData?.completedLessons?.includes(video.id);
        const duration = video.duration || 1200;
        const rewardPoints = duration >= 1800 ? '70' : '50';
        return {
          id: video.id || `quest-${idx}`,
          title: `Complete: ${video.subject} - Part ${video.partNumber || (idx + 1)}`,
          reward: rewardPoints,
          video: video,
          done: isDone,
          icon: BookHeart,
          color: 'text-indigo-500',
          bg: 'bg-indigo-100'
        };
      })
    : [
        { id: 1, title: 'All Caught Up!', reward: '0', video: null, done: true, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100' }
      ];

  const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayDayNum = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
  const activeWeekIndex = todayDayNum === 0 ? 6 : todayDayNum - 1;

  // Leaderboard rendering setup: Only keep the logged-in user themselves, and the 9 dynamic classmate AI competitors (Total 10 participants)
  const currentUserItem = {
    id: user?.uid || 'current_user',
    displayName: userData?.displayName || user?.displayName || 'Student',
    points: userData?.points || 0,
    level: userData?.level || 1,
    streak: userData?.streak || 0,
    status: 'Studying online 🚀',
    isCurrentUser: true
  };

  const displayLeaderboard = [currentUserItem, ...aiCompetitors];

  // Sort and assign ranks
  displayLeaderboard.sort((a, b) => b.points - a.points);

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-32 overflow-x-hidden"
    >
      {/* Penalty Alert Modal */}
      {penaltyDetails && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-red-200 dark:border-red-900/50 p-6 sm:p-8 max-w-md w-full relative shadow-2xl text-center overflow-hidden"
          >
            {/* Warning Icon Badge */}
            <div className="mx-auto w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-red-500" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 dark:bg-red-950/40 px-3 py-1 rounded-full">
              Missions Overdue Penalty
            </span>
            <h3 className="font-sans font-black text-2xl text-slate-800 dark:text-white mt-3">
              Missed Lectures! 😔
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-2 leading-relaxed">
              You did not complete your scheduled missions for <span className="text-slate-700 dark:text-slate-200 font-bold">{penaltyDetails.date}</span>.
            </p>

            {/* List of missed, penalized lectures */}
            <div className="my-5 space-y-2 max-h-40 overflow-y-auto pr-1">
              {penaltyDetails.missedLessons.map((lesson) => {
                const durationFormatted = lesson.duration >= 1800 
                  ? 'More than 30 mins' 
                  : 'Less than 30 mins';

                const penaltyAmt = lesson.duration >= 1800 ? 40 : 30;

                return (
                  <div key={lesson.id} className="p-3 bg-red-50/40 dark:bg-red-950/10 rounded-2xl border border-red-100/50 dark:border-red-950/40 text-left flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-extrabold text-red-500 uppercase tracking-widest block">{lesson.subject}</span>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{lesson.title}</h4>
                      <p className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">Length: {durationFormatted}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-red-600 dark:text-red-400">-{penaltyAmt} Pts</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Points Lost Display */}
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-2xl py-3.5 px-4 mb-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Points Deducted</span>
              <p className="text-3xl font-black text-red-600 dark:text-red-400 mt-1">-{penaltyDetails.pointsDeducted} Pts</p>
            </div>

            <button 
              onClick={() => setPenaltyDetails(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-105 dark:text-slate-900 text-white font-sans font-black py-3 px-6 rounded-2xl shadow-lg transition-transform hover:-translate-y-0.5 cursor-pointer border-none outline-none text-sm"
            >
              Understand & Continue
            </button>
          </motion.div>
        </div>
      )}

      {/* Live AI Competitor Notification Toast */}
      {aiNotification && (
        <div className="fixed bottom-6 right-6 z-[60] pointer-events-none max-w-sm w-full font-sans">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="pointer-events-auto bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 dark:border-slate-800 p-4 rounded-3xl shadow-2xl flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/20">
              <Sparkles className="animate-pulse text-indigo-400" size={18} />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-100 truncate line-clamp-1">
                {aiNotification.message}
              </p>
              <p className="text-[11px] font-semibold text-slate-350 leading-normal mt-0.5">
                {aiNotification.subMessage}
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Parent/Teacher Override PIN Verification Modal */}
      {overrideTargetQuest && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-indigo-200 dark:border-indigo-900/50 p-6 sm:p-8 max-w-sm w-full relative shadow-2xl text-center"
          >
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center mb-4">
              <Check className="text-emerald-600 dark:text-emerald-400" size={28} />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
              Parent Override Check
            </span>
            <h3 className="font-sans font-black text-lg text-slate-900 dark:text-white mt-3">
              Mark Complete?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1.5 leading-relaxed">
              If Manoj watched this video but some error occurred, verify below. This adds <span className="text-amber-500 font-black">+{overrideTargetQuest.reward} Pts</span>.
            </p>

            <div className="my-4 p-3 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/10 text-left">
              <span className="text-[9px] font-extrabold text-indigo-500 uppercase tracking-widest block">
                {overrideTargetQuest.video?.subject || 'Subject'}
              </span>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">
                {overrideTargetQuest.video?.title}
              </h4>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setOverrideError('');
              if (!userData?.deletePin) {
                setOverrideError('Teacher PIN is not set! Set it in Profile Settings. 🔒');
                return;
              }
              if (overridePinInput === userData.deletePin) {
                await markLessonComplete(overrideTargetQuest.video.id, parseInt(overrideTargetQuest.reward, 10));
                setOverrideTargetQuest(null);
                setOverridePinInput('');
              } else {
                setOverrideError('Incorrect Teacher PIN key! ❌');
              }
            }} className="space-y-4">
              <div className="text-left">
                <label className="block text-[10px] font-black text-slate-450 dark:text-slate-550 mb-1.5 text-center uppercase tracking-wider">
                  ENTER 6-DIGIT TEACHER PIN:
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={overridePinInput}
                  onChange={(e) => {
                    setOverrideError('');
                    setOverridePinInput(e.target.value.replace(/\D/g, ''));
                  }}
                  placeholder="••••••"
                  className="w-full text-center bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono tracking-widest text-lg font-black"
                  autoFocus
                />
              </div>

              {overrideError && (
                <p className="text-red-500 text-xs font-bold text-center bg-red-50 dark:bg-red-950/20 py-2 rounded-xl border border-red-100 dark:border-red-900/40">
                  {overrideError}
                </p>
              )}

              <div className="flex gap-2.5 pt-1">
                <button 
                  type="button"
                  onClick={() => {
                    setOverrideTargetQuest(null);
                    setOverridePinInput('');
                    setOverrideError('');
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-700 dark:text-slate-300 font-sans font-bold py-2.5 px-3 rounded-xl text-xs transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold py-2.5 px-3 rounded-xl text-xs transition-all active:scale-[0.98] shadow-md shadow-indigo-600/15"
                >
                  Verify PIN
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Dynamic Grid Layout for Responsive Screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Greeting, Brain Booster, Progress Graph, and Routine */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Profile Section */}
          <motion.div variants={item} className="flex items-center gap-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none">
                <Sparkles size={120} className="text-indigo-400" />
            </div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-indigo-500/30 overflow-hidden border-2 border-white dark:border-slate-800 z-10"
            >
              {user?.displayName?.charAt(0) || 'U'}
            </motion.div>
            <div className="z-10">
              <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-sans">
                Hello, {user?.displayName?.split(' ')[0] || 'Student'}! 👋
              </h2>
              <p className="text-indigo-600 dark:text-indigo-400 font-medium text-sm flex items-center gap-1 mt-0.5">
                <Sparkles size={14} /> Ready to learn today?
              </p>
            </div>
          </motion.div>

          {/* Tuition Videos Section */}
          <motion.div variants={item} className="bg-slate-50/50 dark:bg-slate-900/10 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/40">
            <div className="flex items-center justify-between mb-5 px-1">
              <h3 className="font-bold text-xl flex items-center gap-2 text-slate-800 dark:text-white">
                <PlayCircle className="text-indigo-500" size={26} />
                Tuition Videos <span className="text-xs font-bold text-slate-500 ml-2 hidden sm:inline">(Online Only)</span>
              </h3>
              <button onClick={() => setTab('study')} className="text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 rounded-full uppercase tracking-widest">
                All Library
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {todayRoutine.length === 0 ? (
                <div className="col-span-full app-card rounded-[2rem] border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center bg-white dark:bg-slate-900/50">
                   <br />
                   <Sparkles className="mx-auto text-yellow-500 mb-3" size={32} />
                   <h4 className="font-bold text-slate-700 dark:text-slate-300">You're all caught up!</h4>
                   <p className="text-sm text-slate-500 mt-1">Awesome job completing your lessons.</p>
                   <br />
                </div>
              ) : (
                todayRoutine.map((video, idx) => {
                  // Extract YT ID for thumbnail
                  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                  const match = video.videoUrl?.match(regExp);
                  const extractId = match && match[2].length === 11 ? match[2] : null;

                  return (
                    <motion.div 
                      key={video.id || idx}
                      whileHover={{ y: -4 }}
                      onClick={() => {
                         if (setPlayingVideo) setPlayingVideo(video);
                         setTab('player');
                      }}
                      className="app-card rounded-3xl border-[3px] border-indigo-200/70 dark:border-indigo-500/30 overflow-hidden cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/20 transition-all duration-300 group bg-white dark:bg-slate-900/50 flex flex-col"
                    >
                      {/* Video Thumbnail (16:9 Aspect Ratio like YouTube) - Flush with top/sides */}
                      <div className="relative aspect-video w-full bg-slate-900 dark:bg-slate-950 overflow-hidden">
                        <div className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500 ease-in-out opacity-90" style={{ backgroundImage: `url('https://img.youtube.com/vi/${extractId}/hqdefault.jpg')` }}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                            <PlayCircle size={24} className="ml-0.5" fill="currentColor" />
                          </div>
                        </div>

                        {/* Top Right "Resume" / "Up Next" badge */}
                        <div className="absolute top-2.5 right-2.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-800 dark:text-white bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-2.5 py-1 rounded shadow-sm border border-slate-200/30 dark:border-slate-800/30">
                          {userData?.lessonProgress?.[video.id] ? (
                            <span className="text-amber-500">Resume</span>
                          ) : userData?.completedLessons?.includes(video.id) ? (
                            <span className="text-emerald-500">Completed</span>
                          ) : (
                            <span className="text-indigo-500">Up Next</span>
                          )}
                        </div>

                        {/* Youtube Duration / Info Badge in Bottom Right */}
                        <div className="absolute bottom-2.5 right-2.5 text-[10px] font-black uppercase text-white bg-black/85 backdrop-blur-sm px-2 py-0.5 rounded tracking-wider">
                          Part {video.partNumber}
                        </div>
                      </div>

                      {/* Video Details Row (Channel Info + Text Title underneath like YouTube) - inside the card with padding! */}
                      <div className="flex gap-3 p-5 flex-1 bg-white/40 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/40">
                        {/* Fake Channel Avatar using Subject Initial */}
                        <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 flex-shrink-0 flex items-center justify-center font-black text-sm text-indigo-600 dark:text-indigo-400 select-none shadow-inner">
                          {video.subject ? video.subject.charAt(0).toUpperCase() : 'M'}
                        </div>

                        {/* Text Metadata */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className="font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2 text-[14px] group-hover:text-indigo-500 transition-colors duration-200">{video.title}</h4>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 truncate">
                              {video.subject} • {video.chapterTitle}
                            </p>
                          </div>
                          <p className="text-[10px] font-black text-indigo-600/90 dark:text-indigo-400/90 mt-2 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded inline-block w-fit uppercase tracking-wider">
                            {userData?.completedLessons?.includes(video.id) ? '🎉 Completed • Mastery' : '⚡ practice practice'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>

          {/* Class 8th Daily 10-MCQ Challenge */}
          <motion.div variants={item} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-5 opacity-5 pointer-events-none">
              <BrainCircuit size={100} />
            </div>

            {/* HEADER DISPLAY */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold">
                🎯
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Class 8th Daily MCQ</span>
                <h3 className="font-extrabold text-lg text-slate-800 dark:text-white leading-none">
                  Brain Booster Quiz
                </h3>
              </div>
              <div className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={11} /> +1 / -1 Pt
              </div>
            </div>

            {/* STEP 1: SOLVED / COMPLETED CARD */}
            {class8QuizSolvedToday && !class8QuizStarted && (
              <div className="space-y-4 pt-2 text-center py-4">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-900/40">
                  <CheckCircle2 size={32} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-800 dark:text-white text-base">Completed for Today!</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
                    Excellent focus! You have successfully mastered your Class 8th concepts. Your rank is growing on the live leaderboard!
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 max-w-xs mx-auto text-xs space-y-2 text-left font-semibold">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Correct answers:</span>
                    <span className="text-emerald-500 font-extrabold">{class8QuizCorrectScore || 8} / 10</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Incorrect answers:</span>
                    <span className="text-red-500 font-extrabold">{class8QuizIncorrectScore || 2} / 10</span>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-between items-center">
                    <span className="text-slate-700 dark:text-slate-300">Net Points Change:</span>
                    <span className={`font-black ${(class8PointsNet || 6) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {(class8PointsNet || 6) >= 0 ? `+${class8PointsNet || 6}` : class8PointsNet || 6} Points
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-indigo-500/85 font-bold tracking-wider uppercase">
                  ⚡ Come back tomorrow for 10 new Class 8 boosters! ⚡
                </p>
              </div>
            )}

            {/* STEP 2: NOT STARTED / LOADING CARD */}
            {!class8QuizSolvedToday && !class8QuizStarted && (
              <div className="space-y-4 pt-1">
                {loadingQuiz ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                    <span className="w-10 h-10 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full inline-block" />
                    <div className="space-y-1">
                      <p className="text-sm font-black text-indigo-700 dark:text-indigo-400">Gemini is gathering your completed chapters...</p>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed font-semibold">
                        Customizing 10 high-yield questions from chapters you have started or completed to prevent generic questions!
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-bold">
                      Solve 10 fast-paced, high-yield Multiple Choice Questions customized exactly from chapters you are studying or have completed so you know the answers!
                    </p>

                    <div className="bg-indigo-50/10 dark:bg-slate-950/40 p-4 rounded-2xl border border-dashed border-indigo-150 dark:border-slate-800 space-y-2">
                      <h4 className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                        <Sparkles size={10} /> Dynamic Quiz Guidelines:
                      </h4>
                      <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 font-semibold">
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-emerald-500" />
                          <span>Generated from your actual studied chapters!</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-emerald-500" />
                          <span>Every Correct answer awards <span className="text-emerald-500 font-black">+1 Point</span></span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check size={14} className="text-red-500" />
                          <span>Every Wrong answer deducts <span className="text-red-500 font-black">-1 Point</span></span>
                        </li>
                      </ul>
                    </div>

                    <button
                      onClick={generatePersonalizedQuiz}
                      className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black py-3.5 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 cursor-pointer text-sm outline-none"
                    >
                      <BookOpen size={18} />
                      Start Personalized Chapter Quiz
                    </button>
                  </>
                )}
              </div>
            )}

            {/* STEP 3: ACTIVE QUIZ DISPLAY */}
            {class8QuizStarted && (
              <div className="space-y-4 pt-1">
                {/* Header info */}
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Sparkles size={12} className="animate-pulse" />
                    {activeQuizQuestions.length === 10 && activeQuizQuestions !== CLASS_8_DAILY_QUESTIONS ? (
                      <span className="font-extrabold uppercase text-[10px] bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md">Chapter Mode</span>
                    ) : (
                      <span className="font-extrabold uppercase text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md">General Mode</span>
                    )}
                  </span>
                  <span className="text-slate-400 text-[10px]">Question {class8QuizIdx + 1} of 10</span>
                </div>

                {/* Question */}
                {(() => {
                  const quizPool = activeQuizQuestions.length === 10 ? activeQuizQuestions : CLASS_8_DAILY_QUESTIONS;
                  const currentQuizQuestion = quizPool[class8QuizIdx];
                  if (!currentQuizQuestion) return null;

                  return (
                    <>
                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${((class8QuizIdx + 1) / 10) * 100}%` }}
                        />
                      </div>

                      <div className="py-1">
                        <h4 className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100 leading-snug">
                          {currentQuizQuestion.question}
                        </h4>
                      </div>

                      {/* Options list */}
                      <div className="space-y-2.5">
                        {currentQuizQuestion.options.map((option: string, oIdx: number) => {
                          const isSelected = class8QuizSelectedOpt === oIdx;
                          const isCorrectChoice = oIdx === currentQuizQuestion.correct;

                          let buttonClass = "border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-slate-700 active:scale-[0.99]";
                          let iconCircle = "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700";

                          if (class8QuizAnswered) {
                            if (isCorrectChoice) {
                              buttonClass = "bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-extrabold cursor-default";
                              iconCircle = "bg-emerald-500 text-white";
                            } else if (isSelected) {
                              buttonClass = "bg-red-500/10 border-red-500 text-red-800 dark:text-red-300 font-extrabold cursor-default";
                              iconCircle = "bg-red-500 text-white";
                            } else {
                              buttonClass = "opacity-45 border-slate-150 dark:border-slate-850 cursor-default";
                            }
                          } else if (isSelected) {
                            buttonClass = "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-semibold";
                            iconCircle = "bg-indigo-600 text-white";
                          }

                          return (
                            <button
                              key={oIdx}
                              disabled={class8QuizAnswered}
                              onClick={() => handleClass8QuizAnswer(oIdx)}
                              className={`w-full max-w-full text-left p-3.5 rounded-xl border text-sm transition-all flex items-start gap-3 outline-none cursor-pointer ${buttonClass}`}
                            >
                              <span className={`w-5.5 h-5.5 rounded-full shrink-0 text-xs font-black flex items-center justify-center ${iconCircle}`}>
                                {class8QuizAnswered ? (
                                  isCorrectChoice ? <Check size={12} /> : (isSelected ? <X size={12} /> : String.fromCharCode(65 + oIdx))
                                ) : (
                                  String.fromCharCode(65 + oIdx)
                                )}
                              </span>
                              <span className="flex-1 whitespace-normal break-words pt-0.5 font-bold leading-normal">{option}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Immediate Scoring Animations & Explanation banner */}
                      {class8QuizAnswered && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3"
                        >
                          <div className={`p-4 rounded-2xl text-[13px] font-semibold border ${
                            class8QuizSelectedOpt === currentQuizQuestion.correct
                              ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-250/30 text-emerald-800 dark:text-emerald-400"
                              : "bg-red-50/40 dark:bg-red-950/10 border-red-250/30 text-red-800 dark:text-red-400"
                          }`}>
                            <div className="font-extrabold uppercase text-[10px] tracking-widest flex items-center gap-1.5 mb-1 text-slate-800 dark:text-white">
                              {class8QuizSelectedOpt === currentQuizQuestion.correct ? (
                                <span className="text-emerald-500 flex items-center gap-1">🌟 Correct! (+1 Point)</span>
                              ) : (
                                <span className="text-red-500 flex items-center gap-1">❌ Incorrect! (-1 Point)</span>
                              )}
                            </div>
                            <p className="leading-relaxed opacity-90">{currentQuizQuestion.explanation}</p>
                          </div>

                          <button
                            onClick={handleClass8QuizNext}
                            className="w-full bg-slate-850 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-black font-extrabold py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs shadow-sm cursor-pointer"
                          >
                            {class8QuizIdx === 9 ? "Finish & Submit Score" : "Next Chapter Question"}
                            <ChevronRight size={14} />
                          </button>
                        </motion.div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </motion.div>

          {/* Interactive Weekly Micro Calendar Streak tracker */}
          <motion.div variants={item} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <Calendar className="text-indigo-500" size={22} />
                Weekly Study Progress
              </h3>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Stardust Routine
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2.5 sm:gap-4 text-center">
              {WEEK_DAYS.map((day, dIdx) => {
                const isActive = dIdx <= activeWeekIndex;
                const isToday = dIdx === activeWeekIndex;

                return (
                  <div key={dIdx} className="flex flex-col items-center">
                    <span className={`text-[11px] font-black tracking-wider uppercase mb-2 ${isToday ? 'text-indigo-500' : 'text-slate-400'}`}>
                      {day}
                    </span>
                    <div className="w-full relative h-[60px] bg-slate-150 dark:bg-slate-800/40 rounded-2xl overflow-hidden flex flex-col justify-end border border-slate-200/30 dark:border-slate-805/30">
                      {isActive ? (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: isToday ? '75%' : '100%' }}
                          transition={{ delay: dIdx * 0.05, duration: 0.8 }}
                          className={`w-full rounded-2xl ${
                            isToday 
                              ? 'bg-gradient-to-t from-orange-500 to-amber-400' 
                              : 'bg-gradient-to-t from-indigo-500 to-indigo-400'
                          }`}
                        />
                      ) : (
                        <div className="w-full h-2 rounded-full bg-slate-300 dark:bg-slate-700/60 opacity-30 mx-auto mb-2" />
                      )}
                      
                      {isToday && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-bold text-slate-800 dark:text-amber-300 animate-pulse bg-white/90 dark:bg-slate-900/90 px-1.5 py-0.5 rounded-md shadow-sm border border-slate-100 dark:border-slate-800">
                            Now
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Right Column: Mascot, Daily Missions, Live Leaderboard (Sticky on Desktop) */}
        <div className="space-y-6 lg:sticky lg:top-24">
          {/* Mascot & Streak Banner */}
          <motion.div variants={item} className="relative bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl p-6 shadow-xl shadow-orange-500/20 overflow-hidden text-white flex gap-4 items-center border border-orange-400/50">
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-600/30 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative z-10 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                  <Flame className="text-yellow-200" size={20} fill="currentColor" />
                </div>
                <h3 className="font-bold text-2xl drop-shadow-sm">On Fire!</h3>
              </div>
              <p className="text-orange-50 font-medium text-sm mb-4">
                {userData?.streak} Day Streak. Way to go!
              </p>
              <div className="w-full bg-black/20 rounded-full h-3 backdrop-blur-sm overflow-hidden p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '75%' }}
                  transition={{ delay: 0.5, duration: 1, type: "spring" }}
                  className="bg-white h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                />
              </div>
            </div>
            
            <motion.div 
              animate={{ y: [-4, 4, -4], rotate: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="relative z-10 w-24 h-24 flex-shrink-0 drop-shadow-2xl rounded-[2rem] overflow-hidden border-4 border-white/20 shadow-inner"
            >
               <img src={mascotImg} alt="Mascot" className="w-full h-full object-cover" />
            </motion.div>
          </motion.div>

          {/* Daily Quests Layout */}
          <motion.div variants={item} className="bg-slate-50/50 dark:bg-slate-900/10 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/40">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                <Target className="text-indigo-500" size={24} />
                Today's Missions
              </h3>
            </div>
            
            <div className="space-y-3">
              {quests.map((quest) => {
                const QuestIcon = quest.icon;
                return (
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    key={quest.id} 
                    className={`app-card relative rounded-3xl p-4 border transition-all duration-300 flex items-center gap-4 ${quest.done ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/50' : 'hover:border-indigo-300 dark:hover:border-indigo-600 shadow-sm'}`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${quest.done ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500' : `${quest.bg} ${quest.color} dark:bg-opacity-10`}`}>
                      {quest.done ? <CheckCircle2 size={28} className="text-indigo-600 dark:text-indigo-400" /> : <QuestIcon size={28} />}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className={`font-bold text-[1.05rem] ${quest.done ? 'text-indigo-900/60 dark:text-indigo-200/50 line-through' : 'text-slate-800 dark:text-white'}`}>
                        {quest.title}
                      </h4>
                      {!quest.done && (
                        <div className="flex items-center gap-1.5 mt-1 opacity-90">
                          <Trophy size={14} className="text-amber-500" />
                          <span className="text-sm font-bold text-amber-500">+{quest.reward} Points</span>
                        </div>
                      )}
                    </div>

                     {!quest.done && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={() => {
                            if (quest.video && setPlayingVideo) {
                              setPlayingVideo(quest.video);
                              setTab('player');
                            }
                          }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold transition-colors shadow-sm"
                        >
                          Go
                        </button>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (quest.video) {
                              setOverrideTargetQuest(quest);
                              setOverridePinInput('');
                              setOverrideError('');
                            }
                          }}
                          title="Parent Override (Verify Completion PIN)"
                          className="p-2 border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors shadow-sm flex items-center justify-center cursor-pointer"
                        >
                          <Check size={15} strokeWidth={3} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Gamified Real-Time Competitive Leaderboard */}
          <motion.div variants={item} className="bg-slate-50/50 dark:bg-slate-900/10 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/40">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                <Users className="text-indigo-500" size={24} />
                Student Leaderboard
              </h3>
              <span className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Live
              </span>
            </div>

            <div className="space-y-2">
              {displayLeaderboard.slice(0, 10).map((player, index) => {
                const isCurrentUser = player.isCurrentUser || player.id === user?.uid;
                const position = index + 1;

                // Rank design details
                let rankBg = 'bg-slate-100 dark:bg-slate-800 text-slate-500';
                if (position === 1) rankBg = 'bg-yellow-500 text-white';
                if (position === 2) rankBg = 'bg-slate-300 text-slate-800';
                if (position === 3) rankBg = 'bg-amber-600 text-white';

                return (
                  <motion.div
                    key={player.id}
                    className={`p-3 rounded-2xl border transition-all duration-300 flex items-center gap-3 ${
                      isCurrentUser
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 border-indigo-400 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-xs flex-shrink-0 ${rankBg}`}>
                      {position}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-sm truncate ${isCurrentUser ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                          {player.displayName}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-white text-indigo-600 px-1.5 py-0.5 rounded-md leading-none">
                            You
                          </span>
                        )}
                      </div>
                      <span className={`text-[11px] font-medium block leading-none mt-0.5 ${isCurrentUser ? 'text-indigo-100' : 'text-slate-400'}`}>
                        Level {player.level} • {player.streak}d streak
                      </span>
                      {player.status && !isCurrentUser && (
                        <span className="text-[9.5px] font-extrabold text-indigo-500 dark:text-indigo-400 mt-1 block max-w-full truncate">
                          ● {player.status}
                        </span>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className={`font-extrabold text-sm ${isCurrentUser ? 'text-white' : 'text-indigo-500'}`}>
                        {player.points} Pts
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

      </div>
    </motion.div>
  );
}
