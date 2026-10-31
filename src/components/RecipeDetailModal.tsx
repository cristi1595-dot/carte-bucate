import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { DEFAULT_CATEGORIES } from '../types/recipe';
import type { Recipe, CategoryItem } from '../types/recipe';
import { db } from '../db';
import { convertIngredientUnit, type UnitSystem } from '../services/unitConverter';
import { parseInstructionTimers, formatTimerSeconds } from '../services/timerParser';
import {
  X,
  Clock,
  Users,
  ChefHat,
  Star,
  Heart,
  ExternalLink,
  Plus,
  Minus,
  ShoppingCart,
  Trash2,
  Edit3,
  FileText,
  Check,
  Printer,
  Scale,
  Play,
  Pause,
  RotateCcw,
  Volume2,
} from 'lucide-react';

interface RecipeDetailModalProps {
  recipe: Recipe;
  categories?: CategoryItem[];
  onClose: () => void;
  onOpenCookingMode: (recipe: Recipe) => void;
  onEditRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (id: string) => void;
  onAddToShoppingList: (ingredients: { name: string; amount?: string; recipeTitle: string }[]) => void;
}

interface ActiveTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  categories = DEFAULT_CATEGORIES,
  onClose,
  onOpenCookingMode,
  onEditRecipe,
  onDeleteRecipe,
  onAddToShoppingList,
}) => {
  // Scale & Unit states (Paprika style)
  const baseServings = recipe.servings && recipe.servings > 0 ? recipe.servings : 4;
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('original');
  const servings = Math.max(1, Math.round(baseServings * scaleFactor));

  // Pantry items for smart inventory matching
  const pantryItems = useLiveQuery(() => db.pantry.toArray(), []) || [];

  // Ingredients Strikethrough & Checked states
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});

  // Other recipe states
  const [notes, setNotes] = useState<string>(recipe.notes || '');
  const [rating, setRating] = useState<number>(recipe.rating || 0);
  const [isFavorite, setIsFavorite] = useState<boolean>(recipe.isFavorite);
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [addedToCartToast, setAddedToCartToast] = useState(false);

  // Quick Inline Timer states
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  const categoryInfo = categories.find((c) => c.id === recipe.category);
  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  // Play sound & vibration alert when a timer reaches 0
  const playAlertNotification = () => {
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
      console.warn('Audio alert error:', e);
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([300, 150, 300, 150, 450]);
      } catch {
        // Ignore vibration errors
      }
    }
  };

  // Timer countdown loop
  useEffect(() => {
    if (activeTimer && activeTimer.isRunning) {
      timerIntervalRef.current = window.setInterval(() => {
        setActiveTimer((prev) => {
          if (!prev || !prev.isRunning) return prev;
          if (prev.remainingSeconds <= 1) {
            playAlertNotification();
            return { ...prev, remainingSeconds: 0, isRunning: false };
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeTimer?.isRunning]);

  const startQuickTimer = (seconds: number, label: string) => {
    setActiveTimer({
      id: Date.now().toString(),
      label,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      isRunning: true,
    });
  };

  const toggleIngredientCheck = (id: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const checkAllIngredients = () => {
    const all: Record<string, boolean> = {};
    for (const ing of recipe.ingredients) {
      all[ing.id] = true;
    }
    setCheckedIngredients(all);
  };

  const uncheckAllIngredients = () => {
    setCheckedIngredients({});
  };

  const handleUpdateRating = async (newRating: number) => {
    const updated = newRating === rating ? 0 : newRating;
    setRating(updated);
    await db.recipes.update(recipe.id, { rating: updated, updatedAt: Date.now() });
  };

  const handleToggleFavorite = async () => {
    const updated = !isFavorite;
    setIsFavorite(updated);
    await db.recipes.update(recipe.id, { isFavorite: updated, updatedAt: Date.now() });
  };

  const handleSaveNotes = async () => {
    await db.recipes.update(recipe.id, { notes, updatedAt: Date.now() });
  };

  const handleSendToShoppingList = () => {
    // Send only unchecked ingredients or all if none checked
    const anyChecked = Object.values(checkedIngredients).some(Boolean);
    const needed = recipe.ingredients.filter((ing) => (anyChecked ? !checkedIngredients[ing.id] : true));

    const items = needed.map((ing) => {
      const converted = convertIngredientUnit(
        ing.amount !== null && ing.amount !== undefined ? ing.amount * scaleFactor : null,
        ing.unit,
        unitSystem
      );

      return {
        name: ing.name,
        amount: converted.displayText || undefined,
        recipeTitle: recipe.title,
      };
    });

    onAddToShoppingList(items);
    setAddedToCartToast(true);
    setTimeout(() => setAddedToCartToast(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="recipe-print-area relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Image / Category Icon (Hidden on print) */}
        <div className="relative aspect-21/9 sm:aspect-16/7 w-full bg-stone-100 flex-shrink-0 overflow-hidden no-print">
          {recipe.image ? (
            <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-amber-100 via-orange-100 to-amber-50 flex items-center justify-center">
              <span className="text-7xl select-none">{categoryInfo?.icon || '🍲'}</span>
            </div>
          )}

          {/* Action Buttons Top Bar */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Imprimă sau salvează PDF curat"
              className="p-2.5 rounded-full bg-white/90 backdrop-blur-md text-stone-700 hover:text-orange-600 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={handleToggleFavorite}
              title="Salvează ca favorit"
              className="p-2.5 rounded-full bg-white/90 backdrop-blur-md text-stone-700 hover:text-rose-600 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              title="Închide"
              className="p-2.5 rounded-full bg-white/90 backdrop-blur-md text-stone-700 hover:text-stone-900 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Category Pill */}
          <div className="absolute bottom-3 left-4">
            <span className="inline-flex items-center gap-1.5 bg-stone-900/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md">
              <span>{categoryInfo?.icon || '🍽️'}</span>
              <span>{recipe.category}</span>
            </span>
          </div>
        </div>

        {/* Floating Active Timer Banner */}
        {activeTimer && (
          <div className="no-print bg-stone-900 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-md border-b border-stone-800 animate-in slide-in-from-top">
            <div className="flex items-center gap-2 min-w-0">
              <Volume2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <div className="truncate">
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide mr-2">
                  {activeTimer.label}:
                </span>
                <span
                  className={`font-mono font-bold text-base tracking-wider ${
                    activeTimer.remainingSeconds === 0 ? 'text-emerald-400 animate-pulse' : 'text-orange-400'
                  }`}
                >
                  {formatTimerSeconds(activeTimer.remainingSeconds)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() =>
                  setActiveTimer((prev) => (prev ? { ...prev, isRunning: !prev.isRunning } : null))
                }
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
                title={activeTimer.isRunning ? 'Pauză' : 'Reia'}
              >
                {activeTimer.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() =>
                  setActiveTimer((prev) =>
                    prev ? { ...prev, remainingSeconds: prev.totalSeconds, isRunning: false } : null
                  )
                }
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
                title="Resetează cronometrul"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveTimer(null)}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors"
                title="Închide cronometrul"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Title & Rating */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 leading-tight">
                {recipe.title}
              </h2>
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {recipe.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200/60 px-2.5 py-0.5 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Rating Stars Selector (No print) */}
            <div className="no-print flex items-center gap-1 sm:self-start bg-stone-50 border border-stone-200/80 px-3 py-1.5 rounded-xl">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleUpdateRating(star)}
                  className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                >
                  <Star
                    className={`w-5 h-5 ${
                      star <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 bg-stone-50 rounded-2xl border border-stone-200/60 text-center">
            <div>
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                Timp Total
              </span>
              <span className="text-base sm:text-lg font-bold text-stone-800 flex items-center justify-center gap-1 mt-0.5">
                <Clock className="w-4 h-4 text-orange-500" />
                {totalTime > 0 ? `${totalTime} min` : 'Rapid'}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                Pregătire
              </span>
              <span className="text-base sm:text-lg font-bold text-stone-800 mt-0.5 block">
                {recipe.prepTimeMinutes ? `${recipe.prepTimeMinutes} min` : '-'}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                Gătire
              </span>
              <span className="text-base sm:text-lg font-bold text-stone-800 mt-0.5 block">
                {recipe.cookTimeMinutes ? `${recipe.cookTimeMinutes} min` : '-'}
              </span>
            </div>
          </div>

          {/* Primary Action Button: Cooking Mode (No print) */}
          <button
            onClick={() => onOpenCookingMode(recipe)}
            className="no-print w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-orange-600/25 active:scale-[0.99] transition-all cursor-pointer text-base sm:text-lg"
          >
            <ChefHat className="w-6 h-6" />
            <span>Pornește Modul Bucătar (Ecran Activ & Pași Mari)</span>
          </button>

          {/* PAPRIKA STYLE: Scale & Convert Toolbar */}
          <div className="no-print bg-orange-50/70 border border-orange-200/70 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Scale multiplier buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-orange-900 flex items-center gap-1 mr-1">
                <Users className="w-3.5 h-3.5 text-orange-600" /> Porții:
              </span>
              <div className="flex items-center bg-white border border-orange-200 rounded-xl p-0.5 shadow-2xs">
                {[0.5, 1, 2, 3].map((factor) => {
                  const isActive = scaleFactor === factor;
                  return (
                    <button
                      key={factor}
                      onClick={() => setScaleFactor(factor)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'text-stone-700 hover:bg-orange-50'
                      }`}
                    >
                      {factor}x
                    </button>
                  );
                })}
              </div>

              {/* Fine control +/- */}
              <div className="flex items-center gap-1 ml-1">
                <button
                  onClick={() => setScaleFactor((prev) => Math.max(0.25, Math.round((prev - 0.25) * 100) / 100))}
                  title="Scade porții"
                  className="p-1 rounded-lg bg-white border border-orange-200 text-stone-700 hover:bg-orange-100 active:scale-90"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-extrabold text-stone-800 min-w-[20px] text-center">
                  {servings}
                </span>
                <button
                  onClick={() => setScaleFactor((prev) => Math.round((prev + 0.25) * 100) / 100)}
                  title="Crește porții"
                  className="p-1 rounded-lg bg-white border border-orange-200 text-stone-700 hover:bg-orange-100 active:scale-90"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Unit System Toggle (Convert) */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <span className="text-xs font-bold text-orange-900 flex items-center gap-1 mr-1">
                <Scale className="w-3.5 h-3.5 text-orange-600" /> Unități:
              </span>
              <div className="flex items-center bg-white border border-orange-200 rounded-xl p-0.5 shadow-2xs">
                {(['original', 'metric', 'imperial'] as UnitSystem[]).map((system) => {
                  const isActive = unitSystem === system;
                  const label = system === 'original' ? 'Original' : system === 'metric' ? 'Metric (g/ml)' : 'US (cups/oz)';
                  return (
                    <button
                      key={system}
                      onClick={() => setUnitSystem(system)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'text-stone-700 hover:bg-orange-50'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="border border-stone-200/80 rounded-2xl p-4 sm:p-5 bg-white space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                <span>🥕</span> Ingrediente
                <span className="text-xs font-semibold text-stone-400">({recipe.ingredients.length})</span>
              </h3>

              {/* Strikethrough quick helpers (No print) */}
              <div className="no-print flex items-center gap-2 text-xs">
                <button
                  onClick={checkAllIngredients}
                  className="text-stone-500 hover:text-stone-900 font-medium px-2 py-1 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  Bifează tot
                </button>
                <span className="text-stone-300">•</span>
                <button
                  onClick={uncheckAllIngredients}
                  className="text-stone-500 hover:text-stone-900 font-medium px-2 py-1 rounded-lg hover:bg-stone-100 transition-colors"
                >
                  Resetează
                </button>
              </div>
            </div>

            {/* Ingredients Checkable / Strikeable List */}
            <ul className="space-y-2">
              {recipe.ingredients.map((ing) => {
                const isChecked = !!checkedIngredients[ing.id];
                const rawAmount = ing.amount !== null && ing.amount !== undefined ? ing.amount * scaleFactor : null;
                const converted = convertIngredientUnit(rawAmount, ing.unit, unitSystem);
                const inPantry = pantryItems.find((p) => {
                  if (!p.inStock) return false;
                  const pName = p.name.toLowerCase().trim();
                  const iName = ing.name.toLowerCase().trim();
                  return pName.includes(iName) || iName.includes(pName);
                });

                return (
                  <li
                    key={ing.id}
                    onClick={() => toggleIngredientCheck(ing.id)}
                    className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all select-none ${
                      isChecked
                        ? 'bg-stone-50/80 text-stone-400 line-through'
                        : 'hover:bg-orange-50/50 text-stone-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center transition-colors flex-shrink-0 ${
                        isChecked
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className="flex-1 text-sm font-medium">
                      {converted.displayText ? (
                        <strong className={`font-bold mr-1.5 ${isChecked ? 'text-stone-400' : 'text-stone-900'}`}>
                          {converted.displayText}
                        </strong>
                      ) : null}
                      <span>{ing.name}</span>
                      {inPantry && (
                        <span
                          className="no-print text-[10px] font-bold text-amber-800 bg-amber-100/80 border border-amber-300/70 px-1.5 py-0.5 rounded-md ml-2 inline-flex items-center gap-1 select-none"
                          title="Ai acest ingredient în cămară"
                        >
                          🥫 În Cămară
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Add to Shopping List Button (No print) */}
            <div className="no-print pt-2 flex items-center justify-between border-t border-stone-100">
              <button
                onClick={handleSendToShoppingList}
                className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Adaugă pe Lista de Cumpărături</span>
              </button>

              {addedToCartToast && (
                <span className="text-xs font-bold text-emerald-600 animate-in fade-in flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Adăugate!
                </span>
              )}
            </div>
          </div>

          {/* Instructions Step-by-Step with Interactive Detected Timers */}
          <div className="border border-stone-200/80 rounded-2xl p-4 sm:p-5 bg-white space-y-4">
            <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2 border-b border-stone-100 pb-3">
              <span>📋</span> Instrucțiuni de Preparare
            </h3>

            <div className="space-y-4">
              {recipe.instructions.map((step) => {
                const segments = parseInstructionTimers(step.text);

                return (
                  <div key={step.id} className="flex gap-3.5 items-start">
                    <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-800 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 text-stone-800 text-sm leading-relaxed">
                      <p>
                        {segments.map((seg, idx) => {
                          if (seg.type === 'timer' && seg.seconds) {
                            return (
                              <button
                                key={idx}
                                onClick={() => startQuickTimer(seg.seconds!, `Pasul ${step.stepNumber} (${seg.content})`)}
                                title="Apasă pentru a porni cronometrul"
                                className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-950 font-bold text-xs border border-orange-200/80 shadow-2xs transition-colors cursor-pointer align-baseline"
                              >
                                <Clock className="w-3 h-3 text-orange-600" />
                                <span>{seg.content}</span>
                              </button>
                            );
                          }
                          return <span key={idx}>{seg.content}</span>;
                        })}
                      </p>

                      {step.timerMinutes && (
                        <div className="mt-1.5">
                          <button
                            onClick={() =>
                              startQuickTimer(step.timerMinutes! * 60, `Pasul ${step.stepNumber} (${step.timerMinutes} min)`)
                            }
                            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/70 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pornește cronometru: {step.timerMinutes} min</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cook's Personal Notes (No print) */}
          <div className="no-print border border-stone-200/80 rounded-2xl p-4 sm:p-5 bg-amber-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                <span>📝</span> Notele mele despre această rețetă
              </h4>
              <span className="text-[11px] text-stone-400">Se salvează automat</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="ex: Data viitoare pune mai puțină sare, folosește făină tip 000, 25 min la 180°C..."
              rows={2}
              className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs sm:text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>

          {/* Source Link & Original Text (No print) */}
          <div className="no-print flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 pt-2 border-t border-stone-100">
            {recipe.sourceUrl ? (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-orange-600 hover:underline font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Vezi sursa originală</span>
              </a>
            ) : (
              <span>Adăugată manual</span>
            )}

            {recipe.originalText && (
              <button
                onClick={() => setShowOriginalText(!showOriginalText)}
                className="flex items-center gap-1 text-stone-600 hover:text-stone-900 font-medium"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{showOriginalText ? 'Ascunde textul sursă' : 'Vezi textul sursă original'}</span>
              </button>
            )}
          </div>

          {showOriginalText && recipe.originalText && (
            <div className="no-print bg-stone-100 p-3 rounded-xl text-xs font-mono text-stone-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {recipe.originalText}
            </div>
          )}
        </div>

        {/* Modal Footer with Edit / Delete (No print) */}
        <div className="no-print p-4 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={() => {
              if (window.confirm('Ești sigur că vrei să ștergi această rețetă din cartea ta de bucate?')) {
                onDeleteRecipe(recipe.id);
              }
            }}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Șterge Rețeta</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditRecipe(recipe)}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-200/70 bg-stone-100 px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Editează</span>
            </button>
            <button
              onClick={onClose}
              className="text-xs sm:text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 px-5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Închide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
