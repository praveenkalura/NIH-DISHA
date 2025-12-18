import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProject } from '@/context/ProjectContext';
import { getIndicatorById } from '@/config/indicators';
import { formatValue } from '@/lib/scoring';
import { exportToCSV, formatDateForFilename } from '@/lib/exportUtils';
import { toast } from 'sonner';

// Python API endpoint
const PYTHON_API_URL = 'http://localhost:5000';

interface CroppingIntensityData {
  cropped_area: {
    data: Array<Record<string, any>>;
    average: Record<string, any>;
  };
  normalized_area: {
    data: Array<Record<string, any>>;
    average: Record<string, any>;
  };
  intensity: {
    data: Array<{ year: number; cropping_intensity: number; total_cropped_area: number }>;
    average: { year: string; cropping_intensity: number; total_cropped_area: number };
  };
  crop_labels: Record<number, string>;
  cca: number;
}

export function CroppingIntensityDetail() {
  const navigate = useNavigate();
  const { project } = useProject();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<CroppingIntensityData | null>(null);

  const indicator = getIndicatorById('cropping_intensity');

  useEffect(() => {
    if (!project?.isCalculated) {
      toast.error('Please calculate indicators first');
      navigate('/dashboard');
      return;
    }

    // Load and compute cropping intensity from Python backend
    const loadData = async () => {
      setIsLoading(true);
      try {
        const formData = new FormData();
        
        // Add CCA parameter
        formData.append('cca', project.metadata.cca.toString());
        
        // Try to fetch default CSV file
        const response = await fetch('/data/Data_perSeason_perCrop.csv');
        if (response.ok) {
          const blob = await response.blob();
          formData.append('file', blob, 'Data_perSeason_perCrop.csv');
        }
        
        const apiResponse = await fetch(`${PYTHON_API_URL}/api/cropping-intensity`, {
          method: 'POST',
          body: formData,
        });
        
        if (!apiResponse.ok) {
          throw new Error('Failed to calculate cropping intensity from Python backend');
        }
        
        const result = await apiResponse.json();
        setData(result);
        toast.success('Cropping intensity calculated successfully using Python backend');
      } catch (error) {
        console.error('Error loading cropping intensity data:', error);
        toast.error('Failed to load cropping intensity data from Python backend. Make sure Python server is running.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [project, navigate]);

  if (!project || !indicator) return null;

  const handleDownloadCroppedArea = () => {
    if (!data) return;
    
    const exportData = data.cropped_area.data.map(row => {
      const formattedRow: Record<string, any> = { Year: row.year };
      for (let i = 1; i <= 8; i++) {
        formattedRow[data.crop_labels[i]] = row[`crop_${i}`] || 0;
      }
      return formattedRow;
    });
    
    // Add average row
    const avgRow: Record<string, any> = { Year: 'AVERAGE' };
    for (let i = 1; i <= 8; i++) {
      avgRow[data.crop_labels[i]] = data.cropped_area.average[`crop_${i}`] || 0;
    }
    exportData.push(avgRow);

    exportToCSV(exportData, `cropping_intensity_area_${formatDateForFilename()}`);
    toast.success('Cropped area data exported successfully');
  };

  const handleDownloadNormalizedArea = () => {
    if (!data) return;
    
    const exportData = data.normalized_area.data.map(row => {
      const formattedRow: Record<string, any> = { Year: row.year };
      for (let i = 1; i <= 8; i++) {
        formattedRow[data.crop_labels[i]] = formatValue(row[`crop_${i}`] || 0);
      }
      return formattedRow;
    });
    
    // Add average row
    const avgRow: Record<string, any> = { Year: 'AVERAGE' };
    for (let i = 1; i <= 8; i++) {
      avgRow[data.crop_labels[i]] = formatValue(data.normalized_area.average[`crop_${i}`] || 0);
    }
    exportData.push(avgRow);

    exportToCSV(exportData, `cropping_intensity_normalized_${formatDateForFilename()}`);
    toast.success('Normalized area data exported successfully');
  };

  const handleDownloadIntensity = () => {
    if (!data) return;
    
    const exportData = data.intensity.data.map(row => ({
      Year: row.year,
      'Cropping Intensity': formatValue(row.cropping_intensity),
      'Total Cropped Area': row.total_cropped_area,
    }));
    
    // Add average row
    exportData.push({
      Year: 'AVERAGE' as any,
      'Cropping Intensity': formatValue(data.intensity.average.cropping_intensity),
      'Total Cropped Area': data.intensity.average.total_cropped_area,
    });

    exportToCSV(exportData, `cropping_intensity_summary_${formatDateForFilename()}`);
    toast.success('Intensity summary exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Table 1: Cropped Area (Actual Values) */}
      <div className="edipa-panel animate-scale-in">
        <div className="edipa-header flex items-center justify-between">
          <span>CROPPED AREA</span>
        </div>

        <div className="p-6">
          {/* Indicator Info */}
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              {indicator.description}
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Formula:</strong> Cropping Intensity = Total Cropped Area / CCA
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                <strong>Units:</strong> {indicator.units || '-'}
              </span>
              <span>
                <strong>Preference:</strong>{' '}
                {indicator.higherIsBetter ? 'Higher is better' : 'Lower is better'}
              </span>
              <span>
                <strong>CCA:</strong> {project.metadata.cca.toLocaleString()} ha
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">
                Computing cropping intensity from CSV data...
              </span>
            </div>
          ) : data ? (
            <>
              <div className="overflow-x-auto">
                <table className="edipa-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      {Object.entries(data.crop_labels).map(([id, label]) => (
                        <th key={id}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.cropped_area.data.map((row, index) => (
                      <tr
                        key={row.year}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <td className="font-medium">{row.year}</td>
                        {Object.keys(data.crop_labels).map((id) => (
                          <td key={id}>{row[`crop_${id}`] || 0}</td>
                        ))}
                      </tr>
                    ))}
                    {/* Average Row */}
                    <tr className="bg-secondary font-semibold">
                      <td>AVERAGE</td>
                      {Object.keys(data.crop_labels).map((id) => (
                        <td key={id}>{data.cropped_area.average[`crop_${id}`] || 0}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleDownloadCroppedArea} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download Cropped Area
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Table 2: Normalized Area (Cropped Area / CCA) */}
      {!isLoading && data && (
        <div className="edipa-panel animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="edipa-header">
            CROPPED AREA (NORMALIZED BY CCA)
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="edipa-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    {Object.entries(data.crop_labels).map(([id, label]) => (
                      <th key={id}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.normalized_area.data.map((row, index) => (
                    <tr
                      key={row.year}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <td className="font-medium">{row.year}</td>
                      {Object.keys(data.crop_labels).map((id) => (
                        <td key={id}>{formatValue(row[`crop_${id}`] || 0)}</td>
                      ))}
                    </tr>
                  ))}
                  {/* Average Row */}
                  <tr className="bg-secondary font-semibold">
                    <td>AVERAGE</td>
                    {Object.keys(data.crop_labels).map((id) => (
                      <td key={id}>{formatValue(data.normalized_area.average[`crop_${id}`] || 0)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleDownloadNormalizedArea} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Normalized Area
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table 3: Based on CCA (Cropping Intensity Summary) */}
      {!isLoading && data && (
        <div className="edipa-panel animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="edipa-header">
            BASED ON CCA - CROPPING INTENSITY
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="edipa-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Cropping Intensity</th>
                    <th>Total Cropped Area</th>
                  </tr>
                </thead>
                <tbody>
                  {data.intensity.data.map((row, index) => (
                    <tr
                      key={row.year}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <td className="font-medium">{row.year}</td>
                      <td>{formatValue(row.cropping_intensity)}</td>
                      <td>{row.total_cropped_area.toLocaleString()}</td>
                    </tr>
                  ))}
                  {/* Average Row */}
                  <tr className="bg-secondary font-semibold">
                    <td>AVERAGE</td>
                    <td>{formatValue(data.intensity.average.cropping_intensity)}</td>
                    <td>{data.intensity.average.total_cropped_area.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleDownloadIntensity} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Intensity Summary
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div
        className="flex flex-wrap gap-4 justify-end animate-fade-in"
        style={{ animationDelay: '0.3s' }}
      >
        <Button onClick={() => navigate('/dashboard')} className="edipa-btn-primary">
          <Home className="w-4 h-4 mr-2" />
          HOME
        </Button>
      </div>
    </div>
  );
}
