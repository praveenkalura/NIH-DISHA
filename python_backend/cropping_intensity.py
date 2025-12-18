#============================================================
#  CROPPING INTENSITY CALCULATION
#  Formula: Total Cropped Area / CCA
#  Higher values indicate more intensive use of available land
#  Based on Crop ID categorization
#============================================================
import pandas as pd
import numpy as np
from typing import Dict, List

# Crop ID mapping based on Excel structure
CROP_ID_MAPPING = {
    1: 'Double Crop Kharif/Rabi',
    2: 'Double Crop Rabi/Zaid',
    3: 'Triple Crop',
    4: 'Perennial Crops',
    5: 'Kharif Crop',
    6: 'Rabi Crop',
    7: 'Double Crop Kharif/Zaid',
    8: 'Zaid Crop'
}

def compute_cropping_intensity_from_csv(csv_path: str, cca: float) -> Dict:
    """
    Compute cropping intensity from CSV file
    Returns three tables:
    1. Cropped Area by ID (actual areas)
    2. Cropped Area (normalized by CCA)
    3. Based on CCA (Cropping Intensity and Total Cropped Area)
    """
    # Load CSV data
    df = pd.read_csv(csv_path)
    
    # Ensure required columns exist
    required_cols = ['year', 'Area']
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")
    
    # Check if CropID column exists
    if 'CropID' not in df.columns:
        raise ValueError("CropID column is required for cropping intensity calculation")
    
    # Get unique years
    years = sorted(df['year'].unique())
    
    # Initialize crop IDs (1-8)
    crop_ids = list(range(1, 9))
    
    # Table 1: Cropped Area by ID (actual areas)
    cropped_area_data = []
    for year in years:
        year_data = df[df['year'] == year]
        row = {'year': int(year)}
        
        for crop_id in crop_ids:
            crop_data = year_data[year_data['CropID'] == crop_id]
            area = crop_data['Area'].sum() if not crop_data.empty else 0
            row[f'crop_{crop_id}'] = round(area, 0)
        
        cropped_area_data.append(row)
    
    # Calculate averages for Table 1
    avg_row = {'year': 'AVERAGE'}
    for crop_id in crop_ids:
        values = [row[f'crop_{crop_id}'] for row in cropped_area_data]
        avg_row[f'crop_{crop_id}'] = round(sum(values) / len(values), 0) if values else 0
    
    # Table 2: Cropped Area (normalized by CCA)
    normalized_area_data = []
    for year in years:
        year_data = df[df['year'] == year]
        row = {'year': int(year)}
        
        for crop_id in crop_ids:
            crop_data = year_data[year_data['CropID'] == crop_id]
            area = crop_data['Area'].sum() if not crop_data.empty else 0
            normalized = round(area / cca, 3) if cca > 0 else 0
            row[f'crop_{crop_id}'] = normalized
        
        normalized_area_data.append(row)
    
    # Calculate averages for Table 2
    avg_normalized = {'year': 'AVERAGE'}
    for crop_id in crop_ids:
        values = [row[f'crop_{crop_id}'] for row in normalized_area_data]
        avg_normalized[f'crop_{crop_id}'] = round(sum(values) / len(values), 3) if values else 0
    
    # Table 3: Based on CCA (Cropping Intensity and Total Cropped Area)
    intensity_data = []
    for year in years:
        year_data = df[df['year'] == year]
        total_cropped_area = year_data['Area'].sum()
        cropping_intensity = round(total_cropped_area / cca, 2) if cca > 0 else 0
        
        intensity_data.append({
            'year': int(year),
            'cropping_intensity': cropping_intensity,
            'total_cropped_area': round(total_cropped_area, 0)
        })
    
    # Calculate averages for Table 3
    total_areas = [row['total_cropped_area'] for row in intensity_data]
    intensities = [row['cropping_intensity'] for row in intensity_data]
    avg_intensity = {
        'year': 'AVERAGE',
        'cropping_intensity': round(sum(intensities) / len(intensities), 2) if intensities else 0,
        'total_cropped_area': round(sum(total_areas) / len(total_areas), 0) if total_areas else 0
    }
    
    return {
        'cropped_area': {
            'data': cropped_area_data,
            'average': avg_row
        },
        'normalized_area': {
            'data': normalized_area_data,
            'average': avg_normalized
        },
        'intensity': {
            'data': intensity_data,
            'average': avg_intensity
        },
        'crop_labels': CROP_ID_MAPPING,
        'cca': cca
    }


if __name__ == '__main__':
    # Test with sample data
    import sys
    if len(sys.argv) > 2:
        csv_path = sys.argv[1]
        cca = float(sys.argv[2])
        result = compute_cropping_intensity_from_csv(csv_path, cca)
        print("Cropping Intensity Result:")
        print("Cropped Area Data:", result['cropped_area']['data'])
        print("Normalized Area Data:", result['normalized_area']['data'])
        print("Intensity Data:", result['intensity']['data'])
