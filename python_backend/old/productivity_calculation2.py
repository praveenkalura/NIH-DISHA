#============================================================
# PRODUCTIVITY CALCULATION — BASED ON ORIGINAL PYTHON SCRIPT
# Computes Area, ETa, TBP and Productivity tables for each season
#============================================================
import pandas as pd
import numpy as np
from typing import Dict, Optional

PRODUCTIVITY_SEASON_MAP = {
    0: 'annual',
    1: 'kharif',
    2: 'rabi',
    3: 'zaid',
}


def parse_productivity_csv(csv_path: str) -> pd.DataFrame:
    """Parse productivity CSV file"""
    df = pd.read_csv(csv_path)
    
    # Ensure required columns exist
    required_cols = ['year', 'Season', 'Crop Type', 'Area', 'ETa', 'TBP', 'status']
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")
    
    # Compute productivity column (same formula as original)
    df["Productivity"] = df["TBP"] / (df["ETa"] * 10)
    
    return df


def generate_season_tables(df: pd.DataFrame, season_code: int) -> Optional[Dict]:
    """
    Computes all tables for Season: AREA, ETa, TBP and Productivity with Weighted Average
    Following original Python logic exactly
    season_code = 0 Annual, 1 Kharif, 2 Rabi, 3 Zaid
    """
    
    base = df[(df["Season"] == season_code) & (df["status"] == "IRRIGATED")]   # filter
    if base.empty:
        return None
    
    filtered_avg = base[base["Area"] > 0]  # ETa/TBP input must ignore zero area
    
    # ==== 1) AREA (SUM) ====
    area = base.pivot_table(index="year", columns="Crop Type",
                            values="Area", aggfunc="sum", fill_value=0)
    area.loc["Average"] = area.mean()
    area["Average"] = area.mean(axis=1)
    area = area.round(0).astype(int)
    
    # ==== 2) ETa (AVERAGE) ====
    eta = filtered_avg.pivot_table(index="year", columns="Crop Type",
                                   values="ETa", aggfunc="mean")
    for col in eta.columns:
        eta.loc[area[col] == 0, col] = np.nan
    eta.loc["Average"] = eta.mean(skipna=True)
    eta["Average"] = eta.mean(axis=1, skipna=True)
    eta = eta.round(0)
    
    # ==== 3) TBP (AVERAGE) ====
    tbp = filtered_avg.pivot_table(index="year", columns="Crop Type",
                                   values="TBP", aggfunc="mean")
    for col in tbp.columns:
        tbp.loc[area[col] == 0, col] = np.nan
    tbp.loc["Average"] = tbp.mean(skipna=True)
    tbp["Average"] = tbp.mean(axis=1, skipna=True)
    tbp = tbp.round(0)
    
    # ==== 4) PRODUCTIVITY GRID (mean table + weighted average column) ====
    prod = filtered_avg.pivot_table(index="year", columns="Crop Type",
                                    values="Productivity", aggfunc="mean").round(2)
    
    weighted_values = []
    for yr in prod.index:
        rows = filtered_avg[filtered_avg["year"] == yr]
        weighted = (rows["Area"] * rows["Productivity"]).sum() / rows["Area"].sum()
        weighted_values.append(weighted)
    
    prod["Average"] = weighted_values  # weighted avg column
    final_avg = np.mean(weighted_values)  # avg of avg column
    
    prod.loc["Average"] = [np.nan] * (len(prod.columns) - 1) + [final_avg]  # last row
    prod = prod.round(2)
    
    # Convert to dict for JSON serialization
    area_dict = area.to_dict('index')
    eta_dict = eta.to_dict('index')
    tbp_dict = tbp.to_dict('index')
    prod_dict = prod.to_dict('index')
    
    # Convert keys to strings for JSON
    area_str = {str(k): v for k, v in area_dict.items()}
    eta_str = {str(k): v for k, v in eta_dict.items()}
    tbp_str = {str(k): v for k, v in tbp_dict.items()}
    productivity_str = {str(k): v for k, v in prod_dict.items()}
    
    # Weighted productivity mapping (year -> value)
    weighted_productivity = {}
    for i, yr in enumerate(prod.index[:-1]):  # Exclude 'Average' row
        weighted_productivity[str(yr)] = round(weighted_values[i], 2)
    
    return {
        'area': area_str,
        'eta': eta_str,
        'tbp': tbp_str,
        'productivity': productivity_str,
        'weighted_productivity': weighted_productivity,
        'years': [int(y) for y in prod.index[:-1]],  # Exclude 'Average'
        'crops': list(prod.columns[:-1]),  # Exclude 'Average'
        'average_weighted_productivity': round(final_avg, 2) if not np.isnan(final_avg) else None,
    }


def compute_productivity_from_csv(csv_path: str) -> Dict:
    """Compute productivity from CSV file following original Python logic"""
    df = parse_productivity_csv(csv_path)
    
    # Generate tables for each season
    # Note: Original uses season 0 for Annual, but some implementations use 4 for full year
    # Following the TypeScript implementation which uses season 4 for annual
    kharif = generate_season_tables(df, 1)
    rabi = generate_season_tables(df, 2)
    zaid = generate_season_tables(df, 3)
    annual = generate_season_tables(df, 4)  # Season 4 = full year/annual
    
    # If season 4 doesn't exist, try season 0
    if annual is None:
        annual = generate_season_tables(df, 0)
    
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
