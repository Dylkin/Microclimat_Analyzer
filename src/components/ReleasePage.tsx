import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface ReleaseInfo {
  commitHash: string;
  commitDate: string;
  buildDate: string;
  changes: string;
}

export const ReleasePage: React.FC = () => {
  const [releases, setReleases] = useState<ReleaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReleaseInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ReleaseInfo[]>('/release/info');
      setReleases(data);
    } catch (e: any) {
      console.error('Ошибка загрузки информации о релизах:', e);
      setError(e?.message || 'Ошибка загрузки информации о релизах');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReleaseInfo();
  }, []);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
        <button
          onClick={loadReleaseInfo}
          className="inline-flex items-center px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">История релизов</h1>
          <p className="text-sm text-gray-500 mt-1">
            Последние 5 релизов системы
          </p>
        </div>
        <button
          onClick={loadReleaseInfo}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Обновить
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата время коммита
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата время сборки
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Коммит
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Изменения
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {releases.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    Нет данных о релизах
                  </td>
                </tr>
              ) : (
                releases.map((release, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(release.commitDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(release.buildDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        {release.commitHash}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {release.changes}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

