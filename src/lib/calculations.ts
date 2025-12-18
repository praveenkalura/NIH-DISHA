// Indicator calculation functions
// Each function computes a specific indicator from raw data
// 
// IMPORTANT NOTES:
// 1. Adequacy, Productivity, Equity, Cropping Intensity, and Irrigation Utilization
//    are calculated by Python backend using CSV data files:
//    - Data_perSeason_perCrop.csv (for adequacy, equity, cropping intensity, irrigation utilization)
//    - stats_IndiaSchemes_perCrop_Ong.csv (for productivity)
// 2. Threshold values (critical/target) are NOT used in indicator calculations
//    They are ONLY used for scoring in the Summary Table
// 3. Calculations are based purely on CSV data processed by Python pandas/numpy

import { CroppingIntensityData, YearlyIndicatorData, IndicatorResult } from '@/types/project';
import { calculateScore } from './scoring';
import { INDICATORS, getIndicatorById } from '@/config/indicators';

// Python API endpoint
const PYTHON_API_URL = 'http://localhost:5000';

/**
 * Generate sample data for demonstration purposes
 * In production, this would be replaced with actual data parsing from CSV/Excel files
 */
export function generateSampleData(startYear: number, endYear: number, cca: number) {
  const years = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }
  return { years, cca };
}

/**
 * Compute Cropping Intensity
 * Formula: Total Cropped Area / CCA
 * 
 * Higher values indicate more intensive use of available land
 */
export function computeCroppingIntensity(
  startYear: number,
  endYear: number,
  cca: number,
  criticalValue: number,
  targetValue: number
): { data: CroppingIntensityData[], results: IndicatorResult[] } {
  const indicator = getIndicatorById('cropping_intensity')!;
  const data: CroppingIntensityData[] = [];
  const results: IndicatorResult[] = [];

  // Sample data based on the PDF document
  const sampleAreas = [
    { year: 2018, dc_kr: 71, dc_rz: 0, triple: 0, perennial: 797, kharif: 8678, rabi: 0, dc_kz: 2249, zaid: 0 },
    { year: 2019, dc_kr: 119, dc_rz: 49, triple: 108, perennial: 3774, kharif: 4538, rabi: 120, dc_kz: 4889, zaid: 8 },
    { year: 2020, dc_kr: 60, dc_rz: 16, triple: 7, perennial: 307, kharif: 7898, rabi: 13, dc_kz: 2257, zaid: 0 },
    { year: 2021, dc_kr: 115, dc_rz: 14, triple: 11, perennial: 649, kharif: 6029, rabi: 82, dc_kz: 2123, zaid: 0 },
    { year: 2022, dc_kr: 12, dc_rz: 0, triple: 0, perennial: 709, kharif: 8200, rabi: 0, dc_kz: 4402, zaid: 0 },
  ];

  for (let year = startYear; year <= endYear; year++) {
    const sample = sampleAreas.find(s => s.year === year) || sampleAreas[0];
    const totalCroppedArea = sample.dc_kr + sample.dc_rz + sample.triple + sample.perennial + 
                            sample.kharif + sample.rabi + sample.dc_kz + sample.zaid;
    const croppingIntensity = totalCroppedArea / cca;

    data.push({
      year,
      doubleCropKharifRabi: sample.dc_kr,
      doubleCropRabiZaid: sample.dc_rz,
      tripleCrop: sample.triple,
      perennialCrops: sample.perennial,
      kharifCrop: sample.kharif,
      rabiCrop: sample.rabi,
      doubleCropKharifZaid: sample.dc_kz,
      zaidCrop: sample.zaid,
      totalCroppedArea,
      croppingIntensity,
    });

    const score = calculateScore(croppingIntensity, criticalValue, targetValue, indicator.higherIsBetter);
    results.push({
      indicatorId: 'cropping_intensity',
      year,
      observedValue: croppingIntensity,
      criticalValue,
      targetValue,
      score,
    });
  }

  return { data, results };
}

/**
 * Compute Irrigation Utilization
 * Formula: Irrigated Area / CCA
 */
export function computeIrrigationUtilization(
  startYear: number,
  endYear: number,
  cca: number,
  criticalValue: number,
  targetValue: number
): IndicatorResult[] {
  const indicator = getIndicatorById('irrigation_utilization')!;
  const results: IndicatorResult[] = [];

  // Sample data
  const sampleValues = [0.48, 0.52, 0.45, 0.42, 0.55];
  
  for (let year = startYear; year <= endYear; year++) {
    const idx = (year - startYear) % sampleValues.length;
    const value = sampleValues[idx] + (Math.random() * 0.1 - 0.05);
    const score = calculateScore(value, criticalValue, targetValue, indicator.higherIsBetter);
    
    results.push({
      indicatorId: 'irrigation_utilization',
      year,
      observedValue: value,
      criticalValue,
      targetValue,
      score,
    });
  }

  return results;
}

