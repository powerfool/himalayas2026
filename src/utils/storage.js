/**
 * Storage utility for managing routes in IndexedDB
 * Migrates from localStorage on first load
 */

import { getDB, isIndexedDBSupported } from './indexedDB';

const STORAGE_KEY = 'himalayas_routes';
let migrationDone = false;

/**
 * Migrate routes from localStorage to IndexedDB (one-time operation)
 * @returns {Promise<void>}
 */
async function migrateFromLocalStorage() {
  if (migrationDone) return;
  
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      migrationDone = true;
      return;
    }

    const parsed = JSON.parse(data);
    const routes = parsed.routes || [];
    
    if (routes.length === 0) {
      migrationDone = true;
      return;
    }

    // Migrate routes to IndexedDB
    const db = await getDB();
    const tx = db.transaction('routes', 'readwrite');
    
    for (const route of routes) {
      await tx.store.put(route);
    }
    
    await tx.done;
    
    // Clear localStorage after successful migration
    localStorage.removeItem(STORAGE_KEY);
    migrationDone = true;
    
    console.log(`Migrated ${routes.length} route(s) from localStorage to IndexedDB`);
  } catch (error) {
    console.error('Error migrating from localStorage:', error);
    // Don't mark as done so we can retry
  }
}

/**
 * Get all routes from storage
 * @returns {Promise<Array>} Array of route objects
 */
export async function getAllRoutes() {
  // Migrate from localStorage on first call
  await migrateFromLocalStorage();
  
  if (!isIndexedDBSupported()) {
    console.warn('IndexedDB not supported, falling back to empty array');
    return [];
  }

  try {
    const db = await getDB();
    const routes = await db.getAll('routes');
    return routes || [];
  } catch (error) {
    console.error('Error loading routes:', error);
    return [];
  }
}

/**
 * Get a single route by ID
 * @param {string} id - Route ID
 * @returns {Promise<Object|null>} Route object or null if not found
 */
export async function getRoute(id) {
  // Migrate from localStorage on first call
  await migrateFromLocalStorage();
  
  if (!isIndexedDBSupported()) {
    console.warn('IndexedDB not supported');
    return null;
  }

  try {
    const db = await getDB();
    const route = await db.get('routes', id);
    return route || null;
  } catch (error) {
    console.error('Error loading route:', error);
    return null;
  }
}

/**
 * Save a new route or update an existing one
 * @param {Object} route - Route object to save
 * @returns {Promise<Object>} Saved route with updated timestamp
 */
export async function saveRoute(route) {
  // Migrate from localStorage on first call
  await migrateFromLocalStorage();
  
  if (!isIndexedDBSupported()) {
    throw new Error('IndexedDB not supported. Cannot save route.');
  }

  const now = new Date().toISOString();
  
  const routeToSave = {
    ...route,
    updatedAt: now,
    createdAt: route.createdAt || now,
  };

  try {
    const db = await getDB();
    await db.put('routes', routeToSave);
    return routeToSave;
  } catch (error) {
    console.error('Error saving route:', error);
    throw error;
  }
}

/**
 * Delete a route by ID
 * @param {string} id - Route ID to delete
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteRoute(id) {
  // Migrate from localStorage on first call
  await migrateFromLocalStorage();
  
  if (!isIndexedDBSupported()) {
    throw new Error('IndexedDB not supported. Cannot delete route.');
  }

  try {
    const db = await getDB();
    const existing = await db.get('routes', id);
    
    if (!existing) {
      return false; // Route not found
    }
    
    await db.delete('routes', id);
    return true;
  } catch (error) {
    console.error('Error deleting route:', error);
    throw error;
  }
}
