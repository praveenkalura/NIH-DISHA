"""
Productivity calculation based on Python script logic
Computes Area, ETa, TBP and Productivity tables for each season
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional

PRODUCTIVITY_SEASON_MAP = {
    0: 'annual',
    1: 'kharif',
    2: 'rabi',
    3: 'zaid',
    4: 'fullYear'
}


def parse_productivity_csv(csv_path: str) -> pd.DataFrame:
    """Parse productivity CSV file"""
    df = pd.read_csv(csv_path)
    
    # Ensure required columns exist
    required_cols = ['year', 'Season', 'Crop Type', 'Area', 'ETa', 'TBP', 'status']
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")
    
    # Calculate productivity: TBP / (ETa * 10)
    df['productivity'] = df.apply(
        lambda row: row['TBP'] / (row['ETa'] * 10) if row['ETa'] > 0 else 0,
        axis=1
    )
    
    return df


def generate_season_tables(df: pd.DataFrame, season_code: int) -> Optional[Dict]:
    """Generate tables for a specific season"""
    # Filter for season and irrigated status
    base = df[(df['Season'] == season_code) & (df['status'] == 'IRRIGATED')].copy()
    if base.empty:
        return None
    
    filtered_avg = base[base['Area'] > 0].copy()
    
    years = sorted(base['year'].unique())
    crops = sorted(base['Crop Type'].unique())
    
    # 1) AREA (SUM)
    area = {}
    for year in years:
        area[year] = {}
        for crop in crops:
            total = base[(base['year'] == year) & (base['Crop Type'] == crop)]['Area'].sum()
            area[year][crop] = round(total)
        # Row average
        row_values = [area[year][crop] for crop in crops]
        area[year]['Average'] = round(sum(row_values) / len(row_values))
    
    # Column averages
    area['Average'] = {}
    for crop in crops + ['Average']:
        col_values = [area[y][crop] for y in years if crop in area[y]]
        area['Average'][crop] = round(sum(col_values) / len(col_values)) if col_values else 0
    
    # 2) ETa (AVERAGE)
    eta = {}
    for year in years:
        eta[year] = {}
        for crop in crops:
            crop_records = filtered_avg[(filtered_avg['year'] == year) & (filtered_avg['Crop Type'] == crop)]
            if len(crop_records) > 0 and area[year][crop] > 0:
                eta[year][crop] = round(crop_records['ETa'].mean())
            else:
                eta[year][crop] = None
        row_values = [v for v in eta[year].values() if v is not None]
        eta[year]['Average'] = round(sum(row_values) / len(row_values)) if row_values else None
    
    eta['Average'] = {}
    for crop in crops + ['Average']:
        col_values = [eta[y][crop] for y in years if crop in eta[y] and eta[y][crop] is not None]
        eta['Average'][crop] = round(sum(col_values) / len(col_values)) if col_values else None
    
    # 3) TBP (AVERAGE)
    tbp = {}
    for year in years:
        tbp[year] = {}
        for crop in crops:
            crop_records = filtered_avg[(filtered_avg['year'] == year) & (filtered_avg['Crop Type'] == crop)]
            if len(crop_records) > 0 and area[year][crop] > 0:
                tbp[year][crop] = round(crop_records['TBP'].mean())
            else:
                tbp[year][crop] = None
        row_values = [v for v in tbp[year].values() if v is not None]
        tbp[year]['Average'] = round(sum(row_values) / len(row_values)) if row_values else None
    
    tbp['Average'] = {}
    for crop in crops + ['Average']:
        col_values = [tbp[y][crop] for y in years if crop in tbp[y] and tbp[y][crop] is not None]
        tbp['Average'][crop] = round(sum(col_values) / len(col_values)) if col_values else None
    
    # 4) PRODUCTIVITY (mean + weighted average)
    productivity = {}
    weighted_productivity = {}
    
    for year in years:
        productivity[year] = {}
        for crop in crops:
            crop_records = filtered_avg[(filtered_avg['year'] == year) & (filtered_avg['Crop Type'] == crop)]
            if len(crop_records) > 0:
                avg = crop_records['productivity'].mean()
                productivity[year][crop] = round(avg, 2)
            else:
                productivity[year][crop] = None
        
        # Weighted average for year
        year_records = filtered_avg[filtered_avg['year'] == year]
        total_area = year_records['Area'].sum()
        if total_area > 0:
            weighted_sum = (year_records['Area'] * year_records['productivity']).sum()
            weighted_productivity[year] = round(weighted_sum / total_area, 2)
            productivity[year]['Average'] = weighted_productivity[year]
        else:
            weighted_productivity[year] = None
            productivity[year]['Average'] = None
    
    # Average row
    productivity['Average'] = {}
    for crop in crops:
        col_values = [productivity[y][crop] for y in years if crop in productivity[y] and productivity[y][crop] is not None]
        productivity['Average'][crop] = round(sum(col_values) / len(col_values), 2) if col_values else None
    
    weighted_values = [v for v in weighted_productivity.values() if v is not None]
    average_weighted_productivity = round(sum(weighted_values) / len(weighted_values), 2) if weighted_values else None
    productivity['Average']['Average'] = average_weighted_productivity
    
    # Convert year keys to strings for JSON serialization
    area_str = {str(k): v for k, v in area.items()}
    eta_str = {str(k): v for k, v in eta.items()}
    tbp_str = {str(k): v for k, v in tbp.items()}
    productivity_str = {str(k): v for k, v in productivity.items()}
    weighted_productivity_str = {str(k): v for k, v in weighted_productivity.items()}
    
    return {
        'area': area_str,
        'eta': eta_str,
        'tbp': tbp_str,
        'productivity': productivity_str,
        'weighted_productivity': weighted_productivity_str,
        'years': years,
        'crops': crops,
        'average_weighted_productivity': average_weighted_productivity,
    }


def compute_productivity_from_csv(csv_path: str) -> Dict:
    """Compute productivity from CSV file"""
    df = parse_productivity_csv(csv_path)
    
    # Generate tables for each season
    kharif = generate_season_tables(df, 1)
    rabi = generate_season_tables(df, 2)
    zaid = generate_season_tables(df, 3)
    annual = generate_season_tables(df, 4)  # Season 4 = full year/annual
    
    # Build summary
    all_years = set()
    for season_data in [kharif, rabi, zaid, annual]:
        if season_data:
            all_years.update(season_data['years'])
    
    sorted_years = sorted(all_years)
    
    summary = []
    for year in sorted_years:
        summary.append({
            'year': int(year),
            'kharif': kharif['weighted_productivity'].get(str(year)) if kharif else None,
            'rabi': rabi['weighted_productivity'].get(str(year)) if rabi else None,
            'zaid': zaid['weighted_productivity'].get(str(year)) if zaid else None,
            'annual': annual['weighted_productivity'].get(str(year)) if annual else None,
        })
    
    average = {
        'kharif': kharif['average_weighted_productivity'] if kharif else 0,
        'rabi': rabi['average_weighted_productivity'] if rabi else 0,
        'zaid': zaid['average_weighted_productivity'] if zaid else 0,
        'annual': annual['average_weighted_productivity'] if annual else 0,
    }
    
    return {
        'summary': summary,
        'average': average,
        'season_tables': {
            'kharif': kharif,
            'rabi': rabi,
            'zaid': zaid,
            'annual': annual,
        }
    }


if __name__ == '__main__':
    # Test with sample data
    import sys
    if len(sys.argv) > 1:
        result = compute_productivity_from_csv(sys.argv[1])
        print("Summary:", result['summary'])
        print("Average:", result['average'])
