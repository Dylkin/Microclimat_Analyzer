import React, { useState, useRef, useEffect } from 'react';
import { BarChart, ArrowLeft, TrendingUp } from 'lucide-react';
import { UploadedFile, MeasurementRecord } from '../types/FileData';
import { TimeSeriesAnalyzer } from './TimeSeriesAnalyzer';
import { ReportGenerator } from '../utils/reportGenerator';
import { useAuth } from '../contexts/AuthContext';

interface DataVisualizationProps {
  files: UploadedFile[];
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({ files, onBack }) => {
  const [showTimeSeriesAnalyzer, setShowTimeSeriesAnalyzer] = useState(false);

  // Если показываем анализатор временных рядов
  if (showTimeSeriesAnalyzer) {
    return <TimeSeriesAnalyzer files={files} onBack={() => setShowTimeSeriesAnalyzer(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Визуализация данных</h1>
          <span className="text-sm text-gray-500">({files.filter(f => f.parsingStatus === 'completed').length} файлов)</span>
        </div>
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад к загрузке</span>
        </button>
      </div>

      {/* Быстрый доступ к анализатору временных рядов */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-indigo-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Анализатор временных рядов</h3>
              <p className="text-sm text-gray-600">Интерактивные графики с зумом, маркерами и лимитами</p>
            </div>
          </div>
          <button
            onClick={() => setShowTimeSeriesAnalyzer(true)}
            disabled={files.filter(f => f.parsingStatus === 'completed').length === 0}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <TrendingUp className="w-5 h-5" />
            <span>Открыть анализатор</span>
          </button>
        </div>
      </div>

    </div>
  );
};