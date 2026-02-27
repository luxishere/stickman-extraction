
export const GRAVITY = 0.6; // Increased from 0.25
export const FRICTION = 0.85; 
export const MOVE_SPEED = 4.0; // Increased from 1.5
export const MAX_SPEED = 18; // Increased from 14
export const JUMP_FORCE = -17.0; // Increased from -11.5
export const GROUND_LEVEL = 500;
export const ATTACK_DURATION = 15; // frames
export const ATTACK_COOLDOWN = 30; // frames
export const ATTACK_RANGE = 60;
export const SCREEN_WIDTH = 1024;
export const SCREEN_HEIGHT = 768;

export const PLAYER_WIDTH = 30;
export const PLAYER_HEIGHT = 60;

export const ENEMY_SPAWN_RATE = 0.005;

export const ARROW_SPEED = 20; // Increased from 12
export const ARROW_GRAVITY = 0.25; // Increased from 0.1

export const MAX_BOW_CHARGE = 120; // Reduced from 180 (2 seconds)

export const DOUBLE_JUMP_DELAY = 15; 

export const DASH_FORCE = 25; // Increased from 18
export const DASH_DURATION = 10;
export const DASH_COOLDOWN = 180; // 3 seconds

export const MATCH_DURATION_SECONDS = 60; // 1 minute
export const SUDDEN_DEATH_WALL_SPEED = 2.0; // Increased from 1.0
export const MAP_LEFT_LIMIT = 0;
export const MAP_RIGHT_LIMIT = 3000;

// Colors
export const COLORS = {
  player: '#3b82f6', // blue-500
  playerAttack: '#ef4444', // red-500
  enemy: '#ef4444', // red-500
  ground: '#374151', // gray-700
  background: '#111827', // gray-900
  extraction: '#10b981', // green-500
  loot: '#f59e0b', // amber-500
  danger: '#dc2626', // red-600 for sudden death
};

export const RARITY_COLORS = {
  COMMON: '#9ca3af', // gray-400
  UNCOMMON: '#4ade80', // green-400
  RARE: '#60a5fa', // blue-400
  EPIC: '#a855f7', // purple-500
  LEGENDARY: '#f97316', // orange-500
};
