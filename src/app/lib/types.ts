/**
 * Planning Poker Types
 *
 * This planning poker app supports multi-player estimation sessions
 * with real-time synchronization via Neon PostgreSQL and Netlify Functions.
 *
 * Features:
 * - Create or join rooms with unique codes
 * - Vote using Fibonacci sequence cards (0, 1, 2, 3, 5, 8, 13, 21, ?, ☕)
 * - Reveal votes simultaneously
 * - Calculate average of numeric votes
 * - Reset rounds for new estimations
 * - Responsive design for mobile and desktop
 * - Auto-polling for real-time updates (every 2 seconds)
 * - Persistent sessions via localStorage
 */

export interface Player {
  id: string;
  name: string;
  vote: string | null;
  isObserver: boolean;
  lastSeen: number;
}

export interface BreakoutRoom {
  id: string;
  name: string;
  code: string;
  players: Player[];
  revealed: boolean;
  createdAt: number;
}

export interface Room {
  code: string;
  players: Player[];
  revealed: boolean;
  createdAt: number;
  creatorId?: string;
  breakoutRooms?: BreakoutRoom[];
}
