import { useState } from 'react';
import { Copy, Check, X, Terminal } from 'lucide-react';

interface PythonCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PYTHON_CODE = `import pygame
import random
import sys

# Initialize Pygame
pygame.init()

# Screen setup (800x600 resolution)
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Space Invaders")

# Colors
BLACK  = (10, 10, 18)
WHITE  = (255, 255, 255)
RED    = (255, 60, 60)
GREEN  = (50, 255, 100)
BLUE   = (80, 160, 255)
YELLOW = (255, 220, 50)
PURPLE = (200, 100, 255)

clock = pygame.time.Clock()
FPS = 60

class Player:
    def __init__(self):
        self.width = 46
        self.height = 24
        self.x = SCREEN_WIDTH // 2 - self.width // 2
        self.y = SCREEN_HEIGHT - 65
        self.speed = 6
        self.color = GREEN
        self.last_shot = 0
        self.shoot_cooldown = 260  # ms
        self.lives = 3
        
    def move(self, keys):
        if (keys[pygame.K_LEFT] or keys[pygame.K_a]) and self.x > 15:
            self.x -= self.speed
        if (keys[pygame.K_RIGHT] or keys[pygame.K_d]) and self.x < SCREEN_WIDTH - self.width - 15:
            self.x += self.speed
            
    def shoot(self, current_time):
        if current_time - self.last_shot >= self.shoot_cooldown:
            self.last_shot = current_time
            return Bullet(self.x + self.width // 2, self.y - 4, speed_y=-9, color=GREEN, is_player=True)
        return None

    def draw(self, surface):
        # Draw tank body
        pygame.draw.rect(surface, self.color, (self.x, self.y + 8, self.width, self.height - 8))
        # Turret
        pygame.draw.rect(surface, self.color, (self.x + self.width // 2 - 4, self.y, 8, 10))

class Enemy:
    def __init__(self, x, y, enemy_type, points, color):
        self.x = x
        self.y = y
        self.width = 38
        self.height = 26
        self.type = enemy_type
        self.points = points
        self.color = color
        self.active = True

    def draw(self, surface):
        # Retro boxy alien representation
        pygame.draw.rect(surface, self.color, (self.x, self.y, self.width, self.height), border_radius=4)
        # Eyes
        pygame.draw.rect(surface, BLACK, (self.x + 8, self.y + 6, 6, 6))
        pygame.draw.rect(surface, BLACK, (self.x + self.width - 14, self.y + 6, 6, 6))

class Bullet:
    def __init__(self, x, y, speed_y, color, is_player=False):
        self.width = 4
        self.height = 12
        self.x = x - self.width // 2
        self.y = y
        self.speed_y = speed_y
        self.color = color
        self.active = True
        self.is_player = is_player
        
    def move(self):
        self.y += self.speed_y
        if self.y < -15 or self.y > SCREEN_HEIGHT + 15:
            self.active = False
            
    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        pygame.draw.rect(surface, self.color, (self.x, self.y, self.width, self.height))

class EnemyFleet:
    def __init__(self, wave=1):
        self.enemies = []
        self.wave = wave
        self.direction = 1
        self.speed_x = 1.2 + (wave * 0.3)
        self.drop_distance = 18
        self.last_shot_time = 0
        self.shoot_interval = max(600, 1800 - (wave * 200))
        self.spawn_fleet()

    def spawn_fleet(self):
        self.enemies.clear()
        rows = 5
        cols = 10
        spacing_x = 56
        spacing_y = 40
        start_x = (SCREEN_WIDTH - (cols * spacing_x)) // 2
        start_y = 65

        row_types = [
            ('squid', 30, PURPLE),
            ('crab', 20, BLUE),
            ('crab', 20, BLUE),
            ('octopus', 10, GREEN),
            ('octopus', 10, GREEN)
        ]

        for r in range(rows):
            e_type, points, color = row_types[r]
            for c in range(cols):
                ex = start_x + c * spacing_x
                ey = start_y + r * spacing_y
                self.enemies.append(Enemy(ex, ey, e_type, points, color))

    def update(self):
        edge_hit = False
        for e in self.enemies:
            e.x += self.speed_x * self.direction
            if (e.x + e.width >= SCREEN_WIDTH - 20 and self.direction > 0) or (e.x <= 20 and self.direction < 0):
                edge_hit = True

        if edge_hit:
            self.direction *= -1
            for e in self.enemies:
                e.y += self.drop_distance

    def get_bottom_shooters(self):
        columns = {}
        for e in self.enemies:
            col_key = round(e.x / 40)
            if col_key not in columns or e.y > columns[col_key].y:
                columns[col_key] = e
        return list(columns.values())

    def maybe_shoot(self, current_time):
        if not self.enemies:
            return None
        if current_time - self.last_shot_time >= self.shoot_interval:
            self.last_shot_time = current_time
            shooters = self.get_bottom_shooters()
            if shooters:
                shooter = random.choice(shooters)
                return Bullet(shooter.x + shooter.width // 2, shooter.y + shooter.height, speed_y=5, color=RED)
        return None

class Game:
    def __init__(self):
        self.player = Player()
        self.wave = 1
        self.fleet = EnemyFleet(self.wave)
        self.bullets = []
        self.score = 0
        self.game_over = False
        self.font = pygame.font.SysFont("monospace", 20, bold=True)
        self.big_font = pygame.font.SysFont("monospace", 36, bold=True)

    def update(self, keys):
        if self.game_over:
            if keys[pygame.K_r]:
                self.__init__()
            return

        current_time = pygame.time.get_ticks()
        self.player.move(keys)

        if keys[pygame.K_SPACE]:
            shot = self.player.shoot(current_time)
            if shot:
                self.bullets.append(shot)

        # Fleet update
        self.fleet.update()
        enemy_shot = self.fleet.maybe_shoot(current_time)
        if enemy_shot:
            self.bullets.append(enemy_shot)

        # Bullets movement
        for b in self.bullets:
            b.move()
        self.bullets = [b for b in self.bullets if b.active]

        player_rect = pygame.Rect(self.player.x, self.player.y, self.player.width, self.player.height)

        # Collision checks
        for b in self.bullets:
            if not b.active:
                continue
            b_rect = b.get_rect()

            if b.is_player:
                for e in self.fleet.enemies:
                    if e.active and pygame.Rect(e.x, e.y, e.width, e.height).colliderect(b_rect):
                        b.active = False
                        e.active = False
                        self.score += e.points
                        break
            else:
                if player_rect.colliderect(b_rect):
                    b.active = False
                    self.player.lives -= 1
                    if self.player.lives <= 0:
                        self.game_over = True

        self.fleet.enemies = [e for e in self.fleet.enemies if e.active]

        # Check invasion reach
        for e in self.fleet.enemies:
            if e.y + e.height >= self.player.y:
                self.game_over = True

        # Wave cleared
        if not self.fleet.enemies:
            self.wave += 1
            self.fleet = EnemyFleet(self.wave)

    def draw(self, surface):
        surface.fill(BLACK)
        self.player.draw(surface)

        for e in self.fleet.enemies:
            e.draw(surface)

        for b in self.bullets:
            b.draw(surface)

        # HUD
        score_surf = self.font.render(f"SCORE: {self.score}", True, WHITE)
        wave_surf = self.font.render(f"WAVE: {self.wave}", True, YELLOW)
        lives_surf = self.font.render(f"LIVES: {self.player.lives}", True, GREEN)
        surface.blit(score_surf, (20, 16))
        surface.blit(wave_surf, (SCREEN_WIDTH // 2 - 40, 16))
        surface.blit(lives_surf, (SCREEN_WIDTH - 120, 16))

        if self.game_over:
            over_surf = self.big_font.render("GAME OVER", True, RED)
            prompt_surf = self.font.render("Press 'R' to Restart", True, WHITE)
            surface.blit(over_surf, (SCREEN_WIDTH // 2 - 100, SCREEN_HEIGHT // 2 - 30))
            surface.blit(prompt_surf, (SCREEN_WIDTH // 2 - 110, SCREEN_HEIGHT // 2 + 20))

def main():
    game = Game()
    running = True

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        keys = pygame.key.get_pressed()
        game.update(keys)
        game.draw(screen)

        pygame.display.flip()
        clock.tick(FPS)

    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()
`;

export function PythonCodeModal({ isOpen, onClose }: PythonCodeModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(PYTHON_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="python-code-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 sm:p-6"
    >
      <div
        id="python-code-modal"
        className="bg-neutral-900 border border-neutral-700 w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden text-neutral-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-semibold tracking-wide text-neutral-100">
                Fixed Python (Pygame) Script
              </h2>
              <p className="text-xs text-neutral-400">
                Run locally with <code className="text-emerald-400">pip install pygame</code> &amp; <code className="text-emerald-400">python space_invaders.py</code>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="copy-python-code-btn"
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-lg transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Code
                </>
              )}
            </button>
            <button
              id="close-python-code-btn"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Close code dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-neutral-950 font-mono text-xs text-neutral-300 leading-relaxed select-all">
          <pre className="whitespace-pre overflow-x-auto">{PYTHON_CODE}</pre>
        </div>
      </div>
    </div>
  );
}
