import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ProjectMetadata, ProjectThresholds, IndicatorResult, ProjectData } from '@/types/project';
import { INDICATORS, DEFAULT_CROPS } from '@/config/indicators';
import { calculateAllIndicators } from '@/lib/calculations';

interface ProjectContextType {
  project: ProjectData | null;
  setProjectMetadata: (metadata: ProjectMetadata) => void;
  setThresholds: (thresholds: ProjectThresholds) => void;
  calculateIndicators: () => void;
  getIndicatorResults: (indicatorId: string, crop?: string) => IndicatorResult[];
  isCalculating: boolean;
  uploadedFiles: File[];
  setUploadedFiles: (files: File[]) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Initialize default thresholds
function getDefaultThresholds(): ProjectThresholds {
  return {
    indicators: INDICATORS.map(ind => ({
      indicatorId: ind.id,
      criticalValue: ind.defaultCriticalValue,
      targetValue: ind.defaultTargetValue,
    })),
    crops: DEFAULT_CROPS.map(crop => ({
      cropId: crop.id,
      cropName: crop.name,
      criticalValue: crop.criticalValue,
      targetValue: crop.targetValue,
    })),
  };
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const setProjectMetadata = useCallback((metadata: ProjectMetadata) => {
    setProject(prev => ({
      metadata,
      thresholds: prev?.thresholds || getDefaultThresholds(),
      results: [],
      isCalculated: false,
    }));
  }, []);

  const setThresholds = useCallback((thresholds: ProjectThresholds) => {
    setProject(prev => {
      if (!prev) return null;
      // NOTE: Thresholds are ONLY used for scoring in the Summary Table
      // They do NOT affect indicator calculations (which use Python backend + CSV data)
      return {
        ...prev,
        thresholds,
        // DO NOT reset isCalculated - thresholds don't affect calculations
      };
    });
  }, []);

  const calculateIndicators = useCallback(() => {
    if (!project?.metadata) return;

    setIsCalculating(true);
    
    // NOTE: Indicator calculations are performed by Python backend using CSV data files
    // Thresholds are NOT used here - they only affect scoring in Summary Table
    // Simulate async calculation
    setTimeout(() => {
      const results = calculateAllIndicators(
        project.metadata.startYear,
        project.metadata.endYear,
        project.metadata.cca,
        project.thresholds  // Used only for scoring, not for calculations
      );

      setProject(prev => {
        if (!prev) return null;
        return {
          ...prev,
          results,
          isCalculated: true,
        };
      });
      setIsCalculating(false);
    }, 1500);
  }, [project?.metadata, project?.thresholds]);

  const getIndicatorResults = useCallback((indicatorId: string, crop?: string): IndicatorResult[] => {
    if (!project?.results) return [];
    
    return project.results.filter(r => {
      if (r.indicatorId !== indicatorId) return false;
      if (crop && r.crop !== crop) return false;
      return true;
    });
  }, [project?.results]);

  return (
    <ProjectContext.Provider
      value={{
        project,
        setProjectMetadata,
        setThresholds,
        calculateIndicators,
        getIndicatorResults,
        isCalculating,
        uploadedFiles,
        setUploadedFiles,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
