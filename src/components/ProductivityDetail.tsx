import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProject } from '@/context/ProjectContext';
import { ProductivityData, PRODUCTIVITY_SEASON_OPTIONS, SeasonTables } from '@/lib/productivityCalculation';
import { exportToCSV, formatDateForFilename } from '@/lib/exportUtils';
import { toast } from 'sonner';

// Python API endpoint
const PYTHON_API_URL = 'http://localhost:5000';

export function ProductivityDetail() {
  const navigate = useNavigate();
  const { project, uploadedFiles } = useProject();
  
  const [productivityData, setProductivityData] = useState<ProductivityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState('kharif');
  const [selectedTable, setSelectedTable] = useState<'area' | 'eta' | 'tbp' | 'productivity'>('productivity');

  useEffect(() => {
    if (!project?.isCalculated) {
      toast.error('Please calculate indicators first');
      navigate('/dashboard');
      return;
    }
    
    async function loadData() {
      try {
        setIsLoading(true);
        
        // Call Python API instead of TypeScript calculation
        const formData = new FormData();
        
        // Try to fetch default CSV file
        const response = await fetch('/data/stats_IndiaSchemes_perCrop_Ong.csv');
        if (response.ok) {
          const blob = await response.blob();
          formData.append('file', blob, 'stats_IndiaSchemes_perCrop_Ong.csv');
        }
        
        const apiResponse = await fetch(`${PYTHON_API_URL}/api/productivity`, {
          method: 'POST',
          body: formData,
        });
        
        if (!apiResponse.ok) {
          throw new Error('Failed to calculate productivity from Python backend');
        }
        
        const data = await apiResponse.json();
        setProductivityData(data);
        toast.success('Productivity calculated successfully using Python backend');
      } catch (err) {
        console.error('Error loading productivity data:', err);
        setError('Failed to load productivity data from Python backend. Make sure Python server is running.');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [project, navigate, uploadedFiles]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-lg">Loading productivity data...</span>
      </div>
    );
  }

  if (error || !productivityData) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive text-lg">{error || 'No data available'}</p>
        <Button onClick={() => navigate('/dashboard')} className="mt-4">
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const seasonTables = productivityData.seasonTables[selectedSeason as keyof typeof productivityData.seasonTables];

  const handleDownloadSummary = () => {
    const data = productivityData.summary.map(row => ({
      Year: row.year,
      'Kharif (kg/m³)': row.kharif?.toFixed(2) ?? 'N/A',
      'Rabi (kg/m³)': row.rabi?.toFixed(2) ?? 'N/A',
      'Zaid (kg/m³)': row.zaid?.toFixed(2) ?? 'N/A',
      'Annual (kg/m³)': row.annual?.toFixed(2) ?? 'N/A',
    }));
    data.push({
      Year: 'AVERAGE' as any,
      'Kharif (kg/m³)': productivityData.average.kharif?.toFixed(2) ?? 'N/A',
      'Rabi (kg/m³)': productivityData.average.rabi?.toFixed(2) ?? 'N/A',
      'Zaid (kg/m³)': productivityData.average.zaid?.toFixed(2) ?? 'N/A',
      'Annual (kg/m³)': productivityData.average.annual?.toFixed(2) ?? 'N/A',
    });
    exportToCSV(data, `productivity_summary_${formatDateForFilename()}`);
    toast.success('Summary exported');
  };

  const handleDownloadSeasonTable = () => {
    if (!seasonTables) return;
    
    const tableData = seasonTables[selectedTable];
    const allKeys = [...seasonTables.years.map(String), 'Average'];
    const crops = [...seasonTables.crops, 'Average'];
    
    const data = allKeys.map(year => {
      const row: Record<string, any> = { Year: year };
      crops.forEach(crop => {
        const val = tableData[year]?.[crop];
        row[crop] = val !== undefined && !isNaN(val) ? val : 'N/A';
      });
      return row;
    });

    const tableName = selectedTable.charAt(0).toUpperCase() + selectedTable.slice(1);
    exportToCSV(data, `productivity_${selectedSeason}_${tableName}_${formatDateForFilename()}`);
    toast.success(`${tableName} table exported`);
  };

  const renderTable = (tables: SeasonTables, tableKey: 'area' | 'eta' | 'tbp' | 'productivity') => {
    const tableData = tables[tableKey];
    const allKeys = [...tables.years.map(String), 'Average'];
    const crops = [...tables.crops, 'Average'];

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold bg-muted">Year</TableHead>
              {crops.map(crop => (
                <TableHead key={crop} className="font-bold bg-muted text-center">
                  {crop}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {allKeys.map((year, idx) => (
              <TableRow key={year} className={year === 'Average' ? 'bg-accent/20 font-semibold' : ''}>
                <TableCell className="font-medium">{year}</TableCell>
                {crops.map(crop => {
                  const val = tableData[year]?.[crop];
                  const display = val !== undefined && !isNaN(val) ? val : '-';
                  return (
                    <TableCell key={crop} className="text-center">
                      {display}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Table */}
      <div className="edipa-panel animate-scale-in">
        <div className="edipa-header flex justify-between items-center">
          <span>PRODUCTIVITY - WEIGHTED AVERAGE BY SEASON</span>
          <Button size="sm" variant="ghost" onClick={handleDownloadSummary} className="text-primary-foreground hover:bg-primary/80">
            <Download className="w-4 h-4 mr-1" /> Download
          </Button>
        </div>
        
        <div className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold bg-muted">Year</TableHead>
                  <TableHead className="font-bold bg-muted text-center">Kharif (kg/m³)</TableHead>
                  <TableHead className="font-bold bg-muted text-center">Rabi (kg/m³)</TableHead>
                  <TableHead className="font-bold bg-muted text-center">Zaid (kg/m³)</TableHead>
                  <TableHead className="font-bold bg-muted text-center">Annual (kg/m³)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productivityData.summary.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.year}</TableCell>
                    <TableCell className="text-center">{row.kharif?.toFixed(2) ?? '-'}</TableCell>
                    <TableCell className="text-center">{row.rabi?.toFixed(2) ?? '-'}</TableCell>
                    <TableCell className="text-center">{row.zaid?.toFixed(2) ?? '-'}</TableCell>
                    <TableCell className="text-center">{row.annual?.toFixed(2) ?? '-'}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-accent/20 font-semibold">
                  <TableCell>AVERAGE</TableCell>
                  <TableCell className="text-center">{productivityData.average.kharif?.toFixed(2) ?? '-'}</TableCell>
                  <TableCell className="text-center">{productivityData.average.rabi?.toFixed(2) ?? '-'}</TableCell>
                  <TableCell className="text-center">{productivityData.average.zaid?.toFixed(2) ?? '-'}</TableCell>
                  <TableCell className="text-center">{productivityData.average.annual?.toFixed(2) ?? '-'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Season Detailed Tables */}
      <div className="edipa-panel animate-scale-in" style={{ animationDelay: '0.1s' }}>
        <div className="edipa-header flex justify-between items-center">
          <span>DETAILED TABLES BY SEASON</span>
          <Button size="sm" variant="ghost" onClick={handleDownloadSeasonTable} className="text-primary-foreground hover:bg-primary/80">
            <Download className="w-4 h-4 mr-1" /> Download
          </Button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Season:</span>
              <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTIVITY_SEASON_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-semibold">Table:</span>
              <Select value={selectedTable} onValueChange={(v) => setSelectedTable(v as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="area">Area (ha)</SelectItem>
                  <SelectItem value="eta">ETa (mm)</SelectItem>
                  <SelectItem value="tbp">TBP</SelectItem>
                  <SelectItem value="productivity">Productivity (kg/m³)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {seasonTables ? (
            renderTable(seasonTables, selectedTable)
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No data available for {selectedSeason} season
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-end animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <Button onClick={() => navigate('/dashboard')} className="edipa-btn-primary">
          <Home className="w-4 h-4 mr-2" />
          HOME
        </Button>
      </div>
    </div>
  );
}
