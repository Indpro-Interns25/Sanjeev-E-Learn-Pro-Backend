// Helper functions for handling duration formatting

/**
 * Normalizes duration input to a consistent format
 * Accepts: number, "15", "15 minutes", "15min", etc.
 * Returns: "15 minutes" format
 */
function normalizeDuration(duration) {
  if (!duration) return null;
  
  // Convert to string for processing
  let durationStr = String(duration).trim();
  
  // If it's just a number, add "minutes"
  if (/^\d+$/.test(durationStr)) {
    return `${durationStr} minutes`;
  }
  
  // If it already has "minutes", keep it as is
  if (durationStr.includes('minutes')) {
    return durationStr;
  }
  
  // If it has "min" but not "minutes", replace with "minutes"
  if (durationStr.includes('min')) {
    return durationStr.replace(/\s*min(s)?/i, ' minutes');
  }
  
  // Extract number and add "minutes"
  const match = durationStr.match(/(\d+)/);
  if (match) {
    return `${match[1]} minutes`;
  }
  
  return durationStr; // Return as is if no pattern matches
}

/**
 * Extracts numeric value from duration string
 * Returns: integer value or null
 */
function extractDurationNumber(duration) {
  if (!duration) return null;
  
  const match = String(duration).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Formats duration for form display (just the number)
 * Used when sending data to frontend forms that expect integers
 */
function formatDurationForForm(duration) {
  return extractDurationNumber(duration);
}

/**
 * Formats duration for database storage (standardized with "minutes")
 * Used when storing data in database
 */
function formatDurationForDB(duration) {
  return normalizeDuration(duration);
}

module.exports = {
  normalizeDuration,
  extractDurationNumber,
  formatDurationForForm,
  formatDurationForDB
};