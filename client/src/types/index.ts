export interface Team {
  id: number;
  name: string;
  score: number;
  current_round: number;
  challenges_solved: number;
  last_submission: string | null;
  rank?: number;
  achievements?: Achievement[];
}

export interface Challenge {
  id: number;
  title: string;
  description: string;
  story: string;
  hints: string[];
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  attachment_url: string | null;
  attachment_name: string | null;
  round_number: number;
  order_in_round: number;
  is_active: number;
  is_solved: number;
  solved_at: string | null;
}

export interface Submission {
  correct: boolean;
  points?: number;
  bonus?: number;
  bonusReasons?: string[];
  totalPoints?: number;
  newScore?: number;
  roundComplete?: boolean;
  roundUnlocked?: boolean;
  qualifyFailed?: boolean;
  nextRound?: number;
  message: string;
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  score: number;
  challenges_solved: number;
  current_round: number;
  last_submission: string | null;
  rank: number;
}

export interface Achievement {
  badge: string;
  awarded_at: string;
}

export interface CompetitionConfig {
  easy_qualify_score: string;
  medium_qualify_score: string;
  easy_time_minutes: string;
  medium_time_minutes: string;
  hard_time_minutes: string;
  first_blood_bonus: string;
  speed_bonus: string;
  speed_bonus_minutes: string;
  leaderboard_frozen: string;
  competition_active: string;
}

export interface TimerInfo {
  started: boolean;
  startedAt?: string;
  totalMinutes: number;
  remainingMs?: number;
  expired?: boolean;
}
