// Scoring engine for EDIPA indicators
// Computes scores on a 0-10 scale based on observed values and thresholds

/**
 * Calculate score on a 0-10 scale using linear interpolation
 * 
 * @param observedValue - The actual measured value
 * @param criticalValue - The threshold below/above which score is 0
 * @param targetValue - The threshold at/beyond which score is 10
 * @param higherIsBetter - Direction of preference
 * @returns Score between 0 and 10
 */
export function calculateScore(
  observedValue: number,
  criticalValue: number,
  targetValue: number,
  higherIsBetter: boolean
): number {
  // Handle edge cases
  if (isNaN(observedValue) || observedValue === null || observedValue === undefined) {
    return 0;
  }

  if (higherIsBetter) {
    // Higher values are desirable
    if (observedValue <= criticalValue) {
      return 0;
    }
    if (observedValue >= targetValue) {
      return 10;
    }
    // Linear interpolation between critical and target
    const range = targetValue - criticalValue;
    if (range === 0) return 5; // Avoid division by zero
    return Math.round(((observedValue - criticalValue) / range) * 10);
  } else {
    // Lower values are desirable
    if (observedValue >= criticalValue) {
      return 0;
    }
    if (observedValue <= targetValue) {
      return 10;
    }
    // Linear interpolation between target and critical
    const range = criticalValue - targetValue;
    if (range === 0) return 5; // Avoid division by zero
    return Math.round(((criticalValue - observedValue) / range) * 10);
  }
}

/**
 * Get score category for styling
 */
export function getScoreCategory(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 8) return 'excellent';
  if (score >= 6) return 'good';
  if (score >= 4) return 'fair';
  return 'poor';
}

/**
 * Calculate average score from an array of scores, ignoring invalid values
 */
export function calculateAverageScore(scores: number[]): number {
  const validScores = scores.filter(s => !isNaN(s) && s !== null && s !== undefined);
  if (validScores.length === 0) return 0;
  const sum = validScores.reduce((acc, s) => acc + s, 0);
  return Math.round((sum / validScores.length) * 100) / 100;
}

/**
 * Format score for display
 */
export function formatScore(score: number): string {
  if (isNaN(score) || score === null || score === undefined) {
    return '-';
  }
  return score.toFixed(0);
}

/**
 * Format numeric value for display
 */
export function formatValue(value: number, decimals: number = 2): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '-';
  }
  return value.toFixed(decimals);
}
