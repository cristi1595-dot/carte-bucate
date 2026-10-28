import React from 'react';
import { RECIPE_CATEGORIES } from '../types/recipe';
import type { RecipeCategory } from '../types/recipe';

interface CategoryTabsProps {
  selectedCategory: RecipeCategory | 'Toate';
  onSelectCategory: (category: RecipeCategory | 'Toate') => void;
  categoryCounts: Record<string, number>;
  totalCount: number;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  totalCount,
}) => {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2">
      <div className="flex items-center gap-2 min-w-max px-4">
        {/* 'Toate' button */}
        <button
          onClick={() => onSelectCategory('Toate')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            selectedCategory === 'Toate'
              ? 'bg-stone-900 text-white shadow-sm'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80'
          }`}
        >
          <span>🍽️</span>
          <span>Toate</span>
          <span
            className={`ml-1 text-[11px] px-1.5 py-0.5 rounded-full ${
              selectedCategory === 'Toate' ? 'bg-stone-800 text-stone-300' : 'bg-stone-100 text-stone-600'
            }`}
          >
            {totalCount}
          </span>
        </button>

        {/* Categories list */}
        {RECIPE_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/20'
                  : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200/80'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              {count > 0 && (
                <span
                  className={`ml-1 text-[11px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-orange-700 text-orange-100' : 'bg-stone-100 text-stone-500 font-medium'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
