/**
 * Simple text parser to extract location names from itinerary text
 */

/**
 * Extract potential location names from text
 * Looks for capitalized words, common location patterns, and place names
 * @param {string} text - Itinerary text
 * @returns {Array<string>} Array of potential location names
 */
export function extractLocationNames(text) {
  if (!text || typeof text !== 'string') return [];

  // Common patterns for locations in itineraries:
  // - Capitalized words (likely place names)
  // - After "to", "from", "via", "through"
  // - After colons (Day 1: Location)
  // - In parentheses
  // - After numbers (Day 1, Stop 2, etc.)

  const locations = new Set();

  // Pattern 1: Words after "to", "from", "via", "through", "at"
  const directionPattern = /\b(to|from|via|through|at)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/gi;
  let match;
  while ((match = directionPattern.exec(text)) !== null) {
    locations.add(match[2].trim());
  }

  // Pattern 2: After colons (Day 1: Location)
  const colonPattern = /:\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/g;
  while ((match = colonPattern.exec(text)) !== null) {
    locations.add(match[1].trim());
  }

  // Pattern 3: Capitalized words/phrases (2-4 words, likely place names)
  const capitalizedPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g;
  while ((match = capitalizedPattern.exec(text)) !== null) {
    const word = match[1].trim();
    // Filter out common non-location words
    if (!isCommonWord(word)) {
      locations.add(word);
    }
  }

  // Pattern 4: In parentheses
  const parenPattern = /\(([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\)/g;
  while ((match = parenPattern.exec(text)) !== null) {
    locations.add(match[1].trim());
  }

  return Array.from(locations).filter(loc => loc.length > 2);
}

/**
 * Check if a word is a common non-location word
 * @param {string} word - Word to check
 * @returns {boolean} True if it's a common word
 */
function isCommonWord(word) {
  const commonWords = [
    'Day', 'Days', 'Night', 'Nights', 'Stop', 'Stops',
    'Route', 'Tour', 'Trip', 'Journey', 'Distance', 'Km', 'Miles',
    'Hotel', 'Lodge', 'Camp', 'Breakfast', 'Lunch', 'Dinner',
    'Morning', 'Afternoon', 'Evening', 'Night', 'Today', 'Tomorrow',
    'The', 'This', 'That', 'These', 'Those', 'And', 'Or', 'But',
    'Start', 'End', 'Begin', 'Finish', 'Continue', 'Visit', 'Explore'
  ];
  return commonWords.some(cw => word.toLowerCase().includes(cw.toLowerCase()));
}


