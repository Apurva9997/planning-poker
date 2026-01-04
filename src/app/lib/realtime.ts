/**
 * Ably Realtime Service
 *
 * Handles real-time updates via Ably pub/sub channels.
 * Provides a clean interface for subscribing to room updates.
 */

import * as Ably from "ably";
import type { Room } from "./types";

let ablyClient: Ably.Realtime | null = null;
const activeSubscriptions = new Map<string, Ably.RealtimeChannel>();

/**
 * Initialize Ably client
 */
function getAblyClient(): Ably.Realtime | null {
  const apiKey = import.meta.env.VITE_ABLY_API_KEY;

  if (!apiKey) {
    return null; // Ably not configured, return null for fallback
  }

  if (!ablyClient) {
    ablyClient = new Ably.Realtime({
      key: apiKey,
      clientId: `client-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}`,
      // Enable automatic reconnection
      disconnectedRetryTimeout: 1000,
      suspendedRetryTimeout: 1000,
    });

    // Handle connection state changes
    ablyClient.connection.on("connected", () => {
      console.log("[Ably] Connected");
    });

    ablyClient.connection.on("disconnected", () => {
      console.log("[Ably] Disconnected");
    });

    ablyClient.connection.on("suspended", () => {
      console.log("[Ably] Connection suspended");
    });

    ablyClient.connection.on("failed", () => {
      console.error("[Ably] Connection failed");
    });
  }

  return ablyClient;
}

/**
 * Subscribe to room updates
 *
 * @param roomCode - The room code to subscribe to
 * @param callback - Callback function called when room data updates
 * @returns Unsubscribe function
 */
export function subscribeToRoom(
  roomCode: string,
  callback: (room: Room) => void
): () => void {
  const client = getAblyClient();

  // If Ably not configured, throw error to trigger fallback
  if (!client) {
    throw new Error("Ably not configured");
  }

  const channelName = `room:${roomCode}`;

  // Unsubscribe from previous subscription if exists
  if (activeSubscriptions.has(channelName)) {
    activeSubscriptions.get(channelName)?.unsubscribe();
  }

  const channel = client.channels.get(channelName);

  // Subscribe to room updates
  channel.subscribe("room-update", (message) => {
    try {
      const room = message.data as Room;
      callback(room);
    } catch (error) {
      console.error("[Ably] Error processing room update:", error);
    }
  });

  // Subscribe to connection state changes
  channel.subscribe("room-connection", (message) => {
    console.log("[Ably] Room connection event:", message.data);
  });

  activeSubscriptions.set(channelName, channel);

  // Return unsubscribe function
  return () => {
    channel.unsubscribe();
    activeSubscriptions.delete(channelName);
  };
}

/**
 * Unsubscribe from all channels
 */
export function unsubscribeAll(): void {
  activeSubscriptions.forEach((channel) => {
    channel.unsubscribe();
  });
  activeSubscriptions.clear();
}

/**
 * Get connection state
 */
export function getConnectionState(): Ably.ConnectionState | null {
  if (!ablyClient) {
    return null;
  }
  return ablyClient.connection.state;
}

/**
 * Check if connected
 */
export function isConnected(): boolean {
  const state = getConnectionState();
  return state !== null && state === "connected";
}
