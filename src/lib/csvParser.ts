/**
 * CSV Parser utility for irrigation data
 */

export interface SeasonCropRecord {
  Area: number;
  'Area%': number;
  'Crop Type': string;
  CropID: number;
  ETa: number;
  ETa90: number;
  ETblue: number;
  ETcv: number;
  ETcv_blue: number;
  ETgreen: number;
  Name: string;
  Precip: number;
  RETmax: number;
  RETmin: number;
  Season: number;
  TBP: number;
  TBP_P: number;
  status: string;
  year: number;
  'Water Intensive (based on Etp)': number;
}

export async function parseCSV(csvText: string): Promise<SeasonCropRecord[]> {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const records: SeasonCropRecord[] = [];

  const numericFields = ['Area', 'Area%', 'CropID', 'ETa', 'ETa90', 'ETblue', 'ETcv', 'ETcv_blue', 
                         'ETgreen', 'Precip', 'RETmax', 'RETmin', 'Season', 'TBP', 'TBP_P', 
                         'year', 'Water Intensive (based on Etp)'];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 5) continue; // Minimum required fields

    const record: any = {};
    headers.forEach((header, idx) => {
      const value = values[idx]?.trim() ?? '';
      // Parse numeric fields
      if (numericFields.includes(header)) {
        record[header] = parseFloat(value) || 0;
      } else {
        record[header] = value;
      }
    });

    // Ensure required fields have defaults
    record.Area = record.Area || 0;
    record['Area%'] = record['Area%'] || 0;
    record['Crop Type'] = record['Crop Type'] || '';
    record.CropID = record.CropID || 0;
    record.ETa = record.ETa || 0;
    record.ETa90 = record.ETa90 || 0;
    record.ETblue = record.ETblue || 0;
    record.ETcv = record.ETcv || 0;
    record.ETcv_blue = record.ETcv_blue || 0;
    record.ETgreen = record.ETgreen || 0;
    record.Name = record.Name || '';
    record.Precip = record.Precip || 0;
    record.RETmax = record.RETmax || 0;
    record.RETmin = record.RETmin || 0;
    record.Season = record.Season || 0;
    record.TBP = record.TBP || 0;
    record.TBP_P = record.TBP_P || 0;
    record.status = record.status || '';
    record.year = record.year || 0;
    record['Water Intensive (based on Etp)'] = record['Water Intensive (based on Etp)'] || 0;

    records.push(record as SeasonCropRecord);
  }

  return records;
}

export async function loadCSVFromPublic(filename: string): Promise<SeasonCropRecord[]> {
  try {
    const response = await fetch(`/data/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}`);
    }
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Error loading CSV:', error);
    return [];
  }
}
