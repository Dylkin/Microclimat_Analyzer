import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, FileText, RefreshCw } from 'lucide-react';
import { Project } from '../types/Project';
import { MeasurementZone } from '../types/QualificationObject';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import {
  mergeLoggerPlacementIntoDrawioXml,
  parseLoggerPlacementPositionsFromDrawioXml,
  stripLoggerPlacementMarkersFromDrawioXml
} from '../utils/loggerPlacementDrawioMerge';
import { EquipmentPlacement } from './EquipmentPlacement';

const EMBED_ORIGIN = 'https://embed.diagrams.net';

/** URL редактора diagrams.net в режиме JSON postMessage (тот же движок, что и draw.io / mxGraph). */
function buildEmbedSrc(): string {
  const params = new URLSearchParams({
    embed: '1',
    proto: 'json',
    spin: '1',
    libraries: '1',
    lang: 'ru',
    nav: '1'
  });
  return `${EMBED_ORIGIN}/?${params.toString()}`;
}

function parseEmbedPayload(data: unknown): { event?: string; [key: string]: unknown } | null {
  if (data == null) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as { event?: string };
    } catch {
      return null;
    }
  }
  if (typeof data === 'object') {
    return data as { event?: string };
  }
  return null;
}

interface LoggerPlacementPlanEditorProps {
  project: Project;
  qualificationObjectId: string;
  qualificationObjectName?: string;
  planFileUrl: string;
  planFileName?: string;
  onBack: () => void;
}

function postLoadToEmbed(win: Window, xml: string, title?: string) {
  const loadMsg: Record<string, string> = {
    action: 'load',
    xml
  };
  if (title && title.trim().length > 0) {
    loadMsg.title = title.trim();
  }
  win.postMessage(JSON.stringify(loadMsg), EMBED_ORIGIN);
}

/** Экспорт текущего XML из встроенного редактора (если поддерживается). */
function requestExportXml(win: Window): Promise<string> {
  return new Promise((resolve, reject) => {
    const tid = window.setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Таймаут экспорта XML'));
    }, 10000);

    const handler = (e: MessageEvent) => {
      if (e.origin !== EMBED_ORIGIN) return;
      const msg = parseEmbedPayload(e.data);
      if (!msg || msg.event !== 'export') return;
      const xml = msg.xml;
      if (typeof xml === 'string' && (xml.includes('<mxfile') || xml.includes('<mxGraphModel'))) {
        window.removeEventListener('message', handler);
        window.clearTimeout(tid);
        resolve(xml);
      }
    };

    window.addEventListener('message', handler);
    win.postMessage(JSON.stringify({ action: 'export', format: 'xml' }), EMBED_ORIGIN);
  });
}

