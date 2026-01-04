import { Check, Eye, EyeOff, LogOut, RotateCcw, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

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
  isRevealing?: boolean;
  isResetting?: boolean;
  isVoting?: boolean;
}

const CARD_VALUES = ["0", "1", "2", "3", "5", "8", "13", "21", "?", "☕"];

export function PlanningRoom({
  roomCode,
  currentPlayer,
  players,
  revealed,
  onVote,
  onReveal,
  onReset,
  onLeave,
  isRevealing = false,
  isResetting = false,
  isVoting = false,
}: PlanningRoomProps) {
  const [shareUrlCopied, setShareUrlCopied] = useState(false);

  const handleShareUrl = async () => {
    try {
      const roomUrl = `${window.location.origin}/room/${roomCode}`;
      await navigator.clipboard.writeText(roomUrl);
      setShareUrlCopied(true);
      toast.success("Room URL copied!");
      setTimeout(() => setShareUrlCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy URL");
    }
  };

  const votingPlayers = players.filter((p) => !p.isObserver);
  const hasVoted = votingPlayers.filter((p) => p.vote !== null).length;
  const totalVoters = votingPlayers.length;
  const allVoted = hasVoted === totalVoters && totalVoters > 0;

  const calculateAverage = () => {
    const numericVotes = votingPlayers
      .filter((p) => p.vote && !isNaN(Number(p.vote)))
      .map((p) => Number(p.vote));

    if (numericVotes.length === 0) return null;

    const sum = numericVotes.reduce((acc, val) => acc + val, 0);
    return (sum / numericVotes.length).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 pb-24 sm:pb-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl">🎴 Planning Poker</h1>
            <div className="flex items-center gap-2">
              <span className="font-mono tracking-wider text-sm sm:text-base px-2 py-1 bg-white rounded-md border border-gray-200">
                {roomCode}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareUrl}
                className="gap-2"
              >
                {shareUrlCopied ? (
                  <Check className="size-4" />
                ) : (
                  <Share2 className="size-4" />
                )}
                Share Room
              </Button>
            </div>
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
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="text-sm">
                  {hasVoted} / {totalVoters} voted
                </Badge>
                {revealed && calculateAverage() && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">
                      Average:
                    </span>
                    <span className="text-3xl sm:text-4xl font-bold text-blue-600">
                      {calculateAverage()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-wrap justify-center">
                <Button
                  onClick={onReveal}
                  disabled={revealed || hasVoted === 0 || isRevealing}
                  variant={allVoted && !revealed ? "default" : "outline"}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  {isRevealing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Revealing...
                    </>
                  ) : (
                    <>
                      {revealed ? (
                        <EyeOff className="size-4 mr-2" />
                      ) : (
                        <Eye className="size-4 mr-2" />
                      )}
                      {revealed ? "Revealed" : "Reveal Cards"}
                    </>
                  )}
                </Button>
                <Button
                  onClick={onReset}
                  variant="outline"
                  disabled={isResetting}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  {isResetting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="size-4 mr-2" />
                      New Round
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Players Grid */}
        <div className="mb-6">
          <h2 className="mb-4 text-lg sm:text-xl font-semibold">Players</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {players.map((player) => (
              <Card
                key={player.id}
                className={`${
                  player.id === currentPlayer.id ? "ring-2 ring-blue-500" : ""
                }`}
              >
                <CardContent className="p-3 sm:p-4 text-center">
                  <div className="mb-2 truncate text-sm sm:text-base">
                    {player.name}
                    {player.id === currentPlayer.id && (
                      <span className="text-blue-500"> (You)</span>
                    )}
                  </div>
                  <div className="relative">
                    {player.isObserver ? (
                      <div className="h-16 sm:h-20 flex items-center justify-center text-gray-400 text-xs sm:text-sm">
                        Observer
                      </div>
                    ) : (
                      <div
                        className={`h-16 sm:h-20 flex items-center justify-center rounded-lg text-xl sm:text-2xl transition-all ${
                          player.vote
                            ? revealed
                              ? "bg-blue-500 text-white"
                              : "bg-green-500 text-white"
                            : "bg-gray-200 text-gray-400"
                        }`}
                      >
                        {player.vote ? (revealed ? player.vote : "✓") : "—"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Voting Cards - Sticky on mobile for better UX */}
        <div className="sticky bottom-0 bg-gradient-to-br from-blue-50 to-indigo-100 -mx-4 px-4 pt-4 pb-4 sm:pb-0 sm:relative sm:mx-0 sm:bg-transparent border-t border-gray-200 sm:border-t-0">
          <h2 className="mb-4 text-lg sm:text-xl font-semibold">Your Cards</h2>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3 pb-safe sm:pb-0">
            {CARD_VALUES.map((value) => (
              <button
                key={value}
                onClick={() =>
                  onVote(currentPlayer.vote === value ? null : value)
                }
                disabled={revealed || currentPlayer.isObserver || isVoting}
                className={`aspect-[2/3] rounded-lg text-lg sm:text-xl md:text-2xl transition-all ${
                  currentPlayer.vote === value
                    ? "bg-blue-500 text-white scale-105 shadow-lg"
                    : "bg-white hover:bg-blue-50 hover:scale-105 shadow"
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
              >
                {isVoting && currentPlayer.vote === value ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current mx-auto"></div>
                ) : (
                  value
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
