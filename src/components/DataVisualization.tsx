import React from 'react';
import { UploadedFile, MeasurementRecord } from '../types/FileData';
import { TimeSeriesAnalyzer } from './TimeSeriesAnalyzer';

interface DataVisualizationProps {
  files: UploadedFile[];
  onBack?: () => void;
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({ files, onBack }) => {
  // Сразу показываем анализатор временных рядов
  return <TimeSeriesAnalyzer files={files} onBack={onBack} />;
};