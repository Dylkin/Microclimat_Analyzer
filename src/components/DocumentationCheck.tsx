import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Minus, Save, AlertTriangle, FileText, History, Clock } from 'lucide-react';
import { DocumentationCheck, DocumentationItem, DocumentationItemStatusChange, DocumentationStatus, DOCUMENTATION_ITEMS, DOCUMENTATION_STATUS_LABELS, DOCUMENTATION_STATUS_COLORS } from '../types/DocumentationCheck';
import { useAuth } from '../contexts/AuthContext';
import { auditService } from '../utils/auditService';
import { documentationCheckService } from '../utils/documentationCheckService';

interface DocumentationCheckProps {
  qualificationObjectId: string;
  projectId: string;
  onSave?: (check: DocumentationCheck) => void;
}

export const DocumentationCheckComponent: React.FC<DocumentationCheckProps> = ({
  qualificationObjectId,
  projectId,
  onSave
}) => {
  const { user } = useAuth();
  const [items, setItems] = useState<DocumentationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showHistoryFor, setShowHistoryFor] = useState<string | null>(null);
  const [currentCheckId, setCurrentCheckId] = useState<string | null>(null);

  // Загрузка сохраненных данных проверки документации
  useEffect(() => {
    const loadSavedCheck = async () => {
      if (!documentationCheckService.isAvailable()) {
        console.warn('DocumentationCheckService недоступен, используем локальные данные');
        initializeItems();
        return;
      }

      setLoading(true);
      try {
        console.log('DocumentationCheck: Загружаем сохраненную проверку документации:', {
          qualificationObjectId,
          projectId
        });

        const savedCheck = await documentationCheckService.getLatestCheck(qualificationObjectId, projectId);
        
        if (savedCheck && savedCheck.items.length > 0) {
          console.log('DocumentationCheck: Найдена сохраненная проверка:', savedCheck);
          setItems(savedCheck.items);
          setCurrentCheckId(savedCheck.id);
          setSuccess('Загружены ранее сохраненные данные проверки документации');
        } else {
          console.log('DocumentationCheck: Сохраненная проверка не найдена, инициализируем новые элементы');
          initializeItems();
        }
      } catch (error) {
        console.error('DocumentationCheck: Ошибка загрузки сохраненной проверки:', error);
        setError('Ошибка загрузки сохраненных данных');
        initializeItems();
      } finally {
        setLoading(false);
      }
    };

    loadSavedCheck();
  }, [qualificationObjectId, projectId]);

  // Инициализация элементов документации
  const initializeItems = () => {
    const initializedItems: DocumentationItem[] = DOCUMENTATION_ITEMS.map((item, index) => ({
      id: `doc_${index + 1}`,
      name: item.name,
      description: item.description,
      status: 'not_selected' as DocumentationStatus
    }));
    setItems(initializedItems);
  };

  const handleStatusChange = async (itemId: string, status: DocumentationStatus) => {
    if (!user) {
      setError('Пользователь не авторизован');
      return;
    }

    const now = new Date();
    const statusChange: DocumentationItemStatusChange = {
      status,
      changedAt: now,
      changedBy: user.id,
      changedByName: user.fullName || user.email || 'Пользователь'
    };

    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, status };
        
        // Добавляем изменение в историю
        if (!updatedItem.statusHistory) {
          updatedItem.statusHistory = [];
        }
        updatedItem.statusHistory.push(statusChange);
        
        return updatedItem;
      }
      return item;
    }));

    console.log('DocumentationCheck: Изменение статуса документации', {
      itemId,
      status,
      changedAt: now,
      changedBy: user.id,
      changedByName: user.fullName || user.email || 'Пользователь'
    });

    // Записываем в аудит
    if (auditService.isAvailable()) {
      try {
        await auditService.createAuditLog({
          userId: user.id,
          userName: user.fullName || user.email || 'Пользователь',
          userRole: user.role || 'user',
          action: 'documentation_status_changed',
          entityType: 'documentation_item',
          entityId: itemId,
          entityName: items.find(item => item.id === itemId)?.name || 'Неизвестный элемент',
          details: {
            itemName: items.find(item => item.id === itemId)?.name || 'Неизвестный элемент',
            oldStatus: items.find(item => item.id === itemId)?.status || 'not_selected',
            newStatus: status,
            qualificationObjectId,
            projectId
          },
          ipAddress: undefined, // IP-адрес недоступен в браузере
          userAgent: navigator.userAgent
        });
        console.log('DocumentationCheck: Событие аудита записано: documentation_status_changed');
      } catch (error) {
        console.error('DocumentationCheck: Ошибка записи в аудит:', error);
      }
    }
  };

  const handleSave = async () => {
    if (!user) {
      setError('Пользователь не авторизован');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const checkData = {
        qualificationObjectId,
        projectId,
        items,
        checkedBy: user.id,
        checkedByName: user.fullName || user.email || 'Пользователь'
      };

      let savedCheck: DocumentationCheck;

      if (currentCheckId) {
        // Обновляем существующую проверку
        console.log('DocumentationCheck: Обновляем существующую проверку:', currentCheckId);
        savedCheck = await documentationCheckService.updateCheck(currentCheckId, checkData);
      } else {
        // Создаем новую проверку
        console.log('DocumentationCheck: Создаем новую проверку');
        savedCheck = await documentationCheckService.saveCheck(checkData);
        setCurrentCheckId(savedCheck.id);
      }

      setSuccess('Проверка документации сохранена');
      
      if (onSave) {
        onSave(savedCheck);
      }
    } catch (err) {
      console.error('Ошибка сохранения проверки документации:', err);
      setError('Ошибка сохранения проверки документации');
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: DocumentationStatus) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'not_available':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'not_applicable':
        return <Minus className="w-5 h-5 text-gray-600" />;
      case 'not_selected':
        return <Minus className="w-5 h-5 text-gray-400" />;
      default:
        return <Minus className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: DocumentationStatus) => {
    return DOCUMENTATION_STATUS_COLORS[status];
  };

  const toggleHistory = (itemId: string) => {
    setShowHistoryFor(showHistoryFor === itemId ? null : itemId);
  };

  const isAllChecked = items.every(item => item.status !== 'not_selected' && item.status !== 'not_applicable');
  const hasAvailableItems = items.some(item => item.status === 'available');
  const hasNotAvailableItems = items.some(item => item.status === 'not_available');

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <FileText className="w-6 h-6 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Проверка наличия документации</h3>
          <p className="text-sm text-gray-600">Выберите статус наличия для каждого типа документации</p>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-600">{success}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <p className="text-sm text-blue-600">Загрузка сохраненных данных...</p>
          </div>
        </div>
      )}

      {/* Documentation Items */}
      <div className="space-y-4 mb-6">
        {items.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 mb-1">{item.name}</h4>
                <p className="text-xs text-gray-600 mb-3">{item.description}</p>
                
                {/* Status Selection */}
                <div className="flex items-center space-x-4">
                  {(['not_selected', 'available', 'not_available', 'not_applicable'] as DocumentationStatus[]).map((status) => (
                    <label key={status} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`status_${item.id}`}
                        value={status}
                        checked={item.status === status}
                        onChange={() => handleStatusChange(item.id, status)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        <span>{DOCUMENTATION_STATUS_LABELS[status]}</span>
                      </span>
                    </label>
                  ))}
                </div>
                
                {/* Last Change Info and History Button */}
                {item.statusHistory && item.statusHistory.length > 0 && (
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Последнее изменение: {item.statusHistory[item.statusHistory.length - 1].changedByName} • {item.statusHistory[item.statusHistory.length - 1].changedAt.toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <button
                      onClick={() => toggleHistory(item.id)}
                      className="inline-flex items-center px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                      title="Показать историю изменений"
                    >
                      <History className="w-3 h-3 mr-1" />
                      История
                    </button>
                  </div>
                )}
                
                {/* History Display */}
                {showHistoryFor === item.id && item.statusHistory && item.statusHistory.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">История изменений</span>
                    </div>
                    <div className="space-y-2">
                      {item.statusHistory.slice().reverse().map((change, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(change.status)}`}>
                              {getStatusIcon(change.status)}
                              <span className="ml-1">{DOCUMENTATION_STATUS_LABELS[change.status]}</span>
                            </span>
                          </div>
                          <div className="text-gray-500">
                            {change.changedByName} • {change.changedAt.toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Сводка проверки</h4>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-400">
              {items.filter(item => item.status === 'not_selected').length}
            </div>
            <div className="text-xs text-gray-600">Не выбрано</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {items.filter(item => item.status === 'available').length}
            </div>
            <div className="text-xs text-gray-600">Есть</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {items.filter(item => item.status === 'not_available').length}
            </div>
            <div className="text-xs text-gray-600">Нет</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {items.filter(item => item.status === 'not_applicable').length}
            </div>
            <div className="text-xs text-gray-600">Не применимо</div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Сохранение...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Сохранить проверку
            </>
          )}
        </button>
      </div>
    </div>
  );
};
