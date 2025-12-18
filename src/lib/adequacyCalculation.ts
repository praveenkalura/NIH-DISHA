/**
 * Adequacy Model - Multi-Season Automation
 * Converted from Python script: adequacy_all.py
 * 
 * Formula: Adequacy = 1 - avg(ETa)/avg(ETa90)
 * Lower values are better (less water deficit)
 */

import { SeasonCropRecord, loadCSVFromPublic, parseCSV } from './csvParser';
import { IndicatorResult } from '@/types/project';
import { calculateScore } from './scoring';
import { getIndicatorById } from '@/config/indicators';

// Season labels mapping
export const SEASON_LABELS: Record<number, string> = {
  1: 'Kharif',
  2: 'Rabi',
  3: 'Zaid',
  0: 'Annual',
};

export const SEASON_OPTIONS = [
  { value: 1, label: 'Kharif' },
  { value: 2, label: 'Rabi' },
  { value: 3, label: 'Zaid' },
  { value: 0, label: 'Annual' },
];

// Crop types to exclude
const EXCLUDE_CROPS = ['Other Unirrigated'];

// Seasons to compute
const SEASONS = [0, 1, 2, 3];

export interface AreaMatrix {
  [year: number]: { [crop: string]: number };
}

export interface AdequacyMatrix {
  [year: number]: { [crop: string]: number | null };
}

export interface CombinedAdequacy {
  [year: number]: number | null;
}

export interface SeasonResults {
  areaMatrix: AreaMatrix;
  adequacyMatrix: AdequacyMatrix;
  combinedAdequacy: CombinedAdequacy;
  cropTypes: string[];
}

export interface AdequacySummary {
  year: number;
  kharif: number | null;
  rabi: number | null;
  zaid: number | null;
  annual: number | null;
}

/**
 * Process a single season's data
 */
function processSeasonData(
  data: SeasonCropRecord[],
  season: number
): SeasonResults | null {
  // Filter data for selected season (exclude specified crops)
  const seasonData = data.filter(
    (row) => row.Season === season && !EXCLUDE_CROPS.includes(row['Crop Type'])
  );

  if (seasonData.length === 0) {
    console.log(`No data found for Season ${season}. Skipping.`);
    return null;
  }

  // Extract unique crop types
  const cropTypes = [...new Set(seasonData.map((r) => r['Crop Type']))];

  // Extract unique years
  const years = [...new Set(seasonData.map((r) => r.year))].sort();

  // ============================================================
  // STEP 1 — AREA CALCULATION (Equivalent to Excel SUMIFS)
  // ============================================================
  const areaMatrix: AreaMatrix = {};

  years.forEach((year) => {
    areaMatrix[year] = {};
    cropTypes.forEach((crop) => {
      const irrigatedRecords = seasonData.filter(
        (r) =>
          r.year === year &&
          r['Crop Type'] === crop &&
          r.status === 'IRRIGATED'
      );
      const totalArea = irrigatedRecords.reduce((sum, r) => sum + r.Area, 0);
      areaMatrix[year][crop] = Math.round(totalArea);
    });
  });

  // ============================================================
  // STEP 2 — ADEQUACY MATRIX (Cell-wise)
  // Formula → 1 - avg(ETa)/avg(ETa90)
  // ============================================================
  const adequacyMatrix: AdequacyMatrix = {};

  years.forEach((year) => {
    adequacyMatrix[year] = {};
    cropTypes.forEach((crop) => {
      if (areaMatrix[year][crop] <= 0) {
        adequacyMatrix[year][crop] = null;
        return;
      }

      const subset = seasonData.filter(
        (r) =>
          r.year === year &&
          r['Crop Type'] === crop &&
          r.status === 'IRRIGATED'
      );

      if (subset.length === 0) {
        adequacyMatrix[year][crop] = null;
        return;
      }

      const avgEta = subset.reduce((sum, r) => sum + r.ETa, 0) / subset.length;
      const avgEta90 = subset.reduce((sum, r) => sum + r.ETa90, 0) / subset.length;

      if (avgEta90 === 0 || isNaN(avgEta90)) {
        adequacyMatrix[year][crop] = null;
        return;
      }

      adequacyMatrix[year][crop] = Math.round((1 - avgEta / avgEta90) * 100) / 100;
    });
  });

  // ============================================================
  // STEP 3 — COMBINED ADEQUACY PER YEAR (Weighted Mean)
  // SUMPRODUCT(row_adequacy * row_area) / SUM(area)
  // ============================================================
  const combinedAdequacy: CombinedAdequacy = {};

  years.forEach((year) => {
    const validCrops = cropTypes.filter(
      (crop) => adequacyMatrix[year][crop] !== null
    );

    if (validCrops.length === 0) {
      combinedAdequacy[year] = null;
      return;
    }

    let weightedSum = 0;
    let totalWeight = 0;

    validCrops.forEach((crop) => {
      const adequacy = adequacyMatrix[year][crop]!;
      const weight = areaMatrix[year][crop];
      weightedSum += adequacy * weight;
      totalWeight += weight;
    });

    if (totalWeight === 0) {
      combinedAdequacy[year] = null;
      return;
    }

    combinedAdequacy[year] = Math.round((weightedSum / totalWeight) * 100) / 100;
  });

  return {
    areaMatrix,
    adequacyMatrix,
    combinedAdequacy,
    cropTypes,
  };
}

