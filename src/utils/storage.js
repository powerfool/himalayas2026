/**
 * Storage utility for managing routes in localStorage
 */

const STORAGE_KEY = 'himalayas_routes';

/**
 * Get all routes from storage
 * @returns {Array} Array of route objects
 */
export function getAllRoutes() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return parsed.routes || [];
  } catch (error) {
    console.error('Error loading routes:', error);
    return [];
  }
}

/**
 * Get a single route by ID
 * @param {string} id - Route ID
 * @returns {Object|null} Route object or null if not found
 */
export function getRoute(id) {
  const routes = getAllRoutes();
  return routes.find(route => route.id === id) || null;
}

/**
 * Save a new route or update an existing one
 * @param {Object} route - Route object to save
 * @returns {Object} Saved route with updated timestamp
 */
export function saveRoute(route) {
  const routes = getAllRoutes();
  const now = new Date().toISOString();
  
  const routeToSave = {
    ...route,
    updatedAt: now,
    createdAt: route.createdAt || now,
  };

  const existingIndex = routes.findIndex(r => r.id === route.id);
  
  if (existingIndex >= 0) {
    routes[existingIndex] = routeToSave;
  } else {
    routes.push(routeToSave);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ routes }));
    return routeToSave;
  } catch (error) {
    console.error('Error saving route:', error);
    throw error;
  }
}

/**
 * Delete a route by ID
 * @param {string} id - Route ID to delete
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteRoute(id) {
  const routes = getAllRoutes();
  const filtered = routes.filter(route => route.id !== id);
  
  if (filtered.length === routes.length) {
    return false; // Route not found
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ routes: filtered }));
    return true;
  } catch (error) {
    console.error('Error deleting route:', error);
    throw error;
  }
}


