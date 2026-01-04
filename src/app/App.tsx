import { useState, useEffect } from 'react';
import { HomePage } from './components/HomePage';
import { PlanningRoom, Player } from './components/PlanningRoom';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import * as api from './lib/api';

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
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedRoomCode = localStorage.getItem('planningPokerRoom');
    const savedPlayerId = localStorage.getItem('planningPokerPlayerId');

    if (savedRoomCode && savedPlayerId) {
      setCurrentRoom(savedRoomCode);
      setCurrentPlayerId(savedPlayerId);
      // Try to fetch the room data
      api.getRoom(savedRoomCode)
        .then(room => {
          // Check if the player still exists in the room
          const playerExists = room.players.some(p => p.id === savedPlayerId);
          if (playerExists) {
            setRoomData(room);
          } else {
            // Player not in room, clear saved data
            console.log('Player no longer in saved room, clearing session');
            localStorage.removeItem('planningPokerRoom');
            localStorage.removeItem('planningPokerPlayerId');
            setCurrentRoom(null);
            setCurrentPlayerId(null);
          }
        })
        .catch(err => {
          console.log('Saved room not found, clearing session');
          // Clear invalid saved data - don't show error toast as this is expected
          localStorage.removeItem('planningPokerRoom');
          localStorage.removeItem('planningPokerPlayerId');
          setCurrentRoom(null);
          setCurrentPlayerId(null);
        });
    }
  }, []);

  // Poll for room updates when in a room
  useEffect(() => {
    if (!currentRoom || !currentPlayerId) return;

    const pollInterval = setInterval(async () => {
      try {
        const room = await api.getRoom(currentRoom);
        
        // Check if current player still exists in the room
        const playerExists = room.players.some(p => p.id === currentPlayerId);
        if (!playerExists) {
          console.log('Player removed from room');
          clearInterval(pollInterval);
          setCurrentRoom(null);
          setCurrentPlayerId(null);
          setRoomData(null);
          localStorage.removeItem('planningPokerRoom');
          localStorage.removeItem('planningPokerPlayerId');
          toast.info('You have been removed from the room');
          return;
        }
        
        setRoomData(room);
      } catch (err) {
        console.log('Room no longer exists or polling failed');
        // Room probably doesn't exist anymore, stop polling and return to home
        clearInterval(pollInterval);
        setCurrentRoom(null);
        setCurrentPlayerId(null);
        setRoomData(null);
        localStorage.removeItem('planningPokerRoom');
        localStorage.removeItem('planningPokerPlayerId');
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [currentRoom, currentPlayerId]);

  const handleCreateRoom = async (playerName: string) => {
    setIsLoading(true);
    try {
      const playerId = generatePlayerId();
      const room = await api.createRoom(playerName, playerId);
      
      setCurrentRoom(room.code);
      setCurrentPlayerId(playerId);
      setRoomData(room);
      
      localStorage.setItem('planningPokerRoom', room.code);
      localStorage.setItem('planningPokerPlayerId', playerId);
      
      toast.success('Room created successfully!');
    } catch (err) {
      console.error('Failed to create room:', err);
      toast.error('Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (roomCode: string, playerName: string) => {
    setIsLoading(true);
    try {
      const playerId = generatePlayerId();
      const room = await api.joinRoom(roomCode, playerName, playerId);

      setCurrentRoom(room.code);
      setCurrentPlayerId(playerId);
      setRoomData(room);
      
      localStorage.setItem('planningPokerRoom', room.code);
      localStorage.setItem('planningPokerPlayerId', playerId);
      
      toast.success('Joined room successfully!');
    } catch (err) {
      console.error('Failed to join room:', err);
      toast.error('Failed to join room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (value: string | null) => {
    if (!currentRoom || !currentPlayerId) return;

    try {
      const room = await api.submitVote(currentRoom, currentPlayerId, value);
      setRoomData(room);
    } catch (err) {
      console.error('Failed to submit vote:', err);
      toast.error('Failed to submit vote. Please try again.');
    }
  };

  const handleReveal = async () => {
    if (!currentRoom) return;

    try {
      const room = await api.revealVotes(currentRoom);
      setRoomData(room);
      toast.success('Votes revealed!');
    } catch (err) {
      console.error('Failed to reveal votes:', err);
      toast.error('Failed to reveal votes. Please try again.');
    }
  };

  const handleReset = async () => {
    if (!currentRoom) return;

    try {
      const room = await api.resetRound(currentRoom);
      setRoomData(room);
      toast.success('Round reset!');
    } catch (err) {
      console.error('Failed to reset round:', err);
      toast.error('Failed to reset round. Please try again.');
    }
  };

  const handleLeave = async () => {
    if (!currentRoom || !currentPlayerId) return;

    try {
      await api.leaveRoom(currentRoom, currentPlayerId);
      
      setCurrentRoom(null);
      setCurrentPlayerId(null);
      setRoomData(null);
      
      localStorage.removeItem('planningPokerRoom');
      localStorage.removeItem('planningPokerPlayerId');
      
      toast.success('Left room successfully!');
    } catch (err) {
      console.error('Failed to leave room:', err);
      toast.error('Failed to leave room. Please try again.');
    }
  };

  const currentPlayer = roomData?.players.find(p => p.id === currentPlayerId);

  if (isLoading) {
    return (
      <>
        <div className="size-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
        <Toaster />
      </>
    );
  }

  if (!currentRoom || !currentPlayer || !roomData) {
    return (
      <>
        <HomePage onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} />
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
      />
      <Toaster />
    </>
  );
}