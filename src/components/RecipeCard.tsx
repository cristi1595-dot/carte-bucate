import React from 'react';
import { RECIPE_CATEGORIES } from '../types/recipe';
import type { Recipe } from '../types/recipe';
import { Clock, Users, Star, Heart } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, onClick, onToggleFavorite }) => {
  const categoryInfo = RECIPE_CATEGORIES.find((c) => c.id === recipe.category);
  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-xs hover:shadow-md hover:border-orange-200 transition-all cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Card Header Image / Placeholder */}
        <div className="relative aspect-video w-full bg-stone-100 overflow-hidden">
          {recipe.image ? (
            <img
              src={recipe.image}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 flex items-center justify-center">
              <span className="text-5xl group-hover:scale-110 transition-transform duration-300 select-none">
                {categoryInfo?.icon || '🍲'}
              </span>
            </div>
          )}

          {/* Category Badge */}
          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-stone-800 shadow-xs border border-white/60">
              <span>{categoryInfo?.icon || '🍽️'}</span>
              <span>{recipe.category}</span>
            </span>
          </div>

          {/* Favorite Toggle Button */}
          <button
            onClick={onToggleFavorite}
            title={recipe.isFavorite ? 'Elimină din favorite' : 'Adaugă la favorite'}
            className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/90 backdrop-blur-md text-stone-700 hover:text-rose-600 hover:bg-white shadow-xs transition-transform active:scale-90"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                recipe.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-stone-400'
              }`}
            />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4">
          <h3 className="font-bold text-stone-900 text-base line-clamp-2 group-hover:text-orange-600 transition-colors leading-snug">
            {recipe.title}
          </h3>

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {recipe.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md"
                >
                  #{tag}
                </span>
              ))}
              {recipe.tags.length > 3 && (
                <span className="text-[11px] font-medium text-stone-400">+{recipe.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Meta Footer */}
      <div className="px-4 pb-4 pt-1 flex items-center justify-between text-xs text-stone-500 border-t border-stone-100 mt-2">
        <div className="flex items-center gap-3">
          {totalTime > 0 ? (
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
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

        {/* Rating */}
        {recipe.rating && recipe.rating > 0 ? (
          <div className="flex items-center gap-1 text-amber-500 font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span>{recipe.rating}</span>
          </div>
        ) : (
          <span className="text-stone-400 italic text-[11px]">Fără notă</span>
        )}
      </div>
    </div>
  );
};
