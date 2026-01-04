// API base URL - uses Netlify Functions in production, localhost in development
const API_BASE_URL = import.meta.env.PROD
  ? "/.netlify/functions/api"
  : "http://localhost:8888/.netlify/functions/api";

interface Player {
  id: string;
  name: string;
  vote: string | null;
  isObserver: boolean;
  lastSeen: number;
}

interface Room {
  code: string;
  players: Player[];
  revealed: boolean;
  createdAt: number;
}

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "API request failed");
  }

  return response.json();
}

export async function createRoom(
  playerName: string,
  playerId: string,
  adminUid?: string | null
): Promise<Room> {
  const data = await apiCall("/create-room", {
    method: "POST",
    body: JSON.stringify({ playerName, playerId, adminUid: adminUid || null }),
  });
  return data.room;
}

export async function joinRoom(
  roomCode: string,
  playerName: string,
  playerId: string
): Promise<Room> {
  const data = await apiCall("/join-room", {
    method: "POST",
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
  const data = await apiCall("/vote", {
    method: "POST",
    body: JSON.stringify({ roomCode, playerId, vote }),
  });
  return data.room;
}

export async function revealVotes(roomCode: string): Promise<Room> {
  const data = await apiCall("/reveal", {
    method: "POST",
    body: JSON.stringify({ roomCode }),
  });
  return data.room;
}

export async function resetRound(roomCode: string): Promise<Room> {
  const data = await apiCall("/reset", {
    method: "POST",
    body: JSON.stringify({ roomCode }),
  });
  return data.room;
}

export async function leaveRoom(
  roomCode: string,
  playerId: string
): Promise<void> {
  await apiCall("/leave", {
    method: "POST",
    body: JSON.stringify({ roomCode, playerId }),
  });
}

// Admin API functions
async function adminApiCall(
  endpoint: string,
  idToken: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "API request failed");
  }

  return response.json();
}

export async function getSessionHistory(idToken: string): Promise<any[]> {
  const data = await adminApiCall("/admin/sessions", idToken);
  return data.sessions;
}

export async function getAnalytics(idToken: string): Promise<any> {
  const data = await adminApiCall("/admin/analytics", idToken);
  return data;
}
