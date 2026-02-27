
import React, { useEffect, useRef, useState } from 'react';
import { GameState, Item, Loadout } from '../types';
import { GameEngine } from '../game/GameEngine';
import MobileControls from './MobileControls';
import { DASH_COOLDOWN } from '../constants';

interface GameCanvasProps {
  onGameOver: (won: boolean, loot: Item[] | null) => void;
  gameState: GameState;
  loadout: Loadout;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, gameState, loadout }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hudData, setHudData] = useState({ 
      health: 100, 
      maxHealth: 100, 
      loot: 0, 
      timer: 0, 
      dashCooldown: 0,
      matchCountdown: 60 
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
        setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();

    if (gameState !== GameState.PLAYING) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleResize = () => {
        const dpr = window.devicePixelRatio || 1;
        // Set physical size (scaled by DPR)
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        
        // Set CSS size (logical pixels)
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;

        // Notify engine of the new dimensions (logical)
        if (engineRef.current) {
            engineRef.current.resize(window.innerWidth, window.innerHeight);
            // We need to re-apply the scale to the context after resize clears it
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use ref to ensure we don't accidentally create multiple engines
    if (!engineRef.current) {
        engineRef.current = new GameEngine(
            ctx, 
            window.innerWidth, 
            window.innerHeight, 
            onGameOver, 
            setHudData,
            loadout
        );
        // Apply initial scale
        const dpr = window.devicePixelRatio || 1;
        ctx.scale(dpr, dpr);
        
        engineRef.current.start();
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [gameState, onGameOver, loadout]);

  if (gameState !== GameState.PLAYING) return null;

  const hpPercent = (hudData.health / hudData.maxHealth) * 100;
  
  const minutes = Math.floor(hudData.matchCountdown / 60);
  const seconds = hudData.matchCountdown % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const dashReady = hudData.dashCooldown <= 0;
  const dashPercent = Math.max(0, 100 - (hudData.dashCooldown / DASH_COOLDOWN) * 100);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full touch-none" />
      
      {isMobile && engineRef.current && (
        <MobileControls 
            input={engineRef.current.input} 
            dashCooldown={hudData.dashCooldown}
        />
      )}

      {/* HUD Layer - TOP LEFT (Player Info) */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 font-mono text-white pointer-events-none z-40">
          <div className="flex items-center gap-2">
              <div className="w-64 h-8 bg-gray-800 border-2 border-gray-600 relative rounded overflow-hidden shadow-lg">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-700 to-blue-400 transition-all duration-300" 
                    style={{ width: `${hpPercent}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
                      HP: {Math.max(0, Math.floor(hudData.health))} / {Math.floor(hudData.maxHealth)}
                  </span>
              </div>
          </div>
          
          <div className="flex gap-4">
              <div className="text-gray-300 text-sm bg-black/40 px-2 py-1 rounded w-fit border border-gray-700">
                  TIME: {hudData.timer}s
              </div>
              
              {/* Dash Status */}
              <div className={`text-sm px-2 py-1 rounded w-fit border transition-colors flex items-center gap-2 ${dashReady ? 'bg-yellow-900/40 border-yellow-600 text-yellow-500' : 'bg-gray-900/40 border-gray-700 text-gray-500'}`}>
                  <span className="font-bold text-[10px]">DASH [SHIFT/R]</span>
                  <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                       <div 
                          className={`h-full ${dashReady ? 'bg-yellow-500' : 'bg-gray-600'}`} 
                          style={{ width: `${dashPercent}%` }}
                       />
                  </div>
              </div>
          </div>
      </div>

      {/* HUD Layer - TOP RIGHT (Match Timer) */}
      <div className="absolute top-4 right-4 z-40 pointer-events-none flex flex-col items-end gap-1">
          <div className={`px-4 py-2 rounded-lg border-2 shadow-xl backdrop-blur-sm transition-colors ${hudData.matchCountdown <= 10 ? 'bg-red-900/60 border-red-500 animate-pulse' : 'bg-black/60 border-gray-600'}`}>
              <div className="text-[10px] text-gray-400 font-bold tracking-widest text-right retro-font mb-1 uppercase">
                  {hudData.matchCountdown <= 0 ? 'SUDDEN DEATH' : 'STORM INCOMING'}
              </div>
              <div className={`text-3xl font-mono font-bold leading-none ${hudData.matchCountdown <= 10 ? 'text-red-500' : 'text-white'}`}>
                  {hudData.matchCountdown <= 0 ? '0:00' : timeString}
              </div>
          </div>
          {hudData.matchCountdown <= 0 && (
              <div className="text-red-500 font-bold text-xs uppercase animate-bounce retro-font mt-2">
                  RUN TO CENTER!
              </div>
          )}
      </div>
    </div>
  );
};

export default GameCanvas;
