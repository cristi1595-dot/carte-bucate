import React from 'react';
import type { CategoryItem, RecipeCategory } from '../types/recipe';
import { DEFAULT_CATEGORIES } from '../types/recipe';
import { SlidersHorizontal } from 'lucide-react';

interface CategoryTabsProps {
  categories?: CategoryItem[];
  selectedCategory: RecipeCategory | 'Toate';
  onSelectCategory: (category: RecipeCategory | 'Toate') => void;
  categoryCounts: Record<string, number>;
  totalCount: number;
  onOpenManageCategories: () => void;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories = DEFAULT_CATEGORIES,
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  totalCount,
  onOpenManageCategories,
}) => {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-1.5">
      <div className="flex items-center gap-2 min-w-max px-2 sm:px-4">
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
        {categories.map((cat) => {
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

        {/* Manage Categories Button */}
        <button
          onClick={onOpenManageCategories}
          title="Modifică sau adaugă categorii"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 border border-dashed border-stone-300 transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
          <span>Categorii</span>
        </button>
      </div>
    </div>
  );
};