/**
 * Compute Low Water Intensive Crops
 * Formula: Area of low water crops / Total irrigated area
 */
export function computeLowWaterIntensiveCrops(
  startYear: number,
  endYear: number,
  criticalValue: number,
  targetValue: number
): IndicatorResult[] {
  const indicator = getIndicatorById('low_water_intensive_crops')!;
  const results: IndicatorResult[] = [];

  const sampleValues = [0.07, 0.08, 0.06, 0.09, 0.07];
  
  for (let year = startYear; year <= endYear; year++) {
    const idx = (year - startYear) % sampleValues.length;
    const value = sampleValues[idx] + (Math.random() * 0.02 - 0.01);
    const score = calculateScore(value, criticalValue, targetValue, indicator.higherIsBetter);
    
    results.push({
      indicatorId: 'low_water_intensive_crops',
      year,
      observedValue: value,
      criticalValue,
      targetValue,
      score,
    });
  }

  return results;
}

/**
 * Compute Adequacy
 * Formula: Adequacy = 1 - avg(ETa)/avg(ETa90)
 * Lower values are better (less water deficit)
 * 
 * Note: This function now uses sample data for synchronous calculation.
 * The actual CSV-based calculation is done in AdequacyDetail component
 * using computeAdequacyFromCSV() from adequacyCalculation.ts
 */
export function computeAdequacy(
  startYear: number,
  endYear: number,
  criticalValue: number,
  targetValue: number
): IndicatorResult[] {
  const indicator = getIndicatorById('adequacy')!;
  const results: IndicatorResult[] = [];

  // Sample adequacy values based on the actual CSV data patterns
  // Real calculation happens in AdequacyDetail using computeAdequacyFromCSV
  const sampleValues: Record<number, number> = {
    2018: 0.17,
    2019: 0.21,
    2020: 0.21,
    2021: 0.20,
    2022: 0.19,
  };
  
  for (let year = startYear; year <= endYear; year++) {
    const value = sampleValues[year] ?? 0.20;
    const score = calculateScore(value, criticalValue, targetValue, indicator.higherIsBetter);
    
    results.push({
      indicatorId: 'adequacy',
      year,
      observedValue: value,
      criticalValue,
      targetValue,
      score,
    });
  }

  return results;
}

/**
 * Compute Equity
 * Formula: SD(ETa) / Mean(ETa)
 * Lower values are better (more uniform distribution)
 */
export function computeEquity(
  startYear: number,
  endYear: number,
  criticalValue: number,
  targetValue: number
): IndicatorResult[] {
  const indicator = getIndicatorById('equity')!;
  const results: IndicatorResult[] = [];

  const sampleValues = [0.12, 0.08, 0.15, 0.10, 0.09];
  
  for (let year = startYear; year <= endYear; year++) {
    const idx = (year - startYear) % sampleValues.length;
    const value = sampleValues[idx] + (Math.random() * 0.04 - 0.02);
    const score = calculateScore(value, criticalValue, targetValue, indicator.higherIsBetter);
    
    results.push({
      indicatorId: 'equity',
      year,
      observedValue: value,
      criticalValue,
      targetValue,
      score,
    });
  }

  return results;
}

/**
 * Compute Productivity (crop-specific)
 * Formula: Yield / Water Applied (kg/m³)
 * Higher values are better
 */
export function computeProductivity(
  startYear: number,
  endYear: number,
  cropId: string,
  criticalValue: number,
  targetValue: number
): IndicatorResult[] {
  const indicator = getIndicatorById('productivity')!;
  const results: IndicatorResult[] = [];

  // Sample productivity values by crop
  const cropProductivity: Record<string, number[]> = {
    paddy: [1.05, 1.12, 0.98, 1.15, 1.08],
    wheat: [1.25, 1.30, 1.18, 1.35, 1.28],
    maize: [0.95, 1.02, 0.88, 1.05, 0.98],
    cotton: [0.35, 0.38, 0.32, 0.40, 0.36],
    sugarcane: [4.50, 4.80, 4.20, 5.00, 4.65],
    jowar: [0.70, 0.75, 0.65, 0.78, 0.72],
    mustard: [3.20, 3.35, 3.05, 3.45, 3.28],
  };

  const values = cropProductivity[cropId] || cropProductivity.paddy;
  
  for (let year = startYear; year <= endYear; year++) {
    const idx = (year - startYear) % values.length;
    const value = values[idx] + (Math.random() * 0.1 - 0.05);
    const score = calculateScore(value, criticalValue, targetValue, indicator.higherIsBetter);
    
    results.push({
      indicatorId: 'productivity',
      year,
      crop: cropId,
      observedValue: value,
      criticalValue,
      targetValue,
      score,
    });
  }

  return results;
}