/**
 * Compute adequacy summary for all seasons
 */
export async function computeAdequacyFromCSV(perSeasonFile?: File): Promise<{
  summary: AdequacySummary[];
  average: { kharif: number; rabi: number; zaid: number; annual: number };
  seasonResults: Map<number, SeasonResults>;
}> {
  // Load CSV data from file or default
  let data: SeasonCropRecord[];
  
  if (perSeasonFile) {
    const text = await perSeasonFile.text();
    data = await parseCSV(text);
  } else {
    data = await loadCSVFromPublic('Data_perSeason_perCrop.csv');
  }

  if (data.length === 0) {
    throw new Error('No data loaded from CSV');
  }

  const seasonResults = new Map<number, SeasonResults>();
  const allYears = new Set<number>();

  // Process each season
  SEASONS.forEach((season) => {
    const result = processSeasonData(data, season);
    if (result) {
      seasonResults.set(season, result);
      Object.keys(result.combinedAdequacy).forEach((y) => allYears.add(Number(y)));
    }
  });

  // Build summary table
  const sortedYears = [...allYears].sort();
  const summary: AdequacySummary[] = sortedYears.map((year) => ({
    year,
    kharif: seasonResults.get(1)?.combinedAdequacy[year] ?? null,
    rabi: seasonResults.get(2)?.combinedAdequacy[year] ?? null,
    zaid: seasonResults.get(3)?.combinedAdequacy[year] ?? null,
    annual: seasonResults.get(0)?.combinedAdequacy[year] ?? null,
  }));

  // Calculate averages
  const calcAvg = (values: (number | null)[]) => {
    const valid = values.filter((v) => v !== null) as number[];
    if (valid.length === 0) return 0;
    return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
  };

  const average = {
    kharif: calcAvg(summary.map((s) => s.kharif)),
    rabi: calcAvg(summary.map((s) => s.rabi)),
    zaid: calcAvg(summary.map((s) => s.zaid)),
    annual: calcAvg(summary.map((s) => s.annual)),
  };

  return { summary, average, seasonResults };
}

/**
 * Compute adequacy indicator results for integration with the dashboard
 */
export async function computeAdequacyResults(
  startYear: number,
  endYear: number,
  criticalValue: number,
  targetValue: number
): Promise<IndicatorResult[]> {
  const indicator = getIndicatorById('adequacy')!;
  const results: IndicatorResult[] = [];

  try {
    const { summary } = await computeAdequacyFromCSV();

    // Use Kharif season values as the primary adequacy measure
    // (can be customized based on requirements)
    summary
      .filter((s) => s.year >= startYear && s.year <= endYear)
      .forEach((s) => {
        // Calculate overall adequacy as average of available seasons
        const seasonValues = [s.kharif, s.rabi, s.zaid, s.annual].filter(
          (v) => v !== null
        ) as number[];
        const overallAdequacy =
          seasonValues.length > 0
            ? seasonValues.reduce((a, b) => a + b, 0) / seasonValues.length
            : 0;

        const score = calculateScore(
          overallAdequacy,
          criticalValue,
          targetValue,
          indicator.higherIsBetter
        );

        results.push({
          indicatorId: 'adequacy',
          year: s.year,
          observedValue: overallAdequacy,
          criticalValue,
          targetValue,
          score,
        });
      });
  } catch (error) {
    console.error('Error computing adequacy:', error);
    // Fallback to sample data if CSV fails
    for (let year = startYear; year <= endYear; year++) {
      results.push({
        indicatorId: 'adequacy',
        year,
        observedValue: 0.2,
        criticalValue,
        targetValue,
        score: 5,
      });
    }
  }

  return results;
}
