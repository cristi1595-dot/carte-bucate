import React, { useState, useEffect, useRef } from 'react';
import type { Recipe } from '../types/recipe';
import { wakeLockService } from '../services/wakeLock';
import { parseInstructionTimers } from '../services/timerParser';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  CheckCircle2,
  Sun,
  ListFilter,
  Clock,
} from 'lucide-react';

interface CookingModeModalProps {
  recipe: Recipe;
  onClose: () => void;
}

interface RunningCookingTimer {
  stepIndex: number;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
}

export const CookingModeModal: React.FC<CookingModeModalProps> = ({ recipe, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [showIngredientsPanel, setShowIngredientsPanel] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Background multi-step timer map keyed by stepIndex
  const [stepTimers, setStepTimers] = useState<Record<number, RunningCookingTimer>>({});
  const timerIntervalRef = useRef<number | null>(null);

  const currentStep = recipe.instructions[currentStepIndex];

  // Play Web Audio chime sound and trigger phone vibration
  const playSoundAlert = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
      console.warn('Audio context error:', e);
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([300, 150, 300, 150, 450]);
      } catch {
        // Ignore vibration error
      }
    }
  };

  // Acquire Wake Lock on mount
  useEffect(() => {
    let mounted = true;
    wakeLockService.requestWakeLock().then((active) => {
      if (mounted) setWakeLockActive(active);
    });

    return () => {
      mounted = false;
      wakeLockService.releaseWakeLock();
    };
  }, []);

  // Initialize timer for current step if it has timerMinutes and isn't initialized yet
  useEffect(() => {
    if (currentStep?.timerMinutes) {
      setStepTimers((prev) => {
        if (prev[currentStepIndex]) return prev;
        const seconds = currentStep.timerMinutes! * 60;
        return {
          ...prev,
          [currentStepIndex]: {
            stepIndex: currentStepIndex,
            label: `Pasul ${currentStepIndex + 1}`,
            totalSeconds: seconds,
            remainingSeconds: seconds,
            isRunning: false,
          },
        };
      });
    }
  }, [currentStepIndex, currentStep?.timerMinutes]);

  // Master countdown ticker for all active timers
  useEffect(() => {
    timerIntervalRef.current = window.setInterval(() => {
      setStepTimers((prev) => {
        let hasAnyRunning = false;
        const updated = { ...prev };

        for (const key in updated) {
          const t = updated[key];
          if (t.isRunning) {
            hasAnyRunning = true;
            if (t.remainingSeconds <= 1) {
              playSoundAlert();
              updated[key] = { ...t, remainingSeconds: 0, isRunning: false };
            } else {
              updated[key] = { ...t, remainingSeconds: t.remainingSeconds - 1 };
            }
          }
        }

        return hasAnyRunning ? updated : prev;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const toggleStepCompleted = (index: number) => {
    setCompletedSteps((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleNext = () => {
    if (currentStepIndex < recipe.instructions.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentStepTimer = stepTimers[currentStepIndex];

  // Helper to start/pause current step timer
  const toggleCurrentTimer = () => {
    if (!currentStepTimer) {
      // Default to 5 mins if no timer predefined
      const defaultSec = 300;
      setStepTimers((prev) => ({
        ...prev,
        [currentStepIndex]: {
          stepIndex: currentStepIndex,
          label: `Pasul ${currentStepIndex + 1}`,
          totalSeconds: defaultSec,
          remainingSeconds: defaultSec,
          isRunning: true,
        },
      }));
      return;
    }

    setStepTimers((prev) => ({
      ...prev,
      [currentStepIndex]: {
        ...prev[currentStepIndex],
        isRunning: !prev[currentStepIndex].isRunning,
      },
    }));
  };

  const resetCurrentTimer = () => {
    if (!currentStepTimer) return;
    setStepTimers((prev) => ({
      ...prev,
      [currentStepIndex]: {
        ...prev[currentStepIndex],
        remainingSeconds: prev[currentStepIndex].totalSeconds,
        isRunning: false,
      },
    }));
  };

  const setCustomSecondsForStep = (seconds: number, label: string) => {
    setStepTimers((prev) => ({
      ...prev,
      [currentStepIndex]: {
        stepIndex: currentStepIndex,
        label,
        totalSeconds: seconds,
        remainingSeconds: seconds,
        isRunning: true,
      },
    }));
  };

  // Find any timer running in background (different from current step)
  const backgroundRunningTimers = Object.values(stepTimers).filter(
    (t) => t.stepIndex !== currentStepIndex && (t.isRunning || (t.remainingSeconds === 0 && t.totalSeconds > 0))
  );

  const isLastStep = currentStepIndex === recipe.instructions.length - 1;
  const segments = parseInstructionTimers(currentStep?.text || '');

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 text-white flex flex-col justify-between select-none">
      {/* Top Header Bar */}
      <div className="px-4 py-3 sm:py-4 bg-stone-900/90 border-b border-stone-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
            👨‍🍳
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">{recipe.title}</h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Sun className="w-3 h-3" />
                {wakeLockActive ? 'Ecran aprins' : 'Mod Gătit'}
              </span>
              <span className="text-stone-500">•</span>
              <span className="text-stone-400">
                Pasul {currentStepIndex + 1} din {recipe.instructions.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Quick Ingredients Sheet Toggle */}
          <button
            onClick={() => setShowIngredientsPanel(!showIngredientsPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showIngredientsPanel
                ? 'bg-orange-600 border-orange-600 text-white'
                : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ingrediente</span>
          </button>

          {/* Close Cooking Mode */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-stone-900 h-1.5">
        <div
          className="bg-orange-500 h-1.5 transition-all duration-300"
          style={{ width: `${((currentStepIndex + 1) / recipe.instructions.length) * 100}%` }}
        />
      </div>

      {/* Background Timers Notification Bar */}
      {backgroundRunningTimers.length > 0 && (
        <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-2 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <Volume2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-semibold text-amber-300">Cronometre în fundal:</span>
            {backgroundRunningTimers.map((bt) => (
              <button
                key={bt.stepIndex}
                onClick={() => setCurrentStepIndex(bt.stepIndex)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-900/60 hover:bg-amber-800/80 text-amber-200 border border-amber-700/60 transition-colors cursor-pointer"
                title={`Sari la Pasul ${bt.stepIndex + 1}`}
              >
                <span>Pasul {bt.stepIndex + 1}:</span>
                <strong className={`font-mono ${bt.remainingSeconds === 0 ? 'text-emerald-400 animate-pulse' : 'text-white'}`}>
                  {formatTimer(bt.remainingSeconds)}
                </strong>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Center Area: Large Step View */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-12 py-6 max-w-4xl mx-auto w-full relative overflow-y-auto">
        {/* Step Badge */}
        <div className="mb-4 flex items-center gap-2">
          <span className="px-3.5 py-1 rounded-full text-xs sm:text-sm font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
            PASUL {currentStepIndex + 1}
          </span>
          {completedSteps[currentStepIndex] && (
            <span className="flex items-center gap-1 text-emerald-400 text-xs sm:text-sm font-bold">
              <CheckCircle2 className="w-4 h-4" /> Finalizat
            </span>
          )}
        </div>

        {/* Large Step Text with Interactive Detected Timers */}
        <div className="text-xl sm:text-3xl md:text-4xl font-extrabold text-stone-100 text-center leading-relaxed max-w-3xl">
          {segments.map((seg, idx) => {
            if (seg.type === 'timer' && seg.seconds) {
              return (
                <button
                  key={idx}
                  onClick={() => setCustomSecondsForStep(seg.seconds!, seg.content)}
                  className="inline-flex items-center gap-1.5 mx-1 px-2.5 py-1 rounded-xl bg-orange-600/30 hover:bg-orange-600/50 text-orange-300 border border-orange-500/40 text-base sm:text-xl font-bold transition-all cursor-pointer align-middle"
                  title="Apasă pentru a seta cronometrul"
                >
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                  <span>{seg.content}</span>
                </button>
              );
            }
            return <span key={idx}>{seg.content}</span>;
          })}
        </div>

        {/* Step Timer if available */}
        {currentStepTimer ? (
          <div className="mt-8 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 flex flex-col items-center gap-3 shadow-xl">
            <span className="text-xs font-semibold text-stone-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Volume2 className="w-4 h-4 text-orange-400" /> {currentStepTimer.label}
            </span>

            <div
              className={`text-4xl sm:text-5xl font-mono font-black tracking-wider ${
                currentStepTimer.remainingSeconds === 0 ? 'text-emerald-400 animate-bounce' : 'text-stone-100'
              }`}
            >
              {formatTimer(currentStepTimer.remainingSeconds)}
            </div>

            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={toggleCurrentTimer}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                  currentStepTimer.isRunning
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/30'
                }`}
              >
                {currentStepTimer.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{currentStepTimer.isRunning ? 'Pauză' : 'Pornește'}</span>
              </button>

              <button
                onClick={resetCurrentTimer}
                className="p-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                title="Resetează"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCustomSecondsForStep(300, `Pasul ${currentStepIndex + 1}`)}
            className="mt-6 flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-200 bg-stone-900/60 hover:bg-stone-800 px-3.5 py-1.5 rounded-xl border border-stone-800 transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <span>Adaugă un cronometru pentru acest pas (5 min)</span>
          </button>
        )}

        {/* Step Completion Toggle */}
        <button
          onClick={() => toggleStepCompleted(currentStepIndex)}
          className={`mt-6 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
            completedSteps[currentStepIndex]
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
          }`}
        >
          <CheckCircle2
            className={`w-4 h-4 ${
              completedSteps[currentStepIndex] ? 'text-emerald-400 fill-emerald-400/20' : 'text-stone-500'
            }`}
          />
          <span>{completedSteps[currentStepIndex] ? 'Pas marcat ca finalizat' : 'Bifează pasul ca făcut'}</span>
        </button>
      </div>

      {/* Quick Ingredients Slide-Over Drawer */}
      {showIngredientsPanel && (
        <div className="absolute top-16 right-4 bottom-24 w-80 max-w-[90vw] bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-2xl flex flex-col z-30 animate-in slide-in-from-right">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
            <h3 className="font-bold text-stone-200 text-sm flex items-center gap-1.5">
              <span>🥕</span> Ingrediente Rețetă
            </h3>
            <button
              onClick={() => setShowIngredientsPanel(false)}
              className="p-1 rounded-lg text-stone-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 space-y-2 pr-1">
            {recipe.ingredients.map((ing) => (
              <div key={ing.id} className="text-xs text-stone-300 py-1.5 border-b border-stone-800/60">
                {ing.amount !== null && (
                  <strong className="text-orange-400 mr-1.5">
                    {ing.amount} {ing.unit}
                  </strong>
                )}
                <span>{ing.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Navigation Controls */}
      <div className="px-5 py-4 bg-stone-900/90 border-t border-stone-800 flex items-center justify-between gap-4">
        <button
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
            currentStepIndex === 0
              ? 'opacity-30 cursor-not-allowed bg-stone-800 text-stone-500'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-200 active:scale-95'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Înapoi</span>
        </button>

        {/* Step Indicators Dots */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto max-w-[200px] py-1">
          {recipe.instructions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStepIndex(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === currentStepIndex
                  ? 'w-6 bg-orange-500'
                  : completedSteps[idx]
                  ? 'w-2 bg-emerald-500'
                  : 'w-2 bg-stone-700 hover:bg-stone-600'
              }`}
            />
          ))}
        </div>

        <button
          onClick={isLastStep ? onClose : handleNext}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all active:scale-95 cursor-pointer ${
            isLastStep
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
              : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/30'
          }`}
        >
          <span>{isLastStep ? 'Finalizează Gătitul! 🎉' : 'Următorul Pas'}</span>
          {!isLastStep && <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};
