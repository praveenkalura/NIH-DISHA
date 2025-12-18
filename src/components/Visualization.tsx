import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Download, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProject } from '@/context/ProjectContext';
import { INDICATORS, DEFAULT_CROPS, getIndicatorById } from '@/config/indicators';
import { exportToCSV, formatDateForFilename } from '@/lib/exportUtils';
import { formatValue } from '@/lib/scoring';
import { toast } from 'sonner';
import { computeAdequacyFromCSV, SEASON_OPTIONS } from '@/lib/adequacyCalculation';
import { computeProductivityFromCSV, ProductivityData, PRODUCTIVITY_SEASON_OPTIONS } from '@/lib/productivityCalculation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
  Cell,
} from 'recharts';

// Multicolor palette for charts
const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(210, 70%, 50%)',
  'hsl(280, 60%, 55%)',
  'hsl(330, 65%, 50%)',
];

export function Visualization() {
  const navigate = useNavigate();
  const { project, getIndicatorResults, uploadedFiles } = useProject();
  const chartRef = useRef<HTMLDivElement>(null);
  
  const [selectedIndicator, setSelectedIndicator] = useState(INDICATORS[0].id);
  const [selectedCrop, setSelectedCrop] = useState<string | undefined>();
  const [adequacyViewMode, setAdequacyViewMode] = useState<'combined' | 'seasonal'>('combined');
  const [productivityViewMode, setProductivityViewMode] = useState<'combined' | 'seasonal'>('combined');
  const [selectedSeason, setSelectedSeason] = useState('kharif');
  const [adequacyData, setAdequacyData] = useState<any>(null);
  const [productivityData, setProductivityData] = useState<ProductivityData | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const indicator = getIndicatorById(selectedIndicator);
  const isProductivity = selectedIndicator === 'productivity';
  const isAdequacy = selectedIndicator === 'adequacy';

  useEffect(() => {
    if (!project?.isCalculated) {
      toast.error('Please calculate indicators first');
      navigate('/dashboard');
    }
  }, [project, navigate]);

  useEffect(() => {
    if (isProductivity && !selectedCrop) {
      setSelectedCrop(DEFAULT_CROPS[0].id);
    } else if (!isProductivity && !isAdequacy) {
      setSelectedCrop(undefined);
    }
  }, [isProductivity, isAdequacy, selectedCrop]);

  // Fetch adequacy data when adequacy is selected
  useEffect(() => {
    if (isAdequacy) {
      const perSeasonFile = uploadedFiles.find(f => 
        f.name.toLowerCase().includes('perseason') || f.name.toLowerCase().includes('per_season')
      );
      computeAdequacyFromCSV(perSeasonFile)
        .then(data => setAdequacyData(data))
        .catch(err => {
          console.error('Error loading adequacy data:', err);
          toast.error('Failed to load adequacy data');
        });
    }
  }, [isAdequacy, uploadedFiles]);

  // Fetch productivity data when productivity is selected
  useEffect(() => {
    if (isProductivity) {
      const perCropFile = uploadedFiles.find(f => 
        f.name.toLowerCase().includes('percrop') || f.name.toLowerCase().includes('per_crop')
      );
      computeProductivityFromCSV(perCropFile)
        .then(data => setProductivityData(data))
        .catch(err => {
          console.error('Error loading productivity data:', err);
          toast.error('Failed to load productivity data');
        });
    }
  }, [isProductivity, uploadedFiles]);

  if (!project?.isCalculated || !indicator) return null;

  // Productivity-specific chart data
  const getProductivityChartData = () => {
    if (!productivityData) return [];
    const { summary, average } = productivityData;
    
    if (productivityViewMode === 'combined') {
      return summary.map((row) => ({
        year: row.year.toString(),
        Kharif: row.kharif,
        Rabi: row.rabi,
        Zaid: row.zaid,
        Annual: row.annual,
      }));
    } else {
      const seasonKey = selectedSeason as 'kharif' | 'rabi' | 'zaid' | 'annual';
      const data = summary.map((row) => ({
        year: row.year.toString(),
        value: row[seasonKey] ?? 0,
      }));
      data.push({ year: 'AVERAGE', value: average[seasonKey] ?? 0 });
      return data;
    }
  };

  // Adequacy-specific chart data
  const getAdequacyChartData = () => {
    if (!adequacyData) return [];

    const { summary, average } = adequacyData;
    
    if (adequacyViewMode === 'combined') {
      const data = summary.map((row: any) => ({
        year: row.year.toString(),
        value: parseFloat(((row.kharif + row.rabi + row.zaid + row.annual) / 4 * 100).toFixed(2)),
        kharif: row.kharif !== null ? parseFloat((row.kharif * 100).toFixed(2)) : null,
        rabi: row.rabi !== null ? parseFloat((row.rabi * 100).toFixed(2)) : null,
        zaid: row.zaid !== null ? parseFloat((row.zaid * 100).toFixed(2)) : null,
        annual: row.annual !== null ? parseFloat((row.annual * 100).toFixed(2)) : null,
      }));
      const avgValue = (average.kharif + average.rabi + average.zaid + average.annual) / 4;
      data.push({
        year: 'AVERAGE',
        value: parseFloat((avgValue * 100).toFixed(2)),
        kharif: parseFloat((average.kharif * 100).toFixed(2)),
        rabi: parseFloat((average.rabi * 100).toFixed(2)),
        zaid: parseFloat((average.zaid * 100).toFixed(2)),
        annual: parseFloat((average.annual * 100).toFixed(2)),
      });
      return data;
    } else {
      const seasonKey = selectedSeason as 'kharif' | 'rabi' | 'zaid' | 'annual';
      const data = summary.map((row: any) => ({
        year: row.year.toString(),
        value: row[seasonKey] !== null ? parseFloat((row[seasonKey] * 100).toFixed(2)) : 0,
      }));
      data.push({
        year: 'AVERAGE',
        value: parseFloat((average[seasonKey] * 100).toFixed(2)),
      });
      return data;
    }
  };

  const getAllSeasonsChartData = () => {
    if (!adequacyData) return [];
    const { summary } = adequacyData;
    return summary.map((row: any) => ({
      year: row.year.toString(),
      Kharif: row.kharif !== null ? parseFloat((row.kharif * 100).toFixed(2)) : null,
      Rabi: row.rabi !== null ? parseFloat((row.rabi * 100).toFixed(2)) : null,
      Zaid: row.zaid !== null ? parseFloat((row.zaid * 100).toFixed(2)) : null,
      Annual: row.annual !== null ? parseFloat((row.annual * 100).toFixed(2)) : null,
    }));
  };

  const results = getIndicatorResults(selectedIndicator, undefined);
  
  const chartData = isAdequacy 
    ? getAdequacyChartData()
    : isProductivity 
      ? getProductivityChartData()
      : results.map((r, idx) => ({
          year: r.year.toString(),
          value: parseFloat(r.observedValue.toFixed(3)),
          score: r.score,
          color: CHART_COLORS[idx % CHART_COLORS.length],
        }));

  // Add average for general indicators
  if (!isAdequacy && !isProductivity && chartData.length > 0 && results.length > 0) {
    const avgValue = results.reduce((sum, r) => sum + r.observedValue, 0) / results.length;
    (chartData as any[]).push({
      year: 'AVERAGE',
      value: parseFloat(avgValue.toFixed(3)),
      score: Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length),
      color: 'hsl(var(--accent))',
    });
  }

  const threshold = isProductivity 
    ? project.thresholds.crops.find(c => c.cropId === selectedCrop)
    : project.thresholds.indicators.find(t => t.indicatorId === selectedIndicator);

  const criticalValue = threshold?.criticalValue ?? indicator.defaultCriticalValue;
  const targetValue = threshold?.targetValue ?? indicator.defaultTargetValue;

  const handleDownloadData = () => {
    if (isAdequacy && adequacyData) {
      const data = adequacyData.summary.map((row: any) => ({
        Year: row.year,
        'Kharif (%)': row.kharif !== null ? (row.kharif * 100).toFixed(2) : 'N/A',
        'Rabi (%)': row.rabi !== null ? (row.rabi * 100).toFixed(2) : 'N/A',
        'Zaid (%)': row.zaid !== null ? (row.zaid * 100).toFixed(2) : 'N/A',
        'Annual (%)': row.annual !== null ? (row.annual * 100).toFixed(2) : 'N/A',
      }));
      exportToCSV(data, `adequacy_chart_${formatDateForFilename()}`);
    } else {
      const data = results.map(r => ({
        Year: r.year,
        Value: formatValue(r.observedValue),
        Score: r.score,
      }));
      exportToCSV(data, `${selectedIndicator}_chart_${formatDateForFilename()}`);
    }
    toast.success('Chart data exported');
  };

  const handleDownloadChartPNG = useCallback(() => {
    if (!chartRef.current) return;
    
    const svg = chartRef.current.querySelector('svg');
    if (!svg) {
      toast.error('Could not export chart');
      return;
    }

    // Clone SVG and add white background
    const clonedSvg = svg.cloneNode(true) as SVGElement;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', 'white');
    clonedSvg.insertBefore(rect, clonedSvg.firstChild);

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.scale(2, 2);
      ctx?.drawImage(img, 0, 0);
      
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `${selectedIndicator}_chart_${formatDateForFilename()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Chart exported as PNG');
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, [selectedIndicator]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (isAdequacy) {
        return (
          <div className="bg-card p-3 rounded-lg shadow-lg border border-border">
            <p className="font-semibold">{label}</p>
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-sm">
                <span style={{ color: entry.color }}>{entry.name}: </span>
                <span className="font-medium">{entry.value}%</span>
              </p>
            ))}
          </div>
        );
      }
      return (
        <div className="bg-card p-3 rounded-lg shadow-lg border border-border">
          <p className="font-semibold">{label}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Value: </span>
            <span className="font-medium">{payload[0].value}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Score: </span>
            <span className="font-medium">{payload[0].payload.score}/10</span>
          </p>
          <div className="text-xs text-muted-foreground mt-1 pt-1 border-t border-border">
            <p>Critical: {formatValue(criticalValue)}</p>
            <p>Target: {formatValue(targetValue)}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const seasonColors = {
    Kharif: 'hsl(var(--chart-1))',
    Rabi: 'hsl(var(--chart-2))',
    Zaid: 'hsl(var(--chart-3))',
    Annual: 'hsl(var(--chart-4))',
  };

  const allSeasonsData = isAdequacy ? getAllSeasonsChartData() : [];

  return (
    <div className="space-y-6">
      <div className="edipa-panel animate-scale-in">
        <div className="edipa-header">
          VIZUALIZATION
        </div>
        
        <div className="p-6 space-y-6">
          {/* Indicator Selection */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="font-semibold">SELECT INDICATOR:</span>
              <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDICATORS.map(ind => (
                    <SelectItem key={ind.id} value={ind.id}>
                      {ind.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {isProductivity && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Crop:</span>
                <Select value={selectedCrop} onValueChange={setSelectedCrop}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_CROPS.map(crop => (
                      <SelectItem key={crop.id} value={crop.id}>
                        {crop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Adequacy-specific controls */}
            {isAdequacy && (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">View:</span>
                  <Select value={adequacyViewMode} onValueChange={(v) => setAdequacyViewMode(v as 'combined' | 'seasonal')}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="combined">All Seasons</SelectItem>
                      <SelectItem value="seasonal">Single Season</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {adequacyViewMode === 'seasonal' && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Season:</span>
                    <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kharif">Kharif</SelectItem>
                        <SelectItem value="rabi">Rabi</SelectItem>
                        <SelectItem value="zaid">Zaid</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="font-semibold">Chart:</span>
                  <Select value={chartType} onValueChange={(v) => setChartType(v as 'bar' | 'line')}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="line">Line</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Chart */}
          <div className="edipa-panel">
            <div className="edipa-section-header">
              Interactive Plots - {indicator.displayName}
              {isProductivity && selectedCrop && ` (${DEFAULT_CROPS.find(c => c.id === selectedCrop)?.name})`}
              {isAdequacy && adequacyViewMode === 'seasonal' && ` - ${selectedSeason.charAt(0).toUpperCase() + selectedSeason.slice(1)}`}
            </div>
            
            <div className="p-6" ref={chartRef}>
              {/* Adequacy Multi-Season Line Chart */}
              {isAdequacy && adequacyViewMode === 'combined' && chartType === 'line' && (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={allSeasonsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--foreground))' }} unit="%" domain={[0, 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="Kharif" stroke={seasonColors.Kharif} strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Rabi" stroke={seasonColors.Rabi} strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Zaid" stroke={seasonColors.Zaid} strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Annual" stroke={seasonColors.Annual} strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {/* Adequacy Multi-Season Bar Chart */}
              {isAdequacy && adequacyViewMode === 'combined' && chartType === 'bar' && (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={allSeasonsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--foreground))' }} unit="%" domain={[0, 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="Kharif" fill={seasonColors.Kharif} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Rabi" fill={seasonColors.Rabi} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Zaid" fill={seasonColors.Zaid} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Annual" fill={seasonColors.Annual} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {/* Adequacy Single Season Chart */}
              {isAdequacy && adequacyViewMode === 'seasonal' && chartType === 'bar' && (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--foreground))' }} unit="%" domain={[0, 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <ReferenceLine y={criticalValue * 100} stroke="hsl(var(--destructive))" strokeDasharray="5 5" strokeWidth={2}
                      label={{ value: 'Critical', position: 'right', fill: 'hsl(var(--destructive))', fontSize: 12 }} />
                    <ReferenceLine y={targetValue * 100} stroke="hsl(var(--success))" strokeDasharray="5 5" strokeWidth={2}
                      label={{ value: 'Target', position: 'right', fill: 'hsl(var(--success))', fontSize: 12 }} />
                    <Bar dataKey="value" fill="hsl(var(--accent))" name={`${selectedSeason.charAt(0).toUpperCase() + selectedSeason.slice(1)} Adequacy`} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {isAdequacy && adequacyViewMode === 'seasonal' && chartType === 'line' && (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--foreground))' }} unit="%" domain={[0, 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <ReferenceLine y={criticalValue * 100} stroke="hsl(var(--destructive))" strokeDasharray="5 5" strokeWidth={2}
                      label={{ value: 'Critical', position: 'right', fill: 'hsl(var(--destructive))', fontSize: 12 }} />
                    <ReferenceLine y={targetValue * 100} stroke="hsl(var(--success))" strokeDasharray="5 5" strokeWidth={2}
                      label={{ value: 'Target', position: 'right', fill: 'hsl(var(--success))', fontSize: 12 }} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--accent))" name={`${selectedSeason.charAt(0).toUpperCase() + selectedSeason.slice(1)} Adequacy`} strokeWidth={2} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {/* Non-Adequacy Charts */}
              {!isAdequacy && (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="year" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--foreground))' }} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <ReferenceLine y={criticalValue} stroke="hsl(var(--destructive))" strokeDasharray="5 5" strokeWidth={2}
                      label={{ value: 'Critical', position: 'right', fill: 'hsl(var(--destructive))', fontSize: 12 }} />
                    <ReferenceLine y={targetValue} stroke="hsl(var(--success))" strokeDasharray="5 5" strokeWidth={2}
                      label={{ value: 'Target', position: 'right', fill: 'hsl(var(--success))', fontSize: 12 }} />
                    <Bar dataKey="value" fill="hsl(var(--accent))" name={indicator.displayName} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Legend */}
          {isAdequacy && adequacyViewMode === 'combined' ? (
            <div className="flex flex-wrap gap-6 justify-center text-sm">
              {Object.entries(seasonColors).map(([season, color]) => (
                <div key={season} className="flex items-center gap-2">
                  <div className="w-4 h-3 rounded" style={{ backgroundColor: color }}></div>
                  <span>{season}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-6 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-destructive" style={{ borderStyle: 'dashed', borderWidth: 1, borderColor: 'hsl(var(--destructive))' }}></div>
                <span>Critical Value ({formatValue(isAdequacy ? criticalValue * 100 : criticalValue)}{isAdequacy ? '%' : ''})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-success" style={{ borderStyle: 'dashed', borderWidth: 1, borderColor: 'hsl(var(--success))' }}></div>
                <span>Target Value ({formatValue(isAdequacy ? targetValue * 100 : targetValue)}{isAdequacy ? '%' : ''})</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-between animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="flex gap-4">
          <Button
            onClick={handleDownloadData}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Data
          </Button>
          
          <Button
            onClick={handleDownloadChartPNG}
            variant="outline"
          >
            <Image className="w-4 h-4 mr-2" />
            Download Graph
          </Button>
        </div>
        
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
