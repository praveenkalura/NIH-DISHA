// Productivity calculation based on Python script logic
// Computes Area, ETa, TBP and Productivity tables for each season

export interface CropRecord {
  year: number;
  season: number; // 0=Annual, 1=Kharif, 2=Rabi, 3=Zaid, 4=Full year
  cropType: string;
  area: number;
  eta: number;
  tbp: number;
  status: string;
  productivity?: number;
}

export interface SeasonTables {
  area: Record<string, Record<string, number>>; // year -> cropType -> value
  eta: Record<string, Record<string, number>>;
  tbp: Record<string, Record<string, number>>;
  productivity: Record<string, Record<string, number>>;
  weightedProductivity: Record<string, number>; // year -> weighted avg
  years: number[];
  crops: string[];
  averageWeightedProductivity: number;
}

export interface ProductivityData {
  summary: Array<{
    year: number | string;
    kharif: number | null;
    rabi: number | null;
    zaid: number | null;
    annual: number | null;
  }>;
  average: {
    kharif: number;
    rabi: number;
    zaid: number;
    annual: number;
  };
  seasonTables: {
    kharif: SeasonTables | null;
    rabi: SeasonTables | null;
    zaid: SeasonTables | null;
    annual: SeasonTables | null;
  };
}

export const PRODUCTIVITY_SEASON_MAP: Record<number, string> = {
  0: 'annual',
  1: 'kharif',
  2: 'rabi',
  3: 'zaid',
  4: 'fullYear'
};

export const PRODUCTIVITY_SEASON_OPTIONS = [
  { value: 'kharif', label: 'Kharif', code: 1 },
  { value: 'rabi', label: 'Rabi', code: 2 },
  { value: 'zaid', label: 'Zaid', code: 3 },
  { value: 'annual', label: 'Annual', code: 0 },
];

function parseProductivityCSV(csvText: string): CropRecord[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map(h => h.trim());
  const getIndex = (name: string) => header.findIndex(h => h.toLowerCase() === name.toLowerCase());

  const yearIdx = getIndex('year');
  const seasonIdx = getIndex('Season');
  const cropTypeIdx = getIndex('Crop Type');
  const areaIdx = getIndex('Area');
  const etaIdx = getIndex('ETa');
  const tbpIdx = getIndex('TBP');
  const statusIdx = getIndex('status');

  const records: CropRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < header.length) continue;

    const year = parseInt(values[yearIdx]);
    const season = parseInt(values[seasonIdx]);
    const area = parseFloat(values[areaIdx]);
    const eta = parseFloat(values[etaIdx]);
    const tbp = parseFloat(values[tbpIdx]);

    if (isNaN(year) || isNaN(season) || isNaN(area) || isNaN(eta) || isNaN(tbp)) continue;

    const productivity = eta > 0 ? tbp / (eta * 10) : 0;

    records.push({
      year,
      season,
      cropType: values[cropTypeIdx]?.trim() || 'Unknown',
      area,
      eta,
      tbp,
      status: values[statusIdx]?.trim() || '',
      productivity,
    });
  }

  return records;
}

