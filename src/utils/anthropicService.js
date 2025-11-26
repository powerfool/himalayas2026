/**
 * Anthropic Claude API service for extracting waypoints from unstructured itinerary text
 * 
 * Model: claude-haiku-4-5-20251001 (Haiku model - fast and cost-effective for structured extraction)
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * Initialize Anthropic client
 * API key must be in VITE_ANTHROPIC_API_KEY environment variable
 */
function getAnthropicClient() {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('VITE_ANTHROPIC_API_KEY environment variable is not set. Please create .env.local file with your Anthropic API key.');
  }
  
  // Note: dangerouslyAllowBrowser is required for client-side usage
  // This is acceptable for a local development app, but should be moved to a backend
  // if this app is ever deployed publicly
  return new Anthropic({ 
    apiKey,
    dangerouslyAllowBrowser: true 
  });
}

/**
 * Extract waypoints from unstructured itinerary text using Anthropic Claude
 * @param {string} itineraryText - Unstructured itinerary text from tour operator
 * @returns {Promise<Array<{name: string, sequence: number, context?: string}>>} Array of waypoints in sequence order
 */
export async function extractWaypointsFromText(itineraryText) {
  if (!itineraryText || !itineraryText.trim()) {
    throw new Error('Itinerary text is required');
  }

  const client = getAnthropicClient();

  const prompt = `You are analyzing a motorbike tour itinerary in the Indian Himalayas. Extract ONLY the actual route waypoints - places where the route goes through or where the journey stops/stays overnight.

CRITICAL: Distinguish between:
- WAYPOINTS: Places the route actually passes through or stops at (cities, towns, villages, overnight stops, route destinations)
- HIGHLIGHTS: Points of interest mentioned along the way (lakes you see, viewpoints, landmarks you pass by, scenic spots) - DO NOT include these

Extract waypoints in the order they appear in the itinerary (sequence order). Ignore day numbers - focus on the sequence of locations where the route actually goes.

Return a JSON array of waypoints with this exact structure:
[
  {"name": "Location Name", "sequence": 1, "context": "optional description"},
  {"name": "Location Name", "sequence": 2, "context": "optional description"}
]

Rules:
- Extract ONLY actual route waypoints (places the route goes through/stops at)
- DO NOT include: lakes you see along the way, viewpoints, scenic spots, landmarks you pass by
- DO include: cities/towns you visit, overnight stops, route destinations, villages you pass through
- Look for phrases like "to", "from", "via", "overnight in", "stay in", "reach", "arrive at"
- Ignore phrases like "witness", "see", "spot", "visit" (these are often highlights, not waypoints)
- Maintain the sequence order as they appear in the itinerary
- Use the most common/standard spelling of place names
- Include context only if it helps identify the location (e.g., "Leh (city)" or "Keylong (town)")
- Return valid JSON only, no markdown formatting

Itinerary text:
${itineraryText}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract text content from response
    const responseText = message.content[0].text;
    
    // Parse JSON from response (may be wrapped in markdown code blocks)
    let jsonText = responseText.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
    }
    
    const waypoints = JSON.parse(jsonText);
    
    // Validate structure
    if (!Array.isArray(waypoints)) {
      throw new Error('LLM response is not an array');
    }
    
    // Validate each waypoint has required fields
    waypoints.forEach((wp, index) => {
      if (!wp.name || typeof wp.name !== 'string') {
        throw new Error(`Waypoint ${index} missing valid name`);
      }
      if (typeof wp.sequence !== 'number') {
        throw new Error(`Waypoint ${index} missing valid sequence number`);
      }
    });
    
    // Sort by sequence to ensure correct order
    waypoints.sort((a, b) => a.sequence - b.sequence);
    
    return waypoints;
  } catch (error) {
    // Handle API errors
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Anthropic API error: ${error.message}`);
    }
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse LLM response as JSON: ${error.message}`);
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Retry wrapper for extractWaypointsFromText with exponential backoff
 * @param {string} itineraryText - Itinerary text to extract from
 * @param {number} maxRetries - Maximum number of retry attempts (default: 2)
 * @returns {Promise<Array>} Extracted waypoints
 */
export async function extractWaypointsWithRetry(itineraryText, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await extractWaypointsFromText(itineraryText);
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors (e.g., missing API key, invalid input)
      if (error.message.includes('VITE_ANTHROPIC_API_KEY') || 
          error.message.includes('required')) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s...
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

