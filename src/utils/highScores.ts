import { HighScoreEntry, Difficulty, GameMode } from '../types';

const STORAGE_KEY = 'space_invaders_hall_of_fame_v2';

export const DEFAULT_HALL_OF_FAME: HighScoreEntry[] = [
  { id: '1', name: 'WOLF-BYTES', score: 50000, wave: 20, mode: '1p', difficulty: 'hard', date: '2026-09-14' },
  { id: '2', name: 'ACE', score: 9850, wave: 8, mode: '1p', difficulty: 'hard', date: '2026-09-01' },
  { id: '3', name: 'NEO', score: 7420, wave: 6, mode: '2p', difficulty: 'medium', date: '2026-09-04' },
  { id: '4', name: 'MAX', score: 5600, wave: 5, mode: '1p', difficulty: 'medium', date: '2026-09-08' },
  { id: '5', name: 'FOX', score: 4190, wave: 4, mode: '2p', difficulty: 'easy', date: '2026-09-10' },
];

export function loadHallOfFame(): HighScoreEntry[] {
  if (typeof window === 'undefined') return DEFAULT_HALL_OF_FAME;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveHallOfFame(DEFAULT_HALL_OF_FAME);
      return DEFAULT_HALL_OF_FAME;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure top score is at least 50000 by WOLF-BYTES if not beaten
      const hasWolfBytes = parsed.some((e: HighScoreEntry) => e.name === 'WOLF-BYTES' && e.score >= 50000);
      if (!hasWolfBytes && parsed[0].score < 50000) {
        const merged = [...parsed, DEFAULT_HALL_OF_FAME[0]].sort((a, b) => b.score - a.score).slice(0, 5);
        saveHallOfFame(merged);
        return merged;
      }
      return parsed.slice(0, 5);
    }
    return DEFAULT_HALL_OF_FAME;
  } catch {
    return DEFAULT_HALL_OF_FAME;
  }
}

export function saveHallOfFame(scores: HighScoreEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    const sorted = [...scores].sort((a, b) => b.score - a.score).slice(0, 5);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  } catch {
    // Ignore storage errors
  }
}

export function checkQualifiesForHallOfFame(score: number): boolean {
  if (score <= 0) return false;
  const current = loadHallOfFame();
  if (current.length < 5) return true;
  return score > current[current.length - 1].score;
}

export function addHallOfFameScore(
  name: string,
  score: number,
  wave: number,
  mode: GameMode,
  difficulty: Difficulty
): HighScoreEntry[] {
  const current = loadHallOfFame();
  const newEntry: HighScoreEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: (name.trim().toUpperCase() || 'AAA').slice(0, 10),
    score,
    wave,
    mode,
    difficulty,
    date: new Date().toISOString().split('T')[0],
  };

  const updated = [...current, newEntry].sort((a, b) => b.score - a.score).slice(0, 5);
  saveHallOfFame(updated);
  return updated;
}
