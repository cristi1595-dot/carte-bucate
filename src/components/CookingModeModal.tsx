import React, { useState, useEffect } from 'react';
import type { Recipe } from '../types/recipe';
import { wakeLockService } from '../services/wakeLock';
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
  Sparkles,
} from 'lucide-react';

interface CookingModeModalProps {
  recipe: Recipe;
  onClose: () => void;
}

export const CookingModeModal: React.FC<CookingModeModalProps> = ({ recipe, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [showIngredientsPanel, setShowIngredientsPanel] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Timer states for current step
  const currentStep = recipe.instructions[currentStepIndex];
  const initialSeconds = currentStep?.timerMinutes ? currentStep.timerMinutes * 60 : 0;
  const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Play Web Audio chime sound
  const playSoundAlert = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  // Reset timer whenever step changes
  useEffect(() => {
    const stepSeconds = currentStep?.timerMinutes ? currentStep.timerMinutes * 60 : 0;
    setTimeLeft(stepSeconds);
    setIsTimerRunning(false);
  }, [currentStepIndex, currentStep?.timerMinutes]);

  // Timer countdown interval
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          playSoundAlert();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning]);

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

  const isLastStep = currentStepIndex === recipe.instructions.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 text-white flex flex-col justify-between select-none">
      {/* Top Header Bar */}
      <div className="px-4 py-3 sm:py-4 bg-stone-900/90 border-b border-stone-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white text-sm">
            👨‍🍳
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white line-clamp-1">{recipe.title}</h2>
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

        <div className="flex items-center gap-2">
          {/* Quick Ingredients Sheet Toggle */}
          <button
            onClick={() => setShowIngredientsPanel(!showIngredientsPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
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
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white"
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

        {/* Large Step Text */}
        <p className="text-xl sm:text-3xl md:text-4xl font-extrabold text-stone-100 text-center leading-relaxed max-w-3xl">
          {currentStep?.text}
        </p>

        {/* Step Timer if available */}
        {currentStep?.timerMinutes ? (
          <div className="mt-8 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 flex flex-col items-center gap-3 shadow-xl">
            <span className="text-xs font-semibold text-stone-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Volume2 className="w-4 h-4 text-orange-400" /> Cronometru Pas
            </span>

            <div
              className={`text-4xl sm:text-5xl font-mono font-black tracking-wider ${
                timeLeft === 0 ? 'text-emerald-400 animate-bounce' : 'text-stone-100'
              }`}
            >
              {formatTimer(timeLeft)}
            </div>

            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${
                  isTimerRunning
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-600/30'
                }`}
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isTimerRunning ? 'Pauză' : 'Pornește'}</span>
              </button>

              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setTimeLeft(initialSeconds);
                }}
                className="p-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300"
                title="Resetează"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}

        {/* Step Completion Toggle */}
        <button
          onClick={() => toggleStepCompleted(currentStepIndex)}
          className={`mt-6 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
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

      {/* Slide-in Quick Ingredients Drawer */}
      {showIngredientsPanel && (
        <div className="absolute inset-y-0 right-0 z-20 w-80 max-w-full bg-stone-900 border-l border-stone-800 p-5 overflow-y-auto shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div>
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>🥕</span> Ingrediente
              </h3>
              <button
                onClick={() => setShowIngredientsPanel(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ul className="space-y-2.5 text-sm">
              {recipe.ingredients.map((ing) => (
                <li key={ing.id} className="text-stone-300 pb-1.5 border-b border-stone-800/60">
                  <span className="font-bold text-orange-400 mr-1.5">
                    {ing.amount ? `${ing.amount} ${ing.unit}` : ''}
                  </span>
                  <span>{ing.name}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-[11px] text-stone-500 text-center pt-4">
            Apasă oriunde afară pentru a ascunde
          </div>
        </div>
      )}

      {/* Bottom Navigation Controls */}
      <div className="p-4 sm:p-6 bg-stone-900 border-t border-stone-800 flex items-center justify-between gap-4">
        <button
          onClick={handlePrev}
          disabled={currentStepIndex === 0}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm sm:text-base transition-all ${
            currentStepIndex === 0
              ? 'opacity-30 cursor-not-allowed text-stone-600'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Pasul Anterior</span>
        </button>

        {isLastStep ? (
          <button
            onClick={() => {
              playSoundAlert();
              onClose();
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-7 py-3 rounded-2xl font-bold text-sm sm:text-base shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            <span>Gata! Încheie Gătitul</span>
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-7 py-3 rounded-2xl font-bold text-sm sm:text-base shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
          >
            <span>Următorul Pas</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};
