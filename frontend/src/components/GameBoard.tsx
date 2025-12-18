import { useEffect, useState } from "react";
import GameScene from "../game/scenes/GameScene";
import Button from "./ui/Button";

export default function GameBoard({ mode, onLeave }: { mode: "local" | "online"; onLeave: () => void }) {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Call API when game starts
  useEffect(() => {
    const startGame = async () => {
      try {
        const response = await fetch('/api/game/start', {
          method: 'POST',
          credentials: 'include', // Required to send cookies
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Game started! Total games played:', data.total_games);
          setGameStarted(true);
          setGameStartTime(Date.now()); // Record start time
        } else {
          console.error('❌ Failed to start game:', response.status);
          setError(`Error ${response.status}`);
          setGameStarted(true);
          setGameStartTime(Date.now());
        }
      } catch (error) {
        console.error('❌ Network error:', error);
        setError('Network error');
        setGameStarted(true);
        setGameStartTime(Date.now());
      }
    };

    startGame();
  }, []); // Execute once on component mount

  // Function to handle game end and send stats to backend
  const handleGameEnd = async (kills: number) => {
    const timePlayedSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
    
    console.log('🎮 Sending game stats:', { kills, time_played: timePlayedSeconds });

    try {
      const response = await fetch('/api/game/end', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kills: kills,
          time_played: timePlayedSeconds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Game stats recorded!', data);
      } else {
        console.error('❌ Failed to record game stats:', response.status);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
    }

    // Return to previous screen
    onLeave();
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-wood-900 flex items-center justify-center">
        <p className="text-2xl text-primary">Starting game...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-wood-800 border-b border-wood-700 p-2 flex justify-between items-center shadow-lg z-10">
        <div className="font-bold text-wood-100 px-4">
          <span className="text-wood-400">Mode:</span> {mode.toUpperCase()}
          {error && <span className="text-red-500 ml-4 text-sm">⚠️ {error}</span>}
        </div>
        <Button onClick={() => handleGameEnd(0)} variant="danger" className="py-1 px-3 text-sm">
          Forfeit Match
        </Button>
      </div>

      {/* 3D Canvas Area */}
      <div className="flex-grow bg-black relative">
        <GameScene onLeave={handleGameEnd} />
      </div>
    </div>
  );
}
