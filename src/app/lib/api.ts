// API base URL - uses Netlify Functions in production, localhost in development
const API_BASE_URL = import.meta.env.PROD
  ? '/.netlify/functions/api'
  : 'http://localhost:8888/.netlify/functions/api';

interface Player {
  id: string;
  name: string;
  vote: string | null;
  isObserver: boolean;
  lastSeen: number;
}

interface BreakoutRoom {
  id: string;
  name: string;
  code: string;
  players: Player[];
  revealed: boolean;
  createdAt: number;
}

interface Room {
  code: string;
  players: Player[];
  revealed: boolean;
  createdAt: number;
  creatorId?: string;
  breakoutRooms?: BreakoutRoom[];
}

async function apiCall(
  endpoint: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

export async function createRoom(
  playerName: string,
  playerId: string,
  adminUid?: string | null
): Promise<Room> {
  const data = await apiCall('/create-room', {
    method: 'POST',
    body: JSON.stringify({ playerName, playerId, adminUid: adminUid || null }),
  });
  return data.room;
}

export async function joinRoom(
  roomCode: string,
  playerName: string,
  playerId: string
): Promise<Room> {
  const data = await apiCall('/join-room', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerName, playerId }),
  });
  return data.room;
}

export async function getRoom(roomCode: string): Promise<Room> {
  const data = await apiCall(`/room/${roomCode}`);
  return data.room;
}

export async function submitVote(
  roomCode: string,
  playerId: string,
  vote: string | null
): Promise<Room> {
  const data = await apiCall('/vote', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerId, vote }),
  });
  return data.room;
}

export async function revealVotes(roomCode: string): Promise<Room> {
  const data = await apiCall('/reveal', {
    method: 'POST',
    body: JSON.stringify({ roomCode }),
  });
  return data.room;
}

export async function resetRound(roomCode: string): Promise<Room> {
  const data = await apiCall('/reset', {
    method: 'POST',
    body: JSON.stringify({ roomCode }),
  });
  return data.room;
}

export async function leaveRoom(
  roomCode: string,
  playerId: string
): Promise<void> {
  await apiCall('/leave', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerId }),
  });
}

// Breakout room API functions
export async function createBreakoutRooms(
  roomCode: string,
  playerId: string,
  numBreakouts: number
): Promise<Room> {
  const data = await apiCall('/create-breakout-rooms', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerId, numBreakouts }),
  });
  return data.room;
}

export async function joinBreakoutRoom(
  roomCode: string,
  playerId: string,
  breakoutRoomId: string
): Promise<Room> {
  const data = await apiCall('/join-breakout-room', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerId, breakoutRoomId }),
  });
  return data.room;
}

export async function leaveBreakoutRoom(
  roomCode: string,
  playerId: string
): Promise<Room> {
  const data = await apiCall('/leave-breakout-room', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerId }),
  });
  return data.room;
}

export async function submitBreakoutVote(
  roomCode: string,
  breakoutRoomId: string,
  playerId: string,
  vote: string | null
): Promise<Room> {
  const data = await apiCall('/breakout-room/vote', {
    method: 'POST',
    body: JSON.stringify({ roomCode, breakoutRoomId, playerId, vote }),
  });
  return data.room;
}

export async function revealBreakoutVotes(
  roomCode: string,
  breakoutRoomId: string
): Promise<Room> {
  const data = await apiCall('/breakout-room/reveal', {
    method: 'POST',
    body: JSON.stringify({ roomCode, breakoutRoomId }),
  });
  return data.room;
}

export async function resetBreakoutRound(
  roomCode: string,
  breakoutRoomId: string
): Promise<Room> {
  const data = await apiCall('/breakout-room/reset', {
    method: 'POST',
    body: JSON.stringify({ roomCode, breakoutRoomId }),
  });
  return data.room;
}

export async function deleteBreakoutRooms(
  roomCode: string,
  playerId: string
): Promise<Room> {
  const data = await apiCall('/delete-breakout-rooms', {
    method: 'POST',
    body: JSON.stringify({ roomCode, playerId }),
  });
  return data.room;
}

// Admin API functions
async function adminApiCall(
  endpoint: string,
  idToken: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

export async function getSessionHistory(idToken: string): Promise<unknown[]> {
  const data = await adminApiCall('/admin/sessions', idToken);
  return data.sessions;
}

export async function getAnalytics(idToken: string): Promise<unknown> {
  const data = await adminApiCall('/admin/analytics', idToken);
  return data;
}
