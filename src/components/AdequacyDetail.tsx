import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProject } from '@/context/ProjectContext';
import { getIndicatorById } from '@/config/indicators';
import { formatValue } from '@/lib/scoring';
import { exportToCSV, formatDateForFilename } from '@/lib/exportUtils';
import { 
  AdequacySummary, 
  SeasonResults, 
  SEASON_OPTIONS,
  SEASON_LABELS
} from '@/lib/adequacyCalculation';
import { toast } from 'sonner';

// Python API endpoint
const PYTHON_API_URL = 'http://localhost:5000';

export function AdequacyDetail() {
  const navigate = useNavigate();
  const { project } = useProject();
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<AdequacySummary[]>([]);
  const [average, setAverage] = useState({ kharif: 0, rabi: 0, zaid: 0, annual: 0 });
  const [seasonResults, setSeasonResults] = useState<Map<number, SeasonResults>>(new Map());
  const [selectedSeason, setSelectedSeason] = useState<number>(1); // Default to Kharif

  const indicator = getIndicatorById('adequacy');

  useEffect(() => {
    if (!project?.isCalculated) {
      toast.error('Please calculate indicators first');
      navigate('/dashboard');
      return;
    }

    // Load and compute adequacy from Python backend
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Call Python API instead of TypeScript calculation
        const formData = new FormData();
        
        // Try to fetch default CSV file
        const response = await fetch('/data/Data_perSeason_perCrop.csv');
        if (response.ok) {
          const blob = await response.blob();
          formData.append('file', blob, 'Data_perSeason_perCrop.csv');
        }
        
        const apiResponse = await fetch(`${PYTHON_API_URL}/api/adequacy`, {
          method: 'POST',
          body: formData,
        });
        
        if (!apiResponse.ok) {
          throw new Error('Failed to calculate adequacy from Python backend');
        }
        
        const result = await apiResponse.json();
        
        // Convert season_results to Map
        const seasonResultsMap = new Map<number, SeasonResults>();
        if (result.season_results) {
          Object.entries(result.season_results).forEach(([season, data]: [string, any]) => {
            seasonResultsMap.set(Number(season), {
              areaMatrix: data.area_matrix,
              adequacyMatrix: data.adequacy_matrix,
              combinedAdequacy: data.combined_adequacy,
              cropTypes: data.crop_types,
            });
          });
        }
        
        setSummary(result.summary);
        setAverage(result.average);
        setSeasonResults(seasonResultsMap);
        toast.success('Adequacy calculated successfully using Python backend');
      } catch (error) {
        console.error('Error loading adequacy data:', error);
        toast.error('Failed to load adequacy data from Python backend. Make sure Python server is running.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [project, navigate]);

  if (!project || !indicator) return null;

  const handleDownloadSummary = () => {
    const data = summary.map((s) => ({
      Year: s.year,
      'Kharif (1)': s.kharif !== null ? formatValue(s.kharif) : '-',
      'Rabi (2)': s.rabi !== null ? formatValue(s.rabi) : '-',
      'Zaid (3)': s.zaid !== null ? formatValue(s.zaid) : '-',
      'Annual (0)': s.annual !== null ? formatValue(s.annual) : '-',
    }));

    // Add average row
    data.push({
      Year: 'AVERAGE' as any,
      'Kharif (1)': formatValue(average.kharif),
      'Rabi (2)': formatValue(average.rabi),
      'Zaid (3)': formatValue(average.zaid),
      'Annual (0)': formatValue(average.annual),
    });

    exportToCSV(data, `adequacy_summary_${formatDateForFilename()}`);
    toast.success('Summary data exported successfully');
  };

  const handleDownloadSeasonData = () => {
    const seasonData = seasonResults.get(selectedSeason);
    if (!seasonData) {
      toast.error('No data available for this season');
      return;
    }

    const years = Object.keys(seasonData.adequacyMatrix).map(Number).sort();
    const crops = seasonData.cropTypes;

    const data = years.map((year) => {
      const row: Record<string, any> = { Year: year };
      crops.forEach((crop) => {
        const value = seasonData.adequacyMatrix[year][crop];
        row[crop] = value !== null ? formatValue(value) : '-';
      });
      row['Combined'] = seasonData.combinedAdequacy[year] !== null 
        ? formatValue(seasonData.combinedAdequacy[year]!) 
        : '-';
      return row;
    });

    // Add average row
    const avgRow: Record<string, any> = { Year: 'AVERAGE' };
    crops.forEach((crop) => {
      const values = years
        .map((y) => seasonData.adequacyMatrix[y][crop])
        .filter((v) => v !== null) as number[];
      avgRow[crop] = values.length > 0 
        ? formatValue(values.reduce((a, b) => a + b, 0) / values.length) 
        : '-';
    });
    const combinedValues = years
      .map((y) => seasonData.combinedAdequacy[y])
      .filter((v) => v !== null) as number[];
    avgRow['Combined'] = combinedValues.length > 0 
      ? formatValue(combinedValues.reduce((a, b) => a + b, 0) / combinedValues.length) 
      : '-';
    data.push(avgRow);

    exportToCSV(data, `adequacy_${SEASON_LABELS[selectedSeason]}_${formatDateForFilename()}`);
    toast.success(`${SEASON_LABELS[selectedSeason]} data exported successfully`);
  };

  // Get selected season data
  const selectedSeasonData = seasonResults.get(selectedSeason);
  const seasonYears = selectedSeasonData 
    ? Object.keys(selectedSeasonData.adequacyMatrix).map(Number).sort() 
    : [];

  return (
    <div className="space-y-6">
      {/* Summary Table Panel */}
      <div className="edipa-panel animate-scale-in">
        <div className="edipa-header flex items-center justify-between">
          <span>{indicator.displayName.toUpperCase()} - SUMMARY</span>
        </div>

        <div className="p-6">
          {/* Indicator Info */}
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              {indicator.description}
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Formula:</strong> Adequacy = 1 - avg(ETa) / avg(ETa90)
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

          {/* Summary Results Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">
                Computing adequacy from CSV data...
              </span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="edipa-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Kharif (1)</th>
                      <th>Rabi (2)</th>
                      <th>Zaid (3)</th>
                      <th>Annual (0)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row, index) => (
                      <tr
                        key={row.year}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <td className="font-medium">{row.year}</td>
                        <td>
                          {row.kharif !== null ? formatValue(row.kharif) : '-'}
                        </td>
                        <td>{row.rabi !== null ? formatValue(row.rabi) : '-'}</td>
                        <td>{row.zaid !== null ? formatValue(row.zaid) : '-'}</td>
                        <td>
                          {row.annual !== null ? formatValue(row.annual) : '-'}
                        </td>
                      </tr>
                    ))}
                    {/* Average Row */}
                    <tr className="bg-secondary font-semibold">
                      <td>AVERAGE</td>
                      <td>{formatValue(average.kharif)}</td>
                      <td>{formatValue(average.rabi)}</td>
                      <td>{formatValue(average.zaid)}</td>
                      <td>{formatValue(average.annual)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleDownloadSummary}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Summary
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Season-wise Detailed Table Panel */}
      {!isLoading && (
        <div className="edipa-panel animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="edipa-header flex items-center justify-between">
            <span>SEASON-WISE CROP ADEQUACY</span>
            <Select 
              value={selectedSeason.toString()} 
              onValueChange={(val) => setSelectedSeason(Number(val))}
            >
              <SelectTrigger className="w-40 bg-background border-primary-foreground/20 text-foreground">
                <SelectValue placeholder="Select season" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {SEASON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-6">
            {selectedSeasonData ? (
              <>
                <div className="overflow-x-auto">
                  <table className="edipa-table">
                    <thead>
                      <tr>
                        <th>Year</th>
                        {selectedSeasonData.cropTypes.map((crop) => (
                          <th key={crop}>{crop}</th>
                        ))}
                        <th className="bg-primary/10">Combined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonYears.map((year, index) => (
                        <tr
                          key={year}
                          className="animate-fade-in"
                          style={{ animationDelay: `${index * 0.03}s` }}
                        >
                          <td className="font-medium">{year}</td>
                          {selectedSeasonData.cropTypes.map((crop) => {
                            const value = selectedSeasonData.adequacyMatrix[year][crop];
                            return (
                              <td key={crop}>
                                {value !== null ? formatValue(value) : '-'}
                              </td>
                            );
                          })}
                          <td className="font-semibold bg-primary/5">
                            {selectedSeasonData.combinedAdequacy[year] !== null
                              ? formatValue(selectedSeasonData.combinedAdequacy[year]!)
                              : '-'}
                          </td>
                        </tr>
                      ))}
                      {/* Average Row */}
                      <tr className="bg-secondary font-semibold">
                        <td>AVERAGE</td>
                        {selectedSeasonData.cropTypes.map((crop) => {
                          const values = seasonYears
                            .map((y) => selectedSeasonData.adequacyMatrix[y][crop])
                            .filter((v) => v !== null) as number[];
                          const avg = values.length > 0 
                            ? values.reduce((a, b) => a + b, 0) / values.length 
                            : null;
                          return (
                            <td key={crop}>
                              {avg !== null ? formatValue(avg) : '-'}
                            </td>
                          );
                        })}
                        <td className="bg-primary/10">
                          {(() => {
                            const values = seasonYears
                              .map((y) => selectedSeasonData.combinedAdequacy[y])
                              .filter((v) => v !== null) as number[];
                            const avg = values.length > 0 
                              ? values.reduce((a, b) => a + b, 0) / values.length 
                              : null;
                            return avg !== null ? formatValue(avg) : '-';
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleDownloadSeasonData}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download {SEASON_LABELS[selectedSeason]} Data
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No data available for {SEASON_LABELS[selectedSeason]} season
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div
        className="flex flex-wrap gap-4 justify-end animate-fade-in"
        style={{ animationDelay: '0.2s' }}
      >
        <Button
          onClick={() => navigate('/dashboard')}
          className="edipa-btn-primary"
        >
          <Home className="w-4 h-4 mr-2" />
          HOME
        </Button>
      </div>
    </div>
  );
}
