#============================================================
#  ADEQUACY MODEL — MULTI-SEASON AUTOMATION
#  Formula: Adequacy = 1 - avg(ETa)/avg(ETa90)
#  Lower values are better (less water deficit)
#============================================================
import pandas as pd
import numpy as np
from typing import Dict, Optional

# Season labels mapping
SEASON_LABELS = {
    1: 'Kharif (1)',
    2: 'Rabi   (2)',
    3: 'Zaid   (3)',
    0: 'Annual (0)',
}

# Crop types to exclude (auto applied to all seasons)
EXCLUDE_CROPS = ['Other Unirrigated']

# Seasons to compute
SEASONS = [0, 1, 2, 3]


def process_season_data(df: pd.DataFrame, season: int) -> Optional[Dict]:
    """Process a single season's data following original Python logic"""
    # Filter data for selected season (exclude specified crops)
    df_season = df[(df['Season'] == season) & (~df['Crop Type'].isin(EXCLUDE_CROPS))]
    
    if df_season.empty:
        print(f"⚠ No data found for Season {season}. Skipping.")
        return None
    
    # Extract dynamic crop list
    crop_types = df_season['Crop Type'].unique().tolist()
    
    # ============================================================
    # STEP 1 — AREA CALCULATION (Equivalent to Excel SUMIFS)
    # ============================================================
    area_df = (df_season[df_season['status'] == "IRRIGATED"]
               .groupby(['year', 'Crop Type'])['Area']
               .sum()
               .unstack(fill_value=0))
    
    # Keep seasonal crop types only (no hardcoding)
    area_df = area_df[[c for c in crop_types if c in area_df.columns]]
    
    # Round and finalize
    area_df = area_df.round(0).astype(int)
    
    # ============================================================
    # STEP 2 — ADEQUACY MATRIX (Cell-wise)
    # Formula → 1 - avg(ETa)/avg(ETa90)
    # ============================================================
    def compute_adequacy(year, crop):
        if area_df.loc[year, crop] <= 0:
            return None  # blank when no area
        
        subset = df_season[(df_season['year'] == year) &
                           (df_season['Crop Type'] == crop) &
                           (df_season['status'] == "IRRIGATED")]
        
        if subset.empty:
            return None
        
        avg_eta = subset['ETa'].mean()
        avg_eta90 = subset['ETa90'].mean()
        
        if avg_eta90 == 0 or pd.isna(avg_eta90):
            return None
        
        return round(1 - (avg_eta / avg_eta90), 2)
    
    adequacy_df = pd.DataFrame(index=area_df.index, columns=area_df.columns)
    
    for yr in adequacy_df.index:
        for crop in adequacy_df.columns:
            adequacy_df.loc[yr, crop] = compute_adequacy(yr, crop)
    
    # ============================================================
    # STEP 3 — COMBINED ADEQUACY PER YEAR (Weighted Mean)
    # SUMPRODUCT(row_adequacy * row_area) / SUM(area)
    # ============================================================
    combined = {}
    
    for yr in area_df.index:
        # Convert None → NaN safely
        valid = adequacy_df.loc[yr].replace("", np.nan)
        valid = pd.to_numeric(valid, errors='coerce')
        valid = valid[valid.notna()]  # keep only numeric adequacy entries
        
        if valid.empty:
            combined[yr] = None
            continue
        
        weights = area_df.loc[yr][valid.index]
        score = (valid * weights).sum() / weights.sum()
        
        combined[yr] = round(score, 2)
    
    # Convert to dictionaries for JSON serialization
    area_matrix = area_df.to_dict('index')
    adequacy_matrix = adequacy_df.to_dict('index')
    
    return {
        'area_matrix': {int(k): v for k, v in area_matrix.items()},
        'adequacy_matrix': {int(k): v for k, v in adequacy_matrix.items()},
        'combined_adequacy': {int(k): v for k, v in combined.items()},
        'crop_types': crop_types,
        'years': list(area_df.index)
    }


def compute_adequacy_from_csv(csv_path: str) -> Dict:
    """Compute adequacy summary for all seasons following original Python logic"""
    # Load CSV data
    df = pd.read_csv(csv_path)
    
    # Ensure required columns exist
    required_cols = ['year', 'Season', 'Crop Type', 'Area', 'ETa', 'ETa90', 'status']
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")
    
    # Containers for results
    combined_dfs = {}
    season_results = {}
    
    # ============================================================
    # PROCESS EACH SEASON INDIVIDUALLY
    # ============================================================
    for season in SEASONS:
        result = process_season_data(df, season)
        if result:
            season_results[season] = result
            # Create combined adequacy dataframe for this season
            combined_dfs[season] = pd.DataFrame.from_dict(
                result['combined_adequacy'], 
                orient="index", 
                columns=["Combined Adequacy"]
            )
    
    # ============================================================
    # FINAL SUMMARY DATAFRAME FOR ALL SEASONS
    # ============================================================
    summary_df = pd.DataFrame()
    
    for s, label in SEASON_LABELS.items():
        if s in combined_dfs:
            summary_df[label] = combined_dfs[s]["Combined Adequacy"]
    
    # Row order sorted by year
    summary_df = summary_df.sort_index()
    
    # Add AVERAGE row calculation
    avg_row = summary_df.mean().round(2)
    
    # Convert to list of dicts for summary
    summary = []
    for year in summary_df.index:
        row_data = {
            'year': int(year),
            'kharif': None,
            'rabi': None,
            'zaid': None,
            'annual': None,
        }
        
        if 'Kharif (1)' in summary_df.columns:
            val = summary_df.loc[year, 'Kharif (1)']
            row_data['kharif'] = float(val) if pd.notna(val) else None
        if 'Rabi   (2)' in summary_df.columns:
            val = summary_df.loc[year, 'Rabi   (2)']
            row_data['rabi'] = float(val) if pd.notna(val) else None
        if 'Zaid   (3)' in summary_df.columns:
            val = summary_df.loc[year, 'Zaid   (3)']
            row_data['zaid'] = float(val) if pd.notna(val) else None
        if 'Annual (0)' in summary_df.columns:
            val = summary_df.loc[year, 'Annual (0)']
            row_data['annual'] = float(val) if pd.notna(val) else None
        
        summary.append(row_data)
    
    average = {
        'kharif': round(float(avg_row.get('Kharif (1)', 0)), 2) if 'Kharif (1)' in avg_row and pd.notna(avg_row.get('Kharif (1)')) else 0,
        'rabi': round(float(avg_row.get('Rabi   (2)', 0)), 2) if 'Rabi   (2)' in avg_row and pd.notna(avg_row.get('Rabi   (2)')) else 0,
        'zaid': round(float(avg_row.get('Zaid   (3)', 0)), 2) if 'Zaid   (3)' in avg_row and pd.notna(avg_row.get('Zaid   (3)')) else 0,
        'annual': round(float(avg_row.get('Annual (0)', 0)), 2) if 'Annual (0)' in avg_row and pd.notna(avg_row.get('Annual (0)')) else 0,
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
