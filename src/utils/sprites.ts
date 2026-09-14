// 8-bit pixel matrix patterns for Space Invaders (two animation frames each)
export const SQUID_SPRITE = [
  // Frame 0
  [
    "  ██  ",
    " ████ ",
    "██████",
    "██ ██ ",
    "██████",
    "  █   ",
    " █ █  ",
    "█   █ "
  ],
  // Frame 1
  [
    "  ██  ",
    " ████ ",
    "██████",
    "██ ██ ",
    "██████",
    " █  █ ",
    "  ██  ",
    " █  █ "
  ]
];

export const CRAB_SPRITE = [
  // Frame 0
  [
    "  █     █  ",
    "   █   █   ",
    "  ███████  ",
    " ██ ███ ██ ",
    "███████████",
    "█ ███████ █",
    "█ █     █ █",
    "   ██ ██   "
  ],
  // Frame 1
  [
    "  █     █  ",
    "█  █   █  █",
    "█ ███████ █",
    "███ ███ ███",
    "███████████",
    "  ███████  ",
    "  █     █  ",
    " █       █ "
  ]
];

export const OCTOPUS_SPRITE = [
  // Frame 0
  [
    "    ████    ",
    "  ████████  ",
    " ██████████ ",
    "███  ██  ███",
    "████████████",
    "  ███  ███  ",
    " ██  ██  ██ ",
    "  ██    ██  "
  ],
  // Frame 1
  [
    "    ████    ",
    "  ████████  ",
    " ██████████ ",
    "███  ██  ███",
    "████████████",
    "   ██  ██   ",
    "  ██ ██ ██  ",
    "██        ██"
  ]
];

export const UFO_SPRITE = [
  "    ████████    ",
  "  ████████████  ",
  " ██████████████ ",
  "██ ██ ██ ██ ████",
  "████████████████",
  "  ███  ██  ███  ",
  "   █        █   "
];

export const MOTHERSHIP_SPRITE = [
  "      ██████████████      ",
  "    ██████████████████    ",
  "  ██████████████████████  ",
  " ████  ██  ██  ██  ██████ ",
  "██████████████████████████",
  "██████████████████████████",
  "  ████  ████████  ████    ",
  "   ██      ██      ██     "
];

export const PLAYER_SPRITE = [
  "       ██       ",
  "       ██       ",
  "      ████      ",
  "  ████████████  ",
  " ██████████████ ",
  "████████████████",
  "████████████████",
  "████████████████"
];

export const PLAYER_P1_SPRITE = [
  "     ██     ",
  "     ██     ",
  "    ████    ",
  "   ██████   ",
  "  ████████  ",
  " ██████████ ",
  "████████████",
  "██  ████  ██"
];

export const PLAYER_P2_SPRITE = [
  "    ████    ",
  "     ██     ",
  "    ████    ",
  "  ████████  ",
  " ██████████ ",
  "████████████",
  "██  ████  ██",
  "█    ██    █"
];

export const BOSS_DREADNOUGHT_SPRITE = [
  "        ████████████████████████        ",
  "      ████████████████████████████      ",
  "    ████████  ████████████  ████████    ",
  "  ████████████████████████████████████  ",
  "████  ████  ████████████████  ████  ████",
  "████████████████████████████████████████",
  "██████████  ████████████████  ██████████",
  "  ██████      ████    ████      ██████  ",
  "    ████        ██    ██        ████    ",
  "      ██                        ██      "
];

export function drawMissile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Missile body
  ctx.fillStyle = color;
  ctx.fillRect(-2, -7, 4, 14);
  // Nosecone
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(-2, -7);
  ctx.lineTo(0, -11);
  ctx.lineTo(2, -7);
  ctx.closePath();
  ctx.fill();
  // Fins
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect(-4, 2, 2, 4);
  ctx.fillRect(2, 2, 2, 4);
  // Thruster glow
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-1.5, 7, 3, 4 + Math.random() * 3);
  ctx.restore();
}

export function drawPixelPattern(
  ctx: CanvasRenderingContext2D,
  pattern: string[],
  startX: number,
  startY: number,
  pixelSize: number,
  color: string
) {
  ctx.fillStyle = color;
  const rows = pattern.length;
  for (let r = 0; r < rows; r++) {
    const row = pattern[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === '█') {
        ctx.fillRect(
          startX + c * pixelSize,
          startY + r * pixelSize,
          pixelSize,
          pixelSize
        );
      }
    }
  }
}

export function drawPowerUpCapsule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  color: string,
  glowColor: string,
  pulse: number
) {
  const width = 28;
  const height = 22;
  const rx = x - width / 2;
  const ry = y - height / 2;

  // Outer glowing aura
  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 8 + Math.sin(pulse) * 4;

  // Capsule frame
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(rx, ry, width, height, 5);
  ctx.fill();
  ctx.stroke();

  // Highlight bar
  ctx.fillStyle = color;
  ctx.fillRect(rx + 3, ry + 2, width - 6, 2);

  // Symbol / Letter
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + 1);

  ctx.restore();
}

export const ARMORED_SPRITE = [
  [
    "  ██████  ",
    " ████████ ",
    "██████████",
    "██ ██  ██ ",
    "██████████",
    " ████████ ",
    "  ██  ██  ",
    "  ██  ██  "
  ],
  [
    "  ██████  ",
    " ████████ ",
    "██████████",
    "██ ██  ██ ",
    "██████████",
    " ████████ ",
    "  ██  ██  ",
    " ██    ██ "
  ]
];

export const HUNTER_SPRITE = [
  [
    "   ████   ",
    " ██    ██ ",
    "██████████",
    "█ ██████ █",
    "██████████",
    " ██    ██ ",
    "  ██  ██  ",
    "   ████   "
  ],
  [
    "   ████   ",
    " ██    ██ ",
    "██████████",
    "█ ██████ █",
    "██████████",
    "  ██  ██  ",
    " ██    ██ ",
    "  ██████  "
  ]
];

export const GLIDER_SPRITE = [
  [
    "    ██    ",
    "   ████   ",
    "  ██████  ",
    " ██ ██ ██ ",
    "██████████",
    " ████████ ",
    "  █    █  ",
    "  █    █  "
  ],
  [
    "    ██    ",
    "   ████   ",
    "  ██████  ",
    " ██ ██ ██ ",
    "██████████",
    " ████████ ",
    "   █  █   ",
    "   █  █   "
  ]
];
