import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProject } from '@/context/ProjectContext';
import { INDICATORS, DEFAULT_CROPS, getGeneralIndicators } from '@/config/indicators';
import { toast } from 'sonner';

export function ThresholdsForm() {
  const navigate = useNavigate();
  const { project, setThresholds } = useProject();
  
  const [indicatorThresholds, setIndicatorThresholds] = useState(
    INDICATORS.filter(ind => ind.id !== 'productivity').map(ind => ({
      indicatorId: ind.id,
      displayName: ind.displayName,
      criticalValue: project?.thresholds.indicators.find(t => t.indicatorId === ind.id)?.criticalValue ?? ind.defaultCriticalValue,
      targetValue: project?.thresholds.indicators.find(t => t.indicatorId === ind.id)?.targetValue ?? ind.defaultTargetValue,
    }))
  );

  const [cropThresholds, setCropThresholds] = useState(
    DEFAULT_CROPS.map(crop => ({
      cropId: crop.id,
      cropName: crop.name,
      criticalValue: project?.thresholds.crops.find(c => c.cropId === crop.id)?.criticalValue ?? crop.criticalValue,
      targetValue: project?.thresholds.crops.find(c => c.cropId === crop.id)?.targetValue ?? crop.targetValue,
    }))
  );

  const [selectedCrop, setSelectedCrop] = useState(DEFAULT_CROPS[0].id);

  useEffect(() => {
    if (!project) {
      toast.error('Please create a project first');
      navigate('/');
    }
  }, [project, navigate]);

  const handleIndicatorChange = (indicatorId: string, field: 'criticalValue' | 'targetValue', value: string) => {
    setIndicatorThresholds(prev => 
      prev.map(t => 
        t.indicatorId === indicatorId 
          ? { ...t, [field]: parseFloat(value) || 0 }
          : t
      )
    );
  };

  const handleCropChange = (cropId: string, field: 'criticalValue' | 'targetValue', value: string) => {
    setCropThresholds(prev => 
      prev.map(c => 
        c.cropId === cropId 
          ? { ...c, [field]: parseFloat(value) || 0 }
          : c
      )
    );
  };

  const handleSubmit = () => {
    setThresholds({
      indicators: indicatorThresholds.map(t => ({
        indicatorId: t.indicatorId,
        criticalValue: t.criticalValue,
        targetValue: t.targetValue,
      })),
      crops: cropThresholds,
    });

    toast.success('Thresholds saved successfully for summary scoring');
    navigate('/summary');
  };

  const selectedCropData = cropThresholds.find(c => c.cropId === selectedCrop);

  if (!project) return null;

  return (
    <div className="space-y-6">
      {/* Important Notice */}
      <div className="edipa-panel animate-scale-in bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="text-2xl">ℹ️</div>
            <div>
              <h3 className="font-bold text-lg mb-2">About Threshold Values</h3>
              <p className="text-sm leading-relaxed">
                Threshold values (Critical and Target) are <strong>only used for calculating scores in the Summary Table</strong>. 
                They do NOT affect the indicator calculations themselves, which are based solely on the CSV data files 
                processed by the Python backend.
              </p>
              <p className="text-sm leading-relaxed mt-2">
                <strong>Critical Value:</strong> Minimum acceptable performance level<br/>
                <strong>Target Value:</strong> Desired optimal performance level
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="edipa-panel animate-scale-in">
        <div className="edipa-header">
          INDICATOR Threshold for Score Calculations
        </div>
        
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="edipa-table">
              <thead>
                <tr>
                  <th className="w-2/5">Indicator</th>
                  <th className="w-1/5">Critical Value</th>
                  <th className="w-1/5">Target Value</th>
                </tr>
              </thead>
              <tbody>
                {indicatorThresholds.map((threshold, index) => (
                  <tr key={threshold.indicatorId} className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                    <td className="font-medium">{threshold.displayName}</td>
                    <td>
                      <Input
                        type="number"
                        step="0.01"
                        value={threshold.criticalValue}
                        onChange={(e) => handleIndicatorChange(threshold.indicatorId, 'criticalValue', e.target.value)}
                        className="edipa-input w-24"
                      />
                    </td>
                    <td>
                      <Input
                        type="number"
                        step="0.01"
                        value={threshold.targetValue}
                        onChange={(e) => handleIndicatorChange(threshold.indicatorId, 'targetValue', e.target.value)}
                        className="edipa-input w-24"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="edipa-panel animate-scale-in" style={{ animationDelay: '0.15s' }}>
        <div className="edipa-header">
          Productivity Thresholds (Crop-Specific)
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <span className="font-semibold">Crop Type:</span>
            <Select value={selectedCrop} onValueChange={setSelectedCrop}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cropThresholds.map(crop => (
                  <SelectItem key={crop.cropId} value={crop.cropId}>
                    {crop.cropName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCropData && (
            <div className="grid grid-cols-2 gap-6 max-w-md animate-fade-in">
              <div>
                <label className="edipa-label">Critical Value (kg/m³)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={selectedCropData.criticalValue}
                  onChange={(e) => handleCropChange(selectedCrop, 'criticalValue', e.target.value)}
                  className="edipa-input"
                />
              </div>
              <div>
                <label className="edipa-label">Target Value (kg/m³)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={selectedCropData.targetValue}
                  onChange={(e) => handleCropChange(selectedCrop, 'targetValue', e.target.value)}
                  className="edipa-input"
                />
              </div>
            </div>
          )}

          <div className="mt-4">
            <h4 className="font-semibold mb-3">All Crop Thresholds</h4>
            <div className="overflow-x-auto">
              <table className="edipa-table">
                <thead>
                  <tr>
                    <th>Crop</th>
                    <th>Critical Value</th>
                    <th>Target Value</th>
                  </tr>
                </thead>
                <tbody>
                  {cropThresholds.map(crop => (
                    <tr key={crop.cropId}>
                      <td className="font-medium">{crop.cropName}</td>
                      <td>{crop.criticalValue.toFixed(2)}</td>
                      <td>{crop.targetValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between animate-fade-in" style={{ animationDelay: '0.25s' }}>
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard')}
          className="text-lg px-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          BACK TO DASHBOARD
        </Button>
        <Button 
          onClick={handleSubmit}
          className="edipa-btn-action text-lg px-8"
        >
          SAVE & VIEW SUMMARY
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
