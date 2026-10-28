import React from 'react';
import { Search, X, Refrigerator, Sparkles } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  fridgeFilterActive: boolean;
  onToggleFridgeFilter: () => void;
  fridgeIngredients: string[];
  onAddFridgeIngredient: (ing: string) => void;
  onRemoveFridgeIngredient: (ing: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  fridgeFilterActive,
  onToggleFridgeFilter,
  fridgeIngredients,
  onAddFridgeIngredient,
  onRemoveFridgeIngredient,
}) => {
  const [ingredientInput, setIngredientInput] = React.useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (ingredientInput.trim()) {
        onAddFridgeIngredient(ingredientInput.trim());
        setIngredientInput('');
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 my-3 space-y-2">
      <div className="flex items-center gap-2">
        {/* Main Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Caută după nume rețetă, ingredient sau etichetă..."
            className="w-full bg-white border border-stone-200/90 rounded-xl pl-10 pr-9 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 'Ce am în frigider' Toggle Button */}
        <button
          onClick={onToggleFridgeFilter}
          title="Filtrează după ce ingrediente ai în casă"
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border cursor-pointer whitespace-nowrap ${
            fridgeFilterActive
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-white text-stone-700 hover:bg-stone-50 border-stone-200/90'
          }`}
        >
          <Refrigerator className="w-4 h-4" />
          <span className="hidden sm:inline">Ce am în frigider</span>
          <span className="sm:hidden">Frigider</span>
          {fridgeIngredients.length > 0 && (
            <span
              className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
                fridgeFilterActive ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {fridgeIngredients.length}
            </span>
          )}
        </button>
      </div>

      {/* Expanded Fridge Ingredients Input */}
      {fridgeFilterActive && (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 sm:p-4 text-xs sm:text-sm animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Adaugă ingredientele pe care le ai la îndemână:
            </span>
            <span className="text-[11px] text-emerald-700 hidden sm:inline">Apasă Enter sau virgulă</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {fridgeIngredients.map((ing) => (
              <span
                key={ing}
                className="inline-flex items-center gap-1 bg-white border border-emerald-300 text-emerald-900 font-medium px-2.5 py-1 rounded-lg text-xs shadow-2xs"
              >
                {ing}
                <button
                  onClick={() => onRemoveFridgeIngredient(ing)}
                  className="hover:text-rose-600 ml-0.5 text-emerald-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            <input
              type="text"
              value={ingredientInput}
              onChange={(e) => setIngredientInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ex: ouă, cartofi, ceapă..."
              className="bg-white border border-emerald-300/80 rounded-lg px-2.5 py-1 text-xs text-stone-900 placeholder:text-emerald-700/60 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-w-[140px]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