export const LoggerPlacementPlanEditor: React.FC<LoggerPlacementPlanEditorProps> = ({
  project,
  qualificationObjectId,
  qualificationObjectName,
  planFileUrl,
  planFileName,
  onBack
}) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorText, setErrorText] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const baseDiagramXmlRef = useRef<string | null>(null);
  const iframeReadyRef = useRef(false);
  const zonesLoadedRef = useRef(false);
  const measurementZonesRef = useRef<MeasurementZone[]>([]);
  const mergeDebounceRef = useRef<number | null>(null);
  const [refreshingMarkers, setRefreshingMarkers] = useState(false);
  const [diagramSaveStatus, setDiagramSaveStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [diagramSaveMessage, setDiagramSaveMessage] = useState<string | null>(null);
  /** После сохранения из draw.io в БД уходит новый URL файла — обновляем ссылку «Открыть план» без сброса iframe. */
  const [schemeDownloadUrl, setSchemeDownloadUrl] = useState(planFileUrl);
  const diagramSaveInProgressRef = useRef(false);

  const [zonesLoaded, setZonesLoaded] = useState(false);
  const [zonesLoadError, setZonesLoadError] = useState<string | null>(null);
  const [measurementZones, setMeasurementZones] = useState<MeasurementZone[]>([]);

  useEffect(() => {
    measurementZonesRef.current = measurementZones;
  }, [measurementZones]);

  useEffect(() => {
    zonesLoadedRef.current = zonesLoaded;
  }, [zonesLoaded]);

  useEffect(() => {
    let cancelled = false;
    setZonesLoaded(false);
    setZonesLoadError(null);
    (async () => {
      try {
        const obj = await qualificationObjectService.getQualificationObjectById(
          qualificationObjectId,
          project.id
        );
        if (cancelled) return;
        setMeasurementZones(obj.measurementZones ?? []);
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setZonesLoadError(message);
        setMeasurementZones([]);
      } finally {
        if (!cancelled) {
          setZonesLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [qualificationObjectId, project.id]);

  useEffect(() => {
    setSchemeDownloadUrl(planFileUrl);
  }, [planFileUrl]);

  const resolvePlanFetchUrl = useCallback((): string => {
    const isAbsolute = /^https?:\/\//i.test(planFileUrl);
    const origin =
      typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
    return isAbsolute ? planFileUrl : `${origin}${planFileUrl}`;
  }, [planFileUrl]);

  const loadMergedDiagram = useCallback(
    (sourceXml: string) => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      const merged = mergeLoggerPlacementIntoDrawioXml(sourceXml, measurementZonesRef.current);
      postLoadToEmbed(win, merged, planFileName);
    },
    [planFileName]
  );

  const scheduleMergeFromCurrentData = useCallback(() => {
    if (!iframeReadyRef.current || !zonesLoadedRef.current) return;
    const base = baseDiagramXmlRef.current;
    if (!base) return;
    if (mergeDebounceRef.current != null) {
      window.clearTimeout(mergeDebounceRef.current);
    }
    mergeDebounceRef.current = window.setTimeout(() => {
      mergeDebounceRef.current = null;
      loadMergedDiagram(base);
    }, 180);
  }, [loadMergedDiagram]);

  useEffect(() => {
    let cancelled = false;
    iframeReadyRef.current = false;
    baseDiagramXmlRef.current = null;
    setStatus('loading');
    setErrorText(null);

    const fetchUrl = resolvePlanFetchUrl();

    (async () => {
      try {
        const response = await fetch(fetchUrl, { credentials: 'include' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const text = await response.text();
        if (!text.includes('<mxfile') && !text.includes('<mxGraphModel')) {
          throw new Error('Файл не похож на корректный документ draw.io (.drawio).');
        }
        if (cancelled) return;
        baseDiagramXmlRef.current = text;
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setErrorText(message);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [planFileUrl, resolvePlanFetchUrl]);

  const persistDiagramFromEmbedXml = useCallback(
    async (rawXml: string) => {
      if (diagramSaveInProgressRef.current) return;
      const trimmed = rawXml.trim();
      if (!trimmed || (!trimmed.includes('<mxfile') && !trimmed.includes('<mxGraphModel'))) {
        return;
      }

      diagramSaveInProgressRef.current = true;
      setDiagramSaveStatus('saving');
      setDiagramSaveMessage(null);

      try {
        const zonesWithPos = parseLoggerPlacementPositionsFromDrawioXml(
          trimmed,
          measurementZonesRef.current
        );
        const baseXml = stripLoggerPlacementMarkersFromDrawioXml(trimmed);
        baseDiagramXmlRef.current = baseXml;

        const { url } = await qualificationObjectService.uploadEquipmentPlacementSchemeFile(
          qualificationObjectId,
          baseXml,
          project.id,
          planFileName
        );
        setSchemeDownloadUrl(url);

        await qualificationObjectService.updateMeasurementZones(
          qualificationObjectId,
          zonesWithPos,
          project.id
        );
        setMeasurementZones(zonesWithPos);

        setDiagramSaveStatus('ok');
        setDiagramSaveMessage('Схема и позиции маркеров сохранены на сервере.');
        window.setTimeout(() => {
          setDiagramSaveStatus('idle');
          setDiagramSaveMessage(null);
        }, 5000);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setDiagramSaveStatus('error');
        setDiagramSaveMessage(message);
      } finally {
        diagramSaveInProgressRef.current = false;
      }
    },
    [qualificationObjectId, project.id, planFileName]
  );

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== EMBED_ORIGIN) return;
      const payload = parseEmbedPayload(e.data);
      if (!payload) return;

      if (payload.event === 'init') {
        iframeReadyRef.current = true;
        scheduleMergeFromCurrentData();
        return;
      }

      if (payload.event === 'save') {
        const xml = payload.xml;
        if (typeof xml !== 'string' || !xml.trim()) return;
        void persistDiagramFromEmbedXml(xml);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [scheduleMergeFromCurrentData, persistDiagramFromEmbedXml]);

  useEffect(() => {
    if (status === 'ready' && zonesLoaded) {
      scheduleMergeFromCurrentData();
    }
  }, [status, zonesLoaded, scheduleMergeFromCurrentData]);

  useEffect(
    () => () => {
      if (mergeDebounceRef.current != null) {
        window.clearTimeout(mergeDebounceRef.current);
      }
    },
    []
  );

  const handleRefreshMarkersOnDiagram = useCallback(async () => {
    const base = baseDiagramXmlRef.current;
    if (!base) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;

    setRefreshingMarkers(true);
    try {
      let sourceXml = base;
      try {
        sourceXml = await requestExportXml(win);
      } catch {
        sourceXml = base;
      }
      loadMergedDiagram(sourceXml);
    } finally {
      setRefreshingMarkers(false);
    }
  }, [loadMergedDiagram]);

  const objectTitle =
    qualificationObjectName && qualificationObjectName.trim().length > 0
      ? qualificationObjectName
      : qualificationObjectId;

  return (
    <div className="space-y-6">
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
          <h1 className="text-2xl font-bold text-gray-900">Размещение логгеров на схеме</h1>
          <p className="text-xs text-indigo-700 mt-1">
            Редактируется отдельный файл схемы (копия плана объекта для отчёта), не исходный «План объекта».
          </p>
          <p className="text-sm text-gray-600">
            Проект: <span className="font-medium">{project.name}</span>
          </p>
          <p className="text-sm text-gray-600">
            Объект квалификации: <span className="font-medium">{objectTitle}</span>
          </p>
          {planFileName && (
            <p className="text-xs text-gray-500">
              Файл схемы: <span className="font-mono">{planFileName}</span>
            </p>
          )}
        </div>
      </div>

      {status === 'loading' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
          Загрузка файла плана…
        </div>
      )}

      {zonesLoadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
          Не удалось загрузить зоны измерения из базы данных ({zonesLoadError}). Ниже можно задать зоны
          заново и сохранить.
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm mb-2">
            Не удалось загрузить план для редактора.{' '}
            {errorText ? <span className="font-mono text-xs">({errorText})</span> : null}
          </p>
          <p className="text-sm text-gray-700 mb-2">
            Вы можете открыть файл напрямую в браузере или в настольном draw.io:
          </p>
          <a
            href={schemeDownloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 border border-indigo-600 text-sm font-medium rounded-md text-indigo-600 hover:bg-indigo-50"
          >
            Открыть план объекта
          </a>
        </div>
      )}

      {status === 'ready' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Маркеры зон и уровней вставляются в документ draw.io как стандартные фигуры «Эллипс» и
            «Прямоугольник»: ими можно пользоваться как обычно (стиль, размер, текст). Номер зоны — в
            круге (37×37), уровни одной зоны — столбиком друг над другом (100×30), в прямоугольнике —
            наименование логгера и высота в метрах (например, «2,2 M»). Кнопка «Сохранить» в панели
            draw.io сохраняет на сервер весь чертёж и актуальные координаты маркеров зон и уровней.
            После изменения зон или уровней в блоке ниже нажмите «Обновить маркеры на схеме», чтобы
            перестроить только эти объекты (по возможности сохраняется текущая правка плана из
            редактора).
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRefreshMarkersOnDiagram}
              disabled={!zonesLoaded || refreshingMarkers}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshingMarkers ? 'animate-spin' : ''}`} />
              {refreshingMarkers ? 'Обновление…' : 'Обновить маркеры на схеме'}
            </button>
          </div>
          {diagramSaveStatus === 'saving' && (
            <div className="text-sm text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-md px-3 py-2">
              Сохранение схемы и позиций маркеров на сервере…
            </div>
          )}
          {diagramSaveStatus === 'ok' && diagramSaveMessage && (
            <div className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-md px-3 py-2">
              {diagramSaveMessage}
            </div>
          )}
          {diagramSaveStatus === 'error' && diagramSaveMessage && (
            <div className="text-sm text-red-800 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              Не удалось сохранить схему: {diagramSaveMessage}
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <iframe
              ref={iframeRef}
              title="Редактор плана объекта (diagrams.net / draw.io)"
              src={buildEmbedSrc()}
              className="w-full block"
              style={{ minHeight: '70vh', border: 'none' }}
              allowFullScreen
            />
          </div>
        </div>
      )}

      {status === 'ready' && zonesLoaded && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <EquipmentPlacement
            qualificationObjectId={qualificationObjectId}
            initialZones={measurementZones}
            onZonesChange={setMeasurementZones}
            projectId={project.id}
          />
        </div>
      )}

      {status === 'ready' && !zonesLoaded && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
          Загрузка зон измерения…
        </div>
      )}
    </div>
  );
};
