import React, { useState } from 'react';
import { RECIPE_CATEGORIES } from '../types/recipe';
import type { Recipe } from '../types/recipe';
import { db } from '../db';
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
} from 'lucide-react';

interface RecipeDetailModalProps {
  recipe: Recipe;
  onClose: () => void;
  onOpenCookingMode: (recipe: Recipe) => void;
  onEditRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (id: string) => void;
  onAddToShoppingList: (ingredients: { name: string; amount?: string; recipeTitle: string }[]) => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  onClose,
  onOpenCookingMode,
  onEditRecipe,
  onDeleteRecipe,
  onAddToShoppingList,
}) => {
  const [servings, setServings] = useState<number>(recipe.servings || 4);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<string>(recipe.notes || '');
  const [rating, setRating] = useState<number>(recipe.rating || 0);
  const [isFavorite, setIsFavorite] = useState<boolean>(recipe.isFavorite);
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [addedToCartToast, setAddedToCartToast] = useState(false);

  const categoryInfo = RECIPE_CATEGORIES.find((c) => c.id === recipe.category);
  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  // Scaling factor for portion adjustment
  const scale = recipe.servings && recipe.servings > 0 ? servings / recipe.servings : 1;

  const toggleIngredientCheck = (id: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [id]: !prev[id] }));
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
    // Collect ingredients that are NOT checked (meaning user needs to buy them)
    // or all ingredients if none are checked
    const anyChecked = Object.values(checkedIngredients).some(Boolean);
    const needed = recipe.ingredients.filter((ing) => (anyChecked ? !checkedIngredients[ing.id] : true));

    const items = needed.map((ing) => {
      let amountStr = '';
      if (ing.amount !== null && ing.amount !== undefined) {
        const scaledAmount = Math.round(ing.amount * scale * 10) / 10;
        amountStr = `${scaledAmount} ${ing.unit}`.trim();
      }
      return {
        name: ing.name,
        amount: amountStr,
        recipeTitle: recipe.title,
      };
    });

    onAddToShoppingList(items);
    setAddedToCartToast(true);
    setTimeout(() => setAddedToCartToast(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Image / Gradient */}
        <div className="relative aspect-21/9 sm:aspect-16/7 w-full bg-stone-100 flex-shrink-0 overflow-hidden">
          {recipe.image ? (
            <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-amber-100 via-orange-100 to-amber-50 flex items-center justify-center">
              <span className="text-7xl select-none">{categoryInfo?.icon || '🍲'}</span>
            </div>
          )}

          {/* Close & Action Buttons */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              onClick={handleToggleFavorite}
              className="p-2.5 rounded-full bg-white/90 backdrop-blur-md text-stone-700 hover:text-rose-600 shadow-md active:scale-95 transition-all"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/90 backdrop-blur-md text-stone-700 hover:text-stone-900 shadow-md active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Category Pill on Image */}
          <div className="absolute bottom-3 left-4">
            <span className="inline-flex items-center gap-1.5 bg-stone-900/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md">
              <span>{categoryInfo?.icon || '🍽️'}</span>
              <span>{recipe.category}</span>
            </span>
          </div>
        </div>

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

            {/* Rating Stars Selector */}
            <div className="flex items-center gap-1 sm:self-start bg-stone-50 border border-stone-200/80 px-3 py-1.5 rounded-xl">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleUpdateRating(star)}
                  className="p-0.5 hover:scale-110 transition-transform"
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

          {/* Primary Action Button: Cooking Mode */}
          <button
            onClick={() => onOpenCookingMode(recipe)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-orange-600/25 active:scale-[0.99] transition-all cursor-pointer text-base sm:text-lg"
          >
            <ChefHat className="w-6 h-6" />
            <span>Pornește Modul Bucătar (Ecran Activ & Pași Mari)</span>
          </button>

          {/* Ingredients Section with Portion Scaler */}
          <div className="border border-stone-200/80 rounded-2xl p-4 sm:p-5 bg-white space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2">
                <span>🥕</span> Ingrediente
              </h3>

              {/* Portion Scaler */}
              <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-xl">
                <span className="text-xs font-semibold text-stone-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Porții:
                </span>
                <button
                  onClick={() => setServings((prev) => Math.max(1, prev - 1))}
                  className="p-1 rounded-lg bg-white text-stone-700 hover:bg-stone-200 active:scale-90"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-stone-900 text-sm px-1.5 min-w-[20px] text-center">
                  {servings}
                </span>
                <button
                  onClick={() => setServings((prev) => prev + 1)}
                  className="p-1 rounded-lg bg-white text-stone-700 hover:bg-stone-200 active:scale-90"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Ingredients Checkable List */}
            <ul className="space-y-2.5">
              {recipe.ingredients.map((ing) => {
                const isChecked = !!checkedIngredients[ing.id];
                let displayAmount: string | null = null;
                if (ing.amount !== null && ing.amount !== undefined) {
                  const scaled = Math.round(ing.amount * scale * 10) / 10;
                  displayAmount = `${scaled} ${ing.unit}`.trim();
                }

                return (
                  <li
                    key={ing.id}
                    onClick={() => toggleIngredientCheck(ing.id)}
                    className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                      isChecked ? 'bg-stone-50 text-stone-400 line-through' : 'hover:bg-orange-50/50 text-stone-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className="flex-1 text-sm font-medium">
                      {displayAmount && (
                        <strong className={`font-bold mr-1.5 ${isChecked ? 'text-stone-400' : 'text-stone-900'}`}>
                          {displayAmount}
                        </strong>
                      )}
                      {ing.name}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Add to Shopping List Button */}
            <div className="pt-2 flex items-center justify-between">
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

          {/* Instructions Step-by-Step */}
          <div className="border border-stone-200/80 rounded-2xl p-4 sm:p-5 bg-white space-y-4">
            <h3 className="font-bold text-stone-900 text-lg flex items-center gap-2 border-b border-stone-100 pb-3">
              <span>📋</span> Instrucțiuni de Preparare
            </h3>

            <div className="space-y-4">
              {recipe.instructions.map((step) => (
                <div key={step.id} className="flex gap-3.5 items-start">
                  <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-800 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {step.stepNumber}
                  </div>
                  <div className="flex-1 text-stone-800 text-sm leading-relaxed">
                    <p>{step.text}</p>
                    {step.timerMinutes && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/70 px-2 py-0.5 rounded-md">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Timp sugerat: {step.timerMinutes} minute
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cook's Personal Notes */}
          <div className="border border-stone-200/80 rounded-2xl p-4 sm:p-5 bg-amber-50/50 space-y-2">
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

          {/* Source Link & Original Text */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 pt-2 border-t border-stone-100">
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
            <div className="bg-stone-100 p-3 rounded-xl text-xs font-mono text-stone-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {recipe.originalText}
            </div>
          )}
        </div>

        {/* Modal Footer with Edit / Delete */}
        <div className="p-4 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between gap-3 flex-shrink-0">
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
