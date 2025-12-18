import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, BarChart3, Table, Loader2, Settings, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProject } from '@/context/ProjectContext';
import { INDICATORS } from '@/config/indicators';
import { toast } from 'sonner';

const indicatorIcons: Record<string, string> = {
  cropping_intensity: '🌾',
  irrigation_utilization: '💧',
  low_water_intensive_crops: '🌱',
  adequacy: '✅',
  equity: '⚖️',
  productivity: '📈',
  reliability: '🔄',
  yield_gap: '📉',
};

export function Dashboard() {
  const navigate = useNavigate();
  const { project, calculateIndicators, isCalculating, setProjectMetadata } = useProject();
  const [isEditing, setIsEditing] = useState(false);
  const [editedCCA, setEditedCCA] = useState('');
  const [editedArea, setEditedArea] = useState('');

  useEffect(() => {
    if (!project) {
      toast.error('Please create a project first');
      navigate('/');
    } else {
      // Initialize edit values
      setEditedCCA(project.metadata.cca.toString());
      setEditedArea(project.metadata.geographicArea || '');
    }
  }, [project, navigate]);

  const handleCalculate = () => {
    if (isEditing) {
      toast.error('Please save or cancel your changes first');
      return;
    }
    calculateIndicators();
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1500)),
      {
        loading: 'Calculating all indicators...',
        success: 'All indicators calculated successfully!',
        error: 'Calculation failed',
      }
    );
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const cca = parseFloat(editedCCA);
    const area = editedArea.trim();

    if (isNaN(cca) || cca <= 0) {
      toast.error('Please enter a valid CCA value');
      return;
    }

    // Update project metadata
    setProjectMetadata({
      ...project!.metadata,
      cca: cca,
      geographicArea: area,
    });

    setIsEditing(false);
    toast.success('Project details updated successfully');
  };

  const handleCancelEdit = () => {
    // Reset to original values
    setEditedCCA(project!.metadata.cca.toString());
    setEditedArea(project!.metadata.geographicArea || '');
    setIsEditing(false);
  };

  const handleIndicatorClick = (indicatorId: string) => {
    if (!project?.isCalculated) {
      toast.error('Please calculate indicators first');
      return;
    }
    navigate(`/indicator/${indicatorId}`);
  };

  if (!project) return null;

  return (
    <div className="space-y-8">
      {/* Project Info */}
      <div className="edipa-panel animate-fade-in">
        <div className="edipa-section-header flex items-center justify-between">
          <span>PROJECT: {project.metadata.projectName}</span>
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              className="text-xs"
            >
              <Edit2 className="w-3 h-3 mr-1" />
              EDIT
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveEdit}
                className="text-xs bg-green-500 hover:bg-green-600 text-white"
              >
                <Check className="w-3 h-3 mr-1" />
                SAVE
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                className="text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                CANCEL
              </Button>
            </div>
          )}
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Area:</span>{' '}
            {isEditing ? (
              <Input
                type="text"
                value={editedArea}
                onChange={(e) => setEditedArea(e.target.value)}
                className="mt-1 h-8 text-sm"
                placeholder="Geographic area"
              />
            ) : (
              <span className="font-medium">{project.metadata.geographicArea || 'Not specified'}</span>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">CCA:</span>{' '}
            {isEditing ? (
              <Input
                type="number"
                value={editedCCA}
                onChange={(e) => setEditedCCA(e.target.value)}
                className="mt-1 h-8 text-sm"
                placeholder="CCA in ha"
              />
            ) : (
              <span className="font-medium">{project.metadata.cca.toLocaleString()} ha</span>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Period:</span>{' '}
            <span className="font-medium">{project.metadata.startYear} - {project.metadata.endYear}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>{' '}
            <span className={`font-medium ${project.isCalculated ? 'text-success' : 'text-warning'}`}>
              {project.isCalculated ? 'Calculated' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Calculate Button */}
      <div className="flex justify-center animate-slide-up">
        <Button
          onClick={handleCalculate}
          disabled={isCalculating}
          className="edipa-btn-action text-xl px-12 py-6 h-auto shadow-xl hover:shadow-2xl"
        >
          {isCalculating ? (
            <>
              <Loader2 className="w-6 h-6 mr-3 animate-spin" />
              CALCULATING...
            </>
          ) : (
            <>
              <Calculator className="w-6 h-6 mr-3" />
              CALCULATE ALL INDICATORS
            </>
          )}
        </Button>
      </div>

      {/* Indicator Cards */}
      <div className="edipa-panel animate-scale-in" style={{ animationDelay: '0.1s' }}>
        <div className="edipa-section-header">
          INDICATOR WISE RESULTS
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {INDICATORS.map((indicator, index) => (
              <button
                key={indicator.id}
                onClick={() => handleIndicatorClick(indicator.id)}
                className="edipa-indicator-card animate-fade-in"
                style={{ animationDelay: `${0.15 + index * 0.05}s` }}
                disabled={!project.isCalculated}
              >
                <div className="text-2xl mb-2">{indicatorIcons[indicator.id]}</div>
                <div className="text-sm leading-tight">
                  {indicator.displayName.toUpperCase()}
                </div>
                {!project.isCalculated && (
                  <div className="text-xs opacity-70 mt-1">Click Calculate first</div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary and Visualization Buttons */}
      <div className="flex flex-col gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <Button
          onClick={() => project.isCalculated ? navigate('/thresholds') : toast.error('Please calculate indicators first')}
          className="edipa-btn-primary h-16 text-lg w-full"
          disabled={!project.isCalculated}
        >
          <Settings className="w-6 h-6 mr-3" />
          SET THRESHOLDS
        </Button>
        
        <Button
          onClick={() => project.isCalculated ? navigate('/summary') : toast.error('Please calculate indicators first')}
          className="edipa-btn-primary h-16 text-lg w-full"
          disabled={!project.isCalculated}
        >
          <Table className="w-6 h-6 mr-3" />
          SUMMARY TABLE
        </Button>
        
        <Button
          onClick={() => project.isCalculated ? navigate('/visualization') : toast.error('Please calculate indicators first')}
          className="edipa-btn-primary h-16 text-lg w-full"
          disabled={!project.isCalculated}
        >
          <BarChart3 className="w-6 h-6 mr-3" />
          VIZUALIZATION
        </Button>
      </div>
    </div>
  );
}
