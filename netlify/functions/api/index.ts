/**
 * Netlify Serverless Function - Planning Poker API
 *
 * Handles all API endpoints for the Planning Poker application.
 * Uses Neon PostgreSQL for data storage.
 */

import type { Handler, HandlerEvent } from "@netlify/functions";
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

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
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
      const { playerName, playerId } = JSON.parse(event.body || "{}");

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
      } else {
        await db.set(`room:${roomCode}`, room);
      }

      return jsonResponse({ success: true });
    }

    // 404 for unknown routes
    return errorResponse("Not found", 404);
  } catch (error: any) {
    console.error("API Error:", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
};

export { handler };
