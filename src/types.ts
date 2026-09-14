export type EnemyType = 'squid' | 'crab' | 'octopus' | 'ufo' | 'elite_ufo' | 'armored' | 'hunter' | 'glider';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = '1p' | '2p';
export type WeaponTier = 1 | 2 | 3 | 4 | 5;
export type WeaponArchetype = 'vulcan' | 'plasma' | 'missiles' | 'laser' | 'scatter' | 'wave' | 'flamethrower' | 'lightning';

export type PowerUpType =
  | 'weapon_vulcan'
  | 'weapon_plasma'
  | 'weapon_missiles'
  | 'weapon_laser'
  | 'weapon_scatter'
  | 'weapon_wave'
  | 'weapon_flamethrower'
  | 'weapon_lightning'
  | 'mystery_weapon'
  | 'wingman_ship'
  | 'mortar_ammo'
  | 'shield_charge'
  | 'extra_life'
  | 'smart_bomb'
  | 'rapid_boost';

export interface Enemy {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: EnemyType;
  points: number;
  health: number;
  maxHealth: number;
  color: string;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  prevX?: number;
  prevY?: number;
  vx?: number;
  width: number;
  height: number;
  speedY: number;
  color: string;
  isPlayer: boolean;
  playerId?: 1 | 2;
  damage?: number;
  piercing?: boolean;
  isHoming?: boolean;
  isMothershipBomb?: boolean;
  isEmpBomb?: boolean;
  isDud?: boolean;
  isMortar?: boolean;
  targetY?: number;
  mortarRadius?: number;
  isAlienBomb?: boolean;
  bombHealth?: number;
  targetEnemyId?: number;
  trail?: { x: number; y: number }[];
}

export interface BombExplosion {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  isNuke?: boolean;
  isMothershipBlast?: boolean;
  isEmpNuke?: boolean;
  alpha: number;
  color: string;
  duration: number;
  maxDuration: number;
}

export type ParticleType = 'spark' | 'streak' | 'ember' | 'ring' | 'glow';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  endColor?: string;
  alpha: number;
  size: number;
  initialSize?: number;
  life: number;
  maxLife: number;
  type?: ParticleType;
  drag?: number;
  gravity?: number;
  trailLength?: number;
  glow?: boolean;
}

export interface BunkerBlock {
  x: number;
  y: number;
  health: number; // 0 to 3
}

export interface Bunker {
  x: number;
  y: number;
  blocks: BunkerBlock[];
}

export interface MysteryShip {
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  points: number;
  health: number;
  maxHealth: number;
  isBoss?: boolean;
  bombDropped?: boolean;
}

export interface BossEnemy {
  active: boolean;
  x: number;
  y: number;
  targetX: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  points: number;
  speed: number;
  vx: number;
  leftTurretHealth: number;
  rightTurretHealth: number;
  dropTimer: number;
  nextDropTime: number;
  evasionCooldown: number; // AI avoidance reaction timer
  evasionActive: boolean;
  evasionDir: number;
  evasionTimer: number;
  attackTimer: number;
  phase: number;
  name: string;
  shieldActive: boolean;
  shieldHealth: number;
}

export interface PowerUpItem {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  type: PowerUpType;
  label: string;
  name: string;
  color: string;
  glowColor: string;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

export interface PlayerData {
  id: 1 | 2;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  alive: boolean;
  lives: number;
  score: number;
  weaponType: WeaponArchetype;
  weaponTier: WeaponTier;
  weaponAmmo: number; // random pool between 30 and 60
  mortarAmmo: number;
  mortarChargeStart: number;
  shieldsRemaining: number;     // starts at 3
  shieldActiveUntil: number;    // timestamp ms when shield expires (3 seconds active)
  lastShot: number;
  invulnerableUntil: number;
  empDisabledUntil: number;    // disabled from firing if hit by EMP nuke
  holdShootTime: number;       // tracks duration spacebar held down to slow rate of fire
  attachedShips: {
    id: number;
    offset: -22 | 22; // left (-22) or right (+22) wingman
    alive: boolean;
  }[];
  color: string;
  label: string;
}

export interface HighScoreEntry {
  id: string;
  name: string;
  score: number;
  wave: number;
  mode: GameMode;
  difficulty: Difficulty;
  date: string;
}

export type GameState =
  | 'title'
  | 'select_difficulty'
  | 'playing'
  | 'boss_intro'
  | 'paused'
  | 'name_entry'
  | 'hall_of_fame'
  | 'game_over'
  | 'victory';
