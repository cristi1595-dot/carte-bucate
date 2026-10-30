import React from 'react';
import type { Recipe, CategoryItem } from '../types/recipe';
import { RECIPE_CATEGORIES } from '../types/recipe';
import { Clock, Users, Star, Heart, Utensils } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
  categories?: CategoryItem[];
  onClick: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  categories = RECIPE_CATEGORIES,
  onClick,
  onToggleFavorite,
}) => {
  const categoryInfo = categories.find((c) => c.id === recipe.category);
  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
  const ingredientsCount = recipe.ingredients?.length || 0;

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-stone-200/85 hover:border-orange-300 p-3.5 sm:p-4 shadow-2xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between gap-2.5 active:scale-[0.99]"
    >
      <div>
        {/* Top Header Row: Category Badge + Favorite & Rating */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1.5 bg-orange-50/80 text-orange-900 border border-orange-200/50 px-2.5 py-0.5 rounded-lg text-xs font-semibold">
            <span>{categoryInfo?.icon || '🍽️'}</span>
            <span className="truncate max-w-[130px] sm:max-w-[180px]">{categoryInfo?.label || recipe.category}</span>
          </span>

          <div className="flex items-center gap-1">
            {recipe.rating && recipe.rating > 0 ? (
              <div className="flex items-center gap-0.5 text-amber-500 font-bold text-xs bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/60 mr-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{recipe.rating}</span>
              </div>
            ) : null}

            <button
              onClick={onToggleFavorite}
              title={recipe.isFavorite ? 'Elimină din favorite' : 'Adaugă la favorite'}
              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  recipe.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-stone-300'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-stone-900 text-base leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
          {recipe.title}
        </h3>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium bg-stone-100 text-stone-600 px-2 py-0.2 rounded-md"
              >
                #{tag}
              </span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="text-[10px] font-medium text-stone-400 self-center">
                +{recipe.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Meta Footer Row */}
      <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100 mt-0.5">
        <div className="flex items-center gap-3">
          {totalTime > 0 ? (
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              {totalTime} min
            </span>
          ) : (
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              Rapid
            </span>
          )}

          <span className="flex items-center gap-1 font-medium">
            <Users className="w-3.5 h-3.5 text-stone-400" />
            {recipe.servings} porții
          </span>
        </div>

        {ingredientsCount > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-stone-400 font-medium">
            <Utensils className="w-3 h-3 text-stone-400" />
            {ingredientsCount} ingrediente
          </span>
        )}
      </div>
    </div>
  );
};
