import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Home, Download, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProject } from '@/context/ProjectContext';
import { getIndicatorById, DEFAULT_CROPS } from '@/config/indicators';
import { ScoreBadge } from './ScoreBadge';
import { formatValue } from '@/lib/scoring';
import { exportToCSV, formatDateForFilename } from '@/lib/exportUtils';
import { toast } from 'sonner';

export function IndicatorDetail() {
  const navigate = useNavigate();
  const { indicatorId } = useParams<{ indicatorId: string }>();
  const { project, getIndicatorResults } = useProject();
  const [selectedCrop, setSelectedCrop] = useState<string | undefined>();

  const indicator = indicatorId ? getIndicatorById(indicatorId) : null;

  useEffect(() => {
    if (!project?.isCalculated) {
      toast.error('Please calculate indicators first');
      navigate('/dashboard');
      return;
    }
    if (!indicator) {
      toast.error('Invalid indicator');
      navigate('/dashboard');
      return;
    }
    // Set default crop for productivity
    if (indicator.id === 'productivity' && !selectedCrop) {
      setSelectedCrop(DEFAULT_CROPS[0].id);
    }
  }, [project, indicator, navigate, selectedCrop]);

  if (!project || !indicator) return null;

  const isProductivity = indicator.id === 'productivity';
  const results = getIndicatorResults(indicator.id, isProductivity ? selectedCrop : undefined);

  // Calculate average
  const avgValue = results.length > 0 
    ? results.reduce((sum, r) => sum + r.observedValue, 0) / results.length 
    : 0;
  const avgScore = results.length > 0 
    ? results.reduce((sum, r) => sum + r.score, 0) / results.length 
    : 0;

  const handleDownload = () => {
    const data = results.map(r => ({
      Year: r.year,
      ...(r.season ? { Season: r.season } : {}),
      ...(r.crop ? { Crop: r.crop } : {}),
      'Observed Value': formatValue(r.observedValue),
      'Critical Value': formatValue(r.criticalValue),
      'Target Value': formatValue(r.targetValue),
      Score: r.score,
    }));

    exportToCSV(data, `${indicator.id}_${formatDateForFilename()}`);
    toast.success('Data exported successfully');
  };

  return (
    <div className="space-y-6">
      <div className="edipa-panel animate-scale-in">
        <div className="edipa-header flex items-center justify-between">
          <span>{indicator.displayName.toUpperCase()}</span>
          {isProductivity && (
            <Select value={selectedCrop} onValueChange={setSelectedCrop}>
              <SelectTrigger className="w-40 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground">
                <SelectValue placeholder="Select crop" />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_CROPS.map(crop => (
                  <SelectItem key={crop.id} value={crop.id}>
                    {crop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="p-6">
          {/* Indicator Info */}
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">{indicator.description}</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                <strong>Units:</strong> {indicator.units || '-'}
              </span>
              <span>
                <strong>Preference:</strong> {indicator.higherIsBetter ? 'Higher is better' : 'Lower is better'}
              </span>
              <span>
                <strong>CCA:</strong> {project.metadata.cca.toLocaleString()} ha
              </span>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="edipa-table">
              <thead>
                <tr>
                  <th>Year</th>
                  {isProductivity && <th>Crop</th>}
                  <th>Observed Value</th>
                  <th>Critical Value</th>
                  <th>Target Value</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={`${result.year}-${result.crop || ''}`} className="animate-fade-in" style={{ animationDelay: `${index * 0.03}s` }}>
                    <td className="font-medium">{result.year}</td>
                    {isProductivity && <td>{result.crop}</td>}
                    <td>{formatValue(result.observedValue)}</td>
                    <td>{formatValue(result.criticalValue)}</td>
                    <td>{formatValue(result.targetValue)}</td>
                    <td><ScoreBadge score={result.score} /></td>
                  </tr>
                ))}
                {/* Average Row */}
                <tr className="bg-secondary font-semibold">
                  <td>AVERAGE</td>
                  {isProductivity && <td>-</td>}
                  <td>{formatValue(avgValue)}</td>
                  <td>-</td>
                  <td>-</td>
                  <td><ScoreBadge score={Math.round(avgScore)} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-between animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <Button
          onClick={handleDownload}
          variant="outline"
          className="flex-1 md:flex-none"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Result
        </Button>
        
        <Button
          onClick={() => navigate('/dashboard')}
          className="edipa-btn-primary flex-1 md:flex-none"
        >
          <Home className="w-4 h-4 mr-2" />
          HOME
        </Button>
      </div>
    </div>
  );
}
