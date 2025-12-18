#============================================================
#  EQUITY CALCULATION
#  Formula: Equity = SD(ETa) / Mean(ETa) (Coefficient of Variation)
#  Lower values are better (more uniform distribution)
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

# Seasons to compute
SEASONS = [0, 1, 2, 3]


def compute_equity_from_csv(csv_path: str, crop_id: Optional[int] = None) -> Dict:
    """
    Compute equity (coefficient of variation) from CSV file
    Equity = SD(ETa) / Mean(ETa) for each season and year
    """
    # Load CSV data
    df = pd.read_csv(csv_path)
    
    # Ensure required columns exist
    required_cols = ['year', 'Season', 'status', 'ETa']
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")
    
    # Get unique years
    years = sorted(df['year'].unique())
    
    # If crop_id is provided and CropID column exists, use it for filtering
    has_crop_id = 'CropID' in df.columns
    if crop_id is None and has_crop_id:
        # Use first available crop ID as default
        crop_id = df['CropID'].dropna().unique()[0] if len(df['CropID'].dropna().unique()) > 0 else None
    
    # Compute equity for each year and season
    results = []
    for year in years:
        row = {'year': int(year)}
        
        for season in SEASONS:
            # Filter data
            if season == 0:
                # Annual season - don't filter by CropID
                subset = df[
                    (df['year'] == year) &
                    (df['status'].str.upper() == 'IRRIGATED') &
                    (df['Season'] == season)
                ]
            else:
                # Seasonal data - filter by CropID if available
                if has_crop_id and crop_id is not None:
                    subset = df[
                        (df['CropID'] == crop_id) &
                        (df['year'] == year) &
                        (df['status'].str.upper() == 'IRRIGATED') &
                        (df['Season'] == season)
                    ]
                else:
                    subset = df[
                        (df['year'] == year) &
                        (df['status'].str.upper() == 'IRRIGATED') &
                        (df['Season'] == season)
                    ]
            
            # Calculate equity (CV = std / mean)
            if not subset.empty and len(subset) > 1:
                mean_eta = subset['ETa'].mean()
                std_eta = subset['ETa'].std()
                equity = round(std_eta / mean_eta, 3) if mean_eta > 0 else None
            else:
                equity = None
            
            # Map season to key
            season_key = {0: 'annual', 1: 'kharif', 2: 'rabi', 3: 'zaid'}[season]
            row[season_key] = equity
        
        results.append(row)
    
    # Calculate averages
    def calc_avg(values):
        valid = [v for v in values if v is not None]
        if not valid:
            return 0
        return round(sum(valid) / len(valid), 3)
    
    average = {
        'kharif': calc_avg([r['kharif'] for r in results]),
        'rabi': calc_avg([r['rabi'] for r in results]),
        'zaid': calc_avg([r['zaid'] for r in results]),
        'annual': calc_avg([r['annual'] for r in results]),
    }
    
    return {
        'summary': results,
        'average': average
    }


if __name__ == '__main__':
    # Test with sample data
    import sys
    if len(sys.argv) > 1:
        result = compute_equity_from_csv(sys.argv[1])
        print("Summary:", result['summary'])
        print("Average:", result['average'])
