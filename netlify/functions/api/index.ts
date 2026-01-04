/**
 * Netlify Serverless Function - Planning Poker API
 *
 * Handles all API endpoints for the Planning Poker application.
 * Uses Neon PostgreSQL for data storage.
 */

import type { Handler, HandlerEvent } from "@netlify/functions";
import Ably from "ably";
import * as admin from "firebase-admin";
import * as db from "./db";

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

// Initialize Firebase Admin
let firebaseAdminInitialized = false;
function initializeFirebaseAdmin() {
  if (firebaseAdminInitialized || admin.apps.length > 0) {
    return;
  }

  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccount) {
      try {
        const serviceAccountJson = JSON.parse(serviceAccount);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountJson),
        });
        firebaseAdminInitialized = true;
      } catch (parseError) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", parseError);
      }
    } else {
      // Fallback: use default credentials if available (e.g., on Google Cloud)
      try {
        admin.initializeApp();
        firebaseAdminInitialized = true;
      } catch (initError) {
        console.warn(
          "Firebase Admin initialization failed - admin features will be disabled:",
          initError
        );
      }
    }
  } catch (error) {
    console.warn(
      "Firebase Admin initialization failed - admin features will be disabled:",
      error
    );
  }
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Helper to generate room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Input validation helpers
function validatePlayerName(name: string): boolean {
  return (
    typeof name === "string" &&
    name.trim().length > 0 &&
    name.trim().length <= 50
  );
}

function validatePlayerId(id: string): boolean {
  return typeof id === "string" && id.length > 0 && id.length <= 100;
}

function validateRoomCode(code: string): boolean {
  return typeof code === "string" && /^[A-Z0-9]{6}$/.test(code);
}

// JSON response helper
function jsonResponse(data: any, statusCode: number = 200) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  };
}

// Error response helper
function errorResponse(message: string, statusCode: number = 400) {
  return jsonResponse({ error: message }, statusCode);
}

