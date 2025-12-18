// Indicator definitions and configuration
// This file defines all irrigation performance indicators and their metadata

export interface IndicatorDefinition {
  id: string;
  displayName: string;
  shortName: string;
  description: string;
  units: string;
  higherIsBetter: boolean;
  defaultCriticalValue: number;
  defaultTargetValue: number;
  category: 'general' | 'productivity';
}

export interface ProductivityCrop {
  id: string;
  name: string;
  criticalValue: number;
  targetValue: number;
}

export const INDICATORS: IndicatorDefinition[] = [
  {
    id: 'cropping_intensity',
    displayName: 'Cropping Intensity',
    shortName: 'CI',
    description: 'Cropping Intensity, considering CCA (Culturable Command Area)',
    units: '%/100',
    higherIsBetter: true,
    defaultCriticalValue: 1.0,
    defaultTargetValue: 1.5,
    category: 'general',
  },
  {
    id: 'irrigation_utilization',
    displayName: 'Irrigation Utilization',
    shortName: 'IU',
    description: 'Fraction of CCA irrigated',
    units: '%/100',
    higherIsBetter: true,
    defaultCriticalValue: 0.25,
    defaultTargetValue: 0.80,
    category: 'general',
  },
  {
    id: 'low_water_intensive_crops',
    displayName: 'Low Water Intensive Crops',
    shortName: 'LWIC',
    description: 'Fraction of low water intensive irrigated crops',
    units: '%/100',
    higherIsBetter: true,
    defaultCriticalValue: 0.25,
    defaultTargetValue: 0.80,
    category: 'general',
  },
  {
    id: 'adequacy',
    displayName: 'Adequacy',
    shortName: 'ADQ',
    description: 'RWD = 1 - (ETa/ETp) - Relative Water Deficit',
    units: '',
    higherIsBetter: false,
    defaultCriticalValue: 0.40,
    defaultTargetValue: 0.0,
    category: 'general',
  },
  {
    id: 'equity',
    displayName: 'Equity',
    shortName: 'EQ',
    description: 'Standard deviation of ETa over irrigated areas divided by average ETa',
    units: '',
    higherIsBetter: false,
    defaultCriticalValue: 0.40,
    defaultTargetValue: 0.0,
    category: 'general',
  },
  {
    id: 'productivity',
    displayName: 'Productivity',
    shortName: 'PROD',
    description: 'Water Productivity (in terms of yield)',
    units: 'kg/m³',
    higherIsBetter: true,
    defaultCriticalValue: 0.40,
    defaultTargetValue: 1.0,
    category: 'productivity',
  },
  {
    id: 'reliability',
    displayName: 'Reliability',
    shortName: 'REL',
    description: 'Range of average crop-specific monthly Relative ET (ET/ETp)',
    units: '%/100',
    higherIsBetter: false,
    defaultCriticalValue: 0.40,
    defaultTargetValue: 0.0,
    category: 'general',
  },
  {
    id: 'yield_gap',
    displayName: 'Yield Gap due to Water Stress',
    shortName: 'YG',
    description: '(Ypotential - Yactual) / Ypotential × 100%',
    units: '%/100',
    higherIsBetter: false,
    defaultCriticalValue: 0.40,
    defaultTargetValue: 0.0,
    category: 'general',
  },
];

export const DEFAULT_CROPS: ProductivityCrop[] = [
  { id: 'paddy', name: 'Paddy', criticalValue: 0.46, targetValue: 1.0 },
  { id: 'wheat', name: 'Wheat', criticalValue: 1.07, targetValue: 1.49 },
  { id: 'maize', name: 'Maize', criticalValue: 0.40, targetValue: 1.0 },
  { id: 'cotton', name: 'Cotton', criticalValue: 0.11, targetValue: 0.42 },
  { id: 'sugarcane', name: 'Sugarcane', criticalValue: 3.90, targetValue: 5.23 },
  { id: 'jowar', name: 'Jowar', criticalValue: 0.53, targetValue: 0.82 },
  { id: 'mustard', name: 'Mustard (Forage)', criticalValue: 2.92, targetValue: 3.66 },
];

export const getIndicatorById = (id: string): IndicatorDefinition | undefined => {
  return INDICATORS.find(ind => ind.id === id);
};

export const getGeneralIndicators = (): IndicatorDefinition[] => {
  return INDICATORS.filter(ind => ind.category === 'general');
};

export const getProductivityIndicator = (): IndicatorDefinition | undefined => {
  return INDICATORS.find(ind => ind.category === 'productivity');
};
