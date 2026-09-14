import React from 'react';
import { HighScoreEntry } from '../types';
import { Trophy, Medal, X } from 'lucide-react';

interface HallOfFameModalProps {
  isOpen: boolean;
  onClose: () => void;
  scores: HighScoreEntry[];
  highlightId?: string;
}

export function HallOfFameModal({
  isOpen,
  onClose,
  scores,
  highlightId,
}: HallOfFameModalProps) {
  if (!isOpen) return null;

  return (
    <div
      id="hall-of-fame-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-neutral-900 border border-amber-500/40 rounded-xl shadow-2xl overflow-hidden font-mono">
        {/* Header */}
        <div className="bg-neutral-950 px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-amber-400 tracking-wider">
                HALL OF FAME
              </h2>
              <p className="text-[11px] text-neutral-400">
                TOP 5 ALL-TIME SPACE DEFENDERS
              </p>
            </div>
          </div>

          <button
            id="close-hall-of-fame-btn"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scores Table */}
        <div className="p-5 space-y-2.5">
          <div className="grid grid-cols-12 text-[11px] uppercase tracking-wider text-neutral-500 font-bold px-3 pb-1 border-b border-neutral-800">
            <span className="col-span-2">Rank</span>
            <span className="col-span-3">Pilot</span>
            <span className="col-span-3 text-right">Score</span>
            <span className="col-span-2 text-center">Wave</span>
            <span className="col-span-2 text-right">Mode</span>
          </div>

          {scores.map((entry, index) => {
            const isHighlighted = highlightId === entry.id;
            const rankColors = [
              'text-amber-400 bg-amber-500/10 border-amber-500/30',
              'text-slate-300 bg-slate-500/10 border-slate-400/30',
              'text-amber-600 bg-amber-700/10 border-amber-600/30',
              'text-neutral-400 bg-neutral-800/40 border-neutral-700/30',
              'text-neutral-500 bg-neutral-800/20 border-neutral-800/30',
            ];

            return (
              <div
                key={entry.id}
                className={`grid grid-cols-12 items-center px-3 py-2.5 rounded-lg text-xs sm:text-sm border transition-all ${
                  isHighlighted
                    ? 'bg-amber-950/40 border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                    : rankColors[index] || 'bg-neutral-950/40 border-neutral-800'
                }`}
              >
                {/* Rank Badge */}
                <div className="col-span-2 flex items-center gap-1 font-bold">
                  {index === 0 ? (
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  ) : index < 3 ? (
                    <Medal className="w-3.5 h-3.5" />
                  ) : (
                    <span className="text-neutral-500 text-xs">#</span>
                  )}
                  <span>{index + 1}</span>
                </div>

                {/* Pilot Name */}
                <div className="col-span-3 font-bold tracking-widest text-emerald-400">
                  {entry.name}
                </div>

                {/* Score */}
                <div className="col-span-3 text-right font-bold text-amber-300">
                  {entry.score.toLocaleString()}
                </div>

                {/* Wave Reached */}
                <div className="col-span-2 text-center text-sky-300 font-semibold">
                  W-{entry.wave}
                </div>

                {/* Mode & Diff */}
                <div className="col-span-2 text-right">
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {entry.mode.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="bg-neutral-950 px-5 py-3 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Saved in Local Storage</span>
          <button
            id="done-hall-of-fame-btn"
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold rounded-lg cursor-pointer transition-colors"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
}
