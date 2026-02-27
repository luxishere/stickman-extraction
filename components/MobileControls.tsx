
import React, { useState, useRef } from 'react';
import { InputHandler } from '../game/Input';

interface MobileControlsProps {
  input: InputHandler;
  dashCooldown: number;
}

const MobileControls: React.FC<MobileControlsProps> = ({ input, dashCooldown }) => {
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });

  const JOYSTICK_RADIUS = 50;

  const handleJoystickStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setJoystickActive(true);
    setJoystickPos({ x: touch.clientX, y: touch.clientY });
    setKnobOffset({ x: 0, y: 0 });
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    if (!joystickActive) return;
    const touch = e.touches[0];
    const dx = touch.clientX - joystickPos.x;
    const dy = touch.clientY - joystickPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const limitedDist = Math.min(dist, JOYSTICK_RADIUS);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * limitedDist;
    const ny = Math.sin(angle) * limitedDist;

    setKnobOffset({ x: nx, y: ny });

    // Thresholds for horizontal input only
    const threshold = 15;
    input.setKey('KeyD', nx > threshold);
    input.setKey('KeyA', nx < -threshold);
  };

  const handleJoystickEnd = () => {
    setJoystickActive(false);
    setKnobOffset({ x: 0, y: 0 });
    input.setKey('KeyD', false);
    input.setKey('KeyA', false);
  };

  const handleAttackStart = () => input.setKey('Mouse0', true);
  const handleAttackEnd = () => input.setKey('Mouse0', false);

  const handleDashStart = () => {
    if (dashCooldown <= 0) {
        input.setKey('KeyR', true);
    }
  };
  const handleDashEnd = () => input.setKey('KeyR', false);

  const handleJumpStart = () => input.setKey('Space', true);
  const handleJumpEnd = () => input.setKey('Space', false);

  const [activeSlot, setActiveSlot] = useState(1);
  const handleSwap = () => {
    const nextSlot = activeSlot === 1 ? 2 : 1;
    setActiveSlot(nextSlot);
    input.setKey(`Digit${nextSlot}`, true);
    setTimeout(() => input.setKey(`Digit${nextSlot}`, false), 50);
  };

  // Convert frames to seconds with 3 decimal places for milliseconds
  const dashTimeLeft = (dashCooldown / 60).toFixed(3);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-50 overflow-hidden">
      {/* Joystick Area (Left) */}
      <div 
        className="absolute bottom-12 left-12 w-48 h-48 flex items-center justify-center pointer-events-auto"
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
      >
        <div className="w-32 h-32 rounded-full bg-white/10 border-2 border-white/20 relative">
            <div 
              className="absolute w-16 h-16 bg-white/30 rounded-full border-2 border-white/40 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
              style={{ transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)` }}
            />
        </div>
      </div>

      {/* Action Area (Right) */}
      <div className="absolute bottom-12 right-12 flex items-end gap-6 pointer-events-auto">
        <div className="flex flex-col items-center gap-4">
            <button 
              onPointerDown={handleSwap}
              className="w-16 h-16 rounded-full bg-gray-700/60 border-2 border-gray-500/50 flex items-center justify-center text-xs text-white font-bold active:bg-gray-500 shadow-lg"
            >
              SWAP
            </button>
            
            <button 
              onPointerDown={handleJumpStart}
              onPointerUp={handleJumpEnd}
              onPointerLeave={handleJumpEnd}
              className="w-20 h-20 rounded-full bg-blue-600/40 border-4 border-blue-400/40 flex items-center justify-center active:bg-blue-500 active:scale-95 transition-all shadow-xl"
            >
              <div className="text-white font-bold text-sm retro-font">UP</div>
            </button>
        </div>
        
        <div className="flex flex-col items-center gap-4">
            <div className="relative">
                <button 
                    onPointerDown={handleDashStart}
                    onPointerUp={handleDashEnd}
                    onPointerLeave={handleDashEnd}
                    disabled={dashCooldown > 0}
                    className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all shadow-xl ${
                        dashCooldown > 0 
                        ? 'bg-gray-800/80 border-gray-600/50 cursor-not-allowed' 
                        : 'bg-yellow-600/50 border-yellow-400/50 active:bg-yellow-500 active:scale-95'
                    }`}
                >
                    {dashCooldown > 0 ? (
                        <div className="text-white font-bold text-xs font-mono leading-none tracking-tighter">
                            {dashTimeLeft}s
                        </div>
                    ) : (
                        <div className="text-white font-bold text-xs retro-font">DASH</div>
                    )}
                </button>
                {dashCooldown > 0 && (
                     <div 
                        className="absolute inset-1 rounded-full border-2 border-white/10 pointer-events-none overflow-hidden"
                     >
                        <div 
                            className="absolute bottom-0 left-0 right-0 bg-white/10 transition-all duration-100"
                            style={{ height: `${(dashCooldown / 300) * 100}%` }}
                        />
                     </div>
                )}
            </div>

            <div className="relative w-32 h-32">
                <button 
                  onPointerDown={handleAttackStart}
                  onPointerUp={handleAttackEnd}
                  onPointerLeave={handleAttackEnd}
                  className="w-full h-full rounded-full bg-red-600/50 border-4 border-red-400/50 flex items-center justify-center active:bg-red-500 active:scale-95 transition-all shadow-xl"
                >
                  <div className="text-white font-black text-xl retro-font drop-shadow-lg">ATK</div>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MobileControls;
