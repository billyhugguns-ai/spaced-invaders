import React, { useEffect, useRef, useState, useCallback } from 'react';
import { soundManager } from '../utils/audio';
import {
  SQUID_SPRITE,
  CRAB_SPRITE,
  OCTOPUS_SPRITE,
  UFO_SPRITE,
  MOTHERSHIP_SPRITE,
  PLAYER_P1_SPRITE,
  PLAYER_P2_SPRITE,
  BOSS_DREADNOUGHT_SPRITE,
  ARMORED_SPRITE,
  HUNTER_SPRITE,
  GLIDER_SPRITE,
  drawPixelPattern,
  drawPowerUpCapsule,
  drawMissile,
} from '../utils/sprites';
import {
  Enemy,
  EnemyType,
  Bullet,
  Particle,
  Bunker,
  MysteryShip,
  BossEnemy,
  PowerUpItem,
  PowerUpType,
  FloatingText,
  GameState,
  Difficulty,
  GameMode,
  WeaponTier,
  WeaponArchetype,
  PlayerData,
  HighScoreEntry,
  BombExplosion,
} from '../types';
import {
  loadHallOfFame,
  checkQualifiesForHallOfFame,
  addHallOfFameScore,
} from '../utils/highScores';
import { HallOfFameModal } from './HallOfFameModal';
import { Trophy, Bot, Crosshair, Maximize2, Minimize2, Lock, KeyRound } from 'lucide-react';

const VIRTUAL_WIDTH = 800;
const VIRTUAL_HEIGHT = 600;

// Player ship size reduced by 50%: 24px width, 14px height
const SHIP_WIDTH = 24;
const SHIP_HEIGHT = 14;

