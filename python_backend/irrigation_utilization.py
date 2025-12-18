#============================================================
#  IRRIGATION UTILIZATION CALCULATION
#  Formula: Irrigated Area / CCA
#  Higher values indicate better utilization of irrigation infrastructure
#============================================================
import pandas as pd
import numpy as np
from typing import Dict

def compute_irrigation_utilization_from_csv(csv_path: str, cca: float) -> Dict:
    """
    Compute irrigation utilization from CSV file
    Irrigation Utilization = Irrigated Area / CCA
    """
    # Load CSV data
    df = pd.read_csv(csv_path)
    
    # Ensure required columns exist
    required_cols = ['year', 'Area', 'status']
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")
    
    # Get unique years
    years = sorted(df['year'].unique())
    
    # Calculate irrigation utilization for each year
    results = []
    for year in years:
        year_data = df[df['year'] == year]
        
        # Filter irrigated areas
        irrigated_data = year_data[year_data['status'].str.upper() == 'IRRIGATED']
        
        # Calculate total irrigated area
        irrigated_area = irrigated_data['Area'].sum()
        
        # Calculate irrigation utilization
        utilization = round(irrigated_area / cca, 4) if cca > 0 else 0
        
        results.append({
            'year': int(year),
            'irrigatedArea': round(irrigated_area, 2),
            'utilizationRatio': utilization
        })
    
    return {
        'data': results,
        'cca': cca
    }


if __name__ == '__main__':
    # Test with sample data
    import sys
    if len(sys.argv) > 2:
        csv_path = sys.argv[1]
        cca = float(sys.argv[2])
        result = compute_irrigation_utilization_from_csv(csv_path, cca)
        print("Irrigation Utilization Data:", result['data'])
