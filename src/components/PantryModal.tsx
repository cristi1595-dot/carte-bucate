import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { PantryItem, SupermarketAisle } from '../types/recipe';
import { SUPERMARKET_AISLES } from '../types/recipe';
import { classifyAisle, prepareShoppingItem, adjustQuantity } from '../services/groceryClassifier';
import {
  X,
  Package,
  Plus,
  Minus,
  Pencil,
  Trash2,
  ShoppingCart,
  Check,
  Search,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface PantryModalProps {
  onClose: () => void;
  onOpenShoppingList: () => void;
  onApplyFridgeFilter?: (ingredients: string[]) => void;
}

export const PantryModal: React.FC<PantryModalProps> = ({
  onClose,
  onOpenShoppingList,
  onApplyFridgeFilter,
}) => {
  const pantryItems = useLiveQuery(() => db.pantry.orderBy('name').toArray(), []) || [];

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'outOfStock'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // New item form
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>('auto');

  // Feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Inline amount editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingAmountValue, setEditingAmountValue] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Toggle inStock status
  const handleToggleStock = async (item: PantryItem) => {
    const updatedStock = !item.inStock;
    await db.pantry.update(item.id, {
      inStock: updatedStock,
      updatedAt: Date.now(),
    });
  };

  // Fast +/- quantity adjustment stepper
  const handleAdjustQuantity = async (item: PantryItem, delta: number) => {
    const { newAmount, isZero } = adjustQuantity(item.amount, delta);
    await db.pantry.update(item.id, {
      amount: newAmount,
      inStock: isZero ? false : true,
      updatedAt: Date.now(),
    });
  };

  const startEditingAmount = (item: PantryItem) => {
    setEditingItemId(item.id);
    setEditingAmountValue(item.amount || '');
  };

  const handleSaveInlineAmount = async (item: PantryItem) => {
    const trimmed = editingAmountValue.trim();
    const isZero = trimmed === '0' || trimmed.startsWith('0 ') || trimmed.startsWith('0g') || trimmed.startsWith('0kg');
    await db.pantry.update(item.id, {
      amount: trimmed || undefined,
      inStock: isZero ? false : item.inStock,
      updatedAt: Date.now(),
    });
    setEditingItemId(null);
  };

  // Add new item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const assignedCategory =
      newItemCategory === 'auto' ? classifyAisle(newItemName) : (newItemCategory as SupermarketAisle);

    const newItem: PantryItem = {
      id: 'pantry-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: newItemName.trim(),
      amount: newItemAmount.trim() || undefined,
      category: assignedCategory,
      inStock: true,
      updatedAt: Date.now(),
    };

    await db.pantry.add(newItem);
    setNewItemName('');
    setNewItemAmount('');
    setNewItemCategory('auto');
    showToast(`„${newItem.name}” a fost adăugat în cămară!`);
  };

  const handleDeleteItem = async (id: string) => {
    await db.pantry.delete(id);
  };

  // Send single item to shopping list
  const handleSendToShoppingList = async (item: PantryItem) => {
    const shopItem = prepareShoppingItem(item.name, item.amount, 'Din Cămară (Reaprovizionare)');
    await db.shoppingList.add(shopItem);
    showToast(`„${item.name}” a fost trimis în lista de cumpărături!`);
  };

  // Send all out-of-stock items to shopping list
  const handleSendAllOutOfStockToShopping = async () => {
    const outOfStockItems = pantryItems.filter((i) => !i.inStock);
    if (outOfStockItems.length === 0) {
      alert('Toate alimentele din cămară sunt în stoc!');
      return;
    }

    const newShopItems = outOfStockItems.map((item) =>
      prepareShoppingItem(item.name, item.amount, 'Din Cămară (Epuizate)')
    );

    await db.shoppingList.bulkAdd(newShopItems);
    showToast(`${outOfStockItems.length} produse epuizate au fost adăugate în lista de cumpărături!`);
  };

  // Apply in-stock ingredients to the "Ce am în frigider" search filter on main page
  const handleUseInFridgeFilter = () => {
    if (!onApplyFridgeFilter) return;
    const inStockNames = pantryItems.filter((i) => i.inStock).map((i) => i.name.toLowerCase());
    onApplyFridgeFilter(inStockNames);
    onClose();
  };

  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return pantryItems.filter((item) => {
      // 1. Stock filter
      if (stockFilter === 'inStock' && !item.inStock) return false;
      if (stockFilter === 'outOfStock' && item.inStock) return false;

      // 2. Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return item.name.toLowerCase().includes(q) || (item.category && item.category.toLowerCase().includes(q));
      }

      return true;
    });
  }, [pantryItems, stockFilter, selectedCategory, searchQuery]);

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, PantryItem[]> = {};

    for (const item of filteredItems) {
      const cat = item.category || 'Altele';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    }

    return groups;
  }, [filteredItems]);

  const inStockCount = pantryItems.filter((i) => i.inStock).length;
  const outOfStockCount = pantryItems.filter((i) => !i.inStock).length;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Cămară (Pantry)</h2>
              <p className="text-xs text-stone-500">
                {inStockCount} în stoc • {outOfStockCount} epuizate (stil Paprika)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search & Filter Tabs */}
        <div className="px-5 sm:px-6 py-3 bg-stone-100/60 border-b border-stone-200/70 space-y-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Caută în cămară (ex: ulei, făină, sare)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center bg-white border border-stone-200 rounded-xl p-0.5 shadow-2xs">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  stockFilter === 'all' ? 'bg-amber-600 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                Toate ({pantryItems.length})
              </button>
              <button
                onClick={() => setStockFilter('inStock')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  stockFilter === 'inStock' ? 'bg-emerald-600 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                În Stoc ({inStockCount})
              </button>
              <button
                onClick={() => setStockFilter('outOfStock')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  stockFilter === 'outOfStock' ? 'bg-rose-600 text-white shadow-xs' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                Epuizate ({outOfStockCount})
              </button>
            </div>

            {/* Category Filter dropdown */}
            <div className="flex items-center gap-1.5 text-stone-500">
              <Filter className="w-3.5 h-3.5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-700 focus:outline-none"
              >
                <option value="all">Toate Categoriile</option>
                {SUPERMARKET_AISLES.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.icon} {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Toast confirmation */}
        {toastMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 flex items-center justify-between text-xs font-bold text-emerald-800 animate-in fade-in">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              {toastMessage}
            </span>
            <button
              onClick={onOpenShoppingList}
              className="underline text-emerald-900 cursor-pointer font-bold"
            >
              Vezi Lista
            </button>
          </div>
        )}

        {/* Fast Action Bar: Send all out of stock to shopping list */}
        {outOfStockCount > 0 && stockFilter !== 'inStock' && (
          <div className="px-6 py-2 bg-amber-50/70 border-b border-amber-200/60 flex items-center justify-between text-xs">
            <span className="text-amber-900 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Ai {outOfStockCount} produse epuizate
            </span>
            <button
              onClick={handleSendAllOutOfStockToShopping}
              className="flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950 bg-white border border-amber-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
              <span>Cumpără-le pe toate</span>
            </button>
          </div>
        )}

        {/* Pantry Items List grouped by Category */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-stone-400">
              <Package className="w-12 h-12 mx-auto stroke-1 text-stone-300" />
              <p className="text-sm font-semibold text-stone-600">Niciun produs găsit în cămară.</p>
              <p className="text-xs text-stone-400 max-w-xs mx-auto">
                Adaugă ingredientele de bază folosind formularul de mai jos!
              </p>
            </div>
          ) : (
            Object.keys(groupedItems).map((categoryName) => {
              const catItems = groupedItems[categoryName];
              if (!catItems || catItems.length === 0) return null;

              const isCollapsed = !!collapsedCategories[categoryName];
              const aisleMeta = SUPERMARKET_AISLES.find((a) => a.id === categoryName);
              const icon = aisleMeta ? aisleMeta.icon : '🥫';

              return (
                <div
                  key={categoryName}
                  className="bg-stone-50/60 border border-stone-200/80 rounded-2xl overflow-hidden shadow-2xs"
                >
                  {/* Category Header */}
                  <div
                    onClick={() => toggleCategoryCollapse(categoryName)}
                    className="px-4 py-2.5 bg-stone-100/70 flex items-center justify-between cursor-pointer select-none hover:bg-stone-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{icon}</span>
                      <span className="font-bold text-xs sm:text-sm text-stone-800">
                        {categoryName}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-stone-600 border border-stone-200">
                        {catItems.length}
                      </span>
                    </div>

                    <div className="text-stone-400">
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Items list */}
                  {!isCollapsed && (
                    <div className="p-2 space-y-1.5">
                      {catItems.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                            item.inStock
                              ? 'bg-white border-stone-200/70 text-stone-900 shadow-2xs'
                              : 'bg-stone-100/70 border-stone-200/50 text-stone-400'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Stock toggle button */}
                            <button
                              onClick={() => handleToggleStock(item)}
                              className={`p-1 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
                                item.inStock
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-600 hover:bg-emerald-100'
                                  : 'bg-stone-200 border-stone-300 text-stone-400 hover:bg-stone-300'
                              }`}
                              title={item.inStock ? 'Marchează ca epuizat' : 'Marchează ca în stoc'}
                            >
                              <CheckCircle2 className={`w-4 h-4 ${item.inStock ? 'fill-emerald-600/20' : ''}`} />
                            </button>

                            <div className="min-w-0 flex-1">
                              <span
                                className={`text-xs sm:text-sm font-semibold block truncate ${
                                  !item.inStock ? 'line-through text-stone-400' : 'text-stone-900'
                                }`}
                              >
                                {item.name}
                              </span>

                              {/* Quantity Stepper & Inline Edit */}
                              <div className="mt-1 flex items-center gap-1.5">
                                {editingItemId === item.id ? (
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      handleSaveInlineAmount(item);
                                    }}
                                    className="flex items-center gap-1"
                                  >
                                    <input
                                      type="text"
                                      value={editingAmountValue}
                                      onChange={(e) => setEditingAmountValue(e.target.value)}
                                      onBlur={() => handleSaveInlineAmount(item)}
                                      className="w-24 sm:w-28 bg-white border border-amber-400 rounded-lg px-2 py-0.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                      placeholder="ex: 500g"
                                      autoFocus
                                    />
                                    <button
                                      type="submit"
                                      className="p-1 rounded-md bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
                                      title="Salvează cantitatea"
                                    >
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </button>
                                  </form>
                                ) : (
                                  <div className="inline-flex items-center gap-1 bg-stone-100/90 border border-stone-200/90 rounded-lg p-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustQuantity(item, -1)}
                                      className="p-1 rounded-md bg-white hover:bg-stone-200 text-stone-700 active:scale-90 transition-all cursor-pointer shadow-2xs"
                                      title="Scade cantitatea (-)"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span
                                      onClick={() => startEditingAmount(item)}
                                      className="px-2 text-xs font-bold text-stone-800 cursor-pointer hover:bg-stone-200/70 rounded transition-colors select-none"
                                      title="Apasă pentru a edita cantitatea"
                                    >
                                      {item.amount || '0'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustQuantity(item, 1)}
                                      className="p-1 rounded-md bg-white hover:bg-stone-200 text-stone-700 active:scale-90 transition-all cursor-pointer shadow-2xs"
                                      title="Crește cantitatea (+)"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => startEditingAmount(item)}
                                      className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
                                      title="Editează manual textul"
                                    >
                                      <Pencil className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Quick Add to Shopping List button */}
                            <button
                              onClick={() => handleSendToShoppingList(item)}
                              className="p-1.5 rounded-lg text-amber-700 hover:text-amber-900 hover:bg-amber-50 cursor-pointer"
                              title="Adaugă în lista de cumpărături"
                            >
                              <ShoppingCart className="w-4 h-4" />
                            </button>

                            {/* Delete button */}
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Șterge din cămară"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Quick Add Item Form & Fridge Filter Integration */}
        <div className="p-3.5 bg-stone-50 border-t border-stone-200/80 space-y-2.5">
          <form onSubmit={handleAddItem} className="flex gap-2">
            <input
              type="text"
              placeholder="Adaugă în cămară (ex: orez, scorțișoară)..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <input
              type="text"
              placeholder="Cant. (500g)"
              value={newItemAmount}
              onChange={(e) => setNewItemAmount(e.target.value)}
              className="w-20 sm:w-24 bg-white border border-stone-200 rounded-xl px-2.5 py-2 text-xs sm:text-sm text-stone-900 text-center focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white p-2.5 rounded-xl cursor-pointer shadow-sm flex-shrink-0"
              title="Adaugă în cămară"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </form>

          {/* Fridge Filter Link Button */}
          {onApplyFridgeFilter && (
            <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-200/60">
              <span>Folosește cămara pentru idei de rețete:</span>
              <button
                onClick={handleUseInFridgeFilter}
                className="font-bold text-amber-700 hover:underline cursor-pointer"
              >
                Găsește rețete cu ce am în cămară ✨
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
