import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../db';
import type { Recipe, ShoppingItem, MealPlanEntry, PantryItem } from '../types/recipe';

// Firebase configuration for Carte de Bucate
export const FIREBASE_CONFIG = {
  projectId: 'carte-bucate-pwa-5a92',
  appId: '1:781396015156:web:0bca37eec78600c0337261',
  storageBucket: 'carte-bucate-pwa-5a92.firebasestorage.app',
  apiKey: 'AIzaSyARKfwb6OlFyIJkTo23ppNa4qG-LreDtk4',
  authDomain: 'carte-bucate-pwa-5a92.firebaseapp.com',
  messagingSenderId: '781396015156',
};

const SYNC_CODE_KEY = 'CARTE_BUCATE_SYNC_CODE';
const LAST_SYNC_KEY = 'CARTE_BUCATE_LAST_SYNC_TIME';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'disconnected';

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: number | null;
  syncCode: string | null;
  errorMessage?: string;
}

// Initialize Firebase App
export function getFirebaseApp() {
  return getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
}

// Get Firestore instance
export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}

export function getStoredSyncCode(): string | null {
  try {
    const code = localStorage.getItem(SYNC_CODE_KEY);
    return code ? code.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

export function setStoredSyncCode(code: string): void {
  const clean = code.trim().toUpperCase();
  if (clean) {
    localStorage.setItem(SYNC_CODE_KEY, clean);
  } else {
    localStorage.removeItem(SYNC_CODE_KEY);
  }
}

export function clearStoredSyncCode(): void {
  localStorage.removeItem(SYNC_CODE_KEY);
  localStorage.removeItem(LAST_SYNC_KEY);
}

export function getStoredLastSyncTime(): number | null {
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    return raw ? parseInt(raw, 10) : null;
  } catch {
    return null;
  }
}

export function setStoredLastSyncTime(ts: number): void {
  localStorage.setItem(LAST_SYNC_KEY, ts.toString());
}

/**
 * Generates an easy-to-read household sync code (e.g. BUCATE-7492)
 */
export function generateRandomSyncCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BUCATE-${rand}`;
}

let activeUnsubscribes: Unsubscribe[] = [];
let isLocalSyncInProgress = false;

/**
 * Full Two-Way Synchronization between Dexie (IndexedDB) and Cloud Firestore.
 */
export async function performFullSync(
  syncCode?: string,
  onProgress?: (step: string) => void
): Promise<{ success: boolean; message: string }> {
  const code = (syncCode || getStoredSyncCode())?.trim().toUpperCase();
  if (!code) {
    return { success: false, message: 'Niciun cod de sincronizare configurat.' };
  }

  isLocalSyncInProgress = true;
  const firestore = getFirebaseDb();

  try {
    onProgress?.('Sincronizare rețete...');
    const recipesRef = collection(firestore, 'syncRooms', code, 'recipes');
    const localRecipes = await db.recipes.toArray();
    const remoteRecipesSnap = await getDocs(recipesRef);
    const remoteRecipesMap = new Map<string, Recipe>();

    remoteRecipesSnap.forEach((docSnap) => {
      remoteRecipesMap.set(docSnap.id, docSnap.data() as Recipe);
    });

    // 1. Reconcile recipes
    for (const local of localRecipes) {
      const remote = remoteRecipesMap.get(local.id);
      if (!remote) {
        // Exists locally, not in remote -> upload
        await setDoc(doc(recipesRef, local.id), local);
      } else {
        const localTime = local.updatedAt || local.createdAt || 0;
        const remoteTime = remote.updatedAt || remote.createdAt || 0;
        if (localTime > remoteTime) {
          await setDoc(doc(recipesRef, local.id), local);
        } else if (remoteTime > localTime) {
          await db.recipes.put(remote);
        }
      }
    }

    // Pull remaining remote recipes that don't exist locally
    for (const [id, remote] of remoteRecipesMap.entries()) {
      const existsLocally = localRecipes.some((l) => l.id === id);
      if (!existsLocally) {
        await db.recipes.put(remote);
      }
    }

    // 2. Reconcile Pantry
    onProgress?.('Sincronizare cămară...');
    const pantryRef = collection(firestore, 'syncRooms', code, 'pantry');
    const localPantry = await db.pantry.toArray();
    const remotePantrySnap = await getDocs(pantryRef);
    const remotePantryMap = new Map<string, PantryItem>();

    remotePantrySnap.forEach((d) => remotePantryMap.set(d.id, d.data() as PantryItem));

    for (const local of localPantry) {
      const remote = remotePantryMap.get(local.id);
      if (!remote) {
        await setDoc(doc(pantryRef, local.id), local);
      } else {
        const localTime = local.updatedAt || 0;
        const remoteTime = remote.updatedAt || 0;
        if (localTime > remoteTime) {
          await setDoc(doc(pantryRef, local.id), local);
        } else if (remoteTime > localTime) {
          await db.pantry.put(remote);
        }
      }
    }

    for (const [id, remote] of remotePantryMap.entries()) {
      if (!localPantry.some((l) => l.id === id)) {
        await db.pantry.put(remote);
      }
    }

    // 3. Reconcile Shopping List
    onProgress?.('Sincronizare listă de cumpărături...');
    const shoppingRef = collection(firestore, 'syncRooms', code, 'shoppingList');
    const localShopping = await db.shoppingList.toArray();
    const remoteShoppingSnap = await getDocs(shoppingRef);
    const remoteShoppingMap = new Map<string, ShoppingItem>();

    remoteShoppingSnap.forEach((d) => remoteShoppingMap.set(d.id, d.data() as ShoppingItem));

    for (const local of localShopping) {
      const remote = remoteShoppingMap.get(local.id);
      if (!remote) {
        await setDoc(doc(shoppingRef, local.id), local);
      } else {
        const localTime = local.createdAt || 0;
        const remoteTime = remote.createdAt || 0;
        if (localTime >= remoteTime) {
          await setDoc(doc(shoppingRef, local.id), local);
        } else {
          await db.shoppingList.put(remote);
        }
      }
    }

    for (const [id, remote] of remoteShoppingMap.entries()) {
      if (!localShopping.some((l) => l.id === id)) {
        await db.shoppingList.put(remote);
      }
    }

    // 4. Reconcile Meal Plans
    onProgress?.('Sincronizare planificator săptămânal...');
    const mealPlansRef = collection(firestore, 'syncRooms', code, 'mealPlans');
    const localMealPlans = await db.mealPlans.toArray();
    const remoteMealPlansSnap = await getDocs(mealPlansRef);
    const remoteMealPlansMap = new Map<string, MealPlanEntry>();

    remoteMealPlansSnap.forEach((d) => remoteMealPlansMap.set(d.id, d.data() as MealPlanEntry));

    for (const local of localMealPlans) {
      const remote = remoteMealPlansMap.get(local.id);
      if (!remote) {
        await setDoc(doc(mealPlansRef, local.id), local);
      } else {
        await setDoc(doc(mealPlansRef, local.id), local);
      }
    }

    for (const [id, remote] of remoteMealPlansMap.entries()) {
      if (!localMealPlans.some((l) => l.id === id)) {
        await db.mealPlans.put(remote);
      }
    }

    // 5. Update Meta
    const metaRef = doc(firestore, 'syncRooms', code, 'meta', 'info');
    const now = Date.now();
    await setDoc(
      metaRef,
      {
        lastSyncedAt: now,
        syncCode: code,
        recipeCount: (await db.recipes.count()),
      },
      { merge: true }
    );

    setStoredLastSyncTime(now);
    onProgress?.('Sincronizare completă!');
    return { success: true, message: 'Sincronizarea s-a realizat cu succes!' };
  } catch (error: any) {
    console.error('Eroare la sincronizare:', error);
    return {
      success: false,
      message: error?.message || 'Eroare la comunicarea cu serverul de sincronizare.',
    };
  } finally {
    isLocalSyncInProgress = false;
  }
}

/**
 * Starts real-time listeners for instant updates when other devices make changes.
 */
export function startRealtimeSync(
  syncCode: string,
  onStatusChange?: (status: SyncStatus) => void
): () => void {
  stopRealtimeSync();

  const code = syncCode.trim().toUpperCase();
  if (!code) return () => {};

  const firestore = getFirebaseDb();

  onStatusChange?.({
    state: 'syncing',
    lastSyncedAt: getStoredLastSyncTime(),
    syncCode: code,
  });

  // Listen to Recipes
  const unsubsRecipes = onSnapshot(
    collection(firestore, 'syncRooms', code, 'recipes'),
    async (snapshot) => {
      if (isLocalSyncInProgress) return;
      for (const change of snapshot.docChanges()) {
        const data = change.doc.data() as Recipe;
        if (change.type === 'added' || change.type === 'modified') {
          const local = await db.recipes.get(data.id);
          const remoteTime = data.updatedAt || data.createdAt || 0;
          const localTime = local?.updatedAt || local?.createdAt || 0;
          if (!local || remoteTime >= localTime) {
            await db.recipes.put(data);
          }
        } else if (change.type === 'removed') {
          await db.recipes.delete(change.doc.id);
        }
      }
      onStatusChange?.({
        state: 'synced',
        lastSyncedAt: Date.now(),
        syncCode: code,
      });
    },
    (err) => {
      console.warn('Realtime recipes listener warning:', err);
      onStatusChange?.({
        state: 'error',
        lastSyncedAt: getStoredLastSyncTime(),
        syncCode: code,
        errorMessage: err.message,
      });
    }
  );

  // Listen to Pantry
  const unsubsPantry = onSnapshot(
    collection(firestore, 'syncRooms', code, 'pantry'),
    async (snapshot) => {
      if (isLocalSyncInProgress) return;
      for (const change of snapshot.docChanges()) {
        const data = change.doc.data() as PantryItem;
        if (change.type === 'added' || change.type === 'modified') {
          const local = await db.pantry.get(data.id);
          const remoteTime = data.updatedAt || 0;
          const localTime = local?.updatedAt || 0;
          if (!local || remoteTime >= localTime) {
            await db.pantry.put(data);
          }
        } else if (change.type === 'removed') {
          await db.pantry.delete(change.doc.id);
        }
      }
    },
    (err) => console.warn('Pantry realtime listener warning:', err)
  );

  // Listen to Shopping List
  const unsubsShopping = onSnapshot(
    collection(firestore, 'syncRooms', code, 'shoppingList'),
    async (snapshot) => {
      if (isLocalSyncInProgress) return;
      for (const change of snapshot.docChanges()) {
        const data = change.doc.data() as ShoppingItem;
        if (change.type === 'added' || change.type === 'modified') {
          await db.shoppingList.put(data);
        } else if (change.type === 'removed') {
          await db.shoppingList.delete(change.doc.id);
        }
      }
    },
    (err) => console.warn('Shopping list realtime listener warning:', err)
  );

  activeUnsubscribes = [unsubsRecipes, unsubsPantry, unsubsShopping];

  return stopRealtimeSync;
}

export function stopRealtimeSync(): void {
  activeUnsubscribes.forEach((unsub) => {
    try {
      unsub();
    } catch {
      // Ignore
    }
  });
  activeUnsubscribes = [];
}
