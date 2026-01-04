/**
 * Google Analytics utility functions
 * Provides type-safe wrappers for gtag events
 */

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
  }
}

const GA_MEASUREMENT_ID = 'G-8HF5C45Y9D';

/**
 * Track a page view
 * @param pagePath - The path of the page (e.g., '/', '/room/ABC123')
 * @param pageTitle - Optional page title
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: pagePath,
    ...(pageTitle && { page_title: pageTitle }),
  });
}

/**
 * Track a custom event
 * @param eventName - Name of the event (e.g., 'room_created', 'vote_submitted')
 * @param eventParams - Additional event parameters
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, unknown>
): void {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', eventName, eventParams);
}

/**
 * Track room creation
 */
export function trackRoomCreated(roomCode: string): void {
  trackEvent('room_created', {
    room_code: roomCode,
  });
}

/**
 * Track room join
 */
export function trackRoomJoined(roomCode: string): void {
  trackEvent('room_joined', {
    room_code: roomCode,
  });
}

/**
 * Track vote submission
 */
export function trackVoteSubmitted(roomCode: string, voteValue: string | null): void {
  trackEvent('vote_submitted', {
    room_code: roomCode,
    vote_value: voteValue || 'null',
  });
}

/**
 * Track votes revealed
 */
export function trackVotesRevealed(roomCode: string): void {
  trackEvent('votes_revealed', {
    room_code: roomCode,
  });
}

/**
 * Track round reset
 */
export function trackRoundReset(roomCode: string): void {
  trackEvent('round_reset', {
    room_code: roomCode,
  });
}

/**
 * Track room leave
 */
export function trackRoomLeft(roomCode: string): void {
  trackEvent('room_left', {
    room_code: roomCode,
  });
}

