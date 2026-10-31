import React, { useState, useMemo } from 'react';
import type { ShoppingItem, SupermarketAisle } from '../types/recipe';
import { SUPERMARKET_AISLES } from '../types/recipe';
import { db } from '../db';
import { prepareShoppingItem, classifyAisle } from '../services/groceryClassifier';
import {
  X,
  ShoppingCart,
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface ShoppingListModalProps {
  items: ShoppingItem[];
  onClose: () => void;
  onRefreshItems: () => void;
}

export const ShoppingListModal: React.FC<ShoppingListModalProps> = ({
  items,
  onClose,
  onRefreshItems,
}) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [selectedAisle, setSelectedAisle] = useState<SupermarketAisle | 'auto'>('auto');
  const [copiedToast, setCopiedToast] = useState(false);
  const [collapsedAisles, setCollapsedAisles] = useState<Record<string, boolean>>({});

  const handleToggleItem = async (id: string, currentChecked: boolean) => {
    await db.shoppingList.update(id, { checked: !currentChecked });
    onRefreshItems();
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const aisleToUse = selectedAisle === 'auto' ? classifyAisle(newItemName) : selectedAisle;
    const newItem = prepareShoppingItem(newItemName, newItemAmount, undefined, aisleToUse);

    await db.shoppingList.add(newItem);
    setNewItemName('');
    setNewItemAmount('');
    setSelectedAisle('auto');
    onRefreshItems();
  };

  const handleDeleteItem = async (id: string) => {
    await db.shoppingList.delete(id);
    onRefreshItems();
  };

  const handleClearChecked = async () => {
    const checkedIds = items.filter((i) => i.checked).map((i) => i.id);
    await db.shoppingList.bulkDelete(checkedIds);
    onRefreshItems();
  };

  const handleMoveCheckedToPantry = async () => {
    const checkedItems = items.filter((i) => i.checked);
    if (checkedItems.length === 0) return;

    const existingPantry = await db.pantry.toArray();
    for (const item of checkedItems) {
      const lower = item.name.toLowerCase().trim();
      const match = existingPantry.find((p) => p.name.toLowerCase().trim() === lower);
      if (match) {
        await db.pantry.update(match.id, {
          inStock: true,
          amount: item.amount || match.amount,
          updatedAt: Date.now(),
        });
      } else {
        await db.pantry.add({
          id: 'pantry-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: item.name,
          amount: item.amount,
          category: item.aisle || classifyAisle(item.name),
          inStock: true,
          updatedAt: Date.now(),
        });
      }
    }

    const checkedIds = checkedItems.map((i) => i.id);
    await db.shoppingList.bulkDelete(checkedIds);
    onRefreshItems();
  };

  const toggleAisleCollapse = (aisle: string) => {
    setCollapsedAisles((prev) => ({ ...prev, [aisle]: !prev[aisle] }));
  };

  // Group items by aisle
  const groupedItems = useMemo(() => {
    const groups: Record<SupermarketAisle, ShoppingItem[]> = {
      'Legume & Fructe': [],
      'Lactate & Ouă': [],
      'Carne & Pește': [],
      'Panificație': [],
      'Băcănie & Condimente': [],
      'Congelate': [],
      'Băuturi': [],
      'Altele': [],
    };

    for (const item of items) {
      const aisle = item.aisle || classifyAisle(item.name);
      if (groups[aisle]) {
        groups[aisle].push(item);
      } else {
        groups['Altele'].push(item);
      }
    }

    return groups;
  }, [items]);

  const handleCopyShoppingList = () => {
    if (items.length === 0) return;

    let text = '🛒 Lista Mea de Cumpărături (Carte de Bucate):\n\n';

    for (const aisle of SUPERMARKET_AISLES) {
      const aisleItems = groupedItems[aisle.id];
      if (aisleItems && aisleItems.length > 0) {
        text += `${aisle.icon} ${aisle.label}:\n`;
        for (const i of aisleItems) {
          text += `  ${i.checked ? '☑️' : '◻️'} ${i.amount ? i.amount + ' ' : ''}${i.name}\n`;
        }
        text += '\n';
      }
    }

    navigator.clipboard.writeText(text.trim());
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shadow-xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Listă de Cumpărături</h2>
              <p className="text-xs text-stone-500">
                {items.length === 0
                  ? 'Niciun ingredient adăugat'
                  : `${checkedCount} din ${items.length} cumpărate • sortat pe raioane`}
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

        {/* Action Bar (Copy to WhatsApp & Clear) */}
        {items.length > 0 && (
          <div className="px-6 py-2.5 bg-stone-100/60 border-b border-stone-200/60 flex items-center justify-between text-xs">
            <button
              onClick={handleCopyShoppingList}
              className="flex items-center gap-1.5 font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
            >
              {copiedToast ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedToast ? 'Copiat pe raioane!' : 'Trimite pe WhatsApp / Copiază'}</span>
            </button>

            {checkedCount > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMoveCheckedToPantry}
                  className="font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  title="Marchează aceste ingrediente ca fiind în stoc în Cămară"
                >
                  Mută în Cămară ({checkedCount})
                </button>
                <button
                  onClick={handleClearChecked}
                  className="font-semibold text-stone-500 hover:text-rose-600 cursor-pointer"
                >
                  Șterge ({checkedCount})
                </button>
              </div>
            )}
          </div>
        )}

        {/* Grouped Items List by Supermarket Aisle */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-stone-400">
              <ShoppingCart className="w-12 h-12 mx-auto stroke-1 text-stone-300" />
              <p className="text-sm font-semibold text-stone-600">Lista ta este goală momentan.</p>
              <p className="text-xs text-stone-400 max-w-xs mx-auto">
                Deschide orice rețetă sau planificatorul de mese și apasă pe „Adaugă pe Lista de Cumpărături”!
              </p>
            </div>
          ) : (
            SUPERMARKET_AISLES.map((aisle) => {
              const aisleItems = groupedItems[aisle.id];
              if (!aisleItems || aisleItems.length === 0) return null;

              const isCollapsed = !!collapsedAisles[aisle.id];
              const aisleCheckedCount = aisleItems.filter((i) => i.checked).length;

              return (
                <div key={aisle.id} className="bg-stone-50/60 border border-stone-200/80 rounded-2xl overflow-hidden shadow-2xs">
                  {/* Aisle Section Header */}
                  <div
                    onClick={() => toggleAisleCollapse(aisle.id)}
                    className="px-4 py-2.5 bg-stone-100/70 flex items-center justify-between cursor-pointer select-none hover:bg-stone-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{aisle.icon}</span>
                      <span className="font-bold text-xs sm:text-sm text-stone-800">
                        {aisle.label}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-stone-600 border border-stone-200">
                        {aisleCheckedCount}/{aisleItems.length}
                      </span>
                    </div>

                    <div className="text-stone-400">
                      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Aisle Items */}
                  {!isCollapsed && (
                    <div className="p-2 space-y-1.5">
                      {aisleItems.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                            item.checked
                              ? 'bg-stone-100/60 border-stone-200 text-stone-400'
                              : 'bg-white border-stone-200/60 text-stone-900 shadow-2xs'
                          }`}
                        >
                          <div
                            onClick={() => handleToggleItem(item.id, item.checked)}
                            className="flex items-center gap-3 flex-1 cursor-pointer select-none"
                          >
                            <div
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors flex-shrink-0 ${
                                item.checked
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-stone-300 bg-white'
                              }`}
                            >
                              {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <div className="min-w-0">
                              <span className={`text-xs sm:text-sm font-medium ${item.checked ? 'line-through text-stone-400' : ''}`}>
                                {item.amount && <strong className="mr-1.5 font-bold">{item.amount}</strong>}
                                <span>{item.name}</span>
                              </span>
                              {item.recipeTitle && (
                                <span className="block text-[10px] text-stone-400 mt-0.5 truncate">
                                  Pentru: {item.recipeTitle}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 cursor-pointer"
                            title="Șterge"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add custom item form footer */}
        <form onSubmit={handleAddItem} className="p-3.5 bg-stone-50 border-t border-stone-200/80 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ingredient nou (ex: lapte, ouă, morcovi)..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
            <input
              type="text"
              placeholder="Cant. (1l)"
              value={newItemAmount}
              onChange={(e) => setNewItemAmount(e.target.value)}
              className="w-20 sm:w-24 bg-white border border-stone-200 rounded-xl px-2.5 py-2 text-xs sm:text-sm text-stone-900 text-center focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
            <button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700 text-white p-2.5 rounded-xl cursor-pointer shadow-sm flex-shrink-0"
              title="Adaugă în listă"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500 px-1">
            <span>Raion:</span>
            <select
              value={selectedAisle}
              onChange={(e) => setSelectedAisle(e.target.value as any)}
              className="bg-white border border-stone-200 rounded-lg px-2 py-1 text-xs text-stone-700 focus:outline-none"
            >
              <option value="auto">✨ Detectează automat</option>
              {SUPERMARKET_AISLES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.icon} {a.label}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>
    </div>
  );
};
