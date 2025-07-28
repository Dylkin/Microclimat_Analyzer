import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TestReport } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Download, Search, Calendar } from 'lucide-react';

export default function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<TestReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('test_reports')
        .select(`
          *,
          users!test_reports_user_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      setError('Ошибка загрузки отчетов');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report =>
    report.object_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.report_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.test_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = async (reportId: string, filename: string) => {
    try {
      // Here would be the actual download logic
      // For now, we'll just show an alert
      alert(`Скачивание файла: ${filename}`);
    } catch (err: any) {
      setError('Ошибка скачивания файла');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getSeasonFromDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    
    if (month >= 3 && month <= 5) return 'весна';
    if (month >= 6 && month <= 8) return 'лето';
    if (month >= 9 && month <= 11) return 'осень';
    return 'зима';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Загрузка отчетов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Результаты испытаний</h2>
            
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Поиск по отчетам..."
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-3 flex items-center space-x-2">
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата время
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  № отчета
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Объект исследования
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Вид испытания
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Файл
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Исполнитель
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => {
                const season = getSeasonFromDate(report.report_date);
                const year = new Date(report.report_date).getFullYear();
                const filename = `${report.object_name}_${season}_${year}.pdf`;
                
                return (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(report.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.report_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {report.object_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {report.test_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <button
                          onClick={() => handleDownload(report.id, filename)}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {filename}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {(report as any).users?.full_name || 'Неизвестно'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDownload(report.id, filename)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <Download className="w-4 h-4" />
                        <span>Скачать</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredReports.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Отчеты не найдены</p>
            {searchTerm && (
              <p className="text-sm">Попробуйте изменить критерии поиска</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}