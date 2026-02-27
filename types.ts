
export enum GameState {
  MENU,
  PLAYING,
  EXTRACTED,
  DIED
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Vector2;
  vel: Vector2;
  width: number;
  height: number;
  color: string;
  isGrounded: boolean;
  health: number;
  maxHealth: number;
  facingRight: boolean;
}

export interface Projectile {
  id: string;
  pos: Vector2;
  vel: Vector2;
  width: number;
  height: number;
  damage: number;
  color: string;
  life: number;
  ownerId: string; // 'player' or enemy id
}

export interface ItemStats {
  hp?: number;
  damage?: number;
  moveSpeed?: number;
  attackSpeed?: number;
}

export type ItemCategory = 'HELMET' | 'CHEST' | 'LEGGINGS' | 'BOOTS' | 'GLOVES' | 'RING' | 'WEAPON';
export type WeaponType = 'SWORD' | 'BOW';
export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface Item {
  id: string;
  type: 'loot' | 'equipment';
  category?: ItemCategory;
  weaponType?: WeaponType;
  rarity?: ItemRarity;
  name: string;
  value: number;
  pos: Vector2;
  collected: boolean;
  stats?: ItemStats;
}

export interface PlayerStats {
  moveSpeed: number;
  attackSpeed: number; // Attack cooldown multiplier (lower is faster)
  damage: number;      // Flat damage per hit
}

export type LoadoutSlot = 'HELMET' | 'CHEST' | 'LEGGINGS' | 'BOOTS' | 'GLOVES' | 'RING' | 'PRIMARY_WEAPON' | 'SECONDARY_WEAPON';

export type Loadout = Record<LoadoutSlot, Item | null>;

export interface Player extends Entity {
  isAttacking: boolean;
  attackCooldown: number;
  inventory: Item[];
  name: string;
  
  // Stats
  stats: PlayerStats;      // Current active stats
  baseStats: PlayerStats;  // Stats from armor only (no weapons)
  
  // Weapon State
  loadout: Loadout;
  activeSlot: 'PRIMARY_WEAPON' | 'SECONDARY_WEAPON' | null;
  
  // Bow Mechanics
  chargeTime: number;
  shotPower: number; // Normalized power (0.25 to 1.0)
  shootRequested: boolean;

  // Jump Mechanics
  canDoubleJump: boolean;
  jumpWasDown: boolean;
  doubleJumpCooldown: number;

  // Wall Jump Mechanics
  isWallSliding: boolean;
  wallSlideDir: number; // 1 for right wall, -1 for left wall
  wallSlideTimer: number;

  // Dash Mechanics
  dashCooldown: number;
  dashTimer: number;
}

export interface Enemy extends Entity {
  type: 'patrol' | 'chaser' | 'ranger';
  detectionRange: number;
  stats: PlayerStats; // Enemy now shares the same stat structure
  isAttacking: boolean;
  attackCooldown: number;
  loadout: Loadout; // Enemies now have gear

  // Jump Mechanics
  canDoubleJump: boolean;
  doubleJumpCooldown: number;

  // Wall Jump Mechanics
  isWallSliding: boolean;
  wallSlideDir: number;
  wallSlideTimer: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'solid' | 'oneway';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface ExtractionZone {
  pos: Vector2;
  width: number;
  height: number;
  active: boolean;
  timer: number;
}
