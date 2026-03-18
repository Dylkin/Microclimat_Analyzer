import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { Project } from '../types/Project';

interface LoggerPlacementPlanEditorProps {
  project: Project;
  qualificationObjectId: string;
  qualificationObjectName?: string;
  planFileUrl: string;
  planFileName?: string;
  onBack: () => void;
}

export const LoggerPlacementPlanEditor: React.FC<LoggerPlacementPlanEditorProps> = ({
  project,
  qualificationObjectId,
  qualificationObjectName,
  planFileUrl,
  planFileName,
  onBack
}) => {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [isLocalhostBlocked, setIsLocalhostBlocked] = useState(false);

  useEffect(() => {
    try {
      const isAbsolute = /^https?:\/\//i.test(planFileUrl);
      const origin =
        typeof window !== 'undefined' && window.location && window.location.origin
          ? window.location.origin
          : '';
      const fullUrl = isAbsolute ? planFileUrl : `${origin}${planFileUrl}`;

      // Определяем, указывает ли URL на локальный dev-сервер (localhost / 127.0.0.1)
      const isLocalhostTarget = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(fullUrl);

      if (isLocalhostTarget) {
        setIsLocalhostBlocked(true);

        // #region agent log
        fetch('http://127.0.0.1:7653/ingest/766b4759-1f03-4cbe-8972-e019ff31ce62', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Session-Id': '2361d9'
          },
          body: JSON.stringify({
            sessionId: '2361d9',
            runId: 'pre-fix-logger-plan',
            hypothesisId: 'H1',
            location: 'LoggerPlacementPlanEditor.tsx:useEffect',
            message: 'Blocked viewer.diagrams.net for localhost URL',
            data: {
              planFileUrl,
              planFileName,
              origin,
              fullUrl
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion

        // Не формируем URL для viewer.diagrams.net, чтобы избежать 400 при localhost
        setIframeSrc(null);
        return;
      } else {
        setIsLocalhostBlocked(false);
      }

      const encodedUrl = encodeURIComponent(fullUrl);

      // Используем готовый хостинг редактора diagrams.net с возможностью редактирования
      const viewerUrl = `https://viewer.diagrams.net/?lightbox=0&nav=1&toolbar=1&edit=1&layers=1&zoom=1&lang=ru&url=${encodedUrl}`;

      // #region agent log
      fetch('http://127.0.0.1:7653/ingest/766b4759-1f03-4cbe-8972-e019ff31ce62', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '2361d9'
        },
        body: JSON.stringify({
          sessionId: '2361d9',
          runId: 'pre-fix-logger-plan',
          hypothesisId: 'H1-H3',
          location: 'LoggerPlacementPlanEditor.tsx:useEffect',
          message: 'Computed viewer URL for draw.io plan',
          data: {
            planFileUrl,
            planFileName,
            isAbsolute,
            origin,
            fullUrl,
            viewerUrl
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion

      setIframeSrc(viewerUrl);
    } catch (error) {
      console.error('LoggerPlacementPlanEditor: ошибка формирования URL для iframe', error);
      setIframeSrc(null);
    }
  }, [planFileUrl]);

  const objectTitle =
    qualificationObjectName && qualificationObjectName.trim().length > 0
      ? qualificationObjectName
      : qualificationObjectId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 transition-colors"
          title="Назад"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <FileText className="w-8 h-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Размещение логгеров на схеме
          </h1>
          <p className="text-sm text-gray-600">
            Проект: <span className="font-medium">{project.name}</span>
          </p>
          <p className="text-sm text-gray-600">
            Объект квалификации: <span className="font-medium">{objectTitle}</span>
          </p>
          {planFileName && (
            <p className="text-xs text-gray-500">
              Файл плана: <span className="font-mono">{planFileName}</span>
            </p>
          )}
        </div>
      </div>

      {/* Editor */}
      {!iframeSrc ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          {isLocalhostBlocked ? (
            <>
              <p className="text-red-600 text-sm mb-2">
                Невозможно открыть план через онлайн-редактор draw.io при работе с локального
                сервера (<span className="font-mono">localhost</span>). Веб-сервис diagrams.net не
                имеет доступа к вашему локальному адресу.
              </p>
              <p className="text-sm text-gray-700 mb-2">
                Для отладки вы можете открыть файл плана напрямую в новой вкладке браузера:
              </p>
              <a
                href={planFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 border border-indigo-600 text-sm font-medium rounded-md text-indigo-600 hover:bg-indigo-50"
              >
                Открыть план объекта
              </a>
              <p className="text-xs text-gray-500 mt-3">
                В боевом окружении, когда приложение будет доступно по публичному адресу (не
                localhost), схема будет открываться во встроенном редакторе draw.io автоматически.
              </p>
            </>
          ) : (
            <p className="text-red-600 text-sm">
              Не удалось сформировать ссылку для открытия редактора draw.io. Проверьте доступность
              файла плана объекта.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <iframe
            title="Редактор плана объекта (draw.io)"
            src={iframeSrc}
            className="w-full"
            style={{ minHeight: '70vh', border: 'none' }}
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
};

