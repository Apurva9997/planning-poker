import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Users, Plus } from 'lucide-react';

interface HomePageProps {
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  isCreatingRoom?: boolean;
  isJoiningRoom?: boolean;
  initialRoomCode?: string;
}

export function HomePage({ 
  onCreateRoom, 
  onJoinRoom, 
  isCreatingRoom = false,
  isJoiningRoom = false,
  initialRoomCode
}: HomePageProps) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [mode, setMode] = useState<'select' | 'create' | 'join'>(initialRoomCode ? 'join' : 'select');

  const handleCreate = () => {
    if (playerName.trim()) {
      onCreateRoom(playerName.trim());
    }
  };

  const handleJoin = () => {
    if (playerName.trim() && roomCode.trim()) {
      onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl mb-2">🎴 Planning Poker</h1>
          <p className="text-gray-600">Estimate together, deliver better</p>
        </div>

        {mode === 'select' && (
          <Card>
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>Create a new room or join an existing one</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                size="lg"
                onClick={() => setMode('create')}
              >
                <Plus className="mr-2 size-5" />
                Create New Room
              </Button>
              <Button
                className="w-full"
                size="lg"
                variant="outline"
                onClick={() => setMode('join')}
              >
                <Users className="mr-2 size-5" />
                Join Room
              </Button>
            </CardContent>
          </Card>
        )}

        {mode === 'create' && (
          <Card>
            <CardHeader>
              <CardTitle>Create Room</CardTitle>
              <CardDescription>Enter your name to create a new planning poker room</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  placeholder="Your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={!playerName.trim() || isCreatingRoom}
                >
                  {isCreatingRoom ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Room'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMode('select')}
                  disabled={isCreatingRoom}
                >
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === 'join' && (
          <Card>
            <CardHeader>
              <CardTitle>Join Room</CardTitle>
              <CardDescription>Enter the room code and your name</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  placeholder="Room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="uppercase text-center tracking-widest"
                />
              </div>
              <div>
                <Input
                  placeholder="Your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleJoin}
                  disabled={!playerName.trim() || !roomCode.trim() || isJoiningRoom}
                >
                  {isJoiningRoom ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Joining...
                    </>
                  ) : (
                    'Join Room'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMode('select')}
                  disabled={isJoiningRoom}
                >
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
