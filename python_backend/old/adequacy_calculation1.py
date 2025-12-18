"""
Adequacy Model - Multi-Season Automation
Formula: Adequacy = 1 - avg(ETa)/avg(ETa90)
Lower values are better (less water deficit)
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple

# Season labels mapping
SEASON_LABELS = {
    1: 'Kharif',
    2: 'Rabi',
    3: 'Zaid',
    0: 'Annual',
}

# Crop types to exclude
EXCLUDE_CROPS = ['Other Unirrigated']

# Seasons to compute
SEASONS = [0, 1, 2, 3]


def process_season_data(df: pd.DataFrame, season: int) -> Optional[Dict]:
    """Process a single season's data"""
    # Filter data for selected season (exclude specified crops)
    season_data = df[(df['Season'] == season) & (~df['Crop Type'].isin(EXCLUDE_CROPS))].copy()
    
    if season_data.empty:
        print(f"No data found for Season {season}. Skipping.")
        return None
    
    # Extract unique crop types and years
    crop_types = sorted(season_data['Crop Type'].unique())
    years = sorted(season_data['year'].unique())
    
    # STEP 1 — AREA CALCULATION (Equivalent to Excel SUMIFS)
    area_matrix = {}
    for year in years:
        area_matrix[year] = {}
        for crop in crop_types:
            irrigated_records = season_data[
                (season_data['year'] == year) &
                (season_data['Crop Type'] == crop) &
                (season_data['status'] == 'IRRIGATED')
            ]
            total_area = irrigated_records['Area'].sum()
            area_matrix[year][crop] = round(total_area)
    
    # STEP 2 — ADEQUACY MATRIX (Cell-wise)
    # Formula → 1 - avg(ETa)/avg(ETa90)
    adequacy_matrix = {}
    for year in years:
        adequacy_matrix[year] = {}
        for crop in crop_types:
            if area_matrix[year][crop] <= 0:
                adequacy_matrix[year][crop] = None
                continue
            
            subset = season_data[
                (season_data['year'] == year) &
                (season_data['Crop Type'] == crop) &
                (season_data['status'] == 'IRRIGATED')
            ]
            
            if subset.empty:
                adequacy_matrix[year][crop] = None
                continue
            
            avg_eta = subset['ETa'].mean()
            avg_eta90 = subset['ETa90'].mean()
            
            if avg_eta90 == 0 or np.isnan(avg_eta90):
                adequacy_matrix[year][crop] = None
                continue
            
            adequacy_matrix[year][crop] = round((1 - avg_eta / avg_eta90), 2)
    
    # STEP 3 — COMBINED ADEQUACY PER YEAR (Weighted Mean)
    combined_adequacy = {}
    for year in years:
        valid_crops = [crop for crop in crop_types if adequacy_matrix[year][crop] is not None]
        
        if not valid_crops:
            combined_adequacy[year] = None
            continue
        
        weighted_sum = sum(
            adequacy_matrix[year][crop] * area_matrix[year][crop]
            for crop in valid_crops
        )
        total_weight = sum(area_matrix[year][crop] for crop in valid_crops)
        
        if total_weight == 0:
            combined_adequacy[year] = None
            continue
        
        combined_adequacy[year] = round(weighted_sum / total_weight, 2)
    
    return {
        'area_matrix': area_matrix,
        'adequacy_matrix': adequacy_matrix,
        'combined_adequacy': combined_adequacy,
        'crop_types': crop_types,
        'years': years
    }


def compute_adequacy_from_csv(csv_path: str) -> Dict:
    """Compute adequacy summary for all seasons"""
    # Load CSV data
    df = pd.read_csv(csv_path)
    
    # Ensure required columns exist
    required_cols = ['year', 'Season', 'Crop Type', 'Area', 'ETa', 'ETa90', 'status']
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")
    
    season_results = {}
    all_years = set()
    
    # Process each season
    for season in SEASONS:
        result = process_season_data(df, season)
        if result:
            season_results[season] = result
            all_years.update(result['years'])
    
    # Build summary table
    sorted_years = sorted(all_years)
    summary = []
    for year in sorted_years:
        summary.append({
            'year': int(year),
            'kharif': season_results.get(1, {}).get('combined_adequacy', {}).get(year),
            'rabi': season_results.get(2, {}).get('combined_adequacy', {}).get(year),
            'zaid': season_results.get(3, {}).get('combined_adequacy', {}).get(year),
            'annual': season_results.get(0, {}).get('combined_adequacy', {}).get(year),
        })
    
    # Calculate averages
    def calc_avg(values):
        valid = [v for v in values if v is not None]
        if not valid:
            return 0
        return round(sum(valid) / len(valid), 2)
    
    average = {
        'kharif': calc_avg([s['kharif'] for s in summary]),
        'rabi': calc_avg([s['rabi'] for s in summary]),
        'zaid': calc_avg([s['zaid'] for s in summary]),
        'annual': calc_avg([s['annual'] for s in summary]),
    }
    
    return {
        'summary': summary,
        'average': average,
        'season_results': season_results
    }


if __name__ == '__main__':
    # Test with sample data
    import sys
    if len(sys.argv) > 1:
        result = compute_adequacy_from_csv(sys.argv[1])
        print("Summary:", result['summary'])
        print("Average:", result['average'])
