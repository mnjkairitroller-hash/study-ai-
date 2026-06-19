import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const LEVEL_THRESHOLDS = Array.from({ length: 100 }, (_, i) => 
  i === 0 ? 0 : Math.floor(Math.pow(i, 1.5) * 18)
);

export function getLevelInfo(points: number) {
  let level = 1;
  let nextThreshold = LEVEL_THRESHOLDS[1];
  let prevThreshold = 0;

  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      prevThreshold = LEVEL_THRESHOLDS[i];
      nextThreshold = LEVEL_THRESHOLDS[i + 1] || Math.ceil(points * 1.5); // Fallback for very high levels
    } else {
      break;
    }
  }

  const pointsInLevel = points - prevThreshold;
  const pointsNeeded = nextThreshold - prevThreshold;
  const progressPercent = Math.min(100, Math.max(0, (pointsInLevel / pointsNeeded) * 100));

  return {
    level,
    progressPercent,
    nextThreshold,
    pointsToNext: nextThreshold - points,
  };
}

/**
 * Generates an extremely cute, matchable, high-quality cover photo or illustration
 * from a curated collection of royalty-free Unsplash images based on subject and title.
 */
export function getChapterCoverImage(subject: string, title: string): string {
  const s = (subject || '').toLowerCase();
  const t = (title || '').toLowerCase();

  // 1. SPECIFIC TOPIC KEYWORDS (HIGH PRECEDENCE)
  
  // Space, Gravity, Stars, Galaxies, Universe
  if (t.includes('gravit') || t.includes('space') || t.includes('star') || t.includes('galax') || t.includes('planet') || t.includes('univers') || t.includes('orbit')) {
    return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&h=300&fit=crop'; // Neon Earth & space network
  }

  // Chemistry, Acid, Atoms, Base, Elements
  if (t.includes('acid') || t.includes('reaction') || t.includes('chem') || t.includes('metal') || t.includes('atom') || t.includes('molecul')) {
    return 'https://images.unsplash.com/photo-1617155093730-a8bf47be792d?w=300&h=300&fit=crop'; // Glowing colorful glass tubes
  }

  // Biology, Plants, Animals, Cells, Life, Human Body, Forest
  if (t.includes('cell') || t.includes('plant') || t.includes('bio') || t.includes('organism') || t.includes('anim') || t.includes('forest') || t.includes('flower') || t.includes('speci')) {
    return 'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=300&h=300&fit=crop'; // Luminous vibrant green patterns
  }

  // Algebra, Geometry, Triangle, Statistics, Equations
  if (t.includes('geometr') || t.includes('triangl') || t.includes('algebra') || t.includes('equat') || t.includes('fraction') || t.includes('ratio')) {
    return 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=300&h=300&fit=crop'; // Math sketches chalkboard
  }

  // Artificial Intelligence, Robots, Code, Logic
  if (t.includes('robot') || t.includes('ai') || t.includes('intell') || t.includes('logic') || t.includes('program') || t.includes('python') || t.includes('html')) {
    return 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300&h=300&fit=crop'; // Tech glowing code editor layout
  }

  // 2. SUBJECT-BASED FALLBACKS (CUTE CURATED ILLUSTRATIONS)
  
  if (s.includes('math') || s.includes('calc')) {
    const maths = [
      'https://images.unsplash.com/photo-1518133835878-5a93cc3f89e5?w=300&h=300&fit=crop', // Colorful numbers
      'https://images.unsplash.com/photo-1596497352223-ca35352b07e5?w=300&h=300&fit=crop', // Geometry scale setup
      'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=300&h=300&fit=crop', // Abstract neon spatial vector
    ];
    return maths[Math.abs(title.length) % maths.length];
  }

  if (s.includes('sci') || s.includes('phy') || s.includes('chem') || s.includes('bio') || s.includes('evs')) {
    const sciences = [
      'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=300&h=300&fit=crop', // Luminous laboratory glassware
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=300&h=300&fit=crop', // Beautiful glass flask reactions
      'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=300&h=300&fit=crop', // Abstract colorful vector waves
    ];
    return sciences[Math.abs(title.length) % sciences.length];
  }

  if (s.includes('eng') || s.includes('lang') || s.includes('lit') || s.includes('poem') || s.includes('stori') || s.includes('hind') || s.includes('sans')) {
    const languages = [
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=300&h=300&fit=crop', // Warm ambient study table with books
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=300&fit=crop', // Bright library books stacking
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&h=300&fit=crop', // Specular writing diary setup
    ];
    return languages[Math.abs(title.length) % languages.length];
  }

  if (s.includes('comp') || s.includes('cod') || s.includes('tech') || s.includes('program')) {
    const computers = [
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=300&h=300&fit=crop', // Golden high tech cyber shield
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=300&h=300&fit=crop', // Beautiful coding screen with colors
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&h=300&fit=crop', // Digital code network matrix
    ];
    return computers[Math.abs(title.length) % computers.length];
  }

  if (s.includes('hist') || s.includes('soc') || s.includes('geog') || s.includes('civ')) {
    const socials = [
      'https://images.unsplash.com/photo-1447069387593-a5de0862481e?w=300&h=300&fit=crop', // Retro vintage explorer map
      'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=300&h=300&fit=crop', // Global mapping earth model
      'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=300&h=300&fit=crop', // Glowing bookstore setup
    ];
    return socials[Math.abs(title.length) % socials.length];
  }

  // Cute general academic default presets
  const defaults = [
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=300&h=300&fit=crop', // Cute modern color workspace
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=300&h=300&fit=crop', // Chalk kids academic blackboard
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=300&h=300&fit=crop', // Dynamic colorful planner table
  ];
  return defaults[Math.abs(title.length) % defaults.length];
}
