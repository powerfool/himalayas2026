/**
 * IndexedDB helper functions for route storage
 * Uses idb package for simpler IndexedDB API
 */

import { openDB } from 'idb';

const DB_NAME = 'himalayas-routes';
const DB_VERSION = 1;
const STORE_NAME = 'routes';

/**
 * Initialize and return the database
 * @returns {Promise<IDBPDatabase>} Database instance
 */
export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create routes store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id'
        });
        
        // Create indexes for efficient queries
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    }
  });
}

/**
 * Check if database is available (IndexedDB support check)
 * @returns {boolean} True if IndexedDB is supported
 */
export function isIndexedDBSupported() {
  return 'indexedDB' in window;
}

