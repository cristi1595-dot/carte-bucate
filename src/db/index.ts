import Dexie, { type Table } from 'dexie';
import type { Recipe, ShoppingItem, AppBackup, CategoryItem, MealPlanEntry, PantryItem } from '../types/recipe';
import { DEFAULT_CATEGORIES } from '../types/recipe';
import { SAMPLE_RECIPES } from './sampleRecipes';

export const DEFAULT_PANTRY_ITEMS: Omit<PantryItem, 'id' | 'updatedAt'>[] = [
  // --- BAZĂ & CONDIMENTE UNIVERSALE ---
  { name: 'Sare grunjoasă / fină', amount: '1 kg', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Piper negru (măcinat & boabe)', amount: '100g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Ulei de floarea-soarelui', amount: '1 l', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Ulei de măsline extravirgin', amount: '500 ml', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Oțet (de mere / alb)', amount: '500 ml', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Foi de dafin', amount: '1 plic', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Boia dulce de ardei', amount: '100g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Boia iute / afumată', amount: '50g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Cimbru uscat', amount: '50g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Oregano & Busuioc uscat', amount: '50g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Muștar clasic', amount: '1 borcan', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Sos de soia', amount: '150 ml', category: 'Băcănie & Condimente', inStock: true },

  // --- SPECIFIC CIORBE & SUPE ---
  { name: 'Morcovi', amount: '1 kg', category: 'Legume & Fructe', inStock: true },
  { name: 'Țelină rădăcină', amount: '1 buc', category: 'Legume & Fructe', inStock: true },
  { name: 'Păstârnac / Rădăcină pătrunjel', amount: '2 buc', category: 'Legume & Fructe', inStock: true },
  { name: 'Ceapă galbenă', amount: '1 kg', category: 'Legume & Fructe', inStock: true },
  { name: 'Ceapă roșie', amount: '500g', category: 'Legume & Fructe', inStock: true },
  { name: 'Cartofi', amount: '2 kg', category: 'Legume & Fructe', inStock: true },
  { name: 'Ardei gras / Gogoșari', amount: '3 buc', category: 'Legume & Fructe', inStock: true },
  { name: 'Pătrunjel verde proaspăt', amount: '1 legătură', category: 'Legume & Fructe', inStock: true },
  { name: 'Leuștean (verde sau uscat)', amount: '1 legătură', category: 'Legume & Fructe', inStock: true },
  { name: 'Mărar proaspăt', amount: '1 legătură', category: 'Legume & Fructe', inStock: true },
  { name: 'Borș tradițional / tărâțe', amount: '1 l', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Lămâi (pentru acrit)', amount: '3 buc', category: 'Legume & Fructe', inStock: true },
  { name: 'Bulion / Pastă de tomate', amount: '1 borcan', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Roșii pasate / Cuburi', amount: '1 conservă', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Smântână grasă (pentru ciorbă)', amount: '400g', category: 'Lactate & Ouă', inStock: true },
  { name: 'Tăiței de casă / Fidea', amount: '200g', category: 'Panificație', inStock: true },

  // --- MÂNCĂRURI & FEL PRINCIPAL ---
  { name: 'Usturoi', amount: '2 căpățâni', category: 'Legume & Fructe', inStock: true },
  { name: 'Orez bob rotund (pilaf/sarmale)', amount: '1 kg', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Paste (spaghete / penne)', amount: '500g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Mălai (făină de porumb)', amount: '1 kg', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Fasole boabe uscată / conservă', amount: '500g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Mazăre verde fină', amount: '400g', category: 'Congelate', inStock: true },
  { name: 'Fasole verde păstăi', amount: '450g', category: 'Congelate', inStock: true },
  { name: 'Ciuperci champignon', amount: '500g', category: 'Legume & Fructe', inStock: true },
  { name: 'Varză albă proaspătă', amount: '1 buc', category: 'Legume & Fructe', inStock: true },
  { name: 'Dovlecei', amount: '2 buc', category: 'Legume & Fructe', inStock: true },
  { name: 'Vinete', amount: '2 buc', category: 'Legume & Fructe', inStock: true },
  { name: 'Unt 82%', amount: '200g', category: 'Lactate & Ouă', inStock: true },
  { name: 'Ouă proaspete', amount: '10 buc', category: 'Lactate & Ouă', inStock: true },
  { name: 'Lapte 3.5%', amount: '1 l', category: 'Lactate & Ouă', inStock: true },
  { name: 'Cașcaval / Telemea', amount: '300g', category: 'Lactate & Ouă', inStock: true },
  { name: 'Parmezan răzuit', amount: '100g', category: 'Lactate & Ouă', inStock: true },
  { name: 'Carne tocată (amestec porc-vită)', amount: '500g', category: 'Carne & Pește', inStock: true },
  { name: 'Piept de pui dezosat', amount: '600g', category: 'Carne & Pește', inStock: true },
  { name: 'Pesmet alb', amount: '250g', category: 'Panificație', inStock: true },

  // --- DESERTURI & COFETĂRIE / PANIFICAȚIE ---
  { name: 'Făină albă superioară (tip 000)', amount: '2 kg', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Zahăr tos', amount: '1 kg', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Zahăr pudră vanilat', amount: '250g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Esență de vanilie & Zahăr vanilinat', amount: '3 plicuri', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Esență de rom', amount: '1 sticluță', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Praf de copt', amount: '4 plicuri', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Bicarbonat de sodiu alimentar', amount: '100g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Drojdie uscată / proaspătă', amount: '3 plicuri', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Pudră de cacao (calitate)', amount: '100g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Ciocolată menaj / amăruie (55-70%)', amount: '200g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Scorțișoară măcinată', amount: '50g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Frișcă lichidă / Smântână dulce 30%', amount: '500 ml', category: 'Lactate & Ouă', inStock: true },
  { name: 'Mascarpone / Ricotta', amount: '250g', category: 'Lactate & Ouă', inStock: true },
  { name: 'Miez de nucă măcinat', amount: '300g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Stafide aurii', amount: '150g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Amidon de porumb', amount: '250g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Griș de grâu', amount: '500g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Biscuiți simpli (Petit Beurre)', amount: '300g', category: 'Panificație', inStock: true },
  { name: 'Foi de plăcintă / Aluat foietaj', amount: '400g', category: 'Panificație', inStock: true },
  { name: 'Gem / Dulceață de prune sau vișine', amount: '1 borcan', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Miere naturală de albine', amount: '500g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Fructe de pădure congelate', amount: '400g', category: 'Congelate', inStock: true },
];

export class CookbookDatabase extends Dexie {
  recipes!: Table<Recipe, string>;
  shoppingList!: Table<ShoppingItem, string>;
  categories!: Table<CategoryItem, string>;
  mealPlans!: Table<MealPlanEntry, string>;
  pantry!: Table<PantryItem, string>;

  constructor() {
    super('CookbookDB');
    this.version(1).stores({
      recipes: 'id, title, category, *tags, isFavorite, createdAt, updatedAt',
      shoppingList: 'id, name, checked, createdAt',
    });
    this.version(2).stores({
      recipes: 'id, title, category, *tags, isFavorite, createdAt, updatedAt',
      shoppingList: 'id, name, checked, createdAt',
      categories: 'id, label, order',
    });
    this.version(3).stores({
      recipes: 'id, title, category, *tags, isFavorite, createdAt, updatedAt',
      shoppingList: 'id, name, checked, aisle, createdAt',
      categories: 'id, label, order',
      mealPlans: 'id, date, mealType, recipeId, createdAt',
    });
    this.version(4).stores({
      recipes: 'id, title, category, *tags, isFavorite, createdAt, updatedAt',
      shoppingList: 'id, name, checked, aisle, createdAt',
      categories: 'id, label, order',
      mealPlans: 'id, date, mealType, recipeId, createdAt',
      pantry: 'id, name, category, inStock, updatedAt',
    });
  }
}

export const db = new CookbookDatabase();

// Seed initial recipes, default categories & pantry staples if empty
export async function seedInitialRecipesIfEmpty() {
  try {
    const count = await db.recipes.count();
    if (count === 0) {
      await db.recipes.bulkAdd(SAMPLE_RECIPES);
    }

    const catCount = await db.categories.count();
    if (catCount === 0) {
      await db.categories.bulkAdd(DEFAULT_CATEGORIES);
    }

    const pantryCount = await db.pantry.count();
    if (pantryCount === 0) {
      const initialPantry: PantryItem[] = DEFAULT_PANTRY_ITEMS.map((item, idx) => ({
        id: 'pantry-' + (Date.now() + idx),
        ...item,
        updatedAt: Date.now(),
      }));
      await db.pantry.bulkAdd(initialPantry);
    }
  } catch (error) {
    console.error('Error seeding initial database data:', error);
  }
}

// Populates all standard culinary staples (for ciorbe, mâncăruri, deserturi)
// into the pantry adding only what is missing (avoids duplicates).
export async function populatePantryStaples(): Promise<number> {
  const existing = await db.pantry.toArray();
  const existingNames = new Set(existing.map((i) => i.name.toLowerCase().trim()));

  const toAdd: PantryItem[] = [];
  let addedCount = 0;

  for (const staple of DEFAULT_PANTRY_ITEMS) {
    const stapleNameLower = staple.name.toLowerCase().trim();
    if (!existingNames.has(stapleNameLower)) {
      toAdd.push({
        id: 'pantry-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6) + '-' + addedCount,
        ...staple,
        updatedAt: Date.now(),
      });
      existingNames.add(stapleNameLower);
      addedCount++;
    }
  }

  if (toAdd.length > 0) {
    await db.pantry.bulkAdd(toAdd);
  }

  return addedCount;
}

// Reset categories to default set
export async function resetCategoriesToDefault(): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    await db.categories.clear();
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  });
}

