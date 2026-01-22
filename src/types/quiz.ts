export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  qid: string;
  difficulty: Difficulty;
  text: string;
  options: string[]; // Shuffled MCQ choices
  image_url?: string; // Optional URL for question image
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
  start_time: string | number; // ISO String or Epoch MS
  joined_at?: string | number; // ISO String or Epoch MS
  completed_at?: string; // ISO String of completion time
  time_taken?: string; // Human readable duration (e.g. 1m 5s)
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