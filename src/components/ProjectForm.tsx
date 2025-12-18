import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProject } from '@/context/ProjectContext';
import { toast } from 'sonner';

export function ProjectForm() {
  const navigate = useNavigate();
  const { setProjectMetadata, setUploadedFiles, uploadedFiles } = useProject();
  
  const [formData, setFormData] = useState({
    projectName: '',
    geographicArea: '',
    cca: '',
    startYear: '2018',
    endYear: '2022',
  });

  const [perSeasonFile, setPerSeasonFile] = useState<File | null>(null);
  const [perCropFile, setPerCropFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Identify files by name pattern
      Array.from(files).forEach(file => {
        const fileName = file.name.toLowerCase();
        if (fileName.includes('season')) {
          setPerSeasonFile(file);
          toast.success(`Per-Season file selected: ${file.name}`);
        } else if (fileName.includes('crop')) {
          setPerCropFile(file);
          toast.success(`Per-Crop file selected: ${file.name}`);
        } else {
          // If name doesn't match pattern, try to assign based on order
          if (!perSeasonFile) {
            setPerSeasonFile(file);
            toast.success(`File assigned as Per-Season: ${file.name}`);
          } else if (!perCropFile) {
            setPerCropFile(file);
            toast.success(`File assigned as Per-Crop: ${file.name}`);
          }
        }
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.projectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }
    if (!formData.cca || parseFloat(formData.cca) <= 0) {
      toast.error('Please enter a valid CCA value');
      return;
    }
    if (!formData.startYear || !formData.endYear) {
      toast.error('Please enter start and end years');
      return;
    }
    if (parseInt(formData.startYear) > parseInt(formData.endYear)) {
      toast.error('Start year must be before end year');
      return;
    }

    // Store files in context
    const files: File[] = [];
    if (perSeasonFile) files.push(perSeasonFile);
    if (perCropFile) files.push(perCropFile);
    setUploadedFiles(files);

    setProjectMetadata({
      id: crypto.randomUUID(),
      projectName: formData.projectName.trim(),
      geographicArea: formData.geographicArea.trim(),
      cca: parseFloat(formData.cca),
      startYear: parseInt(formData.startYear),
      endYear: parseInt(formData.endYear),
      createdAt: new Date().toISOString(),
    });

    toast.success('Project created successfully');
    navigate('/dashboard');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="edipa-panel animate-scale-in">
        <div className="edipa-header">
          USER INPUT – PROJECT DETAILS
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="projectName" className="edipa-label">
                Name of Project
              </Label>
              <Input
                id="projectName"
                name="projectName"
                value={formData.projectName}
                onChange={handleChange}
                placeholder="Enter project name"
                className="edipa-input"
              />
            </div>
            
            <div>
              <Label htmlFor="geographicArea" className="edipa-label">
                Geographical Area
              </Label>
              <Input
                id="geographicArea"
                name="geographicArea"
                value={formData.geographicArea}
                onChange={handleChange}
                placeholder="Enter geographic area"
                className="edipa-input"
              />
            </div>
            
            <div>
              <Label htmlFor="cca" className="edipa-label">
                CCA (ha)
              </Label>
              <Input
                id="cca"
                name="cca"
                type="number"
                value={formData.cca}
                onChange={handleChange}
                placeholder="Culturable Command Area"
                className="edipa-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="startYear" className="edipa-label">
                Start Year
              </Label>
              <Input
                id="startYear"
                name="startYear"
                type="number"
                min="1900"
                max="2100"
                value={formData.startYear}
                onChange={handleChange}
                placeholder="e.g., 2018"
                className="edipa-input"
              />
            </div>
            
            <div>
              <Label htmlFor="endYear" className="edipa-label">
                End Year
              </Label>
              <Input
                id="endYear"
                name="endYear"
                type="number"
                min="1900"
                max="2100"
                value={formData.endYear}
                onChange={handleChange}
                placeholder="e.g., 2022"
                className="edipa-input"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="edipa-panel animate-scale-in" style={{ animationDelay: '0.1s' }}>
        <div className="edipa-section-header">
          SELECT INPUT FILES
        </div>
        
        <div className="p-6 space-y-4">
          {/* Single Browse Option for Multiple Files */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <Label className="edipa-label mb-2 block">
                  Select Data Files (CSV or Excel)
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">Per-Season File:</span>
                    <span>{perSeasonFile?.name || 'Not selected'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium">Per-Crop File:</span>
                    <span>{perCropFile?.name || 'Not selected'}</span>
                  </div>
                </div>
              </div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                />
                <Button type="button" variant="default" className="edipa-btn-primary" asChild>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    BROWSE FILES
                  </span>
                </Button>
              </label>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-2">
            Select CSV or Excel files containing irrigation project data. You can select multiple files at once.
            Files will be automatically identified by their names (should contain 'season' or 'crop').
            If no files are selected, sample data will be used for demonstration.
          </p>
        </div>
      </div>

      <div className="flex justify-end animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <Button type="submit" className="edipa-btn-action text-lg px-8">
          NEXT
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </form>
  );
}
