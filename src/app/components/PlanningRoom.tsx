import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Eye, EyeOff, RotateCcw, Copy, Check, LogOut, Wifi } from 'lucide-react';
import { toast } from 'sonner';

export interface Player {
  id: string;
  name: string;
  vote: string | null;
  isObserver: boolean;
  lastSeen?: number;
}

interface PlanningRoomProps {
  roomCode: string;
  currentPlayer: Player;
  players: Player[];
  revealed: boolean;
  onVote: (value: string | null) => void;
  onReveal: () => void;
  onReset: () => void;
  onLeave: () => void;
}

const CARD_VALUES = ['0', '1', '2', '3', '5', '8', '13', '21', '?', '☕'];

export function PlanningRoom({
  roomCode,
  currentPlayer,
  players,
  revealed,
  onVote,
  onReveal,
  onReset,
  onLeave,
}: PlanningRoomProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      toast.success('Room code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  const votingPlayers = players.filter(p => !p.isObserver);
  const hasVoted = votingPlayers.filter(p => p.vote !== null).length;
  const totalVoters = votingPlayers.length;
  const allVoted = hasVoted === totalVoters && totalVoters > 0;

  const calculateAverage = () => {
    const numericVotes = votingPlayers
      .filter(p => p.vote && !isNaN(Number(p.vote)))
      .map(p => Number(p.vote));
    
    if (numericVotes.length === 0) return null;
    
    const sum = numericVotes.reduce((acc, val) => acc + val, 0);
    return (sum / numericVotes.length).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl">🎴 Planning Poker</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="gap-2"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              <span className="font-mono tracking-wider">{roomCode}</span>
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={onLeave}>
            <LogOut className="size-4 mr-2" />
            Leave
          </Button>
        </div>

        {/* Status Bar */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {hasVoted} / {totalVoters} voted
                </Badge>
                {revealed && calculateAverage() && (
                  <Badge variant="default">
                    Average: {calculateAverage()}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={onReveal}
                  disabled={revealed || hasVoted === 0}
                  variant={allVoted && !revealed ? "default" : "outline"}
                >
                  {revealed ? <EyeOff className="size-4 mr-2" /> : <Eye className="size-4 mr-2" />}
                  {revealed ? 'Revealed' : 'Reveal Cards'}
                </Button>
                <Button onClick={onReset} variant="outline">
                  <RotateCcw className="size-4 mr-2" />
                  New Round
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Players Grid */}
        <div className="mb-6">
          <h2 className="mb-4">Players</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {players.map(player => (
              <Card
                key={player.id}
                className={`${
                  player.id === currentPlayer.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <CardContent className="p-4 text-center">
                  <div className="mb-2 truncate">
                    {player.name}
                    {player.id === currentPlayer.id && (
                      <span className="text-blue-500"> (You)</span>
                    )}
                  </div>
                  <div className="relative">
                    {player.isObserver ? (
                      <div className="h-20 flex items-center justify-center text-gray-400">
                        Observer
                      </div>
                    ) : (
                      <div
                        className={`h-20 flex items-center justify-center rounded-lg text-2xl transition-all ${
                          player.vote
                            ? revealed
                              ? 'bg-blue-500 text-white'
                              : 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {player.vote ? (revealed ? player.vote : '✓') : '—'}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Voting Cards */}
        <div>
          <h2 className="mb-4">Your Cards</h2>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3">
            {CARD_VALUES.map(value => (
              <button
                key={value}
                onClick={() => onVote(currentPlayer.vote === value ? null : value)}
                disabled={revealed || currentPlayer.isObserver}
                className={`aspect-[2/3] rounded-lg text-xl sm:text-2xl transition-all ${
                  currentPlayer.vote === value
                    ? 'bg-blue-500 text-white scale-105 shadow-lg'
                    : 'bg-white hover:bg-blue-50 hover:scale-105 shadow'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}