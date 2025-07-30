import React, { useState, useRef, useEffect } from 'react';
import { BarChart, ArrowLeft } from 'lucide-react';
import { UploadedFile, MeasurementRecord } from '../types/FileData';
import { TimeSeriesAnalyzer } from './TimeSeriesAnalyzer';
import { ReportGenerator } from '../utils/reportGenerator';
import { useAuth } from '../contexts/AuthContext';

interface DataVisualizationProps {
  files: UploadedFile[];
  onBack?: () => void;
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({ files, onBack }) => {
  // Сразу показываем анализатор временных рядов
  return <TimeSeriesAnalyzer files={files} onBack={onBack} />;
};