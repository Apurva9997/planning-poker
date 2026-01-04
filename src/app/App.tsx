import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { HomePage } from './components/HomePage';
import { PlanningRoom, Player } from './components/PlanningRoom';
import { Toaster } from './components/ui/sonner';
import { useAdminAuth } from './lib/adminAuth';
import {
  trackPageView,
  trackRoomCreated,
  trackRoomJoined,
  trackRoomLeft,
  trackRoundReset,
  trackVoteSubmitted,
  trackVotesRevealed,
} from './lib/analytics';
import * as api from './lib/api';
import { subscribeToRoom, unsubscribeAll } from './lib/realtime';

interface Room {
  code: string;
  players: Player[];
  revealed: boolean;
  createdAt: number;
}

function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export default function App() {
  const { adminUser, isAdmin, getIdToken } = useAdminAuth();
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  // Track initial page view
  useEffect(() => {
    trackPageView(window.location.pathname, document.title);
  }, []);

  // Load from URL or localStorage on mount
  useEffect(() => {
    const urlPath = window.location.pathname;
    const roomCodeMatch = urlPath.match(/^\/room\/([A-Z0-9]{6})$/i);

    if (roomCodeMatch) {
      const roomCode = roomCodeMatch[1].toUpperCase();
      // Check if we have a saved player ID for this room
      const savedPlayerId = localStorage.getItem('planningPokerPlayerId');
      const savedRoomCode = localStorage.getItem('planningPokerRoom');

      if (savedPlayerId && savedRoomCode === roomCode) {
        // We have a saved session for this room
        setCurrentRoom(roomCode);
        setCurrentPlayerId(savedPlayerId);
        setIsLoading(true);
        api
          .getRoom(roomCode)
          .then((room) => {
            const playerExists = room.players.some(
              (p) => p.id === savedPlayerId
            );
            if (playerExists) {
              setRoomData(room);
            } else {
              // Player not in room, clear saved data
              console.log('Player no longer in saved room, clearing session');
              localStorage.removeItem('planningPokerRoom');
              localStorage.removeItem('planningPokerPlayerId');
              setCurrentRoom(null);
              setCurrentPlayerId(null);
              // Update URL to home
              window.history.replaceState({}, '', '/');
              trackPageView('/', 'Home');
            }
            setIsLoading(false);
          })
          .catch((err) => {
            console.log('Saved room not found, clearing session');
            localStorage.removeItem('planningPokerRoom');
            localStorage.removeItem('planningPokerPlayerId');
            setCurrentRoom(null);
            setCurrentPlayerId(null);
            window.history.replaceState({}, '', '/');
            trackPageView('/', 'Home');
            setIsLoading(false);
          });
      } else {
        // No saved session, but we have a room code in URL - user needs to join
        setCurrentRoom(null);
        setCurrentPlayerId(null);
        setIsLoading(false);
      }
    } else {
      // No room code in URL, check localStorage
      const savedRoomCode = localStorage.getItem('planningPokerRoom');
      const savedPlayerId = localStorage.getItem('planningPokerPlayerId');

      if (savedRoomCode && savedPlayerId) {
        setCurrentRoom(savedRoomCode);
        setCurrentPlayerId(savedPlayerId);
        setIsLoading(true);
        // Update URL to match saved room
        window.history.replaceState({}, '', `/room/${savedRoomCode}`);
        trackPageView(`/room/${savedRoomCode}`, `Room ${savedRoomCode}`);
        // Try to fetch the room data
        api
          .getRoom(savedRoomCode)
          .then((room) => {
            // Check if the player still exists in the room
            const playerExists = room.players.some(
              (p) => p.id === savedPlayerId
            );
            if (playerExists) {
              setRoomData(room);
            } else {
              // Player not in room, clear saved data
              console.log('Player no longer in saved room, clearing session');
              localStorage.removeItem('planningPokerRoom');
              localStorage.removeItem('planningPokerPlayerId');
              setCurrentRoom(null);
              setCurrentPlayerId(null);
              window.history.replaceState({}, '', '/');
            }
            setIsLoading(false);
          })
          .catch((err) => {
            console.log('Saved room not found, clearing session');
            // Clear invalid saved data - don't show error toast as this is expected
            localStorage.removeItem('planningPokerRoom');
            localStorage.removeItem('planningPokerPlayerId');
            setCurrentRoom(null);
            setCurrentPlayerId(null);
            window.history.replaceState({}, '', '/');
            trackPageView('/', 'Home');
            setIsLoading(false);
          });
      }
    }
  }, []);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const urlPath = window.location.pathname;
      trackPageView(urlPath, document.title);
      const roomCodeMatch = urlPath.match(/^\/room\/([A-Z0-9]{6})$/i);

      if (!roomCodeMatch) {
        // Navigated to home, clear room state
        setCurrentRoom(null);
        setCurrentPlayerId(null);
        setRoomData(null);
        localStorage.removeItem('planningPokerRoom');
        localStorage.removeItem('planningPokerPlayerId');
      } else {
        // Navigated to a room URL, try to restore session
        const roomCode = roomCodeMatch[1].toUpperCase();
        const savedPlayerId = localStorage.getItem('planningPokerPlayerId');
        const savedRoomCode = localStorage.getItem('planningPokerRoom');

        if (savedPlayerId && savedRoomCode === roomCode) {
          setCurrentRoom(roomCode);
          setCurrentPlayerId(savedPlayerId);
          setIsLoading(true);
          api
            .getRoom(roomCode)
            .then((room) => {
              const playerExists = room.players.some(
                (p) => p.id === savedPlayerId
              );
              if (playerExists) {
                setRoomData(room);
              } else {
                setCurrentRoom(null);
                setCurrentPlayerId(null);
                localStorage.removeItem('planningPokerRoom');
                localStorage.removeItem('planningPokerPlayerId');
              }
              setIsLoading(false);
            })
            .catch(() => {
              setCurrentRoom(null);
              setCurrentPlayerId(null);
              localStorage.removeItem('planningPokerRoom');
              localStorage.removeItem('planningPokerPlayerId');
              trackPageView('/', 'Home');
              setIsLoading(false);
            });
        } else {
          setCurrentRoom(null);
          setCurrentPlayerId(null);
          setRoomData(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Subscribe to real-time room updates via Ably
  useEffect(() => {
    if (!currentRoom || !currentPlayerId) {
      // Unsubscribe when leaving room
      unsubscribeAll();
      return;
    }

    // First, fetch initial room state
    api
      .getRoom(currentRoom)
      .then((room) => {
        // Check if current player still exists in the room
        const playerExists = room.players.some((p) => p.id === currentPlayerId);
        if (!playerExists) {
          console.log('Player removed from room');
          setCurrentRoom(null);
          setCurrentPlayerId(null);
          setRoomData(null);
          localStorage.removeItem('planningPokerRoom');
          localStorage.removeItem('planningPokerPlayerId');
          window.history.replaceState({}, '', '/');
          trackPageView('/', 'Home');
          toast.info('You have been removed from the room');
          return;
        }
        setRoomData(room);
      })
      .catch((err) => {
        console.error('Failed to fetch initial room state:', err);
        // Don't kick user out on initial fetch failure - Ably will handle updates
      });

    // Subscribe to real-time updates
    try {
      const unsubscribe = subscribeToRoom(currentRoom, (room) => {
        // Check if current player still exists in the room
        const playerExists = room.players.some((p) => p.id === currentPlayerId);
        if (!playerExists) {
          console.log('Player removed from room');
          setCurrentRoom(null);
          setCurrentPlayerId(null);
          setRoomData(null);
          localStorage.removeItem('planningPokerRoom');
          localStorage.removeItem('planningPokerPlayerId');
          window.history.replaceState({}, '', '/');
          toast.info('You have been removed from the room');
          return;
        }
        setRoomData(room);
      });

      return () => {
        unsubscribe();
      };
    } catch (error) {
      console.error('Failed to subscribe to room updates:', error);
      toast.error('Real-time updates unavailable. Please refresh the page.');
      // Fallback to polling if Ably fails
      const pollInterval = setInterval(async () => {
        try {
          const room = await api.getRoom(currentRoom);
          const playerExists = room.players.some(
            (p) => p.id === currentPlayerId
          );
          if (!playerExists) {
            clearInterval(pollInterval);
            setCurrentRoom(null);
            setCurrentPlayerId(null);
            setRoomData(null);
            localStorage.removeItem('planningPokerRoom');
            localStorage.removeItem('planningPokerPlayerId');
            window.history.replaceState({}, '', '/');
            trackPageView('/', 'Home');
            toast.info('You have been removed from the room');
            return;
          }
          setRoomData(room);
        } catch (err) {
          console.error('Polling fallback failed:', err);
        }
      }, 3000);

      return () => clearInterval(pollInterval);
    }
  }, [currentRoom, currentPlayerId]);

  const handleCreateRoom = async (playerName: string) => {
    setIsCreatingRoom(true);
    try {
      const playerId = generatePlayerId();
      const room = await api.createRoom(playerName, playerId, adminUser?.uid);

      setCurrentRoom(room.code);
      setCurrentPlayerId(playerId);
      setRoomData(room);

      localStorage.setItem('planningPokerRoom', room.code);
      localStorage.setItem('planningPokerPlayerId', playerId);

      // Update URL
      window.history.pushState({}, '', `/room/${room.code}`);
      trackPageView(`/room/${room.code}`, `Room ${room.code}`);
      trackRoomCreated(room.code);

      toast.success('Room created successfully!');
    } catch (err) {
      console.error('Failed to create room:', err);
      toast.error('Failed to create room. Please try again.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (roomCode: string, playerName: string) => {
    setIsJoiningRoom(true);
    try {
      const playerId = generatePlayerId();
      const room = await api.joinRoom(roomCode, playerName, playerId);

      setCurrentRoom(room.code);
      setCurrentPlayerId(playerId);
      setRoomData(room);

      localStorage.setItem('planningPokerRoom', room.code);
      localStorage.setItem('planningPokerPlayerId', playerId);

      // Update URL
      window.history.pushState({}, '', `/room/${room.code}`);
      trackPageView(`/room/${room.code}`, `Room ${room.code}`);
      trackRoomJoined(room.code);

      toast.success('Joined room successfully!');
    } catch (err) {
      console.error('Failed to join room:', err);
      toast.error('Failed to join room. Please try again.');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleVote = async (value: string | null) => {
    if (!currentRoom || !currentPlayerId) return;

    setIsVoting(true);
    try {
      // Room data will be updated via Ably subscription
      await api.submitVote(currentRoom, currentPlayerId, value);
      trackVoteSubmitted(currentRoom, value);
    } catch (err) {
      console.error('Failed to submit vote:', err);
      toast.error('Failed to submit vote. Please try again.');
    } finally {
      setIsVoting(false);
    }
  };

  const handleReveal = async () => {
    if (!currentRoom) return;

    setIsRevealing(true);
    try {
      // Room data will be updated via Ably subscription
      await api.revealVotes(currentRoom);
      trackVotesRevealed(currentRoom);
      toast.success('Votes revealed!');
    } catch (err) {
      console.error('Failed to reveal votes:', err);
      toast.error('Failed to reveal votes. Please try again.');
    } finally {
      setIsRevealing(false);
    }
  };

  const handleReset = async () => {
    if (!currentRoom) return;

    setIsResetting(true);
    try {
      // Room data will be updated via Ably subscription
      await api.resetRound(currentRoom);
      trackRoundReset(currentRoom);
      toast.success('Round reset!');
    } catch (err) {
      console.error('Failed to reset round:', err);
      toast.error('Failed to reset round. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleLeave = async () => {
    if (!currentRoom || !currentPlayerId) return;

    try {
      await api.leaveRoom(currentRoom, currentPlayerId);

      // Unsubscribe from room updates
      unsubscribeAll();

      setCurrentRoom(null);
      setCurrentPlayerId(null);
      setRoomData(null);

      localStorage.removeItem('planningPokerRoom');
      localStorage.removeItem('planningPokerPlayerId');

      // Update URL to home
      window.history.pushState({}, '', '/');
      trackPageView('/', 'Home');
      trackRoomLeft(currentRoom);

      toast.success('Left room successfully!');
    } catch (err) {
      console.error('Failed to leave room:', err);
      toast.error('Failed to leave room. Please try again.');
    }
  };

  const currentPlayer = roomData?.players.find((p) => p.id === currentPlayerId);

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
        <Toaster />
      </>
    );
  }

  // Extract room code from URL if present
  const urlPath = window.location.pathname;
  const roomCodeMatch = urlPath.match(/^\/room\/([A-Z0-9]{6})$/i);
  const urlRoomCode = roomCodeMatch ? roomCodeMatch[1].toUpperCase() : null;

  // Handle analytics route
  if (urlPath === '/analytics' && isAdmin) {
    return (
      <>
        <AnalyticsDashboard
          onBack={() => {
            window.history.pushState({}, '', '/');
            trackPageView('/', 'Home');
          }}
          getIdToken={getIdToken}
        />
        <Toaster />
      </>
    );
  }

  if (!currentRoom || !currentPlayer || !roomData) {
    return (
      <>
        <HomePage
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          isCreatingRoom={isCreatingRoom}
          isJoiningRoom={isJoiningRoom}
          initialRoomCode={urlRoomCode || undefined}
        />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <PlanningRoom
        roomCode={roomData.code}
        currentPlayer={currentPlayer}
        players={roomData.players}
        revealed={roomData.revealed}
        onVote={handleVote}
        onReveal={handleReveal}
        onReset={handleReset}
        onLeave={handleLeave}
        isRevealing={isRevealing}
        isResetting={isResetting}
        isVoting={isVoting}
      />
      <Toaster />
    </>
  );
}