// Verify Firebase ID token and check admin status
async function verifyAdminToken(
  authHeader: string | undefined
): Promise<{ uid: string; email: string | null; isAdmin: boolean } | null> {
  initializeFirebaseAdmin();

  if (!firebaseAdminInitialized || admin.apps.length === 0) {
    console.error("Firebase Admin not initialized - cannot verify admin token");
    return null;
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const idToken = authHeader.split("Bearer ")[1];
  if (!idToken) {
    return null;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || null;

    // Automatically create admin user for any authenticated user
    // This ensures all users who sign in are admins by default
    await db.createAdminUser(uid, email, decodedToken.name || null);

    return { uid, email, isAdmin: true };
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// Ably client for real-time updates
let ablyClient: Ably.Rest | null = null;

function getAblyClient(): Ably.Rest | null {
  const apiKey = process.env.ABLY_API_KEY;

  if (!apiKey) {
    // Ably is optional - log warning but don't fail
    if (!ablyClient) {
      console.warn("ABLY_API_KEY not set - real-time updates disabled");
    }
    return null;
  }

  if (!ablyClient) {
    ablyClient = new Ably.Rest({ key: apiKey });
  }

  return ablyClient;
}

// Publish room update to Ably channel
async function publishRoomUpdate(roomCode: string, room: Room): Promise<void> {
  try {
    const client = getAblyClient();
    if (!client) {
      return; // Ably not configured, skip publishing
    }

    const channel = client.channels.get(`room:${roomCode}`);
    await channel.publish("room-update", room);
  } catch (error) {
    // Don't fail the request if Ably publish fails
    console.error("Failed to publish room update to Ably:", error);
  }
}

const handler: Handler = async (event: HandlerEvent) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  const path = event.path.replace("/.netlify/functions/api", "");
  const method = event.httpMethod;

  try {
    // Health check
    if (path === "/health" && method === "GET") {
      return jsonResponse({
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    }

    // Create room
    if (path === "/create-room" && method === "POST") {
      const { playerName, playerId, adminUid } = JSON.parse(event.body || "{}");

      if (!validatePlayerName(playerName) || !validatePlayerId(playerId)) {
        return errorResponse("Player name and ID required", 400);
      }

      let roomCode = generateRoomCode();
      let existingRoom = await db.get(`room:${roomCode}`);

      // Ensure unique room code (max 10 attempts)
      let attempts = 0;
      while (existingRoom && attempts < 10) {
        roomCode = generateRoomCode();
        existingRoom = await db.get(`room:${roomCode}`);
        attempts++;
      }

      if (existingRoom) {
        return errorResponse("Failed to generate unique room code", 500);
      }

      const newPlayer: Player = {
        id: playerId.trim(),
        name: playerName.trim(),
        vote: null,
        isObserver: false,
        lastSeen: Date.now(),
      };

      const newRoom: Room = {
        code: roomCode,
        players: [newPlayer],
        revealed: false,
        createdAt: Date.now(),
      };

      await db.set(`room:${roomCode}`, newRoom);

      // Track admin session if admin created the room
      if (adminUid) {
        const isAdmin = await db.isAdmin(adminUid);
        if (isAdmin) {
          await db.createSession(roomCode, adminUid, 1);
        }
      }

      await publishRoomUpdate(roomCode, newRoom);
      return jsonResponse({ room: newRoom });
    }

    // Join room
    if (path === "/join-room" && method === "POST") {
      const { roomCode, playerName, playerId } = JSON.parse(event.body || "{}");

      if (
        !validateRoomCode(roomCode) ||
        !validatePlayerName(playerName) ||
        !validatePlayerId(playerId)
      ) {
        return errorResponse("Room code, player name, and ID required", 400);
      }

      const room = await db.get(`room:${roomCode}`);

      if (!room) {
        // Room doesn't exist, create it
        const newPlayer: Player = {
          id: playerId.trim(),
          name: playerName.trim(),
          vote: null,
          isObserver: false,
          lastSeen: Date.now(),
        };

        const newRoom: Room = {
          code: roomCode.toUpperCase(),
          players: [newPlayer],
          revealed: false,
          createdAt: Date.now(),
        };

        await db.set(`room:${roomCode.toUpperCase()}`, newRoom);
        await publishRoomUpdate(roomCode.toUpperCase(), newRoom);
        return jsonResponse({ room: newRoom });
      }

      // Check if player already exists
      const existingPlayerIndex = room.players.findIndex(
        (p: Player) => p.id === playerId
      );

      if (existingPlayerIndex >= 0) {
        // Update existing player
        room.players[existingPlayerIndex].lastSeen = Date.now();
        room.players[existingPlayerIndex].name = playerName.trim();
      } else {
        // Add new player (limit to 50 players per room)
        if (room.players.length >= 50) {
          return errorResponse("Room is full", 400);
        }

        const newPlayer: Player = {
          id: playerId.trim(),
          name: playerName.trim(),
          vote: null,
          isObserver: false,
          lastSeen: Date.now(),
        };
        room.players.push(newPlayer);
      }

      await db.set(`room:${roomCode}`, room);
      await publishRoomUpdate(roomCode, room);
      return jsonResponse({ room });
    }

    // Get room
    if (path.startsWith("/room/") && method === "GET") {
      const roomCode = path.split("/room/")[1];
      if (!validateRoomCode(roomCode)) {
        return errorResponse("Invalid room code", 400);
      }

      const room = await db.get(`room:${roomCode}`);

      if (!room) {
        return errorResponse("Room not found", 404);
      }

      return jsonResponse({ room });
    }

    // Submit vote
    if (path === "/vote" && method === "POST") {
      const { roomCode, playerId, vote } = JSON.parse(event.body || "{}");

      if (!validateRoomCode(roomCode) || !validatePlayerId(playerId)) {
        return errorResponse("Room code and player ID required", 400);
      }

      // Validate vote value
      const validVotes = [
        "0",
        "1",
        "2",
        "3",
        "5",
        "8",
        "13",
        "21",
        "?",
        "☕",
        null,
      ];
      if (vote !== null && !validVotes.includes(vote)) {
        return errorResponse("Invalid vote value", 400);
      }

      const room = await db.get(`room:${roomCode}`);

      if (!room) {
        return errorResponse("Room not found", 404);
      }

      const playerIndex = room.players.findIndex(
        (p: Player) => p.id === playerId
      );

      if (playerIndex === -1) {
        return errorResponse("Player not found in room", 404);
      }

      room.players[playerIndex].vote = vote;
      room.players[playerIndex].lastSeen = Date.now();

      await db.set(`room:${roomCode}`, room);
      await publishRoomUpdate(roomCode, room);
      return jsonResponse({ room });
    }

    // Reveal votes
    if (path === "/reveal" && method === "POST") {
      const { roomCode } = JSON.parse(event.body || "{}");

      if (!validateRoomCode(roomCode)) {
        return errorResponse("Room code required", 400);
      }

      const room = await db.get(`room:${roomCode}`);

      if (!room) {
        return errorResponse("Room not found", 404);
      }

      room.revealed = true;
      await db.set(`room:${roomCode}`, room);
      await publishRoomUpdate(roomCode, room);

      return jsonResponse({ room });
    }

    // Reset round
    if (path === "/reset" && method === "POST") {
      const { roomCode } = JSON.parse(event.body || "{}");

      if (!validateRoomCode(roomCode)) {
        return errorResponse("Room code required", 400);
      }

      const room = await db.get(`room:${roomCode}`);

      if (!room) {
        return errorResponse("Room not found", 404);
      }

      room.players = room.players.map((p: Player) => ({ ...p, vote: null }));
      room.revealed = false;

      await db.set(`room:${roomCode}`, room);
      await publishRoomUpdate(roomCode, room);
      return jsonResponse({ room });
    }

    // Leave room
    if (path === "/leave" && method === "POST") {
      const { roomCode, playerId } = JSON.parse(event.body || "{}");

      if (!validateRoomCode(roomCode) || !validatePlayerId(playerId)) {
        return errorResponse("Room code and player ID required", 400);
      }

      const room = await db.get(`room:${roomCode}`);

      if (!room) {
        return errorResponse("Room not found", 404);
      }

      room.players = room.players.filter((p: Player) => p.id !== playerId);

      // Delete room if empty
      if (room.players.length === 0) {
        await db.del(`room:${roomCode}`);
        // Publish empty room update before deletion
        await publishRoomUpdate(roomCode, room);
      } else {
        await db.set(`room:${roomCode}`, room);
        await publishRoomUpdate(roomCode, room);
      }

      return jsonResponse({ success: true });
    }

    // Admin endpoints
    // Verify admin token
    if (path === "/admin/verify" && method === "POST") {
      const adminInfo = await verifyAdminToken(event.headers.authorization);
      if (!adminInfo) {
        return errorResponse("Unauthorized", 401);
      }
      return jsonResponse({ isAdmin: adminInfo.isAdmin });
    }

    // Get session history
    if (path === "/admin/sessions" && method === "GET") {
      const adminInfo = await verifyAdminToken(event.headers.authorization);
      if (!adminInfo || !adminInfo.isAdmin) {
        return errorResponse("Unauthorized", 401);
      }

      const sessions = await db.getSessionsByAdmin(adminInfo.uid);
      return jsonResponse({ sessions });
    }

    // Get analytics
    if (path === "/admin/analytics" && method === "GET") {
      const adminInfo = await verifyAdminToken(event.headers.authorization);
      if (!adminInfo || !adminInfo.isAdmin) {
        return errorResponse("Unauthorized", 401);
      }

      const analytics = await db.getAnalyticsByAdmin(adminInfo.uid);
      return jsonResponse(analytics);
    }

    // 404 for unknown routes
    return errorResponse("Not found", 404);
  } catch (error: any) {
    console.error("API Error:", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
};

export { handler };