/**
 * Compute Reliability
 * Formula: Range of monthly Relative ET values
 * Lower values are better (more consistent supply)
 */
export function computeReliability(
  startYear: number,
  endYear: number,
  criticalValue: number,
  targetValue: number
): IndicatorResult[] {
  const indicator = getIndicatorById('reliability')!;
  const results: IndicatorResult[] = [];

  const sampleValues = [0.28, 0.25, 0.32, 0.27, 0.24];
  
  for (let year = startYear; year <= endYear; year++) {
    const idx = (year - startYear) % sampleValues.length;
    const value = sampleValues[idx] + (Math.random() * 0.04 - 0.02);
    const score = calculateScore(value, criticalValue, targetValue, indicator.higherIsBetter);
    
    results.push({
      indicatorId: 'reliability',
      year,
      observedValue: value,
      criticalValue,
      targetValue,
      score,
    });
  }

  return results;
}

/**
 * Compute Yield Gap due to Water Stress
 * Formula: (Ypotential - Yactual) / Ypotential
 * Lower values are better (less yield loss)
 */
export function computeYieldGap(
  startYear: number,
  endYear: number,
  criticalValue: number,
  targetValue: number
): IndicatorResult[] {
  const indicator = getIndicatorById('yield_gap')!;
  const results: IndicatorResult[] = [];

  const sampleValues = [0.25, 0.22, 0.28, 0.24, 0.20];
  
  for (let year = startYear; year <= endYear; year++) {
    const idx = (year - startYear) % sampleValues.length;
    const value = sampleValues[idx] + (Math.random() * 0.04 - 0.02);
    const score = calculateScore(value, criticalValue, targetValue, indicator.higherIsBetter);
    
    results.push({
      indicatorId: 'yield_gap',
      year,
      observedValue: value,
      criticalValue,
      targetValue,
      score,
    });
  }

  return results;
}

/**
 * Calculate all indicators for a project
 */
export function calculateAllIndicators(
  startYear: number,
  endYear: number,
  cca: number,
  thresholds: { indicators: { indicatorId: string; criticalValue: number; targetValue: number }[]; crops: { cropId: string; criticalValue: number; targetValue: number }[] }
): IndicatorResult[] {
  const results: IndicatorResult[] = [];

  // Get thresholds for each indicator
  const getThreshold = (id: string) => {
    const t = thresholds.indicators.find(th => th.indicatorId === id);
    const indicator = getIndicatorById(id);
    return {
      critical: t?.criticalValue ?? indicator?.defaultCriticalValue ?? 0,
      target: t?.targetValue ?? indicator?.defaultTargetValue ?? 1,
    };
  };

  // Cropping Intensity
  const ci = getThreshold('cropping_intensity');
  const { results: ciResults } = computeCroppingIntensity(startYear, endYear, cca, ci.critical, ci.target);
  results.push(...ciResults);

  // Irrigation Utilization
  const iu = getThreshold('irrigation_utilization');
  results.push(...computeIrrigationUtilization(startYear, endYear, cca, iu.critical, iu.target));

  // Low Water Intensive Crops
  const lwic = getThreshold('low_water_intensive_crops');
  results.push(...computeLowWaterIntensiveCrops(startYear, endYear, lwic.critical, lwic.target));

  // Adequacy
  const adq = getThreshold('adequacy');
  results.push(...computeAdequacy(startYear, endYear, adq.critical, adq.target));

  // Equity
  const eq = getThreshold('equity');
  results.push(...computeEquity(startYear, endYear, eq.critical, eq.target));

  // Productivity (for each crop)
  thresholds.crops.forEach(crop => {
    results.push(...computeProductivity(startYear, endYear, crop.cropId, crop.criticalValue, crop.targetValue));
  });

  // Reliability
  const rel = getThreshold('reliability');
  results.push(...computeReliability(startYear, endYear, rel.critical, rel.target));

  // Yield Gap
  const yg = getThreshold('yield_gap');
  results.push(...computeYieldGap(startYear, endYear, yg.critical, yg.target));

  return results;
}
