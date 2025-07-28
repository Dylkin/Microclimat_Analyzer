import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { supabase } from '../lib/supabase';
import { DataFile, TestReport, VerticalLine, TEST_TYPES, TestType, ResultsTableRow } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Save, FileText, Calendar, Upload as UploadIcon, AlertCircle, Plus } from 'lucide-react';

export default function AnalysisPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<DataFile[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verticalLines, setVerticalLines] = useState<VerticalLine[]>([]);
  const [resultsTable, setResultsTable] = useState<ResultsTableRow[]>([]);

  const [reportData, setReportData] = useState({
    report_number: '',
    report_date: '',
    template_file: null as File | null,
    object_name: '',
    climate_system_name: '',
    test_type: TEST_TYPES[0] as TestType,
    temp_min_limit: '',
    temp_max_limit: '',
    humidity_min_limit: '',
    humidity_max_limit: '',
    conclusions: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch files
      const { data: filesData, error: filesError } = await supabase
        .from('data_files')
        .select('*')
        .order('order_index', { ascending: true });

      if (filesError) throw filesError;
      setFiles(filesData || []);

      // Generate mock chart data for demonstration
      const mockData = [];
      const now = new Date();
      for (let i = 0; i < 100; i++) {
        const timestamp = new Date(now.getTime() - (100 - i) * 60000);
        mockData.push({
          timestamp: timestamp.toISOString(),
          time: timestamp.toLocaleTimeString('ru-RU'),
          temperature: 20 + Math.sin(i / 10) * 5 + Math.random() * 2,
          humidity: 50 + Math.cos(i / 8) * 10 + Math.random() * 3
        });
      }
      setChartData(mockData);

      // Generate results table
      generateResultsTable(filesData || []);
    } catch (err: any) {
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const generateResultsTable = (filesList: DataFile[]) => {
    const results: ResultsTableRow[] = filesList.map(file => {
      const loggerName = file.original_filename.substring(0, 6);
      const serialNumber = file.original_filename.substring(7, 15);
      
      // Mock statistics
      const tempMin = 18 + Math.random() * 2;
      const tempMax = 25 + Math.random() * 3;
      const tempAvg = (tempMin + tempMax) / 2;
      
      const humMin = 45 + Math.random() * 5;
      const humMax = 65 + Math.random() * 10;
      const humAvg = (humMin + humMax) / 2;

      const tempMinLimit = reportData.temp_min_limit ? parseFloat(reportData.temp_min_limit) : null;
      const tempMaxLimit = reportData.temp_max_limit ? parseFloat(reportData.temp_max_limit) : null;
      const humMinLimit = reportData.humidity_min_limit ? parseFloat(reportData.humidity_min_limit) : null;
      const humMaxLimit = reportData.humidity_max_limit ? parseFloat(reportData.humidity_max_limit) : null;

      const tempCompliant = (tempMinLimit === null || tempMin >= tempMinLimit) && 
                           (tempMaxLimit === null || tempMax <= tempMaxLimit);
      const humCompliant = (humMinLimit === null || humMin >= humMinLimit) && 
                          (humMaxLimit === null || humMax <= humMaxLimit);

      return {
        zone: file.zone_number || 1,
        level: file.measurement_level || '',
        logger_name: loggerName,
        serial_number: serialNumber,
        temperature: {
          min: tempMin,
          max: tempMax,
          average: tempAvg,
          compliant: tempMinLimit !== null || tempMaxLimit !== null ? tempCompliant : null
        },
        humidity: {
          min: humMin,
          max: humMax,
          average: humAvg,
          compliant: humMinLimit !== null || humMaxLimit !== null ? humCompliant : null
        }
      };
    });

    setResultsTable(results);
  };

  const handleChartDoubleClick = (event: any) => {
    if (event && event.activeLabel) {
      const newLine: VerticalLine = {
        id: Date.now().toString(),
        x: event.activeLabel,
        timestamp: event.activeLabel,
        comment: '',
        color: '#ef4444'
      };
      setVerticalLines([...verticalLines, newLine]);
    }
  };

  const updateLineComment = (lineId: string, comment: string) => {
    setVerticalLines(lines => 
      lines.map(line => 
        line.id === lineId ? { ...line, comment } : line
      )
    );
  };

  const removeVerticalLine = (lineId: string) => {
    setVerticalLines(lines => lines.filter(line => line.id !== lineId));
  };

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.docx')) {
      setReportData({ ...reportData, template_file: file });
    } else {
      setError('Пожалуйста, выберите файл в формате .docx');
    }
  };

  const generatePDFReport = async () => {
    if (!reportData.report_number || !reportData.report_date || !reportData.object_name || !reportData.template_file) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }

    try {
      // Here would be the PDF generation logic
      // For now, we'll just show a success message
      alert('PDF отчет будет сгенерирован (функция в разработке)');
    } catch (err: any) {
      setError('Ошибка генерации отчета');
    }
  };

  const isFormValid = reportData.report_number && reportData.report_date && 
                     reportData.object_name && reportData.template_file;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Загрузка данных для исследования...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Research Information */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Информация для исследования</h2>
        </div>
        
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-3 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              № отчета *
            </label>
            <input
              type="text"
              value={reportData.report_number}
              onChange={(e) => setReportData({ ...reportData, report_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дата отчета *
            </label>
            <input
              type="date"
              value={reportData.report_date}
              onChange={(e) => setReportData({ ...reportData, report_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Шаблон выходной формы отчета *
            </label>
            <label className="flex items-center space-x-2 border border-gray-300 rounded-md px-3 py-2 cursor-pointer hover:bg-gray-50">
              <UploadIcon className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {reportData.template_file ? reportData.template_file.name : 'Выберите файл .docx'}
              </span>
              <input
                type="file"
                accept=".docx"
                onChange={handleTemplateUpload}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название объекта исследования *
            </label>
            <input
              type="text"
              value={reportData.object_name}
              onChange={(e) => setReportData({ ...reportData, object_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название климатической установки
            </label>
            <input
              type="text"
              value={reportData.climate_system_name}
              onChange={(e) => setReportData({ ...reportData, climate_system_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Research Mode */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Исследовательский режим</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Limits and Test Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Температура мин. (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={reportData.temp_min_limit}
                onChange={(e) => setReportData({ ...reportData, temp_min_limit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Температура макс. (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={reportData.temp_max_limit}
                onChange={(e) => setReportData({ ...reportData, temp_max_limit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Выбор вида испытаний
              </label>
              <select
                value={reportData.test_type}
                onChange={(e) => setReportData({ ...reportData, test_type: e.target.value as TestType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TEST_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Charts */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">График температуры</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} onDoubleClick={handleChartDoubleClick}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Температура (°C)"
                    />
                    {reportData.temp_min_limit && (
                      <ReferenceLine 
                        y={parseFloat(reportData.temp_min_limit)} 
                        stroke="#ef4444" 
                        strokeDasharray="5 5" 
                        label="Мин. лимит"
                      />
                    )}
                    {reportData.temp_max_limit && (
                      <ReferenceLine 
                        y={parseFloat(reportData.temp_max_limit)} 
                        stroke="#ef4444" 
                        strokeDasharray="5 5" 
                        label="Макс. лимит"
                      />
                    )}
                    {verticalLines.map(line => (
                      <ReferenceLine 
                        key={line.id}
                        x={line.x} 
                        stroke={line.color} 
                        strokeDasharray="2 2"
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">График влажности</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="humidity" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Влажность (%)"
                    />
                    {reportData.humidity_min_limit && (
                      <ReferenceLine 
                        y={parseFloat(reportData.humidity_min_limit)} 
                        stroke="#ef4444" 
                        strokeDasharray="5 5" 
                        label="Мин. лимит"
                      />
                    )}
                    {reportData.humidity_max_limit && (
                      <ReferenceLine 
                        y={parseFloat(reportData.humidity_max_limit)} 
                        stroke="#ef4444" 
                        strokeDasharray="5 5" 
                        label="Макс. лимит"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Vertical Lines Management */}
          {verticalLines.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Вертикальные линии и комментарии</h3>
              <div className="space-y-3">
                {verticalLines.map(line => (
                  <div key={line.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                    <span className="text-sm font-medium text-gray-700">
                      {new Date(line.timestamp).toLocaleString('ru-RU')}
                    </span>
                    <input
                      type="text"
                      value={line.comment}
                      onChange={(e) => updateLineComment(line.id, e.target.value)}
                      placeholder="Добавить комментарий..."
                      className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removeVerticalLine(line.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results Table */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Таблица результатов</h3>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 border border-gray-300 text-left text-sm font-medium text-gray-700">
                      Зона измерения
                    </th>
                    <th className="px-4 py-2 border border-gray-300 text-left text-sm font-medium text-gray-700">
                      Уровень установки
                    </th>
                    <th className="px-4 py-2 border border-gray-300 text-left text-sm font-medium text-gray-700">
                      Наименование логгера
                    </th>
                    <th className="px-4 py-2 border border-gray-300 text-left text-sm font-medium text-gray-700">
                      Серийный № логгера
                    </th>
                    <th className="px-4 py-2 border border-gray-300 text-center text-sm font-medium text-gray-700" colSpan={3}>
                      Зафиксированные показания t °C
                    </th>
                    <th className="px-4 py-2 border border-gray-300 text-left text-sm font-medium text-gray-700">
                      Соответствует заданным критериям
                    </th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 border border-gray-300"></th>
                    <th className="px-4 py-2 border border-gray-300"></th>
                    <th className="px-4 py-2 border border-gray-300"></th>
                    <th className="px-4 py-2 border border-gray-300"></th>
                    <th className="px-4 py-2 border border-gray-300 text-center text-sm font-medium text-gray-700">
                      Мин.
                    </th>
                    <th className="px-4 py-2 border border-gray-300 text-center text-sm font-medium text-gray-700">
                      Макс.
                    </th>
                    <th className="px-4 py-2 border border-gray-300 text-center text-sm font-medium text-gray-700">
                      Среднее
                    </th>
                    <th className="px-4 py-2 border border-gray-300"></th>
                  </tr>
                </thead>
                <tbody>
                  {resultsTable.map((row, index) => {
                    const isMinTemp = resultsTable.every(r => r.temperature.min >= row.temperature.min);
                    const isMaxTemp = resultsTable.every(r => r.temperature.max <= row.temperature.max);
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border border-gray-300 text-sm">
                          {row.zone}
                        </td>
                        <td className="px-4 py-2 border border-gray-300 text-sm">
                          {row.level}
                        </td>
                        <td className="px-4 py-2 border border-gray-300 text-sm">
                          {row.logger_name}
                        </td>
                        <td className="px-4 py-2 border border-gray-300 text-sm">
                          {row.serial_number}
                        </td>
                        <td className={`px-4 py-2 border border-gray-300 text-sm text-center ${
                          isMinTemp ? 'bg-blue-100' : ''
                        }`}>
                          {row.temperature.min.toFixed(1)}
                        </td>
                        <td className={`px-4 py-2 border border-gray-300 text-sm text-center ${
                          isMaxTemp ? 'bg-red-100' : ''
                        }`}>
                          {row.temperature.max.toFixed(1)}
                        </td>
                        <td className="px-4 py-2 border border-gray-300 text-sm text-center">
                          {row.temperature.average.toFixed(1)}
                        </td>
                        <td className="px-4 py-2 border border-gray-300 text-sm text-center">
                          {row.temperature.compliant === null ? '-' : 
                           row.temperature.compliant ? 'Да' : 'Нет'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Conclusions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Выводы
            </label>
            <textarea
              value={reportData.conclusions}
              onChange={(e) => setReportData({ ...reportData, conclusions: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите выводы по результатам исследования..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={generatePDFReport}
              disabled={!isFormValid}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Отчет по испытанию</span>
            </button>
            
            <button
              disabled={!isFormValid}
              className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Завершить исследования</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}