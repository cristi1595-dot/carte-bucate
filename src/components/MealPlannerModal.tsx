import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Recipe, MealType, MealPlanEntry } from '../types/recipe';
import { prepareShoppingItem } from '../services/groceryClassifier';
import {
  X,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  ShoppingCart,
  Check,
  Search,
} from 'lucide-react';

interface MealPlannerModalProps {
  onClose: () => void;
  onOpenShoppingList: () => void;
  onSelectRecipe?: (recipe: Recipe) => void;
}

const MEAL_TYPES: { id: MealType; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Mic Dejun', icon: '🍳' },
  { id: 'lunch', label: 'Prânz', icon: '🍲' },
  { id: 'dinner', label: 'Cină', icon: '🍗' },
  { id: 'snack', label: 'Gustare / Desert', icon: '🍰' },
];

const DAYS_OF_WEEK = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'];

export const MealPlannerModal: React.FC<MealPlannerModalProps> = ({
  onClose,
  onOpenShoppingList,
  onSelectRecipe,
}) => {
  // Navigation states
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0); // 0 for Monday .. 6 for Sunday

  // Selector modal state for adding a recipe to a specific date & slot
  const [addingTarget, setAddingTarget] = useState<{ date: string; mealType: MealType } | null>(null);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [addedToCartToast, setAddedToCartToast] = useState<string | null>(null);

  // Queries
  const allRecipes = useLiveQuery(() => db.recipes.toArray(), []) || [];
  const allMealPlans = useLiveQuery(() => db.mealPlans.toArray(), []) || [];

  // Compute the dates for the currently displayed week (Monday to Sunday)
  const weekDates = useMemo(() => {
    const today = new Date();
    // Monday as first day of week
    const currentDay = today.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday + currentWeekOffset * 7);

    const dates: { dateStr: string; dayName: string; dayNumber: number; monthName: string; isToday: boolean }[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const dateStr = d.toISOString().split('T')[0];
      dates.push({
        dateStr,
        dayName: DAYS_OF_WEEK[i],
        dayNumber: d.getDate(),
        monthName: d.toLocaleDateString('ro-RO', { month: 'short' }),
        isToday: dateStr === todayStr,
      });
    }

    return dates;
  }, [currentWeekOffset]);

  // Filter meal plans for the current week
  const weekPlansMap = useMemo(() => {
    const map: Record<string, Record<MealType, MealPlanEntry[]>> = {};

    for (const d of weekDates) {
      map[d.dateStr] = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
      };
    }

    for (const plan of allMealPlans) {
      if (map[plan.date] && map[plan.date][plan.mealType]) {
        map[plan.date][plan.mealType].push(plan);
      }
    }

    return map;
  }, [weekDates, allMealPlans]);

  // Handle adding recipe to plan
  const handleAddRecipeToPlan = async (recipe: Recipe) => {
    if (!addingTarget) return;

    const newEntry: MealPlanEntry = {
      id: 'meal-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      date: addingTarget.date,
      mealType: addingTarget.mealType,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      recipeCategory: recipe.category,
      servings: recipe.servings || 4,
      createdAt: Date.now(),
    };

    await db.mealPlans.add(newEntry);
    setAddingTarget(null);
    setRecipeSearch('');
  };

  const handleDeletePlanEntry = async (id: string) => {
    await db.mealPlans.delete(id);
  };

  // Generate grocery list from the current week's planned meals
  const handleGenerateShoppingListFromWeek = async () => {
    const weekPlanList: MealPlanEntry[] = [];
    for (const d of weekDates) {
      const dayPlans = weekPlansMap[d.dateStr];
      if (dayPlans) {
        for (const type of MEAL_TYPES) {
          weekPlanList.push(...dayPlans[type.id]);
        }
      }
    }

    if (weekPlanList.length === 0) {
      alert('Nu ai nicio masă planificată în această săptămână.');
      return;
    }

    // Collect all ingredients from the planned recipes
    const newItems = [];
    let itemsCount = 0;

    for (const plan of weekPlanList) {
      const rec = allRecipes.find((r) => r.id === plan.recipeId);
      if (rec && rec.ingredients) {
        for (const ing of rec.ingredients) {
          let amtStr = '';
          if (ing.amount !== null && ing.amount !== undefined) {
            amtStr = `${ing.amount} ${ing.unit}`.trim();
          }
          const item = prepareShoppingItem(ing.name, amtStr || undefined, rec.title);
          newItems.push(item);
          itemsCount++;
        }
      }
    }

    await db.shoppingList.bulkAdd(newItems);
    setAddedToCartToast(`${itemsCount} ingrediente au fost trimise în lista de cumpărături!`);
    setTimeout(() => setAddedToCartToast(null), 3500);
  };

  const filteredRecipes = useMemo(() => {
    if (!recipeSearch.trim()) return allRecipes;
    const q = recipeSearch.toLowerCase().trim();
    return allRecipes.filter(
      (r) => r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
    );
  }, [allRecipes, recipeSearch]);

  const currentSelectedDay = weekDates[selectedDayIndex] || weekDates[0];

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shadow-xs">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900">Planificator de Mese</h2>
              <p className="text-xs text-stone-500">Meniul tău pe zile (stil Paprika)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle (Săptămână / Zi) */}
            <div className="flex items-center bg-stone-200/70 rounded-xl p-0.5 text-xs font-bold">
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'week' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
                }`}
              >
                Săptămână
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'day' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600'
                }`}
              >
                Zi
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Week / Date Navigation Bar */}
        <div className="px-5 sm:px-6 py-3 bg-stone-100/60 border-b border-stone-200/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
              className="p-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 cursor-pointer"
              title="Săptămâna anterioară"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs sm:text-sm font-bold text-stone-800">
              {weekDates[0].dayNumber} {weekDates[0].monthName} – {weekDates[6].dayNumber} {weekDates[6].monthName}
            </span>
            <button
              onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
              className="p-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 cursor-pointer"
              title="Săptămâna următoare"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {currentWeekOffset !== 0 && (
              <button
                onClick={() => setCurrentWeekOffset(0)}
                className="text-xs font-semibold text-orange-600 hover:underline ml-2 cursor-pointer"
              >
                Azi
              </button>
            )}
          </div>

          {/* Action: Send week meals to shopping list */}
          <button
            onClick={handleGenerateShoppingListFromWeek}
            className="flex items-center gap-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Generează Cumpărături pentru Săptămână</span>
          </button>
        </div>

        {/* Toast confirmation */}
        {addedToCartToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 flex items-center justify-between text-xs font-bold text-emerald-800 animate-in fade-in">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              {addedToCartToast}
            </span>
            <button
              onClick={onOpenShoppingList}
              className="underline text-emerald-900 cursor-pointer font-bold"
            >
              Deschide Lista
            </button>
          </div>
        )}

        {/* Weekdays Day Selector Strip */}
        <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-stone-200/60 flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto">
          {weekDates.map((d, idx) => {
            const isSelected = viewMode === 'day' && selectedDayIndex === idx;
            return (
              <button
                key={d.dateStr}
                onClick={() => setSelectedDayIndex(idx)}
                className={`flex-1 min-w-[50px] sm:min-w-[70px] py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-orange-600 text-white shadow-md'
                    : d.isToday
                    ? 'bg-orange-50 border border-orange-200 text-orange-900'
                    : 'hover:bg-stone-100 text-stone-700'
                }`}
              >
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-80">
                  {d.dayName.substring(0, 3)}
                </span>
                <span className="text-sm sm:text-base font-extrabold mt-0.5">
                  {d.dayNumber}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-50/50">
          {viewMode === 'week' ? (
            /* WEEK VIEW: 7 Columns on large screens or responsive cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
              {weekDates.map((day) => {
                const dayPlans = weekPlansMap[day.dateStr];

                return (
                  <div
                    key={day.dateStr}
                    className={`bg-white rounded-2xl border p-3 flex flex-col gap-2 shadow-2xs ${
                      day.isToday ? 'border-orange-300 ring-1 ring-orange-200' : 'border-stone-200/80'
                    }`}
                  >
                    {/* Day Column Header */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-stone-100">
                      <div>
                        <span className="font-extrabold text-xs sm:text-sm text-stone-900 block">
                          {day.dayName}
                        </span>
                        <span className="text-[10px] text-stone-400 font-medium">
                          {day.dayNumber} {day.monthName}
                        </span>
                      </div>
                      {day.isToday && (
                        <span className="text-[9px] font-bold uppercase bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-md">
                          Azi
                        </span>
                      )}
                    </div>

                    {/* Meal Slots */}
                    <div className="space-y-2 flex-1">
                      {MEAL_TYPES.map((type) => {
                        const itemsInSlot = dayPlans ? dayPlans[type.id] : [];

                        return (
                          <div key={type.id} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 pt-1">
                              <span className="flex items-center gap-1">
                                <span>{type.icon}</span> {type.label}
                              </span>
                              <button
                                onClick={() => setAddingTarget({ date: day.dateStr, mealType: type.id })}
                                className="p-0.5 rounded text-orange-600 hover:bg-orange-50 cursor-pointer"
                                title={`Adaugă la ${type.label}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Planned Recipes in slot */}
                            {itemsInSlot.length > 0 ? (
                              itemsInSlot.map((item) => (
                                <div
                                  key={item.id}
                                  className="group flex items-center justify-between gap-1 p-1.5 rounded-xl bg-orange-50/70 border border-orange-200/60 text-xs text-stone-900"
                                >
                                  <span
                                    onClick={() => {
                                      const rec = allRecipes.find((r) => r.id === item.recipeId);
                                      if (rec && onSelectRecipe) onSelectRecipe(rec);
                                    }}
                                    className="font-medium truncate flex-1 hover:text-orange-700 cursor-pointer"
                                    title={item.recipeTitle}
                                  >
                                    {item.recipeTitle}
                                  </span>
                                  <button
                                    onClick={() => handleDeletePlanEntry(item.id)}
                                    className="text-stone-400 hover:text-rose-600 p-0.5 opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                                    title="Șterge"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div
                                onClick={() => setAddingTarget({ date: day.dateStr, mealType: type.id })}
                                className="text-[10px] text-stone-300 hover:text-stone-400 hover:bg-stone-50 border border-dashed border-stone-200 rounded-lg p-1 text-center cursor-pointer select-none transition-colors"
                              >
                                + Adaugă
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* DAY VIEW: Focus on selected day */
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    {currentSelectedDay.dayName}, {currentSelectedDay.dayNumber} {currentSelectedDay.monthName}
                  </h3>
                  <p className="text-xs text-stone-500">Planul meselor pentru această zi</p>
                </div>
                {currentSelectedDay.isToday && (
                  <span className="text-xs font-bold bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
                    Astăzi
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MEAL_TYPES.map((type) => {
                  const dayPlans = weekPlansMap[currentSelectedDay.dateStr];
                  const itemsInSlot = dayPlans ? dayPlans[type.id] : [];

                  return (
                    <div
                      key={type.id}
                      className="bg-white rounded-2xl border border-stone-200/80 p-4 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                        <span className="font-bold text-sm text-stone-800 flex items-center gap-1.5">
                          <span>{type.icon}</span> {type.label}
                        </span>
                        <button
                          onClick={() => setAddingTarget({ date: currentSelectedDay.dateStr, mealType: type.id })}
                          className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-2 py-1 rounded-lg cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Adaugă
                        </button>
                      </div>

                      {itemsInSlot.length > 0 ? (
                        <div className="space-y-2">
                          {itemsInSlot.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-orange-50/60 border border-orange-200/60"
                            >
                              <div
                                onClick={() => {
                                  const rec = allRecipes.find((r) => r.id === item.recipeId);
                                  if (rec && onSelectRecipe) onSelectRecipe(rec);
                                }}
                                className="cursor-pointer flex-1"
                              >
                                <span className="font-bold text-sm text-stone-900 block hover:text-orange-700">
                                  {item.recipeTitle}
                                </span>
                                {item.recipeCategory && (
                                  <span className="text-[10px] text-stone-500">
                                    {item.recipeCategory}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeletePlanEntry(item.id)}
                                className="p-1.5 text-stone-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          onClick={() => setAddingTarget({ date: currentSelectedDay.dateStr, mealType: type.id })}
                          className="text-center py-6 text-stone-400 border border-dashed border-stone-200 rounded-xl cursor-pointer hover:bg-stone-50 transition-colors"
                        >
                          <span className="text-xs font-medium">Nicio rețetă selectată</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recipe Selection Modal overlay */}
        {addingTarget && (
          <div className="absolute inset-0 z-20 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-stone-900">
                    Alege o rețetă
                  </h3>
                  <p className="text-xs text-stone-500">
                    pentru {MEAL_TYPES.find((m) => m.id === addingTarget.mealType)?.label} ({addingTarget.date})
                  </p>
                </div>
                <button
                  onClick={() => setAddingTarget(null)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search input */}
              <div className="p-3 border-b border-stone-100 bg-white">
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Caută în cărțile tale..."
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-stone-100 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    autoFocus
                  />
                </div>
              </div>

              {/* Recipe List */}
              <div className="p-3 overflow-y-auto flex-1 space-y-1.5">
                {filteredRecipes.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-xs">
                    Nu a fost găsită nicio rețetă.
                  </div>
                ) : (
                  filteredRecipes.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleAddRecipeToPlan(r)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-orange-50 border border-transparent hover:border-orange-200/60 text-left transition-all cursor-pointer"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-xs sm:text-sm text-stone-900 block truncate">
                          {r.title}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {r.category} • {r.servings || 4} porții
                        </span>
                      </div>
                      <Plus className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
