import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedInitialRecipesIfEmpty } from './db';
import type { Recipe, RecipeCategory } from './types/recipe';
import { Navbar } from './components/Navbar';
import { CategoryTabs } from './components/CategoryTabs';
import { SearchBar } from './components/SearchBar';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { CookingModeModal } from './components/CookingModeModal';
import { AddRecipeModal } from './components/AddRecipeModal';
import { SettingsModal } from './components/SettingsModal';
import { ShoppingListModal } from './components/ShoppingListModal';
import { Plus } from 'lucide-react';

export function App() {
  // Database live subscriptions
  const recipes = useLiveQuery(() => db.recipes.orderBy('createdAt').reverse().toArray(), []) || [];
  const shoppingItems = useLiveQuery(() => db.shoppingList.toArray(), []) || [];

  // Filter & Search states
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'Toate'>('Toate');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavoritesOnly, setFilterFavoritesOnly] = useState(false);
  const [fridgeFilterActive, setFridgeFilterActive] = useState(false);
  const [fridgeIngredients, setFridgeIngredients] = useState<string[]>([]);

  // Modals
  const [activeDetailRecipe, setActiveDetailRecipe] = useState<Recipe | null>(null);
  const [activeCookingRecipe, setActiveCookingRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isShoppingListModalOpen, setIsShoppingListModalOpen] = useState(false);

  // Share Target Web API parameters
  const [shareText, setShareText] = useState<string | undefined>(undefined);
  const [shareUrl, setShareUrl] = useState<string | undefined>(undefined);

  // Seed default recipes on initial mount if database is empty
  useEffect(() => {
    seedInitialRecipesIfEmpty();
  }, []);

  // Check URL parameters for Web Share Target (e.g. ?title=...&text=...&url=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedTitle = params.get('title') || '';
    const sharedText = params.get('text') || '';
    const sharedUrl = params.get('url') || '';

    if (sharedTitle || sharedText || sharedUrl) {
      const combinedText = `${sharedTitle}\n${sharedText}`.trim();
      setShareText(combinedText || undefined);
      setShareUrl(sharedUrl || undefined);
      setIsAddModalOpen(true);

      // Clean browser URL query string without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of recipes) {
      counts[r.category] = (counts[r.category] || 0) + 1;
    }
    return counts;
  }, [recipes]);

  const favoritesCount = useMemo(() => {
    return recipes.filter((r) => r.isFavorite).length;
  }, [recipes]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      // 1. Favorites only filter
      if (filterFavoritesOnly && !r.isFavorite) return false;

      // 2. Category filter
      if (selectedCategory !== 'Toate' && r.category !== selectedCategory) return false;

      // 3. Search query filter (matches title, tags, or ingredients)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesTags = r.tags?.some((t) => t.toLowerCase().includes(q));
        const matchesIngs = r.ingredients.some((i) => i.name.toLowerCase().includes(q));
        if (!matchesTitle && !matchesTags && !matchesIngs) return false;
      }

      // 4. "Ce am în frigider" filter
      if (fridgeFilterActive && fridgeIngredients.length > 0) {
        const recipeIngsText = r.ingredients.map((i) => i.name.toLowerCase()).join(' ');
        // Must contain at least one of the fridge ingredients
        const hasMatch = fridgeIngredients.some((fi) => recipeIngsText.includes(fi.toLowerCase().trim()));
        if (!hasMatch) return false;
      }

      return true;
    });
  }, [recipes, selectedCategory, searchQuery, filterFavoritesOnly, fridgeFilterActive, fridgeIngredients]);

  // Handlers
  const handleToggleFavorite = async (recipe: Recipe, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.recipes.update(recipe.id, {
      isFavorite: !recipe.isFavorite,
      updatedAt: Date.now(),
    });
  };

  const handleSaveRecipe = async (saved: Recipe) => {
    await db.recipes.put(saved);
    setIsAddModalOpen(false);
    setEditingRecipe(null);
    setShareText(undefined);
    setShareUrl(undefined);
  };

  const handleDeleteRecipe = async (id: string) => {
    await db.recipes.delete(id);
    setActiveDetailRecipe(null);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setActiveDetailRecipe(null);
    setEditingRecipe(recipe);
    setIsAddModalOpen(true);
  };

  const handleAddToShoppingList = async (items: { name: string; amount?: string; recipeTitle: string }[]) => {
    const newItems = items.map((i) => ({
      id: 'shop-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      name: i.name,
      amount: i.amount,
      recipeTitle: i.recipeTitle,
      checked: false,
      createdAt: Date.now(),
    }));
    await db.shoppingList.bulkAdd(newItems);
  };

  const handleAddFridgeIngredient = (ing: string) => {
    if (!fridgeIngredients.includes(ing)) {
      setFridgeIngredients((prev) => [...prev, ing]);
    }
  };

  const handleRemoveFridgeIngredient = (ing: string) => {
    setFridgeIngredients((prev) => prev.filter((i) => i !== ing));
  };

  return (
    <div className="min-h-screen bg-[#fcfaf6] text-stone-900 flex flex-col font-sans pb-16">
      {/* Navigation Header */}
      <Navbar
        onOpenAdd={() => {
          setEditingRecipe(null);
          setIsAddModalOpen(true);
        }}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenShoppingList={() => setIsShoppingListModalOpen(true)}
        shoppingListCount={shoppingItems.filter((i) => !i.checked).length}
        filterFavoritesOnly={filterFavoritesOnly}
        onToggleFavoritesOnly={() => setFilterFavoritesOnly(!filterFavoritesOnly)}
        favoritesCount={favoritesCount}
      />

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto w-full px-2 sm:px-4 py-3 flex-1 flex flex-col space-y-3">
        {/* Category Carousel Tabs */}
        <CategoryTabs
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
          categoryCounts={categoryCounts}
          totalCount={recipes.length}
        />

        {/* Search Bar & Fridge Filter */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          fridgeFilterActive={fridgeFilterActive}
          onToggleFridgeFilter={() => setFridgeFilterActive(!fridgeFilterActive)}
          fridgeIngredients={fridgeIngredients}
          onAddFridgeIngredient={handleAddFridgeIngredient}
          onRemoveFridgeIngredient={handleRemoveFridgeIngredient}
        />

        {/* Active Filters Summary if filtering */}
        {(filterFavoritesOnly || selectedCategory !== 'Toate' || searchQuery || fridgeFilterActive) && (
          <div className="flex items-center justify-between text-xs text-stone-500 px-4 pt-1">
            <span>
              Afișare: <strong>{filteredRecipes.length}</strong> rețete găsite
              {filterFavoritesOnly && ' (Doar Favorite)'}
              {selectedCategory !== 'Toate' && ` • Categoria: ${selectedCategory}`}
              {fridgeFilterActive && fridgeIngredients.length > 0 && ` • Frigider: ${fridgeIngredients.join(', ')}`}
            </span>
            <button
              onClick={() => {
                setSelectedCategory('Toate');
                setSearchQuery('');
                setFilterFavoritesOnly(false);
                setFridgeFilterActive(false);
                setFridgeIngredients([]);
              }}
              className="font-bold text-orange-600 hover:underline"
            >
              Resetează filtrele
            </button>
          </div>
        )}

        {/* Recipes Grid */}
        {filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-2 sm:px-0 pt-2">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => setActiveDetailRecipe(recipe)}
                onToggleFavorite={(e) => handleToggleFavorite(recipe, e)}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4 space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-orange-100/70 text-orange-600 flex items-center justify-center text-3xl">
              🍳
            </div>
            <h3 className="text-lg font-bold text-stone-800">Nu am găsit nicio rețetă</h3>
            <p className="text-xs sm:text-sm text-stone-500 max-w-sm">
              {searchQuery || fridgeFilterActive
                ? 'Nicio rețetă nu se potrivește cu filtrele tale. Încearcă să cauți altceva sau resetează filtrele.'
                : 'Cartea ta de bucate este pregătită pentru rețetele tale favorite!'}
            </p>
            <button
              onClick={() => {
                setEditingRecipe(null);
                setIsAddModalOpen(true);
              }}
              className="mt-2 flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adaugă prima rețetă</span>
            </button>
          </div>
        )}
      </main>

      {/* Floating Action Button for Mobile Add */}
      <div className="fixed bottom-5 right-5 sm:hidden z-30">
        <button
          onClick={() => {
            setEditingRecipe(null);
            setIsAddModalOpen(true);
          }}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 text-white shadow-xl shadow-orange-600/30 flex items-center justify-center active:scale-90 transition-transform"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>
      </div>

      {/* Recipe Detail Modal */}
      {activeDetailRecipe && (
        <RecipeDetailModal
          recipe={activeDetailRecipe}
          onClose={() => setActiveDetailRecipe(null)}
          onOpenCookingMode={(recipe) => {
            setActiveDetailRecipe(null);
            setActiveCookingRecipe(recipe);
          }}
          onEditRecipe={handleEditRecipe}
          onDeleteRecipe={handleDeleteRecipe}
          onAddToShoppingList={handleAddToShoppingList}
        />
      )}

      {/* Fullscreen Cooking Mode Modal */}
      {activeCookingRecipe && (
        <CookingModeModal
          recipe={activeCookingRecipe}
          onClose={() => setActiveCookingRecipe(null)}
        />
      )}

      {/* Add / Edit Recipe Modal */}
      {isAddModalOpen && (
        <AddRecipeModal
          initialRecipe={editingRecipe}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingRecipe(null);
          }}
          onSave={handleSaveRecipe}
          onOpenSettings={() => {
            setIsAddModalOpen(false);
            setIsSettingsModalOpen(true);
          }}
          initialShareText={shareText}
          initialShareUrl={shareUrl}
        />
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <SettingsModal
          onClose={() => setIsSettingsModalOpen(false)}
          onRefreshData={() => {
            // Live query updates automatically
          }}
        />
      )}

      {/* Shopping List Modal */}
      {isShoppingListModalOpen && (
        <ShoppingListModal
          items={shoppingItems}
          onClose={() => setIsShoppingListModalOpen(false)}
          onRefreshItems={() => {
            // Live query updates automatically
          }}
        />
      )}
    </div>
  );
}

export default App;
