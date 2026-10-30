import React, { useState } from 'react';
import type { CategoryItem } from '../types/recipe';
import { saveCategory, deleteCategory, resetCategoriesToDefault } from '../db';
import { X, Plus, Trash2, Edit2, RotateCcw, Check, Sparkles } from 'lucide-react';

interface ManageCategoriesModalProps {
  categories: CategoryItem[];
  categoryCounts: Record<string, number>;
  onClose: () => void;
}

const COMMON_EMOJIS = ['🍲', '🥣', '🍳', '🍝', '🍗', '💨', '🥪', '🥗', '🍰', '🥖', '🥩', '🍕', '🌮', '🍣', '🍱', '🥦', '🥞', '🍽️'];

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  categories,
  categoryCounts,
  onClose,
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('🍲');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = newLabel.trim();
    if (!cleanLabel) return;

    // Check duplicate
    if (categories.some((c) => c.id.toLowerCase() === cleanLabel.toLowerCase())) {
      showToast('Există deja o categorie cu acest nume!');
      return;
    }

    const newCat: CategoryItem = {
      id: cleanLabel,
      label: cleanLabel,
      icon: newIcon.trim() || '🍽️',
      order: categories.length + 1,
    };

    await saveCategory(newCat);
    setNewLabel('');
    setNewIcon('🍲');
    showToast(`Categoria „${cleanLabel}” a fost adăugată!`);
  };

  const handleStartEdit = (cat: CategoryItem) => {
    setEditingId(cat.id);
    setEditLabel(cat.label);
    setEditIcon(cat.icon);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editLabel.trim()) return;

    const existing = categories.find((c) => c.id === editingId);
    if (!existing) return;

    const updated: CategoryItem = {
      ...existing,
      label: editLabel.trim(),
      icon: editIcon.trim() || '🍽️',
    };

    await saveCategory(updated);
    setEditingId(null);
    showToast('Categoria a fost actualizată!');
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    const count = categoryCounts[cat.id] || 0;
    const warning = count > 0
      ? `Categoria „${cat.label}” conține ${count} rețete. Ești sigur că vrei să o ștergi? Rețetele vor rămâne în cartea de bucate.`
      : `Ești sigur că vrei să ștergi categoria „${cat.label}”?`;

    if (window.confirm(warning)) {
      await deleteCategory(cat.id);
      showToast(`Categoria „${cat.label}” a fost ștearsă.`);
    }
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Vrei să resetezi lista la categoriile inițiale (fără conserve, sosuri și băuturi)?')) {
      await resetCategoriesToDefault();
      showToast('Categoriile au fost resetate la valorile implicite!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/50">
          <div>
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span>🏷️</span> Gestionare Categorii
            </h2>
            <p className="text-xs text-stone-500">Adaugă, redenumește sau elimină categoriile de rețete</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-2 text-center flex items-center justify-center gap-1.5 animate-in fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Add Category Card */}
          <form onSubmit={handleAddCategory} className="bg-orange-50/60 border border-orange-200/70 rounded-2xl p-3.5 space-y-3">
            <span className="text-xs font-bold text-orange-950 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" /> Adaugă Categorie Nouă
            </span>

            <div className="flex gap-2">
              <input
                type="text"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                placeholder="Icon"
                title="Alege o pictogramă sau emoji"
                className="w-12 text-center text-lg bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Nume categorie (ex: Grătar, Mâncare Chinezească)..."
                className="flex-1 text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              <button
                type="submit"
                disabled={!newLabel.trim()}
                className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Adaugă</span>
              </button>
            </div>

            {/* Quick Emoji Suggestions */}
            <div className="flex flex-wrap gap-1 items-center pt-0.5">
              <span className="text-[11px] text-stone-500 mr-1">Sugestii:</span>
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewIcon(emoji)}
                  className={`text-base p-1 rounded-lg hover:bg-orange-100 transition-colors ${
                    newIcon === emoji ? 'bg-orange-200 scale-110' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </form>

          {/* Existing Categories List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-500 font-semibold px-1">
              <span>Categoriile Tale ({categories.length})</span>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-stone-500 hover:text-orange-600 flex items-center gap-1 text-[11px]"
              >
                <RotateCcw className="w-3 h-3" /> Resetează la implicite
              </button>
            </div>

            <div className="space-y-1.5">
              {categories.map((cat) => {
                const isEditing = editingId === cat.id;
                const count = categoryCounts[cat.id] || 0;

                if (isEditing) {
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center gap-2 p-2.5 bg-orange-50 border border-orange-300 rounded-xl"
                    >
                      <input
                        type="text"
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        className="w-10 text-center text-lg bg-white border border-stone-200 rounded-lg py-1"
                      />
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="flex-1 text-sm bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-stone-900"
                      />
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="p-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700"
                        title="Salvează"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg bg-stone-200 text-stone-700 hover:bg-stone-300"
                        title="Anulează"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2.5 bg-white border border-stone-200/80 rounded-xl hover:border-stone-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl flex-shrink-0">{cat.icon}</span>
                      <span className="text-sm font-semibold text-stone-900 truncate">
                        {cat.label}
                      </span>
                      {count > 0 && (
                        <span className="text-[11px] px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded-md font-medium">
                          {count} {count === 1 ? 'rețetă' : 'rețete'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                        title="Editează"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Șterge"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200/80 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs sm:text-sm font-semibold text-white bg-stone-900 hover:bg-stone-800 px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            Gata
          </button>
        </div>
      </div>
    </div>
  );
};
