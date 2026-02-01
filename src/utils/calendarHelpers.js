/**
 * Helpers for trip calendar: date from day number, segment labels, day range.
 */

/**
 * @param {string | null} tripStartDate - ISO date YYYY-MM-DD
 * @param {number} dayNumber - 1-based trip day
 * @returns {Date | null} Calendar date or null if no tripStartDate
 */
export function dateForDay(tripStartDate, dayNumber) {
  if (!tripStartDate || dayNumber < 1) return null;
  const d = new Date(tripStartDate + 'T12:00:00');
  d.setDate(d.getDate() + (dayNumber - 1));
  return d;
}

/**
 * Main place name only (e.g. "Kargil" from "Kargil, Kargil Tehsil, Kargil district, Ladakh, 194103, India")
 * @param {string} name - Full waypoint name
 * @returns {string}
 */
export function getShortPlaceName(name) {
  if (!name || typeof name !== 'string') return '?';
  const main = name.split(',')[0].trim();
  return main || name;
}

/**
 * @param {Object} segment - { fromWaypointId, toWaypointId, distance }
 * @param {Array} waypoints - waypoints with id/order and name
 * @returns {string} "FromName → ToName" using main place names only
 */
export function getSegmentLabel(segment, waypoints) {
  if (!segment || !waypoints) return '—';
  const from = waypoints.find(w => (w.id && w.id === segment.fromWaypointId) || (w.order !== undefined && String(w.order) === segment.fromWaypointId));
  const to = waypoints.find(w => (w.id && w.id === segment.toWaypointId) || (w.order !== undefined && String(w.order) === segment.toWaypointId));
  const fromName = getShortPlaceName(from?.name);
  const toName = getShortPlaceName(to?.name);
  return `${fromName} → ${toName}`;
}

/**
 * @param {number[]} segmentDays
 * @returns {number} Max day (trip duration in days), or 0 if empty
 */
export function getMaxDay(segmentDays) {
  if (!segmentDays || segmentDays.length === 0) return 0;
  return Math.max(...segmentDays);
}

/**
 * Format date for calendar label: "Mon 15 Apr" or "Day 1"
 * @param {string | null} tripStartDate
 * @param {number} dayNumber
 * @returns {string}
 */
export function formatDayLabel(tripStartDate, dayNumber) {
  const date = dateForDay(tripStartDate, dayNumber);
  if (date) {
    return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return `Day ${dayNumber}`;
}
