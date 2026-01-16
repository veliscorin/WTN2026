export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  qid: string;
  difficulty: Difficulty;
  text: string;
  options: string[]; // Shuffled MCQ choices
}

export interface UserState {
  email: string;
  school_id: string;
  status: 'LOBBY' | 'IN_PROGRESS' | 'COMPLETED' | 'DISQUALIFIED';
  current_index: number;
  question_order?: string[]; // Array of QIDs in randomized order
  answers?: Record<string, string>; // Map of QID -> Selected Option
  score: number;
  strike_count: number;
  start_time: number; // Epoch MS
  is_disqualified: boolean;
}

export interface School {
  id: string;
  name: string;
  domain: string;
}

export interface Session {
  id: string; // e.g., "session_1"
  name: string; // e.g., "April 8 - Morning"
  startTime: string; // ISO 8601 String (e.g. "2026-04-08T11:00:00+08:00")
  durationMinutes: number; // e.g., 30
  entryWindowMinutes?: number; // Optional override for lobby window (e.g., 5)
  schoolIds: string[]; // List of school IDs allowed in this session
}