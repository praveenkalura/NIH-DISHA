// Type definitions for EDIPA project data

export interface ProjectMetadata {
  id: string;
  projectName: string;
  geographicArea: string;
  cca: number; // Culturable Command Area in hectares
  startYear: number;
  endYear: number;
  createdAt: string;
}

export interface IndicatorThreshold {
  indicatorId: string;
  criticalValue: number;
  targetValue: number;
}

export interface CropThreshold {
  cropId: string;
  cropName: string;
  criticalValue: number;
  targetValue: number;
}

export interface ProjectThresholds {
  indicators: IndicatorThreshold[];
  crops: CropThreshold[];
}

export interface IndicatorResult {
  indicatorId: string;
  year: number;
  season?: string;
  crop?: string;
  observedValue: number;
  criticalValue: number;
  targetValue: number;
  score: number;
  rawData?: Record<string, number>;
}

export interface IndicatorSummary {
  indicatorId: string;
  displayName: string;
  description: string;
  units: string;
  criticalValue: number;
  targetValue: number;
  observedValue: number;
  score: number;
  crop?: string;
}

export interface CroppingIntensityData {
  year: number;
  doubleCropKharifRabi: number;
  doubleCropRabiZaid: number;
  tripleCrop: number;
  perennialCrops: number;
  kharifCrop: number;
  rabiCrop: number;
  doubleCropKharifZaid: number;
  zaidCrop: number;
  totalCroppedArea: number;
  croppingIntensity: number;
}

export interface YearlyIndicatorData {
  year: number;
  value: number;
  season?: string;
}

export interface ProjectData {
  metadata: ProjectMetadata;
  thresholds: ProjectThresholds;
  results: IndicatorResult[];
  isCalculated: boolean;
}