function generateSeasonTables(records: CropRecord[], seasonCode: number): SeasonTables | null {
  // Filter for season and irrigated status
  const base = records.filter(r => r.season === seasonCode && r.status === 'IRRIGATED');
  if (base.length === 0) return null;

  const filteredAvg = base.filter(r => r.area > 0);
  
  const years = [...new Set(base.map(r => r.year))].sort((a, b) => a - b);
  const crops = [...new Set(base.map(r => r.cropType))].sort();

  // 1) AREA (SUM)
  const area: Record<string, Record<string, number>> = {};
  for (const year of years) {
    area[year] = {};
    for (const crop of crops) {
      const sum = base.filter(r => r.year === year && r.cropType === crop)
        .reduce((acc, r) => acc + r.area, 0);
      area[year][crop] = Math.round(sum);
    }
    // Row average
    const rowValues = Object.values(area[year]);
    area[year]['Average'] = Math.round(rowValues.reduce((a, b) => a + b, 0) / rowValues.length);
  }
  // Column averages
  area['Average'] = {};
  for (const crop of [...crops, 'Average']) {
    const colValues = years.map(y => area[y][crop]).filter(v => !isNaN(v));
    area['Average'][crop] = Math.round(colValues.reduce((a, b) => a + b, 0) / colValues.length);
  }

  // 2) ETa (AVERAGE)
  const eta: Record<string, Record<string, number>> = {};
  for (const year of years) {
    eta[year] = {};
    for (const crop of crops) {
      const cropRecords = filteredAvg.filter(r => r.year === year && r.cropType === crop);
      if (cropRecords.length > 0 && area[year][crop] > 0) {
        eta[year][crop] = Math.round(cropRecords.reduce((acc, r) => acc + r.eta, 0) / cropRecords.length);
      } else {
        eta[year][crop] = NaN;
      }
    }
    const rowValues = Object.values(eta[year]).filter(v => !isNaN(v));
    eta[year]['Average'] = rowValues.length > 0 ? Math.round(rowValues.reduce((a, b) => a + b, 0) / rowValues.length) : NaN;
  }
  eta['Average'] = {};
  for (const crop of [...crops, 'Average']) {
    const colValues = years.map(y => eta[y][crop]).filter(v => !isNaN(v));
    eta['Average'][crop] = colValues.length > 0 ? Math.round(colValues.reduce((a, b) => a + b, 0) / colValues.length) : NaN;
  }

  // 3) TBP (AVERAGE)
  const tbp: Record<string, Record<string, number>> = {};
  for (const year of years) {
    tbp[year] = {};
    for (const crop of crops) {
      const cropRecords = filteredAvg.filter(r => r.year === year && r.cropType === crop);
      if (cropRecords.length > 0 && area[year][crop] > 0) {
        tbp[year][crop] = Math.round(cropRecords.reduce((acc, r) => acc + r.tbp, 0) / cropRecords.length);
      } else {
        tbp[year][crop] = NaN;
      }
    }
    const rowValues = Object.values(tbp[year]).filter(v => !isNaN(v));
    tbp[year]['Average'] = rowValues.length > 0 ? Math.round(rowValues.reduce((a, b) => a + b, 0) / rowValues.length) : NaN;
  }
  tbp['Average'] = {};
  for (const crop of [...crops, 'Average']) {
    const colValues = years.map(y => tbp[y][crop]).filter(v => !isNaN(v));
    tbp['Average'][crop] = colValues.length > 0 ? Math.round(colValues.reduce((a, b) => a + b, 0) / colValues.length) : NaN;
  }

  // 4) PRODUCTIVITY (mean + weighted average)
  const productivity: Record<string, Record<string, number>> = {};
  const weightedProductivity: Record<string, number> = {};
  
  for (const year of years) {
    productivity[year] = {};
    for (const crop of crops) {
      const cropRecords = filteredAvg.filter(r => r.year === year && r.cropType === crop);
      if (cropRecords.length > 0) {
        const avg = cropRecords.reduce((acc, r) => acc + (r.productivity || 0), 0) / cropRecords.length;
        productivity[year][crop] = parseFloat(avg.toFixed(2));
      } else {
        productivity[year][crop] = NaN;
      }
    }
    
    // Weighted average for year
    const yearRecords = filteredAvg.filter(r => r.year === year);
    const totalArea = yearRecords.reduce((acc, r) => acc + r.area, 0);
    if (totalArea > 0) {
      const weightedSum = yearRecords.reduce((acc, r) => acc + r.area * (r.productivity || 0), 0);
      weightedProductivity[year] = parseFloat((weightedSum / totalArea).toFixed(2));
      productivity[year]['Average'] = weightedProductivity[year];
    } else {
      weightedProductivity[year] = NaN;
      productivity[year]['Average'] = NaN;
    }
  }

  // Average row
  productivity['Average'] = {};
  for (const crop of crops) {
    const colValues = years.map(y => productivity[y][crop]).filter(v => !isNaN(v));
    productivity['Average'][crop] = colValues.length > 0 
      ? parseFloat((colValues.reduce((a, b) => a + b, 0) / colValues.length).toFixed(2))
      : NaN;
  }
  
  const weightedValues = years.map(y => weightedProductivity[y]).filter(v => !isNaN(v));
  const averageWeightedProductivity = weightedValues.length > 0
    ? parseFloat((weightedValues.reduce((a, b) => a + b, 0) / weightedValues.length).toFixed(2))
    : NaN;
  
  productivity['Average']['Average'] = averageWeightedProductivity;

  return {
    area,
    eta,
    tbp,
    productivity,
    weightedProductivity,
    years,
    crops,
    averageWeightedProductivity,
  };
}

export async function computeProductivityFromCSV(perCropFile?: File): Promise<ProductivityData> {
  let csvText: string;

  if (perCropFile) {
    csvText = await perCropFile.text();
  } else {
    // Default to sample file
    const response = await fetch('/data/stats_IndiaSchemes_perCrop_Ong.csv');
    if (!response.ok) throw new Error('Failed to load productivity data file');
    csvText = await response.text();
  }

  const records = parseProductivityCSV(csvText);

  // Generate tables for each season
  const kharif = generateSeasonTables(records, 1);
  const rabi = generateSeasonTables(records, 2);
  const zaid = generateSeasonTables(records, 3);
  const annual = generateSeasonTables(records, 4); // Season 4 = full year/annual

  // Build summary
  const allYears = new Set<number>();
  [kharif, rabi, zaid, annual].forEach(s => s?.years.forEach(y => allYears.add(y)));
  const sortedYears = [...allYears].sort((a, b) => a - b);

  const summary = sortedYears.map(year => ({
    year,
    kharif: kharif?.weightedProductivity[year] ?? null,
    rabi: rabi?.weightedProductivity[year] ?? null,
    zaid: zaid?.weightedProductivity[year] ?? null,
    annual: annual?.weightedProductivity[year] ?? null,
  }));

  const average = {
    kharif: kharif?.averageWeightedProductivity ?? 0,
    rabi: rabi?.averageWeightedProductivity ?? 0,
    zaid: zaid?.averageWeightedProductivity ?? 0,
    annual: annual?.averageWeightedProductivity ?? 0,
  };

  return {
    summary,
    average,
    seasonTables: { kharif, rabi, zaid, annual },
  };
}
