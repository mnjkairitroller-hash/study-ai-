import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const LEVEL_THRESHOLDS = [0, 20, 50, 100, 150, 250, 400, 600, 850, 1150, 1500, 2000, 2600, 3300, 4100, 5000, 6000, 7200, 8500, 10000];

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
