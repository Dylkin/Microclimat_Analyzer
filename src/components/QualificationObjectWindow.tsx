import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { QualificationObject } from '../types/QualificationObject';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { QualificationObjectForm } from './QualificationObjectForm';

type WindowMode = 'view' | 'edit' | 'create';

function getParams(): {
  objectId: string;
  mode: WindowMode;
  contractorId: string;
  contractorAddress?: string;
} {
  const sp = new URLSearchParams(window.location.search);
  const objectId = sp.get('objectId') || sp.get('id') || '';
  const modeRaw = (sp.get('mode') || 'view') as WindowMode;
  const contractorId = sp.get('contractorId') || '';
  const contractorAddress = sp.get('contractorAddress') || undefined;
  const mode: WindowMode = modeRaw === 'edit' ? 'edit' : modeRaw === 'create' ? 'create' : 'view';
  return { objectId, mode, contractorId, contractorAddress };
}

export const QualificationObjectWindow: React.FC = () => {
  const params = useMemo(() => getParams(), []);
  const [mode, setMode] = useState<WindowMode>(params.mode);
  const [objectId, setObjectId] = useState<string>(params.objectId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [obj, setObj] = useState<QualificationObject | null>(null);

  useEffect(() => {
    if (mode === 'create') {
      setLoading(false);
      setError(null);
      setObj(null);
      return;
    }

    if (!objectId) {
      setError('Не указан objectId');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    qualificationObjectService
      .getQualificationObjectById(objectId)
      .then((data) => {
        if (cancelled) return;
        setObj(data);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.message || 'Ошибка загрузки объекта квалификации');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, objectId]);

  const handleBack = () => {
    try {
      if (window.opener) {
        // Просим основное окно открыть список объектов квалификации контрагента
        const contractorIdToReturn = contractorId;
        if (contractorIdToReturn) {
          window.opener.postMessage(
            { type: 'focusQualificationObjectsList', contractorId: contractorIdToReturn, mode: 'edit' },
            window.location.origin
          );
        }
        window.opener.focus();
        window.close();
        return;
      }
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  const contractorId = params.contractorId || obj?.contractorId || '';
  const contractorAddress = params.contractorAddress || obj?.address;
  const title =
    mode === 'create'
      ? 'Добавление объекта квалификации'
      : mode === 'edit'
        ? 'Редактирование объекта квалификации'
        : 'Просмотр объекта квалификации';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg bg-white shadow hover:bg-gray-50 transition-colors"
            title="Назад к списку объектов квалификации"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Назад к списку</span>
          </button>
          <div className="text-sm text-gray-500">
            {title}
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center space-x-2 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Загрузка объекта…</span>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-red-600">{error}</div>
          </div>
        )}

        {!loading && !error && mode === 'create' && (
          <div className="bg-white rounded-lg shadow p-6">
            {contractorId ? (
              <QualificationObjectForm
                key="create"
                contractorId={contractorId}
                contractorAddress={contractorAddress}
                mode="create"
                hideTypeSelection={false}
                onSubmit={async (objectData) => {
                  const saved = await qualificationObjectService.createQualificationObject(objectData as any);
                  setObj(saved);
                  setMode('edit');
                  setObjectId(saved.id);
                  try {
                    // Обновляем URL без перезагрузки, чтобы при F5 был корректный режим
                    const url = new URL(window.location.href);
                    url.searchParams.set('objectId', saved.id);
                    url.searchParams.set('mode', 'edit');
                    window.history.replaceState({}, '', url.toString());
                  } catch {
                    // ignore
                  }
                  try {
                    if (window.opener) {
                      window.opener.postMessage(
                        { type: 'qualificationObjectUpdated', contractorId },
                        window.location.origin
                      );
                    }
                  } catch {
                    // ignore
                  }
                  return saved;
                }}
                onCancel={handleBack}
                onPageChange={() => {
                  alert(
                    'Функция анализа данных доступна только в разделе \"Управление проектами\".\n\nДля анализа данных:\n1. Перейдите в \"Управление проектами\"\n2. Выберите проект\n3. Откройте объект квалификации\n4. Нажмите \"Анализ данных\"'
                  );
                }}
              />
            ) : (
              <div className="text-red-600">Не указан contractorId</div>
            )}
          </div>
        )}

        {!loading && !error && mode !== 'create' && obj && (
          <div className="bg-white rounded-lg shadow p-6">
            <QualificationObjectForm
              key={objectId}
              contractorId={contractorId}
              contractorAddress={contractorAddress}
              initialData={obj}
              mode={mode === 'edit' ? 'edit' : 'view'}
              hideTypeSelection={true}
              onSubmit={async (objectData) => {
                const saved = await qualificationObjectService.updateQualificationObject(objectId, objectData);
                setObj(saved);
                try {
                  if (window.opener) {
                    window.opener.postMessage(
                      { type: 'qualificationObjectUpdated', contractorId },
                      window.location.origin
                    );
                  }
                } catch {
                  // ignore
                }
                return saved;
              }}
              onCancel={handleBack}
              onPageChange={() => {
                alert(
                  'Функция анализа данных доступна только в разделе \"Управление проектами\".\n\nДля анализа данных:\n1. Перейдите в \"Управление проектами\"\n2. Выберите проект\n3. Откройте объект квалификации\n4. Нажмите \"Анализ данных\"'
                );
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