export function SpaceInvadersGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const target = containerRef.current || document.documentElement;
        if (target.requestFullscreen) {
          await target.requestFullscreen();
        } else if ((target as any).webkitRequestFullscreen) {
          await (target as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  // Hall of Fame and High Score state
  const [hallOfFame, setHallOfFame] = useState<HighScoreEntry[]>(loadHallOfFame);
  const [showHallOfFameModal, setShowHallOfFameModal] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    const hof = loadHallOfFame();
    return hof.length > 0 ? hof[0].score : 0;
  });

  // Name Entry state for qualifying pilots
  const [initialsInput, setInitialsInput] = useState('AAA');
  const [qualifyingPlayer, setQualifyingPlayer] = useState<{
    id: 1 | 2;
    score: number;
    wave: number;
  } | null>(null);

  const [gameState, setGameState] = useState<GameState>('title');
  const [gameMode, setGameMode] = useState<GameMode>('1p');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [credits, setCredits] = useState(2);
  const [wave, setWave] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [scanlines, setScanlines] = useState(true);
  const [coinAnim, setCoinAnim] = useState(false);
  const [bossActive, setBossActive] = useState(false);

  // Reactive player info for HUD
  const [p1State, setP1State] = useState<{
    score: number;
    lives: number;
    weaponTier: WeaponTier;
    weaponType: WeaponArchetype;
    weaponAmmo: number;
    mortarAmmo: number;
    shields: number;
    shieldActive: boolean;
    alive: boolean;
  }>({
    score: 0,
    lives: 3,
    weaponTier: 1,
    weaponType: 'vulcan',
    weaponAmmo: 0,
    mortarAmmo: 3,
    shields: 3,
    shieldActive: false,
    alive: true,
  });

  const [p2State, setP2State] = useState<{
    score: number;
    lives: number;
    weaponTier: WeaponTier;
    weaponType: WeaponArchetype;
    weaponAmmo: number;
    mortarAmmo: number;
    shields: number;
    shieldActive: boolean;
    alive: boolean;
  }>({
    score: 0,
    lives: 3,
    weaponTier: 1,
    weaponType: 'vulcan',
    weaponAmmo: 0,
    mortarAmmo: 3,
    shields: 3,
    shieldActive: false,
    alive: true,
  });

  const [autoPlay, setAutoPlay] = useState(false);
  const [autoPlayDebug, setAutoPlayDebug] = useState(true);
  const [showAutoPlayPasswordModal, setShowAutoPlayPasswordModal] = useState(false);
  const [autoPlayPasswordInput, setAutoPlayPasswordInput] = useState('');
  const [autoPlayPasswordError, setAutoPlayPasswordError] = useState(false);
  const [isAutoPlayUnlocked, setIsAutoPlayUnlocked] = useState(false);

  // Handle password unlock for Auto-Play Bot (Password: wolf)
  const handleAutoPlayClick = () => {
    if (autoPlay) {
      // If already running, allow turning off directly
      setAutoPlay(false);
      stateRef.current.autoPlay = false;
      return;
    }

    if (isAutoPlayUnlocked) {
      // Already verified password during this session
      setAutoPlay(true);
      stateRef.current.autoPlay = true;
    } else {
      // Prompt for password
      setAutoPlayPasswordInput('');
      setAutoPlayPasswordError(false);
      setShowAutoPlayPasswordModal(true);
    }
  };

  const handleVerifyPassword = () => {
    if (autoPlayPasswordInput.trim().toLowerCase() === 'wolf') {
      setIsAutoPlayUnlocked(true);
      setShowAutoPlayPasswordModal(false);
      setAutoPlay(true);
      stateRef.current.autoPlay = true;
      setAutoPlayPasswordError(false);
    } else {
      setAutoPlayPasswordError(true);
    }
  };

  // Mutable reference for 60FPS animation loop
  const stateRef = useRef({
    gameState: 'title' as GameState,
    gameMode: '1p' as GameMode,
    difficulty: 'medium' as Difficulty,
    credits: 2,
    highScore: 0,
    wave: 1,
    baseLives: 3,
    maxLives: 5,
    keys: {
      p1Left: false,
      p1Right: false,
      p1Shoot: false,
      p1Shield: false,
      p1Bomb: false,
      p1Mortar: false,
      p2Left: false,
      p2Right: false,
      p2Shoot: false,
      p2Shield: false,
    },
    p1: {
      id: 1 as const,
      x: 350,
      y: 545,
      width: SHIP_WIDTH,
      height: SHIP_HEIGHT,
      speed: 6.8,
      alive: true,
      lives: 3,
      score: 0,
      weaponType: 'vulcan' as WeaponArchetype,
      weaponTier: 1 as WeaponTier,
      weaponAmmo: 0,
      mortarAmmo: 3, // starts with 3 mortars!
      mortarChargeStart: 0,
      shieldsRemaining: 3,
      shieldActiveUntil: 0,
      lastShot: 0,
      invulnerableUntil: 0,
      color: '#22c55e',
      label: '1P',
    } as PlayerData,
    p2: {
      id: 2 as const,
      x: 420,
      y: 545,
      width: SHIP_WIDTH,
      height: SHIP_HEIGHT,
      speed: 6.8,
      alive: true,
      lives: 3,
      score: 0,
      weaponType: 'vulcan' as WeaponArchetype,
      weaponTier: 1 as WeaponTier,
      weaponAmmo: 0,
      mortarAmmo: 3,
      mortarChargeStart: 0,
      shieldsRemaining: 3,
      shieldActiveUntil: 0,
      lastShot: 0,
      invulnerableUntil: 0,
      color: '#06b6d4',
      label: '2P',
    } as PlayerData,
    fleet: {
      direction: 1,
      stepTimer: 0,
      stepInterval: 800,
      animFrame: 0,
      dropPending: false,
      lastEnemyShotTime: 0,
    },
    boss: {
      active: false,
      x: 350,
      y: 80,
      targetX: 350,
      width: 88,
      height: 32,
      health: 30,
      maxHealth: 30,
      points: 2500,
      speed: 2.2,
      vx: 2.2,
      evasionCooldown: 0,
      evasionActive: false,
      evasionDir: 1,
      evasionTimer: 0,
      attackTimer: 0,
      phase: 1,
      name: 'DREADNOUGHT OVERLORD',
      shieldActive: false,
      shieldHealth: 0,
    } as BossEnemy,
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    particles: [] as Particle[],
    powerUps: [] as PowerUpItem[],
    bombExplosions: [] as BombExplosion[],
    screenFlash: null as { color: string; alpha: number; duration: number; maxDuration: number } | null,
    bunkers: [] as Bunker[],
    mysteryShip: {
      active: false,
      x: -80,
      y: 44,
      width: 56,
      height: 24,
      speed: 2.2,
      points: 200,
      health: 2,
      maxHealth: 2,
      isBoss: false,
      bombDropped: false,
    } as MysteryShip,
    floatingTexts: [] as FloatingText[],
    stars: [] as { x: number; y: number; size: number; alpha: number; speed: number }[],
    mysteryShipTimer: 0,
    nextMysteryTime: 12000,
    bulletIdCounter: 0,
    powerUpIdCounter: 0,
    floatingIdCounter: 0,
    combo: 0,
    lastHitTime: 0,
    shakeDuration: 0,
    shakeIntensity: 0,
    warningBanner: false,
    warningText: '',
    warningTimer: 0,
    autoPlay: false,
    autoPlayDebug: true,
    botState: {
      strafeDir: 1 as 1 | -1,
      strafeTimer: 0,
      strafeDuration: 800,
      targetLead: 0,
      lastDodgeTime: 0,
      flankMode: false,
      burstTimer: 0,
    },
  });

  // Sync settings with ref
  useEffect(() => {
    stateRef.current.highScore = highScore;
  }, [highScore]);

  useEffect(() => {
    stateRef.current.difficulty = difficulty;
  }, [difficulty]);

  useEffect(() => {
    stateRef.current.gameMode = gameMode;
  }, [gameMode]);

  useEffect(() => {
    stateRef.current.credits = credits;
  }, [credits]);

  useEffect(() => {
    stateRef.current.autoPlay = autoPlay;
  }, [autoPlay]);

  useEffect(() => {
    stateRef.current.autoPlayDebug = autoPlayDebug;
  }, [autoPlayDebug]);

  // Initialize stars once
  useEffect(() => {
    const stars = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * VIRTUAL_WIDTH,
        y: Math.random() * VIRTUAL_HEIGHT,
        size: Math.random() > 0.8 ? 2.5 : Math.random() > 0.5 ? 1.5 : 1,
        alpha: 0.2 + Math.random() * 0.7,
        speed: 0.15 + Math.random() * 0.4,
      });
    }
    stateRef.current.stars = stars;
  }, []);

  // Screen shake helper
  const triggerScreenShake = (intensity = 6, duration = 300) => {
    stateRef.current.shakeIntensity = intensity;
    stateRef.current.shakeDuration = duration;
  };

  // Bunker generator
  const createBunkers = useCallback((): Bunker[] => {
    const bunkers: Bunker[] = [];
    const bunkerCount = 4;
    const bunkerWidth = 64;
    const bunkerHeight = 44;
    const totalSpan = VIRTUAL_WIDTH - 160;
    const spacing = totalSpan / (bunkerCount - 1);

    for (let i = 0; i < bunkerCount; i++) {
      const bx = 80 + i * spacing - bunkerWidth / 2;
      const by = 460;
      const blocks = [];

      const cols = 8;
      const rows = 6;
      const bw = bunkerWidth / cols;
      const bh = bunkerHeight / rows;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r >= 4 && (c === 3 || c === 4)) continue;
          if (r === 0 && (c === 0 || c === cols - 1)) continue;

          blocks.push({
            x: bx + c * bw,
            y: by + r * bh,
            health: 3,
          });
        }
      }

      bunkers.push({ x: bx, y: by, blocks });
    }
    return bunkers;
  }, []);

  // Particle Palette generator for vibrant colorful sparks
  const getSparkPalette = (baseColor: string): { colors: string[]; coreColor: string } => {
    const c = baseColor.toLowerCase();
    if (c.includes('38bdf8') || c.includes('cyan') || c.includes('blue')) {
      return {
        colors: ['#ffffff', '#e0f2fe', '#38bdf8', '#06b6d4', '#0284c7', '#67e8f9', '#fef08a'],
        coreColor: '#38bdf8',
      };
    } else if (c.includes('a855f7') || c.includes('purple') || c.includes('violet') || c.includes('c084fc')) {
      return {
        colors: ['#ffffff', '#f3e8ff', '#c084fc', '#a855f7', '#7c3aed', '#e879f9', '#fef08a'],
        coreColor: '#c084fc',
      };
    } else if (
      c.includes('22c55e') ||
      c.includes('10b981') ||
      c.includes('green') ||
      c.includes('emerald') ||
      c.includes('16a34a')
    ) {
      return {
        colors: ['#ffffff', '#dcfce7', '#4ade80', '#22c55e', '#10b981', '#a3e635', '#fef08a'],
        coreColor: '#4ade80',
      };
    } else if (
      c.includes('f43f5e') ||
      c.includes('ec4899') ||
      c.includes('pink') ||
      c.includes('rose') ||
      c.includes('red') ||
      c.includes('ef4444')
    ) {
      return {
        colors: ['#ffffff', '#ffe4e6', '#fb7185', '#f43f5e', '#ec4899', '#f59e0b', '#fef08a'],
        coreColor: '#fb7185',
      };
    } else if (
      c.includes('f59e0b') ||
      c.includes('amber') ||
      c.includes('yellow') ||
      c.includes('orange') ||
      c.includes('fbbf24')
    ) {
      return {
        colors: ['#ffffff', '#fef3c7', '#fde047', '#f59e0b', '#f97316', '#ef4444'],
        coreColor: '#fbbf24',
      };
    }
    return {
      colors: ['#ffffff', '#fef08a', baseColor, '#38bdf8', '#ec4899', '#f59e0b'],
      coreColor: baseColor,
    };
  };

  // Dedicated Enemy Destruction Particle System (colorful fading sparks, streaks, expanding rings & glow)
  const spawnEnemyDestructionSparks = (
    x: number,
    y: number,
    baseColor: string,
    intensity = 1.0,
    _enemyType?: string
  ) => {
    const s = stateRef.current;
    const palette = getSparkPalette(baseColor);
    const colors = palette.colors;

    // 1. High-velocity directional spark streaks radiating outward
    const streakCount = Math.floor((14 + Math.random() * 8) * intensity);
    for (let i = 0; i < streakCount; i++) {
      const angle = (i / streakCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const speed = 3.6 + Math.random() * 4.8 * (intensity > 1.5 ? 1.35 : 1.0);
      const color = colors[Math.floor(Math.random() * colors.length)];
      s.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 1,
        size: 1.5 + Math.random() * 1.5,
        life: 0,
        maxLife: Math.floor(18 + Math.random() * 14),
        type: 'streak',
        drag: 0.94 + Math.random() * 0.03,
        gravity: 0.03 + Math.random() * 0.04,
        trailLength: 3.5 + Math.random() * 3.5,
      });
    }

    // 2. Fading, glowing radial spark embers
    const emberCount = Math.floor((18 + Math.random() * 10) * intensity);
    for (let i = 0; i < emberCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 3.8;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const initSize = 2.5 + Math.random() * 3.0;
      s.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        alpha: 1,
        size: initSize,
        initialSize: initSize,
        life: 0,
        maxLife: Math.floor(22 + Math.random() * 18),
        type: 'spark',
        drag: 0.95,
        gravity: 0.04,
        glow: true,
      });
    }

    // 3. Expanding shockwave energy ring
    s.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      color: palette.coreColor,
      alpha: 0.9,
      size: 26 * (intensity > 1.5 ? Math.min(3.2, intensity * 0.8) : 1),
      initialSize: 2,
      life: 0,
      maxLife: 16,
      type: 'ring',
    });

    // 4. Central brilliant flash pop
    s.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      color: palette.coreColor,
      alpha: 0.95,
      size: 14 * Math.min(2.5, intensity),
      initialSize: 14,
      life: 0,
      maxLife: 8,
      type: 'glow',
    });
  };

  // General explosion helper (with colorful sparks)
  const spawnExplosion = (x: number, y: number, color: string, count = 16) => {
    const s = stateRef.current;
    const palette = getSparkPalette(color);
    const colors = palette.colors;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 3.8;
      const isStreak = Math.random() < 0.35;
      const chosenColor = colors[Math.floor(Math.random() * colors.length)];
      const initSize = Math.random() * 2.8 + 1.2;
      s.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: chosenColor,
        alpha: 1,
        size: initSize,
        initialSize: initSize,
        life: 0,
        maxLife: 18 + Math.random() * 16,
        type: isStreak ? 'streak' : 'spark',
        drag: 0.96,
        gravity: 0.04,
        trailLength: isStreak ? 3.0 : undefined,
        glow: true,
      });
    }
  };

  // Continuous Swept AABB Bullet Hit Detection Helper
  const checkBulletHit = (
    b: Bullet,
    targetX: number,
    targetY: number,
    targetW: number,
    targetH: number,
    hitTolerance = 2
  ) => {
    const halfW = (b.width || 4) / 2;
    const bLeft = Math.min(b.x, b.prevX ?? b.x) - halfW;
    const bRight = Math.max(b.x, b.prevX ?? b.x) + halfW;
    const bTop = Math.min(b.y, b.prevY ?? b.y);
    const bBottom = Math.max(b.y + (b.height || 10), (b.prevY ?? b.y) + (b.height || 10));

    const tLeft = targetX - hitTolerance;
    const tRight = targetX + targetW + hitTolerance;
    const tTop = targetY - hitTolerance;
    const tBottom = targetY + targetH + hitTolerance;

    return bRight >= tLeft && bLeft <= tRight && bBottom >= tTop && bTop <= tBottom;
  };

  // Bunker degradation helper: Home base defenses degrade at the same ratio that player weapon increases
  const degradeHomeBunkers = (damageBlocksCount = 4) => {
    const s = stateRef.current;
    const livingBlocks: { block: { health: number; x: number; y: number } }[] = [];
    for (const bunker of s.bunkers) {
      for (const block of bunker.blocks) {
        if (block.health > 0) {
          livingBlocks.push({ block });
        }
      }
    }

    if (livingBlocks.length === 0) return;

    // Shuffle and damage blocks
    const toDamage = Math.min(livingBlocks.length, damageBlocksCount);
    for (let i = 0; i < toDamage; i++) {
      const randIdx = Math.floor(Math.random() * livingBlocks.length);
      const chosen = livingBlocks.splice(randIdx, 1)[0];
      chosen.block.health = Math.max(0, chosen.block.health - 2);
      spawnExplosion(chosen.block.x + 4, chosen.block.y + 3, '#ef4444', 4);
    }

    triggerScreenShake(4, 250);
    s.floatingIdCounter++;
    s.floatingTexts.push({
      id: s.floatingIdCounter,
      x: VIRTUAL_WIDTH / 2,
      y: 445,
      text: `⚡ DEFENSE RETROFIT: BASE DEGRADED (-${toDamage} BLOCKS)`,
      color: '#f87171',
      alpha: 1,
      vy: -0.6,
    });
  };

  // Helper to destroy mystery ship and award points + drops
  const destroyMysteryShip = (scoringPlayer: PlayerData) => {
    const s = stateRef.current;
    if (!s.mysteryShip.active) return;
    s.mysteryShip.active = false;
    s.mysteryShipTimer = 0;
    s.nextMysteryTime = 16000 + Math.random() * 15000;

    scoringPlayer.score += s.mysteryShip.points;
    triggerScreenShake(8, 400);
    soundManager.playAlienExplosion();
    spawnEnemyDestructionSparks(
      s.mysteryShip.x + s.mysteryShip.width / 2,
      s.mysteryShip.y + s.mysteryShip.height / 2,
      '#f43f5e',
      2.8,
      'mothership'
    );

    s.floatingIdCounter++;
    s.floatingTexts.push({
      id: s.floatingIdCounter,
      x: s.mysteryShip.x + 10,
      y: s.mysteryShip.y,
      text: `+${s.mysteryShip.points} (${scoringPlayer.label})`,
      color: '#f43f5e',
      alpha: 1,
      vy: -0.9,
    });

    const roll = Math.random();
    let pType: PowerUpType;
    let label = 'W';
    let name = 'Weapon';
    let color = '#38bdf8';
    let glowColor = 'rgba(56, 189, 248, 0.9)';

    if (roll < 0.04) {
      pType = 'extra_life';
      label = '❤️1UP';
      name = '+1 Life';
      color = '#f43f5e';
      glowColor = 'rgba(244, 63, 94, 0.95)';
    } else if (roll < 0.2) {
      pType = 'shield_charge';
      label = '🛡️+1';
      name = '+1 Shield';
      color = '#a855f7';
      glowColor = 'rgba(168, 85, 247, 0.95)';
    } else if (roll < 0.45) {
      pType = 'mortar_ammo';
      label = '💣MTR';
      name = '+3 Mortar Shells';
      color = '#ea580c';
      glowColor = 'rgba(234, 88, 12, 0.95)';
    } else {
      const weaponTypes: WeaponArchetype[] = ['vulcan', 'plasma', 'missiles', 'laser', 'scatter', 'wave'];
      const chosenWeapon = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];

      if (chosenWeapon === 'vulcan') {
        pType = 'weapon_vulcan';
        label = '⚡V';
        name = 'Vulcan Rapid';
        color = '#38bdf8';
        glowColor = 'rgba(56, 189, 248, 0.9)';
      } else if (chosenWeapon === 'plasma') {
        pType = 'weapon_plasma';
        label = '⚡P';
        name = 'Plasma Piercer';
        color = '#f43f5e';
        glowColor = 'rgba(244, 63, 94, 0.9)';
      } else if (chosenWeapon === 'missiles') {
        pType = 'weapon_missiles';
        label = '🚀M';
        name = 'Homing Missiles';
        color = '#f59e0b';
        glowColor = 'rgba(245, 158, 11, 0.9)';
      } else if (chosenWeapon === 'scatter') {
        pType = 'weapon_scatter';
        label = '💥S';
        name = 'Scatter Flak';
        color = '#eab308';
        glowColor = 'rgba(234, 179, 8, 0.9)';
      } else if (chosenWeapon === 'wave') {
        pType = 'weapon_wave';
        label = '〰W';
        name = 'Sonic Wave';
        color = '#10b981';
        glowColor = 'rgba(16, 185, 129, 0.9)';
      } else {
        pType = 'weapon_laser';
        label = '⚡L';
        name = 'Rail Laser';
        color = '#c084fc';
        glowColor = 'rgba(192, 132, 252, 0.9)';
      }
    }

    s.powerUpIdCounter++;
    s.powerUps.push({
      id: s.powerUpIdCounter,
      x: s.mysteryShip.x + s.mysteryShip.width / 2,
      y: s.mysteryShip.y + s.mysteryShip.height,
      width: 28,
      height: 22,
      vy: 1.5,
      type: pType,
      label,
      name,
      color,
      glowColor,
    });
  };

  // Spawn enemy fleet or Boss according to wave
  const spawnFleet = useCallback((waveNum: number, diff: Difficulty) => {
    const s = stateRef.current;
    s.bullets = [];

    // Boss Level check: Every 5th wave is a Boss Encounter with AI Avoidance routine!
    const isBossWave = waveNum % 5 === 0;

    if (isBossWave) {
      // Initialize Dreadnought Boss
      const bossHp = (diff === 'hard' ? 55 : diff === 'medium' ? 38 : 26) + (Math.floor(waveNum / 5) - 1) * 15;
      s.boss = {
        active: true,
        x: VIRTUAL_WIDTH / 2 - 44,
        y: 80,
        targetX: VIRTUAL_WIDTH / 2 - 44,
        width: 88,
        height: 32,
        health: bossHp,
        maxHealth: bossHp,
        points: 2500 + waveNum * 200,
        speed: 2.2 + Math.min(1.2, waveNum * 0.2),
        vx: 2.2,
        evasionCooldown: 0,
        evasionActive: false,
        evasionDir: 1,
        evasionTimer: 0,
        attackTimer: 0,
        phase: 1,
        name: `DREADNOUGHT MK-${Math.floor(waveNum / 3)}`,
        shieldActive: false,
        shieldHealth: 0,
        leftTurretHealth: 10,
        rightTurretHealth: 10,
        dropTimer: 0,
        nextDropTime: 30000 + Math.random() * 30000,
      };
      s.enemies = [];
      setBossActive(true);

      s.warningBanner = true;
      s.warningText = `⚠ BOSS LEVEL ${waveNum}: ${s.boss.name} ⚠`;
      s.warningTimer = 3000;
      soundManager.playBossWarning();
      triggerScreenShake(8, 600);
      return;
    }

    // Normal Fleet
    s.boss.active = false;
    setBossActive(false);

    const enemies: Enemy[] = [];
    const rows = 5;
    const cols = 11;
    const spacingX = 48;
    const spacingY = 36;
    const startX = (VIRTUAL_WIDTH - cols * spacingX) / 2 + 10;
    // Keep fleet well clear of the bottom: starts high up and gently advances by wave
    const startY = Math.min(68 + (waveNum - 1) * 8, 115);

    let id = 0;
    for (let r = 0; r < rows; r++) {
      let type: EnemyType = 'octopus';
      let points = 10;
      let color = '#22c55e'; // Green

      if (r === 0) {
        type = 'squid';
        points = 30;
        color = '#c084fc'; // Purple
      } else if (r === 1 || r === 2) {
        type = 'crab';
        points = 20;
        color = '#38bdf8'; // Sky blue
      }

      const health = diff === 'hard' && r === 0 ? 2 : 1;

      for (let c = 0; c < cols; c++) {
        let actualType = type;
        let actualPoints = points;
        let actualColor = color;
        let actualHealth = health;

        if (waveNum > 1 && Math.random() < Math.min(0.3, 0.05 + waveNum * 0.02)) {
          const rType = Math.random();
          if (rType < 0.33) {
            actualType = 'armored';
            actualPoints = 40;
            actualColor = '#94a3b8'; // Slate
            actualHealth = 2 + Math.floor(waveNum / 5);
          } else if (rType < 0.66) {
            actualType = 'hunter';
            actualPoints = 35;
            actualColor = '#ef4444'; // Red
          } else {
            actualType = 'glider';
            actualPoints = 25;
            actualColor = '#fcd34d'; // Yellow
          }
        }

        // Alien Health Scaling: "higher lvl aliens from lvl 3 onwards start to be able to take more damage"
        if (waveNum >= 3) {
          // Additional HP bonus based on wave progress for tier rows (squids, crabs, armored, hunters)
          const tierBonus = r === 0 ? Math.floor((waveNum - 1) / 2) : r <= 2 ? Math.floor((waveNum - 2) / 3) : Math.floor((waveNum - 3) / 4);
          actualHealth += tierBonus;
        }

        id++;
        enemies.push({
          id,
          x: startX + c * spacingX,
          y: startY + r * spacingY,
          width: 36,
          height: 24,
          type: actualType,
          points: actualPoints + (actualHealth > 1 ? (actualHealth - 1) * 10 : 0),
          health: actualHealth,
          maxHealth: actualHealth,
          color: actualColor,
        });
      }
    }

    s.enemies = enemies;
    s.fleet.direction = 1;
    s.fleet.dropPending = false;
    s.fleet.stepTimer = 0;

    // Difficulty baseline tempo
    let baseTempo = 850;
    if (diff === 'easy') baseTempo = 1050;
    if (diff === 'hard') baseTempo = 650;

    // Acceleration after Stage 2 increases faster!
    const stageDropFactor = waveNum >= 2 ? 80 + (waveNum - 2) * 35 : 50;
    s.fleet.stepInterval = Math.max(140, baseTempo - (waveNum - 1) * stageDropFactor);
  }, []);

  // Insert Coin action
  const insertCoin = useCallback(() => {
    soundManager.playCoinInsert();
    setCredits((prev) => {
      const next = prev + 1;
      stateRef.current.credits = next;
      return next;
    });
    setCoinAnim(true);
    setTimeout(() => setCoinAnim(false), 300);
  }, []);

  // Deploy shield for a player
  const deployShield = useCallback((playerId: 1 | 2) => {
    const s = stateRef.current;
    const player = playerId === 1 ? s.p1 : s.p2;
    const now = Date.now();

    if (!player.alive || player.lives <= 0) return;
    if (player.shieldsRemaining <= 0) return;
    if (player.shieldActiveUntil > now) return; // already active

    player.shieldsRemaining -= 1;
    player.shieldActiveUntil = now + 3000; // 3 seconds shield duration
    soundManager.playShieldActivate();
    triggerScreenShake(3, 150);

    s.floatingIdCounter++;
    s.floatingTexts.push({
      id: s.floatingIdCounter,
      x: player.x - 10,
      y: player.y - 18,
      text: `${player.label} SHIELD ACTIVE (3s)!`,
      color: '#a855f7',
      alpha: 1,
      vy: -0.8,
    });
  }, []);

  // Start new game
  const startGame = useCallback(() => {
    const s = stateRef.current;
    if (s.credits <= 0) {
      soundManager.playEnemyShoot();
      return;
    }

    // Deduct 1 credit for 1P, 2 credits for 2P if available, or at least 1
    setCredits((prev) => {
      const cost = s.gameMode === '2p' && prev >= 2 ? 2 : 1;
      const next = Math.max(0, prev - cost);
      s.credits = next;
      return next;
    });

    s.wave = 1;
    s.bullets = [];
    s.particles = [];
    s.powerUps = [];
    s.floatingTexts = [];
    s.combo = 0;

    let baseLives = 3;
    if (s.difficulty === 'easy') baseLives = 4;
    if (s.difficulty === 'hard') baseLives = 2;
    s.baseLives = baseLives;
    s.maxLives = baseLives + 2; // "two over max only"

    // Reset Player 1
    s.p1.score = 0;
    s.p1.lives = baseLives;
    s.p1.alive = true;
    s.p1.weaponType = 'vulcan';
    s.p1.weaponTier = 1;
    s.p1.weaponAmmo = 0;
    s.p1.shieldsRemaining = 3; // 3 shields that last 3 seconds
    s.p1.shieldActiveUntil = 0;
    s.p1.x = s.gameMode === '2p' ? 320 : VIRTUAL_WIDTH / 2 - SHIP_WIDTH / 2;
    s.p1.y = 545;
    s.p1.invulnerableUntil = Date.now() + 1500;

    // Reset Player 2
    s.p2.score = 0;
    s.p2.lives = s.gameMode === '2p' ? baseLives : 0;
    s.p2.alive = s.gameMode === '2p';
    s.p2.weaponType = 'vulcan';
    s.p2.weaponTier = 1;
    s.p2.weaponAmmo = 0;
    s.p2.shieldsRemaining = 3;
    s.p2.shieldActiveUntil = 0;
    s.p2.x = 450;
    s.p2.y = 545;
    s.p2.invulnerableUntil = Date.now() + 1500;

    s.bunkers = createBunkers();
    s.bombExplosions = [];
    s.screenFlash = null;
    s.mysteryShip.active = false;
    s.mysteryShip.bombDropped = false;
    s.mysteryShipTimer = 0;
    s.nextMysteryTime = 8000 + Math.random() * 8000;

    spawnFleet(1, s.difficulty);

    setWave(1);
    setGameState('playing');
    s.gameState = 'playing';
  }, [createBunkers, spawnFleet]);

  // Restart game
  const restartGame = useCallback(() => {
    if (stateRef.current.credits > 0) {
      startGame();
    } else {
      setGameState('title');
      stateRef.current.gameState = 'title';
    }
  }, [startGame]);

  // Toggle pause
  const togglePause = useCallback(() => {
    if (stateRef.current.gameState === 'playing') {
      stateRef.current.gameState = 'paused';
      setGameState('paused');
    } else if (stateRef.current.gameState === 'paused') {
      stateRef.current.gameState = 'playing';
      setGameState('playing');
    }
  }, []);

  // Sound toggle
  const handleToggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  // Select difficulty
  const handleSelectDifficulty = (newDiff: Difficulty) => {
    setDifficulty(newDiff);
    stateRef.current.difficulty = newDiff;
  };

  // Select game mode (1P vs 2P)
  const handleSelectGameMode = (newMode: GameMode) => {
    setGameMode(newMode);
    stateRef.current.gameMode = newMode;
  };

  // Handle Initials Submission for Hall of Fame
  const submitHallOfFameScore = useCallback(() => {
    if (!qualifyingPlayer) {
      setGameState('game_over');
      stateRef.current.gameState = 'game_over';
      return;
    }

    const updatedScores = addHallOfFameScore(
      initialsInput,
      qualifyingPlayer.score,
      qualifyingPlayer.wave,
      stateRef.current.gameMode,
      stateRef.current.difficulty
    );

    setHallOfFame(updatedScores);
    setHighScore(updatedScores[0].score);
    soundManager.playPowerUp();

    setQualifyingPlayer(null);
    setGameState('game_over');
    stateRef.current.gameState = 'game_over';
    setShowHallOfFameModal(true);
  }, [initialsInput, qualifyingPlayer]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;

      // Name entry state handling
      if (s.gameState === 'name_entry') {
        if (e.code === 'Enter') {
          submitHallOfFameScore();
          return;
        }
        if (e.code === 'Backspace') {
          setInitialsInput((prev) => prev.slice(0, -1));
          return;
        }
        if (/^[a-zA-Z0-9]$/.test(e.key)) {
          setInitialsInput((prev) => (prev.length < 8 ? (prev + e.key).toUpperCase() : prev));
          return;
        }
      }

      const capturedKeys = [
        'Space',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'KeyA',
        'KeyD',
        'KeyW',
        'KeyS',
        'Enter',
        'NumpadEnter',
        'Numpad0',
        'ShiftRight',
        'KeyP',
        'KeyR',
        'KeyC',
        'KeyB',
        'Digit1',
        'Digit2',
        'Digit3',
        'Digit5',
      ];

      if (capturedKeys.includes(e.code)) {
        if (s.gameState === 'playing' || e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyC') {
          e.preventDefault();
        }
      }

      // Coin insertion via 'C' or '5'
      if (e.code === 'KeyC' || e.code === 'Digit5') {
        insertCoin();
        return;
      }

      // Difficulty hotkeys in Title screen
      if (s.gameState === 'title') {
        if (e.code === 'Digit1') handleSelectDifficulty('easy');
        if (e.code === 'Digit2') handleSelectDifficulty('medium');
        if (e.code === 'Digit3') handleSelectDifficulty('hard');
      }

      // Player 1 Controls
      if (e.code === 'KeyA' || (s.gameMode === '1p' && e.code === 'ArrowLeft')) {
        s.keys.p1Left = true;
      } else if (e.code === 'KeyD' || (s.gameMode === '1p' && e.code === 'ArrowRight')) {
        s.keys.p1Right = true;
      } else if (e.code === 'Space' || (s.gameMode === '1p' && e.code === 'ArrowUp')) {
        if (s.gameState === 'title' || s.gameState === 'game_over') {
          startGame();
        } else if (s.gameState === 'playing') {
          s.keys.p1Shoot = true;
        }
      } else if (e.code === 'Enter') {
        deployShield(1);
      } else if (e.code === 'KeyM') {
        // Start charging mortar shell
        if (s.gameState === 'playing' && s.p1.alive && s.p1.mortarAmmo > 0 && !s.keys.p1Mortar) {
          s.keys.p1Mortar = true;
          s.p1.mortarChargeStart = Date.now();
        }
      }

      // Player 2 Controls
      if (s.gameMode === '2p') {
        if (e.code === 'ArrowLeft') {
          s.keys.p2Left = true;
        } else if (e.code === 'ArrowRight') {
          s.keys.p2Right = true;
        } else if (e.code === 'ArrowUp' || e.code === 'Numpad0' || e.code === 'ShiftRight') {
          if (s.gameState === 'playing') {
            s.keys.p2Shoot = true;
          }
        } else if (e.code === 'NumpadEnter' || e.code === 'ArrowDown') {
          deployShield(2);
        }
      }

      if (e.code === 'KeyP') {
        togglePause();
      } else if (e.code === 'KeyR') {
        if (s.gameState !== 'title') {
          restartGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      // Player 1
      if (e.code === 'KeyA' || (s.gameMode === '1p' && e.code === 'ArrowLeft')) {
        s.keys.p1Left = false;
      } else if (e.code === 'KeyD' || (s.gameMode === '1p' && e.code === 'ArrowRight')) {
        s.keys.p1Right = false;
      } else if (e.code === 'Space' || (s.gameMode === '1p' && e.code === 'ArrowUp')) {
        s.keys.p1Shoot = false;
      } else if (e.code === 'KeyM') {
        if (s.keys.p1Mortar && s.p1.mortarAmmo > 0) {
          s.keys.p1Mortar = false;
          const holdTime = Math.min(2500, Math.max(150, Date.now() - (s.p1.mortarChargeStart || Date.now())));
          s.p1.mortarAmmo -= 1;

          // The longer held, the higher (lower Y coordinate) it goes!
          // Min hold -> targetY ~ 420; Max hold (2.5s) -> targetY ~ 80
          const chargeRatio = (holdTime - 150) / 2350; // 0 to 1
          const targetY = 420 - chargeRatio * 340; // 420 down to 80

          soundManager.playMortarLaunch();
          s.bulletIdCounter++;
          s.bullets.push({
            id: s.bulletIdCounter,
            x: s.p1.x + s.p1.width / 2,
            y: s.p1.y - 6,
            width: 8,
            height: 10,
            speedY: -6.5,
            color: '#f97316',
            isPlayer: true,
            playerId: 1,
            isMortar: true,
            targetY,
            mortarRadius: 80 + chargeRatio * 80, // Dynamic blast radius: 80px up to 160px depending on charge
            damage: 6 + Math.round(chargeRatio * 6),
          });
        }
      }

      // Player 2
      if (s.gameMode === '2p') {
        if (e.code === 'ArrowLeft') {
          s.keys.p2Left = false;
        } else if (e.code === 'ArrowRight') {
          s.keys.p2Right = false;
        } else if (e.code === 'ArrowUp' || e.code === 'Numpad0' || e.code === 'ShiftRight') {
          s.keys.p2Shoot = false;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [insertCoin, startGame, restartGame, togglePause, deployShield, submitHallOfFameScore]);

  // Main 60FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let hudSyncTimer = 0;

    const loop = (time: number) => {
      const dt = Math.min(time - lastTime, 100);
      lastTime = time;

      const s = stateRef.current;

      // Update screen shake
      if (s.shakeDuration > 0) {
        s.shakeDuration -= dt;
      }

      // Combo cooldown check
      if (s.combo > 0 && time - s.lastHitTime > 2400) {
        s.combo = 0;
      }

      // ================= PLAYING STATE UPDATES =================
      if (s.gameState === 'playing') {
        // 1. Move stars
        for (const star of s.stars) {
          star.y += star.speed;
          if (star.y > VIRTUAL_HEIGHT) {
            star.y = 0;
            star.x = Math.random() * VIRTUAL_WIDTH;
          }
        }

        // Active players list
        const activePlayers = [s.p1, ...(s.gameMode === '2p' ? [s.p2] : [])].filter(
          (p) => p.alive && p.lives > 0
        );

        // Check if all players dead -> Hall of Fame qualification check!
        if (activePlayers.length === 0) {
          const candidate = s.p1.score >= s.p2.score ? s.p1 : s.p2;
          if (checkQualifiesForHallOfFame(candidate.score)) {
            s.gameState = 'name_entry';
            setGameState('name_entry');
            setQualifyingPlayer({ id: candidate.id, score: candidate.score, wave: s.wave });
            soundManager.playExtraLife();
          } else {
            s.gameState = 'game_over';
            setGameState('game_over');
            soundManager.playGameOver();
          }
        }


        // AUTO-PLAY BOT LOGIC (if enabled)
        if (s.autoPlay && s.p1.alive && s.p1.lives > 0) {
          const p1CenterX = s.p1.x + s.p1.width / 2;
          const bot = s.botState;
          bot.strafeTimer += dt;
          bot.burstTimer += dt;

          // 1. Identify incoming threats (enemy bullets heading down towards p1.x)
          const threatBullets = s.bullets.filter(
            (b) => !b.isPlayer && b.speedY > 0 && b.y > 180 && Math.abs(b.x - p1CenterX) < 65
          );

          // 2. Check bunker protection overhead:
          // Is the bot currently standing under an alive bunker block?
          // If so, shooting vulcan/plasma will destroy our own cover unless we shoot through a gap!
          let directlyUnderActiveBunker = false;
          let bunkerLeftBound = 0;
          let bunkerRightBound = 0;

          for (const bunker of s.bunkers) {
            const aliveInBunker = bunker.blocks.filter((blk) => blk.health > 0);
            if (aliveInBunker.length > 0) {
              const minBx = Math.min(...aliveInBunker.map((b) => b.x));
              const maxBx = Math.max(...aliveInBunker.map((b) => b.x + 8));
              // Player width is 24; check if center is underneath
              if (p1CenterX >= minBx - 6 && p1CenterX <= maxBx + 6) {
                directlyUnderActiveBunker = true;
                bunkerLeftBound = minBx;
                bunkerRightBound = maxBx;
                break;
              }
            }
          }

          // 3. Movement & Tactical AI Decision Matrix
          if (threatBullets.length > 0) {
            // HIGH PRIORITY: Threat evasion / juking
            const closestThreat = threatBullets.reduce((min, b) => (b.y > min.y ? b : min), threatBullets[0]);
            
            // Check if standing under bunker gives protection from this bullet
            const bulletUnderBunker = directlyUnderActiveBunker && closestThreat.y < 460;

            if (!bulletUnderBunker) {
              // Dodge direction away from bullet trajectory
              if (closestThreat.x < p1CenterX && s.p1.x < VIRTUAL_WIDTH - s.p1.width - 24) {
                s.keys.p1Right = true;
                s.keys.p1Left = false;
              } else if (closestThreat.x >= p1CenterX && s.p1.x > 24) {
                s.keys.p1Left = true;
                s.keys.p1Right = false;
              }

              // Emergency auto-shield if bullet is critically close (< 35px) and unshielded
              if (closestThreat.y > s.p1.y - 38 && s.p1.shieldsRemaining > 0 && s.p1.shieldActiveUntil < Date.now()) {
                deployShield(1);
              }
            }
          } else {
            // TACTICAL COMBAT MANEUVERS (autonomous strafing, flanking, and leading shots)
            if (bot.strafeTimer >= bot.strafeDuration) {
              bot.strafeTimer = 0;
              bot.strafeDuration = 450 + Math.random() * 650;
              // 30% chance to toggle flank mode (sweep far left or far right to hit outer edges)
              bot.flankMode = Math.random() < 0.28;
              bot.strafeDir = (bot.strafeDir === 1 ? -1 : 1) as 1 | -1;
            }

            let desiredX = p1CenterX;

            if (bot.flankMode) {
              // Flanking maneuver: sweep to screen borders to snipe edge columns and UFOs
              desiredX = bot.strafeDir === 1 ? VIRTUAL_WIDTH - 60 : 60;
            } else if (s.boss.active) {
              // Dynamic boss tracking with rhythmic strafe-weaving to avoid boss center cannon
              const bossCenter = s.boss.x + s.boss.width / 2;
              const strafeOffset = bot.strafeDir * (28 + Math.sin(time * 0.005) * 45);
              desiredX = bossCenter + strafeOffset;
            } else {
              // Fleet combat: prioritize dangerous lower invaders and snipe open columns
              const livingEnemies = s.enemies.filter((e) => e.health > 0);
              if (livingEnemies.length > 0) {
                // If standing under own bunker, actively step OUT of bunker shadow to shoot!
                if (directlyUnderActiveBunker) {
                  // Step either to left or right clear gap of the bunker
                  const distToLeft = Math.abs(p1CenterX - (bunkerLeftBound - 16));
                  const distToRight = Math.abs(p1CenterX - (bunkerRightBound + 16));
                  desiredX = distToLeft < distToRight ? bunkerLeftBound - 18 : bunkerRightBound + 18;
                } else {
                  // Lead target by alien fleet movement direction
                  const lowest = livingEnemies.reduce((acc, e) => (e.y > acc.y ? e : acc), livingEnemies[0]);
                  const leadPredict = s.fleet.direction * 18;
                  const microWeave = Math.sin(time * 0.008) * 14;
                  desiredX = lowest.x + lowest.width / 2 + leadPredict + microWeave;
                }
              }
            }

            // Apply movement keys with smooth thresholding
            if (Math.abs(p1CenterX - desiredX) > 7) {
              if (p1CenterX < desiredX && s.p1.x < VIRTUAL_WIDTH - s.p1.width - 24) {
                s.keys.p1Right = true;
                s.keys.p1Left = false;
              } else if (p1CenterX > desiredX && s.p1.x > 24) {
                s.keys.p1Left = true;
                s.keys.p1Right = false;
              }
            } else {
              s.keys.p1Left = false;
              s.keys.p1Right = false;
            }
          }

          // 4. SMART TRIGGER SYSTEM (Protect own defenses from self-inflicted damage!)
          // If the ship is directly under an active bunker block, HOLD FIRE unless using piercing weapon
          // or wave weapon that doesn't harm it!
          if (directlyUnderActiveBunker) {
            // DO NOT SHOOT our own defense bunker!
            s.keys.p1Shoot = false;
          } else {
            // Clear line of sight: rhythmic firing
            s.keys.p1Shoot = true;
          }

          // 5. Tactical Mortar Deployment:
          // Launch mortar when enemies are dense or boss is active, but only if clear of roof
          if (s.p1.mortarAmmo > 0 && !directlyUnderActiveBunker && Math.random() < 0.018) {
            s.p1.mortarAmmo -= 1;
            soundManager.playMortarLaunch();
            s.bulletIdCounter++;
            s.bullets.push({
              id: s.bulletIdCounter,
              x: s.p1.x + s.p1.width / 2,
              y: s.p1.y - 6,
              width: 8,
              height: 10,
              speedY: -6.5,
              color: '#f97316',
              isPlayer: true,
              playerId: 1,
              isMortar: true,
              targetY: s.boss.active ? s.boss.y + s.boss.height + 15 : 120 + Math.random() * 140,
              mortarRadius: 90,
              damage: 6,
            });
          }
        }

        // 3. Player Movement (Free move left/right anywhere on baseline, no up/down)
        if (s.p1.alive && s.p1.lives > 0) {
          if (s.keys.p1Left && s.p1.x > 16) {
            s.p1.x -= s.p1.speed;
          }
          if (s.keys.p1Right && s.p1.x < VIRTUAL_WIDTH - s.p1.width - 16) {
            s.p1.x += s.p1.speed;
          }
        }

        if (s.gameMode === '2p' && s.p2.alive && s.p2.lives > 0) {
          if (s.keys.p2Left && s.p2.x > 16) {
            s.p2.x -= s.p2.speed;
          }
          if (s.keys.p2Right && s.p2.x < VIRTUAL_WIDTH - s.p2.width - 16) {
            s.p2.x += s.p2.speed;
          }
        }

        // 4. Player Weapon Shooting System (4 archetypes + 5 tiers)
        const playersToShoot = [
          { p: s.p1, shootKey: s.keys.p1Shoot },
          ...(s.gameMode === '2p' ? [{ p: s.p2, shootKey: s.keys.p2Shoot }] : []),
        ];

        for (const { p, shootKey } of playersToShoot) {
          if (!p.alive || p.lives <= 0 || !shootKey) continue;

          const cooldownsByArchetype: Record<WeaponArchetype, number[]> = {
            vulcan: [260, 210, 170, 130, 95],
            plasma: [320, 260, 210, 160, 120],
            missiles: [360, 290, 230, 180, 130],
            laser: [280, 220, 180, 140, 100],
            scatter: [340, 280, 220, 170, 120],
            wave: [300, 240, 190, 150, 110],
          };

          const effectiveCooldown = cooldownsByArchetype[p.weaponType][p.weaponTier - 1];
          const playerBullets = s.bullets.filter((b) => b.playerId === p.id).length;
          const maxBullets = p.weaponTier >= 4 ? 8 : p.weaponTier >= 2 ? 6 : 4;

          if (time - p.lastShot > effectiveCooldown && playerBullets < maxBullets) {
            p.lastShot = time;
            soundManager.playUpgradedLaser(p.weaponTier);

            // Ammo decay logic
            if (p.weaponTier > 1) {
              p.weaponAmmo -= 1;
              if (p.weaponAmmo <= 0) {
                p.weaponTier = (p.weaponTier - 1) as WeaponTier;
                p.weaponAmmo = p.weaponTier > 1 ? 30 + Math.floor(Math.random() * 31) : 0;
                
                s.floatingIdCounter++;
                s.floatingTexts.push({
                  id: s.floatingIdCounter,
                  x: p.x - 10,
                  y: p.y - 16,
                  text: `${p.label} WEAPON DECAY: LVL ${p.weaponTier}`,
                  color: '#f97316',
                  alpha: 1,
                  vy: -0.7,
                });
              }
            }

            const px = p.x + p.width / 2;
            const py = p.y - 4;

            if (p.weaponType === 'vulcan') {
              if (p.weaponTier === 1) {
                s.bulletIdCounter++;
                s.bullets.push({
                  id: s.bulletIdCounter,
                  x: px,
                  y: py,
                  width: 3.5,
                  height: 12,
                  speedY: -9.5,
                  color: p.color,
                  isPlayer: true,
                  playerId: p.id,
                  damage: 1,
                });
              } else if (p.weaponTier === 2) {
                s.bulletIdCounter++;
                s.bullets.push({
                  id: s.bulletIdCounter,
                  x: px - 6,
                  y: py,
                  width: 3.5,
                  height: 14,
                  speedY: -10.5,
                  color: p.color,
                  isPlayer: true,
                  playerId: p.id,
                  damage: 1,
                });
                s.bulletIdCounter++;
                s.bullets.push({
                  id: s.bulletIdCounter,
                  x: px + 6,
                  y: py,
                  width: 3.5,
                  height: 14,
                  speedY: -10.5,
                  color: p.color,
                  isPlayer: true,
                  playerId: p.id,
                  damage: 1,
                });
              } else if (p.weaponTier === 3) {
                [-1.8, 0, 1.8].forEach((ang) => {
                  s.bulletIdCounter++;
                  s.bullets.push({
                    id: s.bulletIdCounter,
                    x: px + ang * 3,
                    y: py,
                    vx: ang * 1.3,
                    width: 4,
                    height: 14,
                    speedY: -11,
                    color: p.color,
                    isPlayer: true,
                    playerId: p.id,
                    damage: 1,
                  });
                });
              } else if (p.weaponTier === 4) {
                [-3, -1, 1, 3].forEach((ang) => {
                  s.bulletIdCounter++;
                  s.bullets.push({
                    id: s.bulletIdCounter,
                    x: px + ang * 3,
                    y: py,
                    vx: ang * 1.1,
                    width: 4.5,
                    height: 16,
                    speedY: -12,
                    color: '#c084fc',
                    isPlayer: true,
                    playerId: p.id,
                    damage: 2,
                    piercing: true,
                  });
                });
              } else {
                [-4, -2, 0, 2, 4].forEach((ang) => {
                  s.bulletIdCounter++;
                  s.bullets.push({
                    id: s.bulletIdCounter,
                    x: px + ang * 3,
                    y: py,
                    vx: ang * 1.2,
                    width: 5,
                    height: 18,
                    speedY: -13,
                    color: '#fbbf24',
                    isPlayer: true,
                    playerId: p.id,
                    damage: 2,
                    piercing: true,
                  });
                });
              }
            } else if (p.weaponType === 'plasma') {
              const count = p.weaponTier >= 4 ? 3 : p.weaponTier >= 2 ? 2 : 1;
              const dmg = p.weaponTier >= 3 ? 3 : 2;
              const size = 6 + p.weaponTier;

              for (let i = 0; i < count; i++) {
                const off = (i - (count - 1) / 2) * 10;
                s.bulletIdCounter++;
                s.bullets.push({
                  id: s.bulletIdCounter,
                  x: px + off,
                  y: py,
                  width: size,
                  height: size + 6,
                  speedY: -8.5,
                  color: '#f43f5e',
                  isPlayer: true,
                  playerId: p.id,
                  damage: dmg,
                  piercing: true,
                });
              }
            } else if (p.weaponType === 'missiles') {
              soundManager.playMissileLaunch();
              const count = p.weaponTier >= 4 ? 4 : p.weaponTier >= 2 ? 2 : 1;
              for (let i = 0; i < count; i++) {
                const off = (i - (count - 1) / 2) * 8;
                s.bulletIdCounter++;
                s.bullets.push({
                  id: s.bulletIdCounter,
                  x: px + off,
                  y: py,
                  vx: (i - (count - 1) / 2) * 1.5,
                  width: 5,
                  height: 12,
                  speedY: -7.5,
                  color: '#f59e0b',
                  isPlayer: true,
                  playerId: p.id,
                  damage: 2,
                  isHoming: true,
                  isDud: Math.random() < 0.125,
                });
              }
            } else if (p.weaponType === 'laser') {
              const beamWidth = 3 + p.weaponTier * 2;
              s.bulletIdCounter++;
              s.bullets.push({
                id: s.bulletIdCounter,
                x: px,
                y: py,
                width: beamWidth,
                height: 28,
                speedY: -16,
                color: '#38bdf8',
                isPlayer: true,
                playerId: p.id,
                damage: p.weaponTier >= 4 ? 3 : 2,
                piercing: true,
              });
            } else if (p.weaponType === 'scatter') {
              const pelletCount = p.weaponTier >= 4 ? 6 : p.weaponTier >= 2 ? 4 : 3;
              for (let i = 0; i < pelletCount; i++) {
                const spreadAngle = (i - (pelletCount - 1) / 2) * 1.8;
                s.bulletIdCounter++;
                s.bullets.push({
                  id: s.bulletIdCounter,
                  x: px,
                  y: py,
                  vx: spreadAngle,
                  width: 4,
                  height: 10,
                  speedY: -9.0,
                  color: '#eab308',
                  isPlayer: true,
                  playerId: p.id,
                  damage: p.weaponTier >= 3 ? 2 : 1,
                });
              }
            } else if (p.weaponType === 'wave') {
              const waveCount = p.weaponTier >= 4 ? 3 : p.weaponTier >= 2 ? 2 : 1;
              for (let i = 0; i < waveCount; i++) {
                const off = (i - (waveCount - 1) / 2) * 16;
                s.bulletIdCounter++;
                s.bullets.push({
                  id: s.bulletIdCounter,
                  x: px + off,
                  y: py,
                  width: 20 + p.weaponTier * 3,
                  height: 6,
                  speedY: -11,
                  color: '#10b981',
                  isPlayer: true,
                  playerId: p.id,
                  damage: p.weaponTier >= 3 ? 2 : 1,
                  piercing: true,
                });
              }
            }
          }
        }

        // 5. BOSS LEVEL AI AVOIDANCE ROUTINE & ATTACKS
        if (s.boss.active) {
          const boss = s.boss;

          // Phase computation
          const hpRatio = boss.health / boss.maxHealth;
          boss.phase = hpRatio <= 0.33 ? 3 : hpRatio <= 0.66 ? 2 : 1;

          // --- AI AVOIDANCE ROUTINE ---
          // Scan for player bullets moving up within detection cone/column beneath boss
          const threatBullets = s.bullets.filter(
            (b) =>
              b.isPlayer &&
              b.speedY < 0 &&
              b.y < boss.y + 260 &&
              b.y > boss.y + 10 &&
              b.x >= boss.x - 20 &&
              b.x <= boss.x + boss.width + 20
          );

          if (threatBullets.length > 0 && time > boss.evasionCooldown && !boss.evasionActive) {
            // AI decision: evaluate bullet distribution to dodge toward safe pocket
            const bossCenterX = boss.x + boss.width / 2;
            let leftThreat = 0;
            let rightThreat = 0;

            for (const tb of threatBullets) {
              if (tb.x < bossCenterX) leftThreat++;
              else rightThreat++;
            }

            let escapeDir = leftThreat >= rightThreat ? 1 : -1;
            // Prevent getting trapped in corners
            if (boss.x < 80) escapeDir = 1;
            if (boss.x + boss.width > VIRTUAL_WIDTH - 80) escapeDir = -1;

            // Trigger AI Avoidance burst
            boss.evasionActive = true;
            boss.evasionDir = escapeDir;
            boss.evasionTimer = 320;
            const cooldownMult = Math.max(1, 15 / s.wave);
            boss.evasionCooldown = time + (boss.phase === 3 ? 450 : 650) * cooldownMult;
            const speedMult = Math.min(1, Math.max(0.4, s.wave / 15));
            boss.vx = escapeDir * (6.5 + (boss.phase === 3 ? 2.5 : 1.0)) * speedMult;

            soundManager.playBossEvasion();
            triggerScreenShake(3, 160);

            // Evasion particle flare
            spawnExplosion(
              escapeDir > 0 ? boss.x : boss.x + boss.width,
              boss.y + boss.height / 2,
              '#38bdf8',
              12
            );

            s.floatingIdCounter++;
            s.floatingTexts.push({
              id: s.floatingIdCounter,
              x: boss.x + boss.width / 2,
              y: boss.y - 12,
              text: 'EVASION! ⚡',
              color: '#38bdf8',
              alpha: 1,
              vy: -0.8,
            });
          }

          // Handle evasion movement
          if (boss.evasionActive) {
            boss.evasionTimer -= dt;
            boss.x += boss.vx;
            if (boss.evasionTimer <= 0) {
              boss.evasionActive = false;
              boss.vx = boss.evasionDir * boss.speed;
            }
          } else {
            boss.x += boss.vx;
            if (boss.x <= 36) {
              boss.x = 36;
              boss.vx = Math.abs(boss.vx);
            } else if (boss.x + boss.width >= VIRTUAL_WIDTH - 36) {
              boss.x = VIRTUAL_WIDTH - 36 - boss.width;
              boss.vx = -Math.abs(boss.vx);
            }
          }

          // Boss Descent Logic
          boss.dropTimer += dt;
          if (boss.dropTimer >= boss.nextDropTime) {
            boss.dropTimer = 0;
            boss.nextDropTime = 30000 + Math.random() * 30000;
            boss.y += 25;
            if (boss.y > 450) boss.y = 450;
          }

          // AI Attack Routine
          boss.attackTimer += dt;
          const attackInterval = boss.phase === 3 ? 900 : boss.phase === 2 ? 1400 : 2000;

          if (boss.attackTimer >= attackInterval) {
            boss.attackTimer = 0;
            soundManager.playBossLaser();

            const bx = boss.x + boss.width / 2;
            const by = boss.y + boss.height;

            if (boss.phase === 1) {
              // Twin plasma bolts
              const offsets = [];
              if (boss.leftTurretHealth > 0) offsets.push(-20);
              if (boss.rightTurretHealth > 0) offsets.push(20);
              if (offsets.length === 0) offsets.push(0); // fallback if both destroyed

              offsets.forEach((off) => {
                s.bulletIdCounter++;
                s.bullets.push({
                  id: s.bulletIdCounter,
                  x: bx + off,
                  y: by,
                  width: 5,
                  height: 14,
                  speedY: 5.5,
                  color: '#ef4444',
                  isPlayer: false,
                  damage: 1,
                });
              });
            } else if (boss.phase === 2) {
              // 3-way spread attack
              const angles = [0];
              if (boss.leftTurretHealth > 0) angles.push(-2.0);
              if (boss.rightTurretHealth > 0) angles.push(2.0);

              angles.forEach((ang) => {
                s.bulletIdCounter++;
                s.bullets.push({
                  id: s.bulletIdCounter,
                  x: bx + ang * 8,
                  y: by,
                  vx: ang * 1.3,
                  width: 5.5,
                  height: 15,
                  speedY: 5.2,
                  color: '#f97316',
                  isPlayer: false,
                  damage: 1,
                });
              });
            } else {
              // Phase 3 Berserk Overdrive: 5-way spiral storm
              const angles = [0];
              if (boss.leftTurretHealth > 0) { angles.push(-1.6); angles.push(-3.2); }
              if (boss.rightTurretHealth > 0) { angles.push(1.6); angles.push(3.2); }

              angles.forEach((ang) => {
                s.bulletIdCounter++;
                s.bullets.push({
                  id: s.bulletIdCounter,
                  x: bx + ang * 7,
                  y: by,
                  vx: ang * 1.5,
                  width: 6,
                  height: 16,
                  speedY: 6.0,
                  color: '#ec4899',
                  isPlayer: false,
                  damage: 1,
                });
              });
            }
          }
        } else {
          // 6. Normal Fleet Movement & Drop Speed Acceleration
          const aliveEnemies = s.enemies.filter((e) => e.health > 0);
          if (aliveEnemies.length === 0) {
            soundManager.playWaveClear();
            s.wave += 1;
            setWave(s.wave);
            spawnFleet(s.wave, s.difficulty);

            // Restores 1 shield every 2 waves
            if (s.wave % 2 === 0) {
              for (const p of [s.p1, s.p2]) {
                if (p.shieldsRemaining < 3) p.shieldsRemaining += 1;
              }
            }
          } else {
            const livingFraction = aliveEnemies.length / 55;
            const currentStepInterval = Math.max(
              70,
              80 + livingFraction * (s.fleet.stepInterval - 80)
            );

            s.fleet.stepTimer += dt;
            if (s.fleet.stepTimer >= currentStepInterval) {
              s.fleet.stepTimer = 0;
              s.fleet.animFrame = s.fleet.animFrame === 0 ? 1 : 0;
              soundManager.playMarchStep();

              if (s.fleet.dropPending) {
                s.fleet.dropPending = false;
                s.fleet.direction *= -1;

                // Controlled drop amount so aliens don't rapidly crush the bottom
                const dropAmount = Math.min(20, 14 + Math.floor(s.wave / 3) * 2);
                for (const e of aliveEnemies) {
                  e.y += dropAmount;
                }

                if (s.wave >= 2) {
                  s.fleet.stepInterval = Math.max(90, s.fleet.stepInterval * 0.92);
                }
              } else {
                let hitWall = false;
                const stepDistance = 8 + (1 - livingFraction) * 6;
                for (const e of aliveEnemies) {
                  e.x += stepDistance * s.fleet.direction;
                  if (
                    (s.fleet.direction > 0 && e.x + e.width >= VIRTUAL_WIDTH - 24) ||
                    (s.fleet.direction < 0 && e.x <= 24)
                  ) {
                    hitWall = true;
                  }
                }
                if (hitWall) {
                  s.fleet.dropPending = true;
                }
              }

              // Check invasion line
              for (const e of aliveEnemies) {
                if (e.y + e.height >= 540) {
                  s.p1.lives = 0;
                  s.p2.lives = 0;
                  s.gameState = 'game_over';
                  setGameState('game_over');
                  soundManager.playGameOver();
                  triggerScreenShake(16, 900);
                  break;
                }
              }
            }

            // Enemy Shooting
            s.fleet.lastEnemyShotTime += dt;
            let enemyShootInterval = Math.max(400, 1600 - s.wave * 130);
            if (s.difficulty === 'easy') enemyShootInterval *= 1.4;
            if (s.difficulty === 'hard') enemyShootInterval *= 0.68;

            if (s.fleet.lastEnemyShotTime > enemyShootInterval) {
              s.fleet.lastEnemyShotTime = 0;

              const bottomEnemiesMap: { [col: number]: Enemy } = {};
              for (const e of aliveEnemies) {
                const colKey = Math.round(e.x / 40);
                if (!bottomEnemiesMap[colKey] || e.y > bottomEnemiesMap[colKey].y) {
                  bottomEnemiesMap[colKey] = e;
                }
              }
              const shooters = Object.values(bottomEnemiesMap);
              const maxEnemyBullets = s.difficulty === 'hard' ? 7 : 4;

              if (shooters.length > 0 && s.bullets.filter((b) => !b.isPlayer).length < maxEnemyBullets) {
                const shooter = shooters[Math.floor(Math.random() * shooters.length)];
                s.bulletIdCounter++;
                s.bullets.push({
                  id: s.bulletIdCounter,
                  x: shooter.x + shooter.width / 2,
                  y: shooter.y + shooter.height,
                  width: 4,
                  height: 12,
                  speedY: 4.8 + Math.min(s.wave * 0.45, 4.0),
                  color: '#f87171',
                  isPlayer: false,
                });
                soundManager.playEnemyShoot();
              }
            }
          }
        }

        // 7. Mystery Mothership Spawn & Movement (during non-boss waves)
        if (!s.boss.active) {
          s.mysteryShipTimer += dt;
          if (!s.mysteryShip.active && s.mysteryShipTimer >= s.nextMysteryTime) {
            s.mysteryShip.active = true;
            s.mysteryShip.x = -s.mysteryShip.width;
            const isBoss = s.wave >= 2 && Math.random() > 0.4;
            s.mysteryShip.isBoss = isBoss;

            if (isBoss) {
              s.mysteryShip.width = 72;
              s.mysteryShip.height = 28;
              s.mysteryShip.maxHealth = s.difficulty === 'hard' ? 6 : s.difficulty === 'medium' ? 4 : 2;
              s.mysteryShip.health = s.mysteryShip.maxHealth;
              s.mysteryShip.points = 500;
              s.mysteryShip.speed = 1.6;
            } else {
              s.mysteryShip.width = 52;
              s.mysteryShip.height = 22;
              s.mysteryShip.maxHealth = s.difficulty === 'hard' ? 3 : 1;
              s.mysteryShip.health = s.mysteryShip.maxHealth;
              s.mysteryShip.points = [100, 150, 200, 300][Math.floor(Math.random() * 4)];
              s.mysteryShip.speed = 2.4;
            }

            s.warningBanner = true;
            s.warningText = '⚠ ALERT: MOTHERSHIP INCOMING ⚠';
            s.warningTimer = 2200;
            soundManager.playWarningSiren();
            triggerScreenShake(7, 450);
          }

          if (s.mysteryShip.active) {
            s.mysteryShip.x += s.mysteryShip.speed;

            // Mothership dumb non-guided bomb drop (5x normal explosion range):
            // Drops bomb as it passes through the center zone of the screen
            if (!s.mysteryShip.bombDropped && s.mysteryShip.x >= VIRTUAL_WIDTH * 0.35 && s.mysteryShip.x <= VIRTUAL_WIDTH * 0.65) {
              s.mysteryShip.bombDropped = true;
              s.bulletIdCounter++;
              s.bullets.push({
                id: s.bulletIdCounter,
                x: s.mysteryShip.x + s.mysteryShip.width / 2,
                y: s.mysteryShip.y + s.mysteryShip.height + 4,
                width: 14,
                height: 18,
                speedY: 2.8,
                color: '#f97316',
                isPlayer: false,
                isMothershipBomb: true,
                bombHealth: 3,
                damage: 5,
              });

              soundManager.playMothershipBombDrop();

              s.floatingIdCounter++;
              s.floatingTexts.push({
                id: s.floatingIdCounter,
                x: s.mysteryShip.x + s.mysteryShip.width / 2,
                y: s.mysteryShip.y + s.mysteryShip.height + 20,
                text: '💣 MOTHERSHIP HEAVY BOMB DROPPED!',
                color: '#fb923c',
                alpha: 1,
                vy: -0.5,
              });
            }

            if (s.mysteryShip.x > VIRTUAL_WIDTH + 30) {
              s.mysteryShip.active = false;
              s.mysteryShip.bombDropped = false;
              s.mysteryShipTimer = 0;
              s.nextMysteryTime = 14000 + Math.random() * 14000;
            }
          }
        }

        if (s.warningBanner) {
          s.warningTimer -= dt;
          if (s.warningTimer <= 0) s.warningBanner = false;
        }

        // 8. Update Bullets (including Homing Micro-Missiles)
        for (const b of s.bullets) {
          if (b.isHoming && !b.isDud) {
            // Find closest living enemy or boss
            let closestTargetX = VIRTUAL_WIDTH / 2;
            let minDist = Infinity;

            if (s.boss.active) {
              closestTargetX = s.boss.x + s.boss.width / 2;
            } else {
              for (const e of s.enemies) {
                if (e.health <= 0) continue;
                const dist = Math.hypot(e.x + e.width / 2 - b.x, e.y + e.height / 2 - b.y);
                if (dist < minDist) {
                  minDist = dist;
                  closestTargetX = e.x + e.width / 2;
                }
              }
            }
            const dx = closestTargetX - b.x;
            b.vx = (b.vx || 0) * 0.85 + Math.sign(dx) * 1.8;
          }

          // Mortar Shell detonation at apex / targetY
          if (b.isMortar && b.targetY !== undefined && b.y <= b.targetY && b.speedY !== 0) {
            b.speedY = 0;
            const blastRadius = b.mortarRadius || 55;

            soundManager.playMortarExplosion();
            triggerScreenShake(10, 400);

            s.bombExplosions.push({
              id: ++s.bulletIdCounter,
              x: b.x,
              y: b.y,
              radius: 6,
              maxRadius: blastRadius,
              alpha: 1,
              color: '#f97316',
              duration: 0,
              maxDuration: 28,
            });

            const scoringPlayer = b.playerId === 2 ? s.p2 : s.p1;

            // Check Mothership damage first ("max aliens it can take out is one mother ship, or up to 6 normal aliens")
            let hitMothership = false;
            if (s.mysteryShip.active) {
              const msDist = Math.hypot(
                s.mysteryShip.x + s.mysteryShip.width / 2 - b.x,
                s.mysteryShip.y + s.mysteryShip.height / 2 - b.y
              );
              if (msDist <= blastRadius + s.mysteryShip.width / 2) {
                hitMothership = true;
                s.mysteryShip.health -= (b.damage || 4);
                spawnExplosion(b.x, b.y, '#f43f5e', 12);
                if (s.mysteryShip.health <= 0) {
                  destroyMysteryShip(scoringPlayer);
                }
              }
            }

            // If not consumed taking out a mothership, damage up to 6 closest normal aliens in blast radius
            if (!hitMothership) {
              const candidates: { enemy: Enemy; dist: number }[] = [];
              for (const e of s.enemies) {
                if (e.health <= 0) continue;
                const dist = Math.hypot(e.x + e.width / 2 - b.x, e.y + e.height / 2 - b.y);
                if (dist <= blastRadius + 12) {
                  candidates.push({ enemy: e, dist });
                }
              }
              // Sort by proximity to explosion epicenter
              candidates.sort((c1, c2) => c1.dist - c2.dist);
              const maxTargets = 6;
              const targets = candidates.slice(0, maxTargets);

              for (const { enemy: e } of targets) {
                e.health -= b.damage || 4;
                if (e.health <= 0) {
                  scoringPlayer.score += e.points;
                  spawnEnemyDestructionSparks(e.x + e.width / 2, e.y + e.height / 2, e.color, 1.25, e.type);
                }
              }
            }

            // Damage boss if in radius
            if (s.boss.active) {
              const bossDist = Math.hypot(s.boss.x + s.boss.width / 2 - b.x, s.boss.y + s.boss.height / 2 - b.y);
              if (bossDist <= blastRadius + s.boss.width / 2) {
                s.boss.health -= b.damage || 4;
                spawnExplosion(b.x, b.y, '#f97316', 14);
              }
            }
          }

          b.prevX = b.x;
          b.prevY = b.y;
          b.y += b.speedY;
          if (b.vx) b.x += b.vx;
        }

        // Alien Invaders vs Bunker Blocks (marching invaders crush bunkers upon physical descent)
        for (const e of s.enemies) {
          if (e.health <= 0) continue;
          for (const bunker of s.bunkers) {
            for (const block of bunker.blocks) {
              if (block.health <= 0) continue;
              if (
                e.x + e.width >= block.x &&
                e.x <= block.x + 8 &&
                e.y + e.height >= block.y &&
                e.y <= block.y + 7.33
              ) {
                block.health = 0;
                spawnExplosion(block.x + 4, block.y + 3.6, '#15803d', 3);
              }
            }
          }
        }

        // Player Bullets vs Enemy Bullets (Projectile Clashes & Bomb Shootdown)
        for (const pb of s.bullets) {
          if (!pb.isPlayer || pb.speedY === 0) continue;
          for (const eb of s.bullets) {
            if (eb.isPlayer || eb.speedY === 0) continue;

            const hit = checkBulletHit(
              pb,
              eb.x - (eb.width || 4) / 2,
              eb.y,
              eb.width || 4,
              eb.height || 10,
              2
            );

            if (hit) {
              if (eb.isMothershipBomb) {
                eb.bombHealth = (eb.bombHealth ?? 3) - (pb.damage || 1);
                if (!pb.piercing) pb.speedY = 0;
                spawnExplosion(pb.x, pb.y, '#f59e0b', 8);

                if (eb.bombHealth <= 0) {
                  eb.speedY = 0;
                  const scoringP = pb.playerId === 2 ? s.p2 : s.p1;
                  scoringP.score += 300;
                  soundManager.playSmartBomb();
                  triggerScreenShake(8, 400);
                  spawnEnemyDestructionSparks(eb.x, eb.y + eb.height / 2, '#f97316', 2.0, 'mothership');
                  s.floatingIdCounter++;
                  s.floatingTexts.push({
                    id: s.floatingIdCounter,
                    x: eb.x,
                    y: eb.y,
                    text: '🎯 BOMB INTERCEPTED! +300',
                    color: '#fbbf24',
                    alpha: 1,
                    vy: -0.8,
                  });
                }
              } else {
                if (!pb.piercing) pb.speedY = 0;
                eb.speedY = 0;
                spawnExplosion((pb.x + eb.x) / 2, (pb.y + eb.y) / 2, '#38bdf8', 6);
              }
              break;
            }
          }
        }

        // Bunker collisions with swept bullet hit detection
        for (const b of s.bullets) {
          if (b.speedY === 0) continue;
          let hitBunker = false;
          for (const bunker of s.bunkers) {
            for (const block of bunker.blocks) {
              if (block.health <= 0) continue;
              const bw = 8;
              const bh = 7.33;
              if (checkBulletHit(b, block.x, block.y, bw, bh, 0.5)) {
                const dmg = b.isPlayer ? (b.damage || 1) : Math.max(1, (b.damage || 1) + Math.floor(s.wave / 5));
                if (!b.piercing) b.speedY = 0;
                block.health -= dmg;
                spawnExplosion(b.x, b.y, '#22c55e', 5);

                // If mothership dumb bomb hits a bunker, detonate heavy blast
                if (b.isMothershipBomb) {
                  s.bombExplosions.push({
                    id: ++s.bulletIdCounter,
                    x: b.x,
                    y: b.y,
                    radius: 8,
                    maxRadius: 110, // 5x normal explosion radius (normal is ~22px)
                    isMothershipBlast: true,
                    alpha: 1,
                    color: '#f97316',
                    duration: 0,
                    maxDuration: 40,
                  });
                  soundManager.playMothershipBombExplosion();
                  triggerScreenShake(14, 600);
                }
                hitBunker = true;
                break;
              }
            }
            if (hitBunker && !b.piercing) break;
          }
        }

        // Check if mothership bomb reaches defensive ground floor line (y >= 570)
        for (const b of s.bullets) {
          if (b.isMothershipBomb && b.speedY !== 0 && b.y >= 570) {
            b.speedY = 0;
            s.bombExplosions.push({
              id: ++s.bulletIdCounter,
              x: b.x,
              y: 570,
              radius: 10,
              maxRadius: 115, // 5x normal explosion radius
              isMothershipBlast: true,
              alpha: 1,
              color: '#f97316',
              duration: 0,
              maxDuration: 45,
            });
            soundManager.playMothershipBombExplosion();
            triggerScreenShake(16, 750);
          }
        }

        // Bullets vs Boss, Mothership & Invaders (swept continuous collision detection)
        for (const b of s.bullets) {
          if (!b.isPlayer || b.speedY === 0) continue;

          // Boss Hit Check
          if (
            s.boss.active &&
            checkBulletHit(b, s.boss.x, s.boss.y, s.boss.width, s.boss.height, 4)
          ) {
            if (!b.piercing) b.speedY = 0;
            s.boss.health -= b.damage || 1;
            spawnExplosion(b.x, b.y, '#38bdf8', 6);
            soundManager.playAlienExplosion();

            // Turret logic
            const hitOffsetX = b.x - s.boss.x;
            if (hitOffsetX < 24 && s.boss.leftTurretHealth > 0) {
              s.boss.leftTurretHealth -= b.damage || 1;
              if (s.boss.leftTurretHealth <= 0) {
                spawnExplosion(s.boss.x + 12, s.boss.y + 16, '#f97316', 12);
              }
            } else if (hitOffsetX > s.boss.width - 24 && s.boss.rightTurretHealth > 0) {
              s.boss.rightTurretHealth -= b.damage || 1;
              if (s.boss.rightTurretHealth <= 0) {
                spawnExplosion(s.boss.x + s.boss.width - 12, s.boss.y + 16, '#f97316', 12);
              }
            }

            if (s.boss.health <= 0) {
              s.boss.active = false;
              setBossActive(false);

              const scoringPlayer = b.playerId === 2 ? s.p2 : s.p1;
              scoringPlayer.score += s.boss.points;

              triggerScreenShake(18, 1000);
              soundManager.playSmartBomb();
              // Grand Boss colorful spark explosion
              spawnEnemyDestructionSparks(
                s.boss.x + s.boss.width / 2,
                s.boss.y + s.boss.height / 2,
                '#ec4899',
                4.2,
                'boss'
              );

              // Floating Boss Clear text
              s.floatingIdCounter++;
              s.floatingTexts.push({
                id: s.floatingIdCounter,
                x: s.boss.x + 20,
                y: s.boss.y,
                text: `BOSS DESTROYED! +${s.boss.points}`,
                color: '#f43f5e',
                alpha: 1,
                vy: -1.0,
              });

              // Guaranteed drops: Weapon Upgrade Capsule + Shield Capsule
              s.powerUpIdCounter++;
              s.powerUps.push({
                id: s.powerUpIdCounter,
                x: s.boss.x + s.boss.width / 2 - 24,
                y: s.boss.y + s.boss.height,
                width: 28,
                height: 22,
                vy: 1.4,
                type: 'weapon_missiles',
                label: '🚀M',
                name: 'Homing Missiles',
                color: '#f59e0b',
                glowColor: 'rgba(245, 158, 11, 0.95)',
              });

              s.powerUpIdCounter++;
              s.powerUps.push({
                id: s.powerUpIdCounter,
                x: s.boss.x + s.boss.width / 2 + 24,
                y: s.boss.y + s.boss.height,
                width: 28,
                height: 22,
                vy: 1.4,
                type: 'shield_charge',
                label: '🛡️+1',
                name: '+1 Shield',
                color: '#a855f7',
                glowColor: 'rgba(168, 85, 247, 0.95)',
              });

              // Next wave progression
              setTimeout(() => {
                s.wave += 1;
                setWave(s.wave);
                spawnFleet(s.wave, s.difficulty);
              }, 1200);
            }
            continue;
          }

          // Mothership Hit Check
          if (
            s.mysteryShip.active &&
            checkBulletHit(b, s.mysteryShip.x, s.mysteryShip.y, s.mysteryShip.width, s.mysteryShip.height, 3)
          ) {
            if (!b.piercing) b.speedY = 0;
            s.mysteryShip.health -= b.damage || 1;
            spawnExplosion(b.x, b.y, '#f43f5e', 8);

            if (s.mysteryShip.health <= 0) {
              const scoringPlayer = b.playerId === 2 ? s.p2 : s.p1;
              destroyMysteryShip(scoringPlayer);
            }
            continue;
          }

          // Alien Fleet Hit Check (swept continuous collision detection)
          for (const e of s.enemies) {
            if (e.health <= 0) continue;
            if (checkBulletHit(b, e.x, e.y, e.width, e.height, 2.5)) {
              if (!b.piercing) b.speedY = 0;
              e.health -= b.damage || 1;

              if (e.health <= 0) {
                const scoringPlayer = b.playerId === 2 ? s.p2 : s.p1;
                s.combo += 1;
                s.lastHitTime = time;

                const comboBonus = s.combo > 1 ? s.combo * 5 : 0;
                const totalPoints = e.points + comboBonus;
                scoringPlayer.score += totalPoints;

                if (scoringPlayer.score > s.highScore) {
                  s.highScore = scoringPlayer.score;
                  setHighScore(s.highScore);
                }

                s.floatingIdCounter++;
                s.floatingTexts.push({
                  id: s.floatingIdCounter,
                  x: e.x + 4,
                  y: e.y,
                  text: `+${totalPoints}${s.combo >= 3 ? ` x${s.combo}` : ''}`,
                  color: s.combo >= 3 ? '#fbbf24' : e.color,
                  alpha: 1,
                  vy: -0.7,
                });

                // Dedicated Enemy Destruction Particle System (colorful, fading sparks & streaks)
                spawnEnemyDestructionSparks(e.x + e.width / 2, e.y + e.height / 2, e.color, 1.25, e.type);
                soundManager.playAlienExplosion();

                // Random drop from destroyed alien: 3.5% chance bonus capsule, 3% chance live falling bomb!
                const alienDropRoll = Math.random();
                if (alienDropRoll < 0.035) {
                  // Drop random bonus capsule
                  const bonusTypes: PowerUpType[] = ['weapon_vulcan', 'weapon_plasma', 'weapon_missiles', 'weapon_laser', 'weapon_scatter', 'weapon_wave', 'shield_charge', 'mortar_ammo'];
                  const chosenType = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
                  const meta: Record<PowerUpType, { label: string; name: string; color: string; glow: string }> = {
                    weapon_vulcan: { label: '⚡V', name: 'Vulcan Rapid', color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.9)' },
                    weapon_plasma: { label: '⚡P', name: 'Plasma Piercer', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.9)' },
                    weapon_missiles: { label: '🚀M', name: 'Homing Missiles', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.9)' },
                    weapon_laser: { label: '⚡L', name: 'Rail Laser', color: '#c084fc', glow: 'rgba(192, 132, 252, 0.9)' },
                    weapon_scatter: { label: '💥S', name: 'Scatter Flak', color: '#eab308', glow: 'rgba(234, 179, 8, 0.9)' },
                    weapon_wave: { label: '〰W', name: 'Sonic Wave', color: '#10b981', glow: 'rgba(16, 185, 129, 0.9)' },
                    mortar_ammo: { label: '💣MTR', name: '+3 Mortars', color: '#ea580c', glow: 'rgba(234, 88, 12, 0.95)' },
                    shield_charge: { label: '🛡️+1', name: '+1 Shield', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.95)' },
                    extra_life: { label: '❤️1UP', name: '+1 Life', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.95)' },
                    smart_bomb: { label: '💣', name: 'Smart Bomb', color: '#f97316', glow: 'rgba(249, 115, 22, 0.9)' },
                    rapid_boost: { label: '⚡', name: 'Rapid Boost', color: '#eab308', glow: 'rgba(234, 179, 8, 0.9)' },
                  };
                  const m = meta[chosenType];
                  s.powerUpIdCounter++;
                  s.powerUps.push({
                    id: s.powerUpIdCounter,
                    x: e.x + e.width / 2,
                    y: e.y + e.height,
                    width: 28,
                    height: 22,
                    vy: 1.6,
                    type: chosenType,
                    label: m.label,
                    name: m.name,
                    color: m.color,
                    glowColor: m.glow,
                  });
                } else if (alienDropRoll < 0.065) {
                  // Danger! Alien drops a revenge live bomb!
                  s.bulletIdCounter++;
                  s.bullets.push({
                    id: s.bulletIdCounter,
                    x: e.x + e.width / 2,
                    y: e.y + e.height,
                    width: 6,
                    height: 12,
                    speedY: 4.8,
                    color: '#f43f5e',
                    isPlayer: false,
                    damage: 1,
                    isAlienBomb: true,
                  });
                }
              }
              break;
            }
          }
        }

        // 9. Power-Up Capsule Collection & Processing
        for (const pu of s.powerUps) {
          pu.y += pu.vy;

          for (const p of [s.p1, s.p2]) {
            if (!p.alive || p.lives <= 0) continue;

            if (
              pu.x >= p.x - 12 &&
              pu.x <= p.x + p.width + 12 &&
              pu.y >= p.y - 10 &&
              pu.y <= p.y + p.height + 10
            ) {
              pu.vy = 0;
              soundManager.playPowerUp();
              triggerScreenShake(4, 200);

              if (pu.type === 'extra_life') {
                if (p.lives < s.maxLives) {
                  p.lives += 1;
                  soundManager.playExtraLife();
                  s.floatingIdCounter++;
                  s.floatingTexts.push({
                    id: s.floatingIdCounter,
                    x: p.x - 14,
                    y: p.y - 18,
                    text: `${p.label} +1 EXTRA LIFE! (${p.lives}/${s.maxLives})`,
                    color: '#f43f5e',
                    alpha: 1,
                    vy: -0.9,
                  });
                } else {
                  p.score += 500;
                  s.floatingIdCounter++;
                  s.floatingTexts.push({
                    id: s.floatingIdCounter,
                    x: p.x - 14,
                    y: p.y - 18,
                    text: `${p.label} MAX LIVES BONUS +500!`,
                    color: '#fbbf24',
                    alpha: 1,
                    vy: -0.9,
                  });
                }
              } else if (pu.type === 'shield_charge') {
                p.shieldsRemaining = Math.min(5, p.shieldsRemaining + 1);
                s.floatingIdCounter++;
                s.floatingTexts.push({
                  id: s.floatingIdCounter,
                  x: p.x - 14,
                  y: p.y - 18,
                  text: `${p.label} +1 SHIELD (PRESS ENTER)!`,
                  color: '#a855f7',
                  alpha: 1,
                  vy: -0.9,
                });
              } else if (pu.type === 'mortar_ammo') {
                p.mortarAmmo = Math.min(12, p.mortarAmmo + 3);
                s.floatingIdCounter++;
                s.floatingTexts.push({
                  id: s.floatingIdCounter,
                  x: p.x - 14,
                  y: p.y - 18,
                  text: `${p.label} +3 MORTARS (TOTAL: ${p.mortarAmmo})!`,
                  color: '#ea580c',
                  alpha: 1,
                  vy: -0.9,
                });
              } else {
                let newType: WeaponArchetype = 'vulcan';
                if (pu.type === 'weapon_plasma') newType = 'plasma';
                else if (pu.type === 'weapon_missiles') newType = 'missiles';
                else if (pu.type === 'weapon_laser') newType = 'laser';
                else if (pu.type === 'weapon_scatter') newType = 'scatter';
                else if (pu.type === 'weapon_wave') newType = 'wave';

                const oldTier = p.weaponTier;
                p.weaponType = newType;
                p.weaponTier = Math.min(5, (p.weaponTier + 1) as WeaponTier) as WeaponTier;
                // 30 to 60 random shots per tier
                p.weaponAmmo = p.weaponTier > 1 ? 30 + Math.floor(Math.random() * 31) : 0;

                s.floatingIdCounter++;
                s.floatingTexts.push({
                  id: s.floatingIdCounter,
                  x: p.x - 14,
                  y: p.y - 18,
                  text: `${p.label} ${pu.name} LVL ${p.weaponTier} (${p.weaponTier > 1 ? p.weaponAmmo + ' SHOTS' : 'MAX'})!`,
                  color: pu.color,
                  alpha: 1,
                  vy: -0.9,
                });

                // Home base defense degradation mechanic:
                // "home base defences are destroyed at the same ratio that your weapon level increases"
                if (p.weaponTier > oldTier) {
                  degradeHomeBunkers(p.weaponTier * 3);
                }
              }

              spawnExplosion(pu.x, pu.y, pu.color, 24);
              break;
            }
          }
        }
        s.powerUps = s.powerUps.filter((pu) => pu.vy !== 0 && pu.y < VIRTUAL_HEIGHT + 20);

        // 10. Enemy Bullets vs Players
        const now = Date.now();
        for (const b of s.bullets) {
          if (b.isPlayer || b.speedY === 0) continue;

          for (const p of [s.p1, s.p2]) {
            if (!p.alive || p.lives <= 0) continue;
            if (now < p.invulnerableUntil) continue;

            const isShieldActive = now < p.shieldActiveUntil;
            const shieldRadius = p.width * 0.95;
            const distToShipCenter = Math.hypot(
              b.x - (p.x + p.width / 2),
              b.y - (p.y + p.height / 2)
            );

            if (isShieldActive && distToShipCenter <= shieldRadius + 4) {
              b.speedY = 0;
              soundManager.playShieldDeflect();
              spawnExplosion(b.x, b.y, '#a855f7', 10);
              break;
            }

            if (checkBulletHit(b, p.x + 2, p.y + 2, p.width - 4, p.height - 2, 0)) {
              b.speedY = 0;
              p.lives -= 1;
              soundManager.playPlayerHit();
              triggerScreenShake(12, 500);
              spawnExplosion(p.x + p.width / 2, p.y + p.height / 2, p.color, 35);

              // Weapon drops back to the previous level on hit instead of resetting to base
              if (p.weaponTier > 1) {
                p.weaponTier = (p.weaponTier - 1) as WeaponTier;
                p.weaponAmmo = 30 + Math.floor(Math.random() * 31);
                s.floatingIdCounter++;
                s.floatingTexts.push({
                  id: s.floatingIdCounter,
                  x: p.x - 14,
                  y: p.y - 18,
                  text: `${p.label} WEAPON LEVEL DOWN -> LVL ${p.weaponTier}!`,
                  color: '#f59e0b',
                  alpha: 1,
                  vy: -0.8,
                });
              } else {
                p.weaponTier = 1;
                p.weaponType = 'vulcan';
                p.weaponAmmo = 0;
                s.floatingIdCounter++;
                s.floatingTexts.push({
                  id: s.floatingIdCounter,
                  x: p.x - 14,
                  y: p.y - 18,
                  text: `${p.label} WEAPON BASE LEVEL`,
                  color: '#ef4444',
                  alpha: 1,
                  vy: -0.8,
                });
              }

              if (p.lives <= 0) {
                p.alive = false;
              } else {
                p.invulnerableUntil = Date.now() + 2200;
              }
              break;
            }
          }
        }

        s.bullets = s.bullets.filter(
          (b) => b.speedY !== 0 && b.y > -20 && b.y < VIRTUAL_HEIGHT + 20
        );

        // 11. Update Particles & Sparks
        for (const pt of s.particles) {
          if (pt.drag) {
            pt.vx *= pt.drag;
            pt.vy *= pt.drag;
          }
          if (pt.gravity) {
            pt.vy += pt.gravity;
          }
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.life++;
          pt.alpha = Math.max(0, 1 - pt.life / pt.maxLife);
        }
        s.particles = s.particles.filter((pt) => pt.life < pt.maxLife);

        // Update Bomb Explosions (Mothership 5x heavy blast shockwaves)
        for (const be of s.bombExplosions) {
          be.duration++;
          const progress = be.duration / be.maxDuration;
          be.radius = 8 + (be.maxRadius - 8) * Math.sin(progress * Math.PI * 0.5);
          be.alpha = Math.max(0, 1 - progress);

          // During active shockwave, damage bunkers and unshielded players in radius
          if (be.isMothershipBlast && be.duration <= 10) {
            for (const bunker of s.bunkers) {
              for (const block of bunker.blocks) {
                if (block.health <= 0) continue;
                const d = Math.hypot(block.x + 4 - be.x, block.y + 3.5 - be.y);
                if (d <= be.radius) {
                  block.health = 0;
                  spawnExplosion(block.x + 4, block.y + 3.5, '#f97316', 2);
                }
              }
            }

            const expNow = Date.now();
            for (const p of [s.p1, s.p2]) {
              if (!p.alive || p.lives <= 0 || expNow < p.invulnerableUntil) continue;
              if (expNow < p.shieldActiveUntil) continue;
              const pDist = Math.hypot(p.x + p.width / 2 - be.x, p.y + p.height / 2 - be.y);
              if (pDist <= be.radius * 0.8) {
                p.lives -= 1;
                p.invulnerableUntil = expNow + 2200;
                soundManager.playPlayerHit();
                triggerScreenShake(14, 600);
                spawnExplosion(p.x + p.width / 2, p.y + p.height / 2, p.color, 35);
                if (p.lives <= 0) p.alive = false;
              }
            }
          }
        }
        s.bombExplosions = s.bombExplosions.filter((be) => be.duration < be.maxDuration);

        for (const ft of s.floatingTexts) {
          ft.y += ft.vy;
          ft.alpha -= 0.022;
        }
        s.floatingTexts = s.floatingTexts.filter((ft) => ft.alpha > 0);

        // Periodically sync reactive state for UI HUD
        hudSyncTimer += dt;
        if (hudSyncTimer > 100) {
          hudSyncTimer = 0;
          const currNow = Date.now();
          setP1State({
            score: s.p1.score,
            lives: s.p1.lives,
            weaponTier: s.p1.weaponTier,
            weaponType: s.p1.weaponType,
            weaponAmmo: s.p1.weaponAmmo,
            mortarAmmo: s.p1.mortarAmmo,
            shields: s.p1.shieldsRemaining,
            shieldActive: s.p1.shieldActiveUntil > currNow,
            alive: s.p1.alive && s.p1.lives > 0,
          });

          if (s.gameMode === '2p') {
            setP2State({
              score: s.p2.score,
              lives: s.p2.lives,
              weaponTier: s.p2.weaponTier,
              weaponType: s.p2.weaponType,
              weaponAmmo: s.p2.weaponAmmo,
              mortarAmmo: s.p2.mortarAmmo,
              shields: s.p2.shieldsRemaining,
              shieldActive: s.p2.shieldActiveUntil > currNow,
              alive: s.p2.alive && s.p2.lives > 0,
            });
          }
        }
      }

      // ================= RENDERING =================
      ctx.save();

      if (s.shakeDuration > 0) {
        const shakeX = (Math.random() - 0.5) * s.shakeIntensity;
        const shakeY = (Math.random() - 0.5) * s.shakeIntensity;
        ctx.translate(shakeX, shakeY);
      }

      ctx.fillStyle = '#05060a';
      ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

      // Draw Starfield
      for (const star of s.stars) {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }

      // Draw Defense Bunkers
      for (const bunker of s.bunkers) {
        const bw = 8;
        const bh = 7.33;
        for (const block of bunker.blocks) {
          if (block.health <= 0) continue;
          if (block.health === 3) ctx.fillStyle = '#22c55e';
          else if (block.health === 2) ctx.fillStyle = '#16a34a';
          else ctx.fillStyle = '#15803d';
          ctx.fillRect(block.x, block.y, bw - 0.5, bh - 0.5);
        }
      }

      // Draw Boss Level Dreadnought (with AI Avoidance Visuals)
      if (s.boss.active) {
        const boss = s.boss;
        const bossColor = boss.phase === 3 ? '#ef4444' : boss.phase === 2 ? '#f59e0b' : '#38bdf8';

        // Draw Dreadnought Sprite
        drawPixelPattern(ctx, BOSS_DREADNOUGHT_SPRITE, boss.x, boss.y, 2.2, bossColor);

        // Thruster exhaust flames
        ctx.fillStyle = boss.evasionActive ? '#06b6d4' : '#f97316';
        const flameHeight = boss.evasionActive ? 12 + Math.random() * 8 : 6 + Math.random() * 4;
        ctx.fillRect(boss.x + 18, boss.y + boss.height, 8, flameHeight);
        ctx.fillRect(boss.x + boss.width - 26, boss.y + boss.height, 8, flameHeight);

        // Multi-Segment Boss Health Bar Header
        const barW = 340;
        const barH = 10;
        const barX = (VIRTUAL_WIDTH - barW) / 2;
        const barY = 22;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.fillRect(barX, barY, barW, barH);
        ctx.strokeRect(barX, barY, barW, barH);

        const hpPct = Math.max(0, boss.health / boss.maxHealth);
        const hpBarColor = boss.phase === 3 ? '#ef4444' : boss.phase === 2 ? '#f59e0b' : '#22c55e';
        ctx.fillStyle = hpBarColor;
        ctx.fillRect(barX + 2, barY + 2, (barW - 4) * hpPct, barH - 4);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${boss.name} - HP: ${boss.health}/${boss.maxHealth} (PHASE ${boss.phase} • AI DODGE)`,
          VIRTUAL_WIDTH / 2,
          barY - 4
        );
      }

      // Draw Mystery Ship
      if (s.mysteryShip.active) {
        if (s.mysteryShip.isBoss) {
          drawPixelPattern(ctx, MOTHERSHIP_SPRITE, s.mysteryShip.x, s.mysteryShip.y, 2.8, '#e11d48');
        } else {
          drawPixelPattern(ctx, UFO_SPRITE, s.mysteryShip.x, s.mysteryShip.y, 3.2, '#f43f5e');
        }
      }

      // Draw Warning Banner
      if (s.warningBanner) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.fillRect(0, 36, VIRTUAL_WIDTH, 26);
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(s.warningText || '⚠ ALERT: MOTHERSHIP INCOMING ⚠', VIRTUAL_WIDTH / 2, 53);
      }

      // Draw Invaders Fleet
      for (const e of s.enemies) {
        if (e.health <= 0) continue;
        let sprite = OCTOPUS_SPRITE[s.fleet.animFrame];
        let pixelSize = 3;

        if (e.type === 'squid') {
          sprite = SQUID_SPRITE[s.fleet.animFrame];
          pixelSize = 3.6;
        } else if (e.type === 'crab') {
          sprite = CRAB_SPRITE[s.fleet.animFrame];
          pixelSize = 3.2;
        } else if (e.type === 'armored') {
          sprite = ARMORED_SPRITE[s.fleet.animFrame];
          pixelSize = 3.2;
        } else if (e.type === 'hunter') {
          sprite = HUNTER_SPRITE[s.fleet.animFrame];
          pixelSize = 3.0;
        } else if (e.type === 'glider') {
          sprite = GLIDER_SPRITE[s.fleet.animFrame];
          pixelSize = 3.4;
        }

        drawPixelPattern(ctx, sprite, e.x, e.y, pixelSize, e.color);

        // Health bar indicator for high-HP aliens (lvl 3+ or armored)
        if (e.maxHealth > 1) {
          const barW = e.width;
          const barH = 3;
          const barX = e.x;
          const barY = e.y - 5;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
          ctx.fillRect(barX, barY, barW, barH);
          const hpPct = Math.max(0, e.health / e.maxHealth);
          ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
          ctx.fillRect(barX, barY, barW * hpPct, barH);
        }
      }

      // Draw Power-Up Capsules
      for (const pu of s.powerUps) {
        drawPowerUpCapsule(ctx, pu.x, pu.y, pu.label, pu.color, pu.glowColor, time * 0.008);
      }

      // Draw Player Ships
      const nowMs = Date.now();
      const playersToDraw = [
        { p: s.p1, sprite: PLAYER_P1_SPRITE },
        ...(s.gameMode === '2p' ? [{ p: s.p2, sprite: PLAYER_P2_SPRITE }] : []),
      ];

      for (const { p, sprite } of playersToDraw) {
        if (!p.alive || p.lives <= 0) continue;
        const isFlickering = nowMs < p.invulnerableUntil && Math.floor(nowMs / 90) % 2 === 0;

        if (!isFlickering) {
          drawPixelPattern(ctx, sprite, p.x, p.y, 2.0, p.color);

          ctx.fillStyle = p.color;
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(p.label, p.x + p.width / 2, p.y - 4);

          // Active 3-Second Shield Barrier
          if (p.shieldActiveUntil > nowMs) {
            const timeLeftSec = ((p.shieldActiveUntil - nowMs) / 1000).toFixed(1);
            ctx.save();
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(
              p.x + p.width / 2,
              p.y + p.height / 2,
              p.width * 0.95 + Math.sin(time * 0.008) * 2,
              0,
              Math.PI * 2
            );
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`${timeLeftSec}s`, p.x + p.width / 2, p.y - 12);
            ctx.restore();
          }

          // Visual Charge-Up for Mortar when holding button:
          // "need a visual charge up for the mortor when your holding the button, make the higher it goes the bigger the blast radius"
          if (s.keys.p1Mortar && p.id === 1 && p.mortarAmmo > 0 && p.mortarChargeStart > 0) {
            const holdTime = Math.min(2500, Math.max(0, nowMs - p.mortarChargeStart));
            const chargeRatio = Math.min(1, holdTime / 2350);
            const targetY = 420 - chargeRatio * 340;
            const currentBlastRadius = 80 + chargeRatio * 80;
            const centerX = p.x + p.width / 2;

            ctx.save();

            // 1. Charge meter gauge directly beneath ship
            const gaugeW = 44;
            const gaugeH = 6;
            const gaugeX = centerX - gaugeW / 2;
            const gaugeY = p.y + p.height + 6;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 1.2;
            ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);
            ctx.strokeRect(gaugeX, gaugeY, gaugeW, gaugeH);

            const chargeColor = chargeRatio < 0.35 ? '#facc15' : chargeRatio < 0.75 ? '#f97316' : '#ef4444';
            ctx.fillStyle = chargeColor;
            ctx.fillRect(gaugeX + 1, gaugeY + 1, (gaugeW - 2) * chargeRatio, gaugeH - 2);

            // Text tag under gauge
            ctx.fillStyle = chargeColor;
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            const pct = Math.round(chargeRatio * 100);
            ctx.fillText(`MTR CHARGE ${pct}% [R:${Math.round(currentBlastRadius)}px]`, centerX, gaugeY + 16);

            // 2. Trajectory aim line to target altitude
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = chargeRatio >= 0.95 ? 'rgba(239, 68, 68, 0.75)' : 'rgba(249, 115, 22, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(centerX, p.y - 6);
            ctx.lineTo(centerX, targetY);
            ctx.stroke();
            ctx.setLineDash([]);

            // 3. Target Apex Reticle & Projected Blast Radius Circle
            const pulse = Math.sin(nowMs * 0.01) * 3;
            ctx.strokeStyle = chargeRatio >= 0.95 ? '#ef4444' : '#f97316';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(centerX, targetY, currentBlastRadius + pulse, 0, Math.PI * 2);
            ctx.stroke();

            // Reticle crosshair at target center
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(centerX, targetY, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(centerX - 10, targetY);
            ctx.lineTo(centerX + 10, targetY);
            ctx.moveTo(centerX, targetY - 10);
            ctx.lineTo(centerX, targetY + 10);
            ctx.stroke();

            // Altitude indicator label
            ctx.fillStyle = '#fef08a';
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`💣 APEX ALTITUDE (BLAST ${Math.round(currentBlastRadius)}px)`, centerX, targetY - 14);

            ctx.restore();
          }
        }
      }

      // Draw Bullets & Missiles
      for (const b of s.bullets) {
        if (b.isMothershipBomb) {
          ctx.save();
          // Glowing pulsing heavy bomb
          const pulse = Math.sin(time * 0.015) * 1.5;
          ctx.fillStyle = '#f97316';
          ctx.shadowColor = '#ea580c';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(b.x, b.y + b.height / 2, (b.width / 2) + pulse, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(b.x, b.y + b.height / 2, b.width / 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (b.isMortar) {
          ctx.save();
          ctx.fillStyle = '#ea580c';
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
          ctx.fill();
          // Trailing spark
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(b.x - 2, b.y + 6, 4, 6);
          ctx.restore();
        } else if (b.isHoming) {
          drawMissile(ctx, b.x, b.y, b.vx ? b.vx * 0.15 : 0, b.color);
        } else {
          ctx.fillStyle = b.color;
          ctx.fillRect(b.x - b.width / 2, b.y, b.width, b.height);
          ctx.fillStyle = b.isPlayer ? 'rgba(56, 189, 248, 0.35)' : 'rgba(248, 113, 113, 0.35)';
          ctx.fillRect(b.x - b.width, b.y, b.width * 2, b.height);
        }
      }

      // Draw Bomb Explosions (shockwaves from mothership heavy blast)
      for (const be of s.bombExplosions) {
        if (be.alpha <= 0) continue;
        ctx.save();
        ctx.globalAlpha = be.alpha;

        const grad = ctx.createRadialGradient(be.x, be.y, 0, be.x, be.y, be.radius);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.3, be.color);
        grad.addColorStop(0.8, 'rgba(239, 68, 68, 0.35)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(be.x, be.y, be.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = be.color;
        ctx.lineWidth = Math.max(1, 4 * (1 - be.duration / be.maxDuration));
        ctx.beginPath();
        ctx.arc(be.x, be.y, be.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Draw Particles & Colorful Sparks
      ctx.save();
      for (const pt of s.particles) {
        if (pt.alpha <= 0) continue;
        ctx.globalAlpha = Math.max(0, Math.min(1, pt.alpha));

        if (pt.type === 'streak') {
          // High-velocity laser streak spark with trailing tail
          const trailLen = pt.trailLength || 4;
          ctx.strokeStyle = pt.color;
          ctx.lineWidth = Math.max(1, pt.size || 1.5);
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(pt.x - pt.vx * trailLen, pt.y - pt.vy * trailLen);
          ctx.stroke();

          // Hot white spark head
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(pt.x - 1, pt.y - 1, 2, 2);
        } else if (pt.type === 'ring') {
          // Expanding shockwave ring
          const progress = pt.life / pt.maxLife;
          const currentRadius = 3 + progress * (pt.size || 26);
          ctx.strokeStyle = pt.color;
          ctx.lineWidth = Math.max(1, 2.5 * (1 - progress));
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, currentRadius, 0, Math.PI * 2);
          ctx.stroke();
        } else if (pt.type === 'glow') {
          // Central brilliant flash pop
          const progress = pt.life / pt.maxLife;
          const currentRadius = Math.max(2, (pt.size || 14) * (1 - progress * 0.4));
          const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, currentRadius);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.5, pt.color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, currentRadius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Circular ember or spark dot diminishing in size
          const progress = pt.life / pt.maxLife;
          const currentSize = Math.max(0.6, (pt.initialSize || pt.size) * (1 - progress * 0.65));

          if (pt.glow) {
            ctx.shadowColor = pt.color;
            ctx.shadowBlur = 6;
          }
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, currentSize, 0, Math.PI * 2);
          ctx.fill();

          if (pt.glow) {
            ctx.shadowBlur = 0;
          }
        }
      }
      ctx.restore();

      for (const ft of s.floatingTexts) {
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.globalAlpha = 1.0;

      // Bottom Defensive Floor Line
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(16, 575, VIRTUAL_WIDTH - 32, 2);

      // In-game Canvas Bottom HUD Strip
      if (s.gameState === 'playing') {
        ctx.font = 'bold 11px monospace';

        ctx.textAlign = 'left';
        ctx.fillStyle = s.p1.color;
        const p1TimerStr = s.p1.weaponTier > 1 ? ` (${s.p1.weaponAmmo})` : '';
        const autoStr = s.autoPlay ? ' [🤖 AUTO]' : '';
        ctx.fillText(
          `1P: LVL ${s.p1.weaponTier} ${s.p1.weaponType.toUpperCase()}${p1TimerStr} | 🛡️:${s.p1.shieldsRemaining} | 💣:${s.p1.mortarAmmo}${autoStr}`,
          24,
          592
        );

        if (s.gameMode === '2p') {
          ctx.textAlign = 'right';
          ctx.fillStyle = s.p2.color;
          const p2TimerStr = s.p2.weaponTier > 1 ? ` (${s.p2.weaponAmmo})` : '';
          ctx.fillText(
            `2P: LVL ${s.p2.weaponTier} ${s.p2.weaponType.toUpperCase()}${p2TimerStr} | 🛡️:${s.p2.shieldsRemaining} | 💣:${s.p2.mortarAmmo}`,
            VIRTUAL_WIDTH - 24,
            592
          );
        }

        if (s.combo > 1) {
          ctx.textAlign = 'center';
          ctx.fillStyle = '#f59e0b';
          ctx.fillText(`COMBO x${s.combo}!`, VIRTUAL_WIDTH / 2, 592);
        }
      }

      // ================= NAME ENTRY (HALL OF FAME QUALIFIER) =================
      if (s.gameState === 'name_entry') {
        ctx.fillStyle = 'rgba(5, 6, 10, 0.92)';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('★ NEW HIGH SCORE! ★', VIRTUAL_WIDTH / 2, 160);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '18px monospace';
        ctx.fillText('YOU QUALIFIED FOR THE HALL OF FAME!', VIRTUAL_WIDTH / 2, 205);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px monospace';
        const scoreVal = qualifyingPlayer ? qualifyingPlayer.score.toLocaleString() : '0';
        const waveVal = qualifyingPlayer ? qualifyingPlayer.wave : 1;
        ctx.fillText(`SCORE: ${scoreVal}  •  WAVE: ${waveVal}`, VIRTUAL_WIDTH / 2, 260);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px monospace';
        ctx.fillText('ENTER YOUR INITIALS (TYPE ON KEYBOARD OR USE BUTTONS):', VIRTUAL_WIDTH / 2, 320);

        // Blinking Initials Display Box
        const blinkCursor = Math.floor(Date.now() / 400) % 2 === 0;
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.fillRect(VIRTUAL_WIDTH / 2 - 120, 350, 240, 60);
        ctx.strokeRect(VIRTUAL_WIDTH / 2 - 120, 350, 240, 60);

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 36px monospace';
        ctx.fillText(`${initialsInput}${blinkCursor && initialsInput.length < 8 ? '_' : ''}`, VIRTUAL_WIDTH / 2, 394);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '14px monospace';
        ctx.fillText('PRESS [ENTER] TO RECORD YOUR GLORY IN HISTORY', VIRTUAL_WIDTH / 2, 455);
      }

      // ================= TITLE SCREEN OVERLAY =================
      if (s.gameState === 'title') {
        ctx.fillStyle = 'rgba(5, 6, 10, 0.88)';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 42px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SPACE INVADERS', VIRTUAL_WIDTH / 2, 120);

        ctx.fillStyle = '#facc15';
        ctx.font = '13px monospace';
        ctx.fillText('★ 2-PLAYER CO-OP • AI AVOIDANCE BOSS • HALL OF FAME ★', VIRTUAL_WIDTH / 2, 150);

        // Point Table
        const tableY = 180;
        drawPixelPattern(ctx, BOSS_DREADNOUGHT_SPRITE, VIRTUAL_WIDTH / 2 - 140, tableY - 4, 1.4, '#38bdf8');
        ctx.fillStyle = '#38bdf8';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('= BOSS STAGE (2500 PTS + AI BULLET AVOIDANCE)', VIRTUAL_WIDTH / 2 - 60, tableY + 14);

        drawPixelPattern(ctx, UFO_SPRITE, VIRTUAL_WIDTH / 2 - 120, tableY + 28, 2.3, '#f43f5e');
        ctx.fillStyle = '#ffffff';
        ctx.fillText('= MOTHERSHIP (100-500 PTS + BONUS BOX DROP)', VIRTUAL_WIDTH / 2 - 60, tableY + 42);

        drawPixelPattern(ctx, SQUID_SPRITE[0], VIRTUAL_WIDTH / 2 - 110, tableY + 54, 2.3, '#c084fc');
        ctx.fillText('= 30 POINTS (SQUID INVADER)', VIRTUAL_WIDTH / 2 - 60, tableY + 68);

        drawPixelPattern(ctx, CRAB_SPRITE[0], VIRTUAL_WIDTH / 2 - 114, tableY + 80, 2.3, '#38bdf8');
        ctx.fillText('= 20 POINTS (CRAB INVADER)', VIRTUAL_WIDTH / 2 - 60, tableY + 94);

        drawPixelPattern(ctx, OCTOPUS_SPRITE[0], VIRTUAL_WIDTH / 2 - 114, tableY + 106, 2.3, '#22c55e');
        ctx.fillText('= 10 POINTS (OCTOPUS INVADER)', VIRTUAL_WIDTH / 2 - 60, tableY + 120);

        // Drops & Rules
        const puY = 345;
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          'BOX DROPS: ⚡ WEAPONS (60s Duration)  •  🛡️ 1 in 5 EXTRA SHIELD  •  ❤️ 1 in 25 EXTRA LIFE',
          VIRTUAL_WIDTH / 2,
          puY
        );

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px monospace';
        ctx.fillText(
          `STAGE 3 BOSS: DREADNOUGHT OVERLORD HAS SMART AI BULLET AVOIDANCE & COUNTER-ATTACKS`,
          VIRTUAL_WIDTH / 2,
          puY + 24
        );

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '12px monospace';
        if (s.gameMode === '2p') {
          ctx.fillText('1P (GREEN): A/D Move • SPACE Shoot • ENTER Deploy 3s Shield', VIRTUAL_WIDTH / 2, puY + 50);
          ctx.fillText('2P (CYAN):  ←/→ Move • ↑/SHIFT Shoot • NUM ENTER/↓ Deploy Shield', VIRTUAL_WIDTH / 2, puY + 70);
        } else {
          ctx.fillText('CONTROLS: ←/→ or A/D Move • SPACE Shoot • ENTER Deploy 3s Shield (3 charges)', VIRTUAL_WIDTH / 2, puY + 60);
        }

        const blink = Math.floor(Date.now() / 450) % 2 === 0;
        if (s.credits <= 0) {
          if (blink) {
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 20px monospace';
            ctx.fillText('INSERT COIN TO PLAY (PRESS C / 5)', VIRTUAL_WIDTH / 2, 490);
          }
        } else {
          if (blink) {
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 20px monospace';
            ctx.fillText(
              s.gameMode === '2p' ? 'PRESS 2P START (SPACEBAR)' : 'PRESS 1P START (SPACEBAR)',
              VIRTUAL_WIDTH / 2,
              490
            );
          }
          ctx.fillStyle = '#facc15';
          ctx.font = 'bold 13px monospace';
          ctx.fillText(`CREDITS LOADED: ${s.credits.toString().padStart(2, '0')}`, VIRTUAL_WIDTH / 2, 520);
        }
      }

      // ================= PAUSED SCREEN OVERLAY =================
      if (s.gameState === 'paused') {
        ctx.fillStyle = 'rgba(5, 6, 10, 0.78)';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME PAUSED', VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 - 15);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '16px monospace';
        ctx.fillText("PRESS 'P' TO RESUME", VIRTUAL_WIDTH / 2, VIRTUAL_HEIGHT / 2 + 25);
      }

      // ================= GAME OVER SCREEN OVERLAY =================
      if (s.gameState === 'game_over') {
        ctx.fillStyle = 'rgba(5, 6, 10, 0.88)';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 44px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', VIRTUAL_WIDTH / 2, 200);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '20px monospace';
        if (s.gameMode === '2p') {
          ctx.fillText(`1P SCORE: ${s.p1.score}   |   2P SCORE: ${s.p2.score}`, VIRTUAL_WIDTH / 2, 255);
        } else {
          ctx.fillText(`FINAL SCORE: ${s.p1.score.toString().padStart(5, '0')}`, VIRTUAL_WIDTH / 2, 255);
        }

        ctx.fillStyle = '#38bdf8';
        ctx.font = '16px monospace';
        ctx.fillText(`WAVE REACHED: ${s.wave}`, VIRTUAL_WIDTH / 2, 295);

        const blink = Math.floor(Date.now() / 450) % 2 === 0;
        if (s.credits > 0) {
          if (blink) {
            ctx.fillStyle = '#22c55e';
            ctx.font = 'bold 20px monospace';
            ctx.fillText('CONTINUE? PRESS SPACE OR TAP PLAY', VIRTUAL_WIDTH / 2, 375);
          }
        } else {
          if (blink) {
            ctx.fillStyle = '#facc15';
            ctx.font = 'bold 20px monospace';
            ctx.fillText('INSERT COIN TO CONTINUE (C / 5)', VIRTUAL_WIDTH / 2, 375);
          }
        }

        ctx.fillStyle = '#facc15';
        ctx.font = '13px monospace';
        ctx.fillText('CLICK [HALL OF FAME] TO VIEW ALL-TIME TOP SCORES', VIRTUAL_WIDTH / 2, 420);
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [spawnFleet, submitHallOfFameScore]);

  // Touch handlers
  const handleTouchP1LeftStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    stateRef.current.keys.p1Left = true;
  };
  const handleTouchP1LeftEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    stateRef.current.keys.p1Left = false;
  };
  const handleTouchP1RightStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    stateRef.current.keys.p1Right = true;
  };
  const handleTouchP1RightEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    stateRef.current.keys.p1Right = false;
  };
  const handleTouchP1Shoot = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (stateRef.current.gameState === 'title' || stateRef.current.gameState === 'game_over') {
      if (stateRef.current.credits > 0) startGame();
      else insertCoin();
    } else {
      stateRef.current.keys.p1Shoot = true;
      setTimeout(() => {
        stateRef.current.keys.p1Shoot = false;
      }, 120);
    }
  };

  const handleTouchP2LeftStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    stateRef.current.keys.p2Left = true;
  };
  const handleTouchP2LeftEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    stateRef.current.keys.p2Left = false;
  };
  const handleTouchP2RightStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    stateRef.current.keys.p2Right = true;
  };
  const handleTouchP2RightEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    stateRef.current.keys.p2Right = false;
  };
  const handleTouchP2Shoot = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    stateRef.current.keys.p2Shoot = true;
    setTimeout(() => {
      stateRef.current.keys.p2Shoot = false;
    }, 120);
  };

  const handleTouchMortarStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const s = stateRef.current;
    if (s.gameState === 'playing' && s.p1.alive && s.p1.mortarAmmo > 0 && !s.keys.p1Mortar) {
      s.keys.p1Mortar = true;
      s.p1.mortarChargeStart = Date.now();
    }
  };
  const handleTouchMortarEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const s = stateRef.current;
    if (s.keys.p1Mortar && s.p1.mortarAmmo > 0) {
      s.keys.p1Mortar = false;
      const holdTime = Math.min(2500, Math.max(150, Date.now() - (s.p1.mortarChargeStart || Date.now())));
      s.p1.mortarAmmo -= 1;
      const chargeRatio = (holdTime - 150) / 2350;
      const targetY = 420 - chargeRatio * 340;

      soundManager.playMortarLaunch();
      s.bulletIdCounter++;
      s.bullets.push({
        id: s.bulletIdCounter,
        x: s.p1.x + s.p1.width / 2,
        y: s.p1.y - 6,
        width: 8,
        height: 10,
        speedY: -6.5,
        color: '#f97316',
        isPlayer: true,
        playerId: 1,
        isMortar: true,
        targetY,
        mortarRadius: 80 + chargeRatio * 80, // Dynamic blast radius: 80px up to 160px depending on charge
        damage: 6 + Math.round(chargeRatio * 6),
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full flex flex-col items-center select-none ${
        isFullscreen ? 'bg-neutral-950 p-2 sm:p-4 justify-center min-h-screen overflow-y-auto' : ''
      }`}
    >
      {/* Arcade Marquee / Header */}
      <div className="w-full max-w-4xl bg-neutral-900 border-x border-t border-neutral-700 rounded-t-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Scores & Mode */}
        <div className="flex items-center gap-4 sm:gap-6 font-mono text-xs sm:text-sm">
          <div>
            <span className="text-emerald-400 block text-[10px] uppercase font-bold">1P Score</span>
            <span className="text-white font-bold tracking-wider text-sm sm:text-base">
              {p1State.score.toString().padStart(5, '0')}
            </span>
          </div>

          {gameMode === '2p' && (
            <div>
              <span className="text-cyan-400 block text-[10px] uppercase font-bold">2P Score</span>
              <span className="text-white font-bold tracking-wider text-sm sm:text-base">
                {p2State.score.toString().padStart(5, '0')}
              </span>
            </div>
          )}

          <div>
            <span className="text-amber-400 block text-[10px] uppercase font-bold">Hi-Score</span>
            <span className="text-amber-300 font-bold tracking-wider text-sm sm:text-base">
              {highScore.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-sky-400 block text-[10px] uppercase font-bold">Wave</span>
            <span className="text-white font-bold text-sm sm:text-base">{wave}</span>
          </div>
        </div>

        {/* Hall of Fame, Mode & Difficulty Selectors */}
        <div className="flex items-center gap-2">
          {/* Hall of Fame Trigger */}
          <button
            id="hall-of-fame-header-btn"
            onClick={() => setShowHallOfFameModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold transition-all cursor-pointer shadow-xs"
            title="View Top 5 Hall of Fame"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>HALL OF FAME</span>
          </button>

          {/* Mode Selector */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs font-mono">
            <button
              id="mode-1p-btn"
              onClick={() => handleSelectGameMode('1p')}
              className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
                gameMode === '1p'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              1P
            </button>
            <button
              id="mode-2p-btn"
              onClick={() => handleSelectGameMode('2p')}
              className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-colors ${
                gameMode === '2p'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              2P CO-OP
            </button>
          </div>

          {/* Difficulty Selector */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs font-mono">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                id={`diff-${d}-btn`}
                onClick={() => handleSelectDifficulty(d)}
                className={`px-2 py-1 rounded font-bold uppercase transition-all cursor-pointer text-[11px] ${
                  difficulty === d
                    ? d === 'easy'
                      ? 'bg-emerald-600 text-white'
                      : d === 'medium'
                      ? 'bg-amber-600 text-white'
                      : 'bg-red-600 text-white'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Audio, Scanline, Fullscreen & Auto-Play toggles */}
          <div className="flex items-center gap-1 border-l border-neutral-700 pl-2">
            <button
              id="sound-toggle-btn"
              onClick={handleToggleSound}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                isMuted
                  ? 'border-red-500/40 text-red-400 bg-red-950/30'
                  : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
              }`}
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button
              id="scanlines-toggle-btn"
              onClick={() => setScanlines(!scanlines)}
              className={`px-2 py-1 rounded-lg border text-xs transition-colors cursor-pointer font-mono ${
                scanlines
                  ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                  : 'border-neutral-700 text-neutral-400 hover:bg-neutral-800'
              }`}
              title="Toggle CRT Scanline Overlay"
            >
              CRT
            </button>
            <button
              id="fullscreen-toggle-btn"
              onClick={toggleFullscreen}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                isFullscreen
                  ? 'border-sky-400 bg-sky-600 text-white shadow-md'
                  : 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
              }`}
              title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              id="autoplay-toggle-btn"
              onClick={handleAutoPlayClick}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                autoPlay
                  ? 'border-purple-400 bg-purple-600 text-white shadow-md animate-pulse'
                  : 'border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
              title={
                autoPlay
                  ? 'Click to turn off Auto-Play Bot'
                  : isAutoPlayUnlocked
                  ? 'Start Auto-Play Bot'
                  : 'Password Protected (Pass: wolf)'
              }
            >
              {isAutoPlayUnlocked ? (
                <Bot className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{autoPlay ? 'AUTO: ON' : 'AUTO'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Screen Cabinet Frame */}
      <div className="relative w-full max-w-4xl bg-black border border-neutral-700 shadow-2xl overflow-hidden aspect-[4/3] flex items-center justify-center">
        <canvas
          id="space-invaders-canvas"
          ref={canvasRef}
          width={VIRTUAL_WIDTH}
          height={VIRTUAL_HEIGHT}
          onClick={() => {
            if (gameState === 'title' || gameState === 'game_over') {
              if (credits > 0) startGame();
              else insertCoin();
            }
          }}
          className="w-full h-full object-contain cursor-crosshair block"
        />

        {/* CRT Scanline Overlay */}
        {scanlines && (
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] opacity-70 z-10" />
        )}
      </div>

      {/* Name Entry interactive bezel banner (when player qualifies for Hall of Fame) */}
      {gameState === 'name_entry' && (
        <div className="w-full max-w-4xl bg-amber-950/40 border-x border-amber-500/50 px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 font-bold">PILOT INITIALS:</span>
            <input
              id="pilot-initials-input"
              type="text"
              maxLength={10}
              value={initialsInput}
              onChange={(e) => setInitialsInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitHallOfFameScore();
              }}
              className="px-2 py-1 bg-neutral-900 border border-amber-400 rounded text-amber-300 font-bold text-sm tracking-widest uppercase w-32 text-center"
              autoFocus
            />
          </div>

          <button
            id="submit-hall-of-fame-btn"
            onClick={submitHallOfFameScore}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded cursor-pointer transition-colors shadow-xs"
          >
            SUBMIT TO HALL OF FAME
          </button>
        </div>
      )}

      {/* Retro Arcade Lower Bezel: Coin Slot & Equipment Status */}
      <div className="w-full max-w-4xl bg-neutral-950 border-x border-neutral-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Coin Slot & Credits */}
        <div className="flex items-center gap-3">
          <button
            id="insert-coin-btn"
            onClick={insertCoin}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-bold text-xs cursor-pointer transition-all ${
              coinAnim
                ? 'scale-95 bg-amber-400 text-neutral-950 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.9)]'
                : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
            }`}
            title="Click or press 'C' / '5' to insert a coin"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse inline-block" />
            <span>INSERT COIN (25¢)</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-md">
            <span className="text-neutral-500">CREDIT</span>
            <span className="text-amber-400 font-bold text-sm tracking-wider">
              {credits.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Player Statuses (1P & 2P) */}
        <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
          {/* 1P Status */}
          <div className="flex items-center gap-2 bg-neutral-900 px-2.5 py-1 rounded border border-emerald-500/40">
            <span className="text-emerald-400 font-bold">1P:</span>
            <span className="text-neutral-300">
              ❤️ {p1State.lives}
            </span>
            <span className="text-sky-300 font-semibold">
              LVL {p1State.weaponTier} {p1State.weaponTime > 0 ? `(${p1State.weaponTime}s)` : ''}
            </span>
            <button
              id="p1-shield-btn"
              onClick={() => deployShield(1)}
              disabled={p1State.shields <= 0 || p1State.shieldActive}
              className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer ${
                p1State.shieldActive
                  ? 'bg-purple-600 text-white border-purple-400 animate-pulse'
                  : p1State.shields > 0
                  ? 'bg-purple-950/50 hover:bg-purple-900/70 text-purple-300 border-purple-500/50'
                  : 'bg-neutral-800 text-neutral-600 border-neutral-700 cursor-not-allowed'
              }`}
              title="Press 'Enter' to deploy 3-second shield"
            >
              🛡️ {p1State.shields} (ENTER)
            </button>
          </div>

          {/* 2P Status */}
          {gameMode === '2p' && (
            <div className="flex items-center gap-2 bg-neutral-900 px-2.5 py-1 rounded border border-cyan-500/40">
              <span className="text-cyan-400 font-bold">2P:</span>
              <span className="text-neutral-300">
                ❤️ {p2State.lives}
              </span>
              <span className="text-sky-300 font-semibold">
                LVL {p2State.weaponTier} {p2State.weaponTime > 0 ? `(${p2State.weaponTime}s)` : ''}
              </span>
              <button
                id="p2-shield-btn"
                onClick={() => deployShield(2)}
                disabled={p2State.shields <= 0 || p2State.shieldActive}
                className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer ${
                  p2State.shieldActive
                    ? 'bg-purple-600 text-white border-purple-400 animate-pulse'
                    : p2State.shields > 0
                    ? 'bg-purple-950/50 hover:bg-purple-900/70 text-purple-300 border-purple-500/50'
                    : 'bg-neutral-800 text-neutral-600 border-neutral-700 cursor-not-allowed'
                }`}
                title="Press 'NUMPAD ENTER' or 'Down Arrow' to deploy 3-second shield"
              >
                🛡️ {p2State.shields} (↓)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Touch and Mobile Gameplay Controls */}
      <div className="w-full max-w-4xl bg-neutral-900 border-x border-b border-neutral-700 rounded-b-xl px-2 sm:px-4 py-3 select-none touch-manipulation">
        {/* Ergonomic Two-Thumb Mobile Layout: ◀ on far left, action buttons in middle, ▶ on far right */}
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Far Left: Left Thumb Move Left */}
          <button
            id="mobile-btn-left"
            onMouseDown={handleTouchP1LeftStart}
            onMouseUp={handleTouchP1LeftEnd}
            onMouseLeave={handleTouchP1LeftEnd}
            onTouchStart={handleTouchP1LeftStart}
            onTouchEnd={handleTouchP1LeftEnd}
            className="w-14 h-12 bg-neutral-800 hover:bg-neutral-700 active:bg-emerald-600 text-neutral-100 border-2 border-neutral-600 active:border-emerald-400 rounded-xl flex items-center justify-center font-bold text-2xl cursor-pointer transition-colors shadow-md select-none shrink-0"
            aria-label="Move Left"
          >
            ◀
          </button>

          {/* Center Action Buttons: FIRE, 💣 MTR, 🛡️ SHIELD */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap flex-1 px-1">
            <button
              id="mobile-btn-fire"
              onMouseDown={handleTouchP1Shoot}
              onTouchStart={handleTouchP1Shoot}
              className="h-12 px-4 sm:px-6 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-mono font-bold text-sm tracking-wide rounded-xl flex items-center justify-center border-2 border-red-400 shadow-md cursor-pointer transition-colors select-none"
              aria-label="Fire Weapon"
            >
              FIRE 💥
            </button>
            <button
              id="mobile-btn-mortar"
              onMouseDown={handleTouchMortarStart}
              onMouseUp={handleTouchMortarEnd}
              onMouseLeave={handleTouchMortarEnd}
              onTouchStart={handleTouchMortarStart}
              onTouchEnd={handleTouchMortarEnd}
              disabled={p1State.mortarAmmo <= 0}
              className="h-12 px-3 bg-amber-700 hover:bg-amber-600 active:bg-amber-800 disabled:opacity-40 text-white font-mono font-bold text-xs tracking-wide rounded-xl flex items-center justify-center border-2 border-amber-400 shadow-md cursor-pointer transition-colors select-none"
              aria-label="Hold to charge mortar"
              title="Hold to charge height, release to launch mortar"
            >
              💣 MTR ({p1State.mortarAmmo})
            </button>
            <button
              id="mobile-btn-shield"
              onClick={() => deployShield(1)}
              disabled={p1State.shields <= 0 || p1State.shieldActive}
              className="h-12 px-3 bg-purple-700 hover:bg-purple-600 active:bg-purple-800 disabled:opacity-40 text-white font-mono font-bold text-xs tracking-wide rounded-xl flex items-center justify-center border-2 border-purple-400 shadow-md cursor-pointer transition-colors select-none"
              aria-label="Deploy Shield"
            >
              🛡️ SHIELD
            </button>

            {/* 2P Mobile Controls if 2P Mode active */}
            {gameMode === '2p' && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-700">
                <span className="text-cyan-400 font-bold text-xs font-mono">2P:</span>
                <button
                  id="mobile-2p-btn-left"
                  onMouseDown={handleTouchP2LeftStart}
                  onMouseUp={handleTouchP2LeftEnd}
                  onMouseLeave={handleTouchP2LeftEnd}
                  onTouchStart={handleTouchP2LeftStart}
                  onTouchEnd={handleTouchP2LeftEnd}
                  className="w-10 h-11 bg-neutral-800 hover:bg-neutral-700 active:bg-cyan-600 text-neutral-200 border border-neutral-600 rounded-lg flex items-center justify-center font-bold text-base cursor-pointer select-none"
                >
                  ◀
                </button>
                <button
                  id="mobile-2p-btn-right"
                  onMouseDown={handleTouchP2RightStart}
                  onMouseUp={handleTouchP2RightEnd}
                  onMouseLeave={handleTouchP2RightEnd}
                  onTouchStart={handleTouchP2RightStart}
                  onTouchEnd={handleTouchP2RightEnd}
                  className="w-10 h-11 bg-neutral-800 hover:bg-neutral-700 active:bg-cyan-600 text-neutral-200 border border-neutral-600 rounded-lg flex items-center justify-center font-bold text-base cursor-pointer select-none"
                >
                  ▶
                </button>
                <button
                  id="mobile-2p-btn-fire"
                  onMouseDown={handleTouchP2Shoot}
                  onTouchStart={handleTouchP2Shoot}
                  className="h-11 px-3 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-mono font-bold text-xs rounded-lg flex items-center justify-center border border-cyan-400 shadow-md cursor-pointer select-none"
                >
                  2P FIRE
                </button>
              </div>
            )}
          </div>

          {/* Far Right: Right Thumb Move Right */}
          <button
            id="mobile-btn-right"
            onMouseDown={handleTouchP1RightStart}
            onMouseUp={handleTouchP1RightEnd}
            onMouseLeave={handleTouchP1RightEnd}
            onTouchStart={handleTouchP1RightStart}
            onTouchEnd={handleTouchP1RightEnd}
            className="w-14 h-12 bg-neutral-800 hover:bg-neutral-700 active:bg-emerald-600 text-neutral-100 border-2 border-neutral-600 active:border-emerald-400 rounded-xl flex items-center justify-center font-bold text-2xl cursor-pointer transition-colors shadow-md select-none shrink-0"
            aria-label="Move Right"
          >
            ▶
          </button>
        </div>

        {/* Secondary Bar: Pause / Restart / Start */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-neutral-800/80">
          <div className="flex items-center gap-2 font-mono text-xs">
            {gameState === 'playing' ? (
              <button
                id="pause-game-btn"
                onClick={togglePause}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-600 rounded-lg cursor-pointer transition-colors"
              >
                PAUSE (P)
              </button>
            ) : gameState === 'paused' ? (
              <button
                id="resume-game-btn"
                onClick={togglePause}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg cursor-pointer transition-colors"
              >
                RESUME (P)
              </button>
            ) : null}

            {gameState !== 'title' && (
              <button
                id="restart-game-btn"
                onClick={restartGame}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700 rounded-lg cursor-pointer transition-colors"
              >
                RESET (R)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              id="start-game-btn"
              onClick={() => {
                if (credits > 0) startGame();
                else insertCoin();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer transition-colors shadow-[0_0_12px_rgba(16,185,129,0.4)]"
            >
              {credits > 0 ? (gameMode === '2p' ? '2P START (SPACE)' : '1P START (SPACE)') : 'INSERT COIN (C)'}
            </button>
          </div>
        </div>
      </div>

      {/* Hall of Fame Modal */}
      <HallOfFameModal
        isOpen={showHallOfFameModal}
        onClose={() => setShowHallOfFameModal(false)}
        scores={hallOfFame}
      />

      {/* Auto-Play Bot Password Protection Modal */}
      {showAutoPlayPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-purple-500/50 rounded-xl max-w-sm w-full p-6 shadow-2xl font-mono text-center">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center mx-auto mb-3 text-purple-400">
              <Lock className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-purple-300 tracking-wider mb-1">
              AUTHENTICATION REQUIRED
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Enter security clearance key to engage AI Tactical Pilot.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyPassword();
              }}
              className="flex flex-col gap-3"
            >
              <input
                id="bot-password-input"
                type="password"
                placeholder="Enter password..."
                value={autoPlayPasswordInput}
                onChange={(e) => {
                  setAutoPlayPasswordInput(e.target.value);
                  setAutoPlayPasswordError(false);
                }}
                className={`w-full px-3 py-2 bg-neutral-950 border rounded-lg text-white font-mono text-center tracking-widest text-sm focus:outline-hidden ${
                  autoPlayPasswordError
                    ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                    : 'border-neutral-700 focus:border-purple-400'
                }`}
                autoFocus
              />

              {autoPlayPasswordError && (
                <p className="text-xs text-red-400 font-semibold animate-shake">
                  ❌ ACCESS DENIED: Invalid Password
                </p>
              )}

              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAutoPlayPasswordModal(false)}
                  className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                >
                  CANCEL
                </button>
                <button
                  id="submit-bot-password-btn"
                  type="submit"
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-md"
                >
                  UNLOCK BOT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
