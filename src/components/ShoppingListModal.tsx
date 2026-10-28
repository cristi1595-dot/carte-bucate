import React, { useState } from 'react';
import type { ShoppingItem } from '../types/recipe';
import { db } from '../db';
import {
  X,
  ShoppingCart,
  Plus,
  Trash2,
  Copy,
  Check,
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
  const [copiedToast, setCopiedToast] = useState(false);

  const handleToggleItem = async (id: string, currentChecked: boolean) => {
    await db.shoppingList.update(id, { checked: !currentChecked });
    onRefreshItems();
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: ShoppingItem = {
      id: 'shop-' + Date.now(),
      name: newItemName.trim(),
      amount: newItemAmount.trim() || undefined,
      checked: false,
      createdAt: Date.now(),
    };

    await db.shoppingList.add(newItem);
    setNewItemName('');
    setNewItemAmount('');
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

  const handleCopyShoppingList = () => {
    if (items.length === 0) return;
    const text = items
      .map((i) => `${i.checked ? '☑️' : '◻️'} ${i.amount ? i.amount + ' ' : ''}${i.name}`)
      .join('\n');

    const formatted = `🛒 Lista Mea de Cumpărături (Carte de Bucate):\n\n${text}`;
    navigator.clipboard.writeText(formatted);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Listă de Cumpărături</h2>
              <p className="text-xs text-stone-500">
                {items.length === 0
                  ? 'Niciun ingredient adăugat'
                  : `${checkedCount} din ${items.length} cumpărate`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar (Copy to WhatsApp & Clear) */}
        {items.length > 0 && (
          <div className="px-6 py-2.5 bg-stone-100/60 border-b border-stone-200/60 flex items-center justify-between text-xs">
            <button
              onClick={handleCopyShoppingList}
              className="flex items-center gap-1.5 font-bold text-orange-600 hover:text-orange-700"
            >
              {copiedToast ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedToast ? 'Copiat în clipboard!' : 'Trimite pe WhatsApp / Copiază'}</span>
            </button>

            {checkedCount > 0 && (
              <button
                onClick={handleClearChecked}
                className="font-semibold text-stone-500 hover:text-rose-600"
              >
                Șterge cele {checkedCount} bifate
              </button>
            )}
          </div>
        )}

        {/* Items List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-10 space-y-2 text-stone-400">
              <ShoppingCart className="w-10 h-10 mx-auto stroke-1" />
              <p className="text-sm font-medium">Lista ta este goală momentan.</p>
              <p className="text-xs text-stone-400 max-w-xs mx-auto">
                Deschide orice rețetă și apasă pe „Adaugă pe Lista de Cumpărături” sau scrie mai jos!
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                  item.checked
                    ? 'bg-stone-50 border-stone-200 text-stone-400'
                    : 'bg-white border-stone-200/80 text-stone-900 shadow-2xs'
                }`}
              >
                <div
                  onClick={() => handleToggleItem(item.id, item.checked)}
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                >
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                      item.checked
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-stone-300 bg-white'
                    }`}
                  >
                    {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <span className={`text-sm font-medium ${item.checked ? 'line-through' : ''}`}>
                      {item.amount && <strong className="mr-1.5 font-bold">{item.amount}</strong>}
                      {item.name}
                    </span>
                    {item.recipeTitle && (
                      <span className="block text-[10px] text-stone-400 mt-0.5">
                        Pentru: {item.recipeTitle}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 text-stone-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add custom item form footer */}
        <form onSubmit={handleAddItem} className="p-4 bg-stone-50 border-t border-stone-200/80 flex gap-2">
          <input
            type="text"
            placeholder="Ingredient nou (ex: lapte, unt)..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1 bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          <input
            type="text"
            placeholder="Cant. (1l)"
            value={newItemAmount}
            onChange={(e) => setNewItemAmount(e.target.value)}
            className="w-20 bg-white border border-stone-200 rounded-xl px-2.5 py-2 text-xs sm:text-sm text-stone-900 text-center focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
          <button
            type="submit"
            className="bg-orange-600 hover:bg-orange-700 text-white p-2.5 rounded-xl cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </form>
      </div>
    </div>
  );
};
