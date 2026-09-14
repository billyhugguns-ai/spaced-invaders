import { useState } from 'react';
import { SpaceInvadersGame } from './components/SpaceInvadersGame';
import { PythonCodeModal } from './components/PythonCodeModal';
import { Terminal, Gamepad2, Info } from 'lucide-react';

export default function App() {
  const [showPythonModal, setShowPythonModal] = useState(false);

  return (
    <div
      id="space-invaders-app"
      className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex flex-col items-center justify-between p-1 sm:p-4 md:p-6"
    >
      {/* Top Bar / Navigation */}
      <header className="w-full max-w-6xl flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider font-mono text-emerald-400 flex items-center gap-2">
              SPACE INVADERS
              <span className="text-[10px] uppercase font-sans font-semibold tracking-normal px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                AI BOSS &bull; 2P CO-OP &bull; HALL OF FAME
              </span>
            </h1>
            <p className="text-xs text-neutral-400 hidden sm:block">
              1P: A/D + SPACE (ENTER: Shield) &bull; 2P: ←/→ + ↑ (↓: Shield) &bull; Stage 5 AI Dreadnought Boss &bull; Top 5 Hall of Fame
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="open-python-code-btn"
            onClick={() => setShowPythonModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 hover:border-neutral-600 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer shadow-xs"
            title="View fixed Python Pygame code"
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">View Python Code</span>
            <span className="sm:hidden">Python</span>
          </button>
        </div>
      </header>

      {/* Main Arcade Area */}
      <main className="w-full flex-1 flex flex-col items-center justify-center max-w-6xl my-auto">
        <SpaceInvadersGame />
      </main>

      {/* Footer Info & Instructions */}
      <footer className="w-full max-w-4xl mt-3 pt-2 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-400 font-mono">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <span>Mothership drops: ⚡Weapons (60s), 🛡️1-in-5 Shields (3s), ❤️1-in-25 1UP &bull; Stage 5 AI Boss Avoidance</span>
        </div>
        <div className="text-neutral-400">
          Stage 2+ descent accelerates quicker &bull; Top 5 Hall of Fame in Local Storage
        </div>
      </footer>

      {/* Python Code Viewer Modal */}
      <PythonCodeModal
        isOpen={showPythonModal}
        onClose={() => setShowPythonModal(false)}
      />
    </div>
  );
}
