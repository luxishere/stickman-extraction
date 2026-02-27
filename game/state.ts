
import { Player, Enemy, Item, Platform, Particle, ExtractionZone, Loadout, LoadoutSlot, Projectile } from '../types';
import { COLORS, PLAYER_WIDTH, PLAYER_HEIGHT, MOVE_SPEED, MAP_LEFT_LIMIT, MAP_RIGHT_LIMIT } from '../constants';

export interface WorldState {
  player: Player;
  enemies: Enemy[];
  items: Item[];
  platforms: Platform[];
  particles: Particle[];
  projectiles: Projectile[];
  extractionZone: ExtractionZone;
  gameTime: number;
  suddenDeathOffset: number;
}

export const createInitialState = (loadout: Loadout): WorldState => {
  // 1. Calculate Player Base Stats from ARMOR only
  let maxHp = 100;
  let moveSpeed = MOVE_SPEED;
  let damage = 10; // Base flat damage (unarmed)
  let attackSpeed = 1.0;

  const armorSlots: LoadoutSlot[] = ['HELMET', 'CHEST', 'LEGGINGS', 'BOOTS', 'GLOVES', 'RING'];
  
  armorSlots.forEach(slot => {
      const item = loadout[slot];
      if (item && item.stats) {
          if (item.stats.hp) maxHp += item.stats.hp;
          if (item.stats.moveSpeed) moveSpeed += item.stats.moveSpeed;
          if (item.stats.damage) damage += item.stats.damage;
          if (item.stats.attackSpeed) attackSpeed -= item.stats.attackSpeed;
      }
  });

  const baseStats = {
      moveSpeed: moveSpeed,
      attackSpeed: Math.max(0.2, attackSpeed),
      damage: damage
  };

  // 2. Determine Initial Active Weapon for Player
  let activeSlot: 'PRIMARY_WEAPON' | 'SECONDARY_WEAPON' | null = null;
  if (loadout.PRIMARY_WEAPON) activeSlot = 'PRIMARY_WEAPON';
  else if (loadout.SECONDARY_WEAPON) activeSlot = 'SECONDARY_WEAPON';

  // 3. Calculate Final Player Stats (Base + Active Weapon)
  const currentStats = { ...baseStats };
  if (activeSlot) {
      const weapon = loadout[activeSlot];
      if (weapon && weapon.stats) {
          if (weapon.stats.damage) currentStats.damage += weapon.stats.damage;
          if (weapon.stats.attackSpeed) currentStats.attackSpeed -= weapon.stats.attackSpeed;
      }
  }

  // 4. Fixed Enemy Stats (Independent of Player Equipment)
  const enemyStats = {
      moveSpeed: MOVE_SPEED * 0.9, // Slightly slower than base player
      attackSpeed: 1.0,           // Standard attack speed
      damage: 12                  // Fixed damage for "Normal" enemy
  };

  return {
    player: {
      id: 'p1',
      pos: { x: 100, y: 300 },
      vel: { x: 0, y: 0 },
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      color: COLORS.player,
      isGrounded: false,
      health: maxHp,
      maxHealth: maxHp,
      facingRight: true,
      isAttacking: false,
      attackCooldown: 0,
      inventory: [],
      name: 'Hero',
      stats: currentStats,
      baseStats: baseStats,
      loadout: loadout,
      activeSlot: activeSlot,
      chargeTime: 0,
      shotPower: 0,
      shootRequested: false,
      canDoubleJump: true,
      jumpWasDown: false,
      doubleJumpCooldown: 0,
      dashCooldown: 0,
      dashTimer: 0,
      isWallSliding: false,
      wallSlideDir: 0,
      wallSlideTimer: 0
    },
    enemies: [
      {
        id: 'boss_1',
        pos: { x: 800, y: 400 },
        vel: { x: 0, y: 0 },
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        color: COLORS.enemy,
        isGrounded: false,
        health: 120, // Fixed HP for enemy
        maxHealth: 120,
        facingRight: false,
        type: 'chaser',
        detectionRange: 600,
        stats: enemyStats,
        isAttacking: false,
        attackCooldown: 0,
        canDoubleJump: true,
        doubleJumpCooldown: 0,
        isWallSliding: false,
        wallSlideDir: 0,
        wallSlideTimer: 0
      }
    ],
    items: [], 
    platforms: [
      // Main Floor (Shifted pit to right to avoid spawn killing)
      { x: MAP_LEFT_LIMIT, y: 600, width: 1500, height: 100, type: 'solid' }, 
      { x: 1700, y: 600, width: 1300, height: 100, type: 'solid' },

      // Obstacles and Walls
      { x: 300, y: 450, width: 200, height: 20, type: 'solid' },
      
      // The Tall Wall for Wall Jumping
      { x: 600, y: 200, width: 40, height: 400, type: 'solid' },
      
      // Floating Platforms
      { x: 800, y: 350, width: 150, height: 20, type: 'solid' },
      { x: 1200, y: 450, width: 200, height: 20, type: 'solid' },
      { x: 1500, y: 300, width: 20, height: 200, type: 'solid' }, // Another pillar
      { x: 1700, y: 200, width: 200, height: 20, type: 'solid' },
      { x: 2100, y: 400, width: 200, height: 20, type: 'solid' },
      { x: 2500, y: 300, width: 300, height: 20, type: 'solid' },
    ],
    particles: [],
    projectiles: [],
    extractionZone: {
        pos: { x: -1000, y: -1000 }, 
        width: 100,
        height: 200,
        active: false,
        timer: 0
    },
    gameTime: 0,
    suddenDeathOffset: 0
  };
};
