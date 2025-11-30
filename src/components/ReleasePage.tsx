import React, { useEffect, useState } from 'react';
import { RefreshCw, Package, Calendar, GitBranch, CheckCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface ReleaseInfo {
  version: string;
  commitHash: string;
  commitDate: string;
  buildDate: string;
  changelog: string[];
}

export const ReleasePage: React.FC = () => {
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReleaseInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ReleaseInfo>('/release/info');
      setReleaseInfo(data);
    } catch (e: any) {
      console.error('Ошибка загрузки информации о релизе:', e);
      setError(e?.message || 'Ошибка загрузки информации о релизе');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReleaseInfo();
  }, []);

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

  if (!releaseInfo) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Информация о релизе</h1>
          <p className="text-sm text-gray-500 mt-1">
            Текущая версия системы и информация об обновлениях
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

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Версия */}
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Версия</h3>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{releaseInfo.version}</p>
          </div>
        </div>

        {/* Commit Hash */}
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <GitBranch className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Коммит</h3>
            <p className="text-sm text-gray-600 font-mono mt-1">{releaseInfo.commitHash}</p>
          </div>
        </div>

        {/* Даты */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">Дата коммита</h3>
              <p className="text-sm text-gray-600 mt-1">
                {new Date(releaseInfo.commitDate).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">Дата сборки</h3>
              <p className="text-sm text-gray-600 mt-1">
                {new Date(releaseInfo.buildDate).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Changelog */}
        {releaseInfo.changelog && releaseInfo.changelog.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Изменения в этом релизе</h3>
            <ul className="space-y-2">
              {releaseInfo.changelog.map((change, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-2 h-2 bg-indigo-600 rounded-full mt-2"></span>
                  <span className="text-sm text-gray-700">{change}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

