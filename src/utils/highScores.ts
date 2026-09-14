import { HighScoreEntry, Difficulty, GameMode } from '../types';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, query, orderBy, limit } from 'firebase/firestore';

const STORAGE_KEY = 'space_invaders_hall_of_fame_v4';

export const DEFAULT_HALL_OF_FAME: HighScoreEntry[] = [
  { id: '1', name: 'WOLF-BYTES', score: 1500000, wave: 50, mode: '1p', difficulty: 'hard', date: '2026-09-14' },
  { id: '2', name: 'FI', score: 850003, wave: 38, mode: '1p', difficulty: 'hard', date: '2026-09-14' },
  { id: '3', name: 'ACE', score: 9850, wave: 8, mode: '1p', difficulty: 'hard', date: '2026-09-01' },
  { id: '4', name: 'NEO', score: 7420, wave: 6, mode: '2p', difficulty: 'medium', date: '2026-09-04' },
  { id: '5', name: 'MAX', score: 5600, wave: 5, mode: '1p', difficulty: 'medium', date: '2026-09-08' },
];

// Helper to get cookie by name
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return decodeURIComponent(match[2]);
  return null;
}

// Helper to set cookie (expires in 365 days)
function setCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  const d = new Date();
  d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${d.toUTCString()};path=/`;
}

// --- LOCAL STORAGE (COOKIES) FALLBACK ---
export function loadHallOfFame(): HighScoreEntry[] {
  if (typeof document === 'undefined') return DEFAULT_HALL_OF_FAME;
  try {
    const raw = getCookie(STORAGE_KEY);
    if (!raw) return DEFAULT_HALL_OF_FAME;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 5);
    return DEFAULT_HALL_OF_FAME;
  } catch {
    return DEFAULT_HALL_OF_FAME;
  }
}

export function saveHallOfFame(scores: HighScoreEntry[]): void {
  if (typeof document === 'undefined') return;
  try {
    const sorted = [...scores].sort((a, b) => b.score - a.score).slice(0, 5);
    setCookie(STORAGE_KEY, JSON.stringify(sorted));
  } catch {
    // Ignore storage errors
  }
}

// --- FIRESTORE GLOBAL LEADERBOARD ---
export async function fetchGlobalHallOfFame(): Promise<HighScoreEntry[]> {
  try {
    const scoresRef = collection(db, 'highscores');
    const q = query(scoresRef, orderBy('score', 'desc'), limit(5));
    const snapshot = await getDocs(q);
    
    const scores: HighScoreEntry[] = [];
    snapshot.forEach((doc) => {
      scores.push({ id: doc.id, ...doc.data() } as HighScoreEntry);
    });

    if (scores.length > 0) {
      // Sync to local cookies so game starts with latest next time
      saveHallOfFame(scores);
      return scores;
    }
  } catch (error) {
    console.error("Error fetching global high scores:", error);
  }
  // Fallback to local cookie if network fails
  return loadHallOfFame();
}

export async function addGlobalHallOfFameScore(
  name: string,
  score: number,
  wave: number,
  mode: GameMode,
  difficulty: Difficulty
): Promise<HighScoreEntry[]> {
  const newEntry = {
    name: (name.trim().toUpperCase() || 'AAA').slice(0, 10),
    score,
    wave,
    mode,
    difficulty,
    date: new Date().toISOString().split('T')[0],
  };

  try {
    await addDoc(collection(db, 'highscores'), newEntry);
  } catch (error) {
    console.error("Error writing new score to Firebase:", error);
  }

  // Refetch the top 5 from the global DB and update state
  return await fetchGlobalHallOfFame();
}

export function checkQualifiesForHallOfFame(score: number): boolean {
  if (score <= 0) return false;
  // Use local cache to check instantly instead of waiting for a network request to avoid UI delay
  const current = loadHallOfFame();
  if (current.length < 5) return true;
  return score > current[current.length - 1].score;
}