// Add or update a category
export async function saveCategory(category: CategoryItem): Promise<void> {
  await db.categories.put(category);
}

// Delete a category
export async function deleteCategory(id: string): Promise<void> {
  await db.categories.delete(id);
}

// Export entire database as JSON backup
export async function exportDatabaseBackup(): Promise<string> {
  const recipes = await db.recipes.toArray();
  const shoppingList = await db.shoppingList.toArray();
  const categories = await db.categories.toArray();
  const mealPlans = await db.mealPlans.toArray();
  const pantry = await db.pantry.toArray();
  const backup: AppBackup = {
    version: 4,
    exportDate: new Date().toISOString(),
    recipes,
    shoppingList,
    categories,
    mealPlans,
    pantry,
  };
  return JSON.stringify(backup, null, 2);
}

// Import database from JSON backup file
export async function importDatabaseBackup(jsonString: string): Promise<{ success: boolean; importedCount: number; message: string }> {
  try {
    const backup: AppBackup = JSON.parse(jsonString);
    if (!backup.recipes || !Array.isArray(backup.recipes)) {
      throw new Error('Formatul fișierului este invalid (nu conține o listă de rețete validă).');
    }

    await db.transaction('rw', db.recipes, db.shoppingList, db.categories, db.mealPlans, db.pantry, async () => {
      for (const recipe of backup.recipes) {
        await db.recipes.put(recipe);
      }
      if (backup.shoppingList && Array.isArray(backup.shoppingList)) {
        for (const item of backup.shoppingList) {
          await db.shoppingList.put(item);
        }
      }
      if (backup.categories && Array.isArray(backup.categories)) {
        for (const cat of backup.categories) {
          await db.categories.put(cat);
        }
      }
      if (backup.mealPlans && Array.isArray(backup.mealPlans)) {
        for (const mp of backup.mealPlans) {
          await db.mealPlans.put(mp);
        }
      }
      if (backup.pantry && Array.isArray(backup.pantry)) {
        for (const p of backup.pantry) {
          await db.pantry.put(p);
        }
      }
    });

    return {
      success: true,
      importedCount: backup.recipes.length,
      message: `Au fost restaurate cu succes ${backup.recipes.length} rețete!`,
    };
  } catch (error: any) {
    return {
      success: false,
      importedCount: 0,
      message: error?.message || 'Eroare la importul fișierului de backup.',
    };
  }
}
