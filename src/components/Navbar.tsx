import React from 'react';
import { Plus, Settings, ShoppingCart, BookOpen, Heart } from 'lucide-react';

interface NavbarProps {
  onOpenAdd: () => void;
  onOpenSettings: () => void;
  onOpenShoppingList: () => void;
  shoppingListCount: number;
  filterFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  favoritesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAdd,
  onOpenSettings,
  onOpenShoppingList,
  shoppingListCount,
  filterFavoritesOnly,
  onToggleFavoritesOnly,
  favoritesCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5 cursor-pointer select-none">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 leading-tight tracking-tight flex items-center gap-1.5">
              Cartea de Bucate
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-md">
                PWA
              </span>
            </h1>
            <p className="text-xs text-stone-500 hidden sm:block">Rețetele tale, organizate inteligent</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Favorites toggle */}
          <button
            onClick={onToggleFavoritesOnly}
            title="Vezi doar favoritele"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              filterFavoritesOnly
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Heart className={`w-4 h-4 ${filterFavoritesOnly ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span className="hidden md:inline">Favorite</span>
            {favoritesCount > 0 && (
              <span className="text-xs px-1.5 py-0.2 bg-stone-200/70 rounded-full font-semibold">
                {favoritesCount}
              </span>
            )}
          </button>

          {/* Shopping List Button */}
          <button
            onClick={onOpenShoppingList}
            title="Lista de cumpărături"
            className="relative p-2.5 rounded-xl text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            {shoppingListCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {shoppingListCount}
              </span>
            )}
          </button>

          {/* Settings & Backup Button */}
          <button
            onClick={onOpenSettings}
            title="Setări, Cheie API & Backup"
            className="p-2.5 rounded-xl text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Add Recipe Primary Button */}
          <button
            onClick={onOpenAdd}
            className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 active:scale-95 text-white px-3.5 py-2 rounded-xl text-sm font-semibold shadow-sm shadow-orange-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Adaugă Rețetă</span>
          </button>
        </div>
      </div>
    </header>
  );
};
