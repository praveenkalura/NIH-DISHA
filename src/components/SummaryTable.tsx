import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProject } from '@/context/ProjectContext';
import { INDICATORS, DEFAULT_CROPS, getIndicatorById } from '@/config/indicators';
import { ScoreBadge } from './ScoreBadge';
import { formatValue, calculateAverageScore } from '@/lib/scoring';
import { exportToCSV, formatDateForFilename } from '@/lib/exportUtils';
import { toast } from 'sonner';
import { IndicatorSummary } from '@/types/project';

export function SummaryTable() {
  const navigate = useNavigate();
  const { project, getIndicatorResults } = useProject();

  useEffect(() => {
    if (!project?.isCalculated) {
      toast.error('Please calculate indicators first');
      navigate('/dashboard');
    }
  }, [project, navigate]);

  if (!project?.isCalculated) return null;

  // Build summary data
  const summaryData: IndicatorSummary[] = [];

  INDICATORS.forEach(indicator => {
    if (indicator.id === 'productivity') {
      // Add each crop's productivity as a sub-row
      DEFAULT_CROPS.forEach(crop => {
        const results = getIndicatorResults('productivity', crop.id);
        if (results.length > 0) {
          const avgValue = results.reduce((sum, r) => sum + r.observedValue, 0) / results.length;
          const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
          const threshold = project.thresholds.crops.find(c => c.cropId === crop.id);
          
          summaryData.push({
            indicatorId: 'productivity',
            displayName: `Productivity`,
            description: indicator.description,
            units: indicator.units,
            criticalValue: threshold?.criticalValue ?? crop.criticalValue,
            targetValue: threshold?.targetValue ?? crop.targetValue,
            observedValue: avgValue,
            score: Math.round(avgScore),
            crop: crop.name,
          });
        }
      });
    } else {
      const results = getIndicatorResults(indicator.id);
      if (results.length > 0) {
        const avgValue = results.reduce((sum, r) => sum + r.observedValue, 0) / results.length;
        const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
        const threshold = project.thresholds.indicators.find(t => t.indicatorId === indicator.id);
        
        summaryData.push({
          indicatorId: indicator.id,
          displayName: indicator.displayName,
          description: indicator.description,
          units: indicator.units,
          criticalValue: threshold?.criticalValue ?? indicator.defaultCriticalValue,
          targetValue: threshold?.targetValue ?? indicator.defaultTargetValue,
          observedValue: avgValue,
          score: Math.round(avgScore),
        });
      }
    }
  });

  const averageScore = calculateAverageScore(summaryData.map(s => s.score));

  const handleDownload = () => {
    const data = summaryData.map(s => ({
      Indicator: s.displayName + (s.crop ? ` (${s.crop})` : ''),
      Description: s.description,
      Units: s.units,
      'Critical Value': formatValue(s.criticalValue),
      'Target Value': formatValue(s.targetValue),
      'Observed Value': formatValue(s.observedValue),
      Score: s.score,
    }));

    // Add average row
    data.push({
      Indicator: 'AVERAGE SCORE',
      Description: '',
      Units: '',
      'Critical Value': '',
      'Target Value': '',
      'Observed Value': '',
      Score: averageScore as any,
    });

    exportToCSV(data, `summary_${formatDateForFilename()}`);
    toast.success('Summary exported successfully');
  };

  return (
    <div className="space-y-6">
      <div className="edipa-panel animate-scale-in">
        <div className="edipa-header">
          SUMMARY TABLE
        </div>
        
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="edipa-table">
              <thead>
                <tr>
                  <th className="w-1/6">Indicator</th>
                  <th className="w-1/4">Description</th>
                  <th>Units</th>
                  <th>Critical Value</th>
                  <th>Target Value</th>
                  <th>Observed Value</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {summaryData.map((summary, index) => (
                  <tr 
                    key={`${summary.indicatorId}-${summary.crop || ''}`}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    <td className="font-medium">
                      {summary.displayName}
                      {summary.crop && (
                        <span className="block text-xs text-muted-foreground">
                          ({summary.crop})
                        </span>
                      )}
                    </td>
                    <td className="text-sm text-muted-foreground">{summary.description}</td>
                    <td>{summary.units}</td>
                    <td>{formatValue(summary.criticalValue)}</td>
                    <td>{formatValue(summary.targetValue)}</td>
                    <td className="font-medium">{formatValue(summary.observedValue)}</td>
                    <td><ScoreBadge score={summary.score} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-primary text-primary-foreground font-bold">
                  <td colSpan={6} className="text-right px-4 py-3">
                    AVERAGE SCORE:
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center min-w-[2.5rem] px-3 py-1 rounded-full bg-primary-foreground text-primary font-bold">
                      {averageScore.toFixed(2)}
                    </span>
                  </td>
                </tr>
              </tfoot>
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
