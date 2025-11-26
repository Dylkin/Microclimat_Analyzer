import React, { useState, useEffect } from 'react';
import { Calendar, Edit2, Save, X, Clock, CheckCircle, AlertTriangle, XCircle, Upload, Download, Eye, Trash2, FileText, FileImage } from 'lucide-react';
import { 
  TestingPeriod, 
  TestingPeriodStatus,
  TestingPeriodStatusLabels,
  TestingPeriodStatusColors,
  TestingPeriodDocument,
  CreateTestingPeriodData,
  UpdateTestingPeriodData 
} from '../types/TestingPeriod';
import { testingPeriodService } from '../utils/testingPeriodService';
import { useAuth } from '../contexts/AuthContext';

interface TestingPeriodsCRUDProps {
  qualificationObjectId: string;
  qualificationObjectName: string;
  readOnlyMode?: boolean; // Новый пропс для режима только чтения планируемых дат
}

export const TestingPeriodsCRUD: React.FC<TestingPeriodsCRUDProps> = ({
  qualificationObjectId,
  qualificationObjectName,
  readOnlyMode = false
}) => {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<TestingPeriod[]>([]);
  const [periodDocuments, setPeriodDocuments] = useState<Map<string, TestingPeriodDocument[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  
  const [editPeriod, setEditPeriod] = useState<{
    plannedStartDate: string;
    plannedEndDate: string;
    actualStartDate: string;
    actualEndDate: string;
    status: TestingPeriodStatus;
    notes: string;
    testingStartDate: string;
    testingEndDate: string;
  }>({
    plannedStartDate: '',
    plannedEndDate: '',
    actualStartDate: '',
    actualEndDate: '',
    status: 'planned',
    notes: '',
    testingStartDate: '',
    testingEndDate: ''
  });

  // Загрузка периодов испытаний
  const loadTestingPeriods = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await testingPeriodService.getTestingPeriodsByQualificationObject(qualificationObjectId);
      setPeriods(data);
      
      // Загружаем документы для каждого периода
      const documentsMap = new Map<string, TestingPeriodDocument[]>();
      for (const period of data) {
        try {
          const docs = await testingPeriodService.getTestingPeriodDocuments(period.id);
          documentsMap.set(period.id, docs);
        } catch (error) {
          console.warn(`Ошибка загрузки документов для периода ${period.id}:`, error);
          documentsMap.set(period.id, []);
        }
      }
      setPeriodDocuments(documentsMap);
    } catch (error) {
      console.error('Ошибка загрузки периодов испытаний:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTestingPeriods();
  }, [qualificationObjectId]);

  // Редактирование периода
  const handleEditPeriod = (period: TestingPeriod) => {
    setEditPeriod({
      plannedStartDate: period.plannedStartDate.toISOString().split('T')[0],
      plannedEndDate: period.plannedEndDate.toISOString().split('T')[0],
      actualStartDate: period.actualStartDate?.toISOString().split('T')[0] || '',
      actualEndDate: period.actualEndDate?.toISOString().split('T')[0] || '',
      status: period.status,
      notes: period.notes || '',
      testingStartDate: period.testingStartDate?.toISOString().split('T')[0] || '',
      testingEndDate: period.testingEndDate?.toISOString().split('T')[0] || ''
    });
    setEditingPeriod(period.id);
  };

  const handleSaveEdit = async () => {
    if (!editPeriod.plannedStartDate || !editPeriod.plannedEndDate) {
      alert('Заполните даты планируемого периода');
      return;
    }

    const startDate = new Date(editPeriod.plannedStartDate);
    const endDate = new Date(editPeriod.plannedEndDate);

    if (endDate <= startDate) {
      alert('Дата окончания должна быть позже даты начала');
      return;
    }

    setOperationLoading(true);
    try {
      const updateData: UpdateTestingPeriodData = {
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        actualStartDate: editPeriod.actualStartDate ? new Date(editPeriod.actualStartDate) : undefined,
        actualEndDate: editPeriod.actualEndDate ? new Date(editPeriod.actualEndDate) : undefined,
        status: editPeriod.status,
        notes: editPeriod.notes || undefined,
        testingStartDate: editPeriod.testingStartDate ? new Date(editPeriod.testingStartDate) : undefined,
        testingEndDate: editPeriod.testingEndDate ? new Date(editPeriod.testingEndDate) : undefined
      };

      const updatedPeriod = await testingPeriodService.updateTestingPeriod(editingPeriod!, updateData);
      setPeriods(prev => prev.map(p => p.id === editingPeriod ? updatedPeriod : p));
      setEditingPeriod(null);
      
      console.log('Период испытаний успешно обновлен');
    } catch (error) {
      console.error('Ошибка обновления периода испытаний:', error);
      alert(`Ошибка обновления периода: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Загрузка документа для периода испытаний
  const handleDocumentUpload = async (periodId: string, file: File) => {
    if (!file) return;

    // Проверяем тип файла
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/tiff', 'image/bmp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Поддерживаются только файлы: JPG, PNG, PDF, TIFF, BMP');
      return;
    }

    // Проверяем размер файла (максимум 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Размер файла не должен превышать 10MB');
      return;
    }

    setUploadingDocument(periodId);
    try {
      const uploadedDoc = await testingPeriodService.uploadTestingPeriodDocument(periodId, file);
      
      // Обновляем документы для этого периода
      setPeriodDocuments(prev => {
        const newMap = new Map(prev);
        const existingDocs = newMap.get(periodId) || [];
        newMap.set(periodId, [...existingDocs, uploadedDoc]);
        return newMap;
      });
      
      console.log('Документ успешно загружен');
    } catch (error) {
      console.error('Ошибка загрузки документа:', error);
      alert(`Ошибка загрузки документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setUploadingDocument(null);
    }
  };

  // Удаление документа
  const handleDeleteDocument = async (periodId: string, documentId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }

    try {
      await testingPeriodService.deleteTestingPeriodDocument(documentId);
      
      // Обновляем документы для этого периода
      setPeriodDocuments(prev => {
        const newMap = new Map(prev);
        const existingDocs = newMap.get(periodId) || [];
        newMap.set(periodId, existingDocs.filter(doc => doc.id !== documentId));
        return newMap;
      });
      
      console.log('Документ успешно удален');
    } catch (error) {
      console.error('Ошибка удаления документа:', error);
      alert(`Ошибка удаления документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Скачивание документа
  const handleDownloadDocument = (doc: TestingPeriodDocument) => {
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Просмотр документа
  const handleViewDocument = (doc: TestingPeriodDocument) => {
    window.open(doc.fileUrl, '_blank');
  };

  // Форматирование размера файла
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Получение иконки статуса
  const getStatusIcon = (status: TestingPeriodStatus) => {
    switch (status) {
      case 'planned':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'in_progress':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  // Проверка валидности дат
  const validateDates = (startDate: string, endDate: string): boolean => {
    if (!startDate || !endDate) return false;
    return new Date(endDate) > new Date(startDate);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h4 className="text-md font-medium text-gray-900">Испытания</h4>
          <span className="text-sm text-gray-500">({qualificationObjectName})</span>
        </div>
        {!readOnlyMode && (
          <span className="text-xs text-gray-500">
            Периоды планируются на этапе согласования договора
          </span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Periods List */}
      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Загрузка периодов...</p>
        </div>
      ) : periods.length > 0 ? (
        <div className="space-y-3">
          {periods.map((period) => (
            <div key={period.id} className="bg-white border border-gray-200 rounded-lg p-3">
              {editingPeriod === period.id ? (
                // Edit form
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Планируемая дата начала *</label>
                      <input
                        type="date"
                        value={editPeriod.plannedStartDate}
                        onChange={(e) => !readOnlyMode && setEditPeriod(prev => ({ ...prev, plannedStartDate: e.target.value }))}
                        className={`w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                          readOnlyMode ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        disabled={readOnlyMode}
                        required
                        title="Планируемая дата начала"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Планируемая дата окончания *</label>
                      <input
                        type="date"
                        value={editPeriod.plannedEndDate}
                        onChange={(e) => !readOnlyMode && setEditPeriod(prev => ({ ...prev, plannedEndDate: e.target.value }))}
                        className={`w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                          readOnlyMode ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        disabled={readOnlyMode}
                        required
                        title="Планируемая дата окончания"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Период проведения испытаний (с даты)</label>
                      <input
                        type="date"
                        value={editPeriod.testingStartDate}
                        onChange={(e) => setEditPeriod(prev => ({ ...prev, testingStartDate: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="Дата начала испытаний"
                        title="Период проведения испытаний (с даты)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Период проведения испытаний (по дату)</label>
                      <input
                        type="date"
                        value={editPeriod.testingEndDate}
                        onChange={(e) => setEditPeriod(prev => ({ ...prev, testingEndDate: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="Дата окончания испытаний"
                        title="Период проведения испытаний (по дату)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Фактическая дата начала</label>
                      <input
                        type="date"
                        value={editPeriod.actualStartDate}
                        onChange={(e) => setEditPeriod(prev => ({ ...prev, actualStartDate: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        title="Фактическая дата начала"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Фактическая дата окончания</label>
                      <input
                        type="date"
                        value={editPeriod.actualEndDate}
                        onChange={(e) => setEditPeriod(prev => ({ ...prev, actualEndDate: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        title="Фактическая дата окончания"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Статус</label>
                      <select
                        value={editPeriod.status}
                        onChange={(e) => setEditPeriod(prev => ({ ...prev, status: e.target.value as TestingPeriodStatus }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        title="Статус периода испытаний"
                      >
                        {Object.entries(TestingPeriodStatusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Примечания</label>
                      <input
                        type="text"
                        value={editPeriod.notes}
                        onChange={(e) => setEditPeriod(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="Дополнительная информация"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingPeriod(null)}
                      className="px-3 py-1 text-gray-700 bg-gray-200 rounded text-sm hover:bg-gray-300 transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={operationLoading || (!readOnlyMode && !validateDates(editPeriod.plannedStartDate, editPeriod.plannedEndDate))}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {operationLoading ? 'Сохранение...' : 'Сохранить'}
                    </button>
                  </div>
                </div>
              ) : (
                // Display mode
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(period.status)}
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${TestingPeriodStatusColors[period.status]}`}>
                        {TestingPeriodStatusLabels[period.status]}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">
                          <strong>Планируемый период:</strong>
                        </div>
                        <div className="text-gray-900">
                          {period.plannedStartDate.toLocaleDateString('ru-RU')} - {period.plannedEndDate.toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      
                      {(period.testingStartDate || period.testingEndDate) && (
                        <div>
                          <div className="text-gray-600">
                            <strong>Период проведения испытаний:</strong>
                          </div>
                          <div className="text-gray-900">
                            {period.testingStartDate?.toLocaleDateString('ru-RU') || '—'} - {period.testingEndDate?.toLocaleDateString('ru-RU') || '—'}
                          </div>
                        </div>
                      )}
                      
                      {(period.actualStartDate || period.actualEndDate) && (
                        <div>
                          <div className="text-gray-600">
                            <strong>Фактический период:</strong>
                          </div>
                          <div className="text-gray-900">
                            {period.actualStartDate?.toLocaleDateString('ru-RU') || '—'} - {period.actualEndDate?.toLocaleDateString('ru-RU') || '—'}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {period.notes && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">Примечания:</span>
                        <span className="text-gray-900 ml-1">{period.notes}</span>
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-gray-500">
                      Создан: {period.createdAt.toLocaleDateString('ru-RU')} 
                      {period.createdByName && ` • ${period.createdByName}`}
                    </div>
                  </div>
                  
                  {/* Документы по испытаниям */}
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h6 className="text-sm font-medium text-gray-700">Документы по испытаниям</h6>
                      <label className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors cursor-pointer flex items-center space-x-1">
                        {uploadingDocument === period.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            <span>Загрузка...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3 h-3" />
                            <span>Загрузить</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleDocumentUpload(period.id, file);
                            }
                            e.target.value = '';
                          }}
                          className="hidden"
                          disabled={uploadingDocument === period.id}
                        />
                      </label>
                    </div>

                    {/* Список документов */}
                    {periodDocuments.get(period.id)?.length ? (
                      <div className="space-y-2">
                        {periodDocuments.get(period.id)!.map((document) => (
                          <div key={document.id} className="flex items-center justify-between bg-white border border-gray-200 rounded p-2">
                            <div className="flex items-center space-x-2">
                              {document.mimeType.startsWith('image/') ? (
                                <FileImage className="w-4 h-4 text-blue-600" />
                              ) : (
                                <FileText className="w-4 h-4 text-red-600" />
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">{document.fileName}</div>
                                <div className="text-xs text-gray-500">
                                  {formatFileSize(document.fileSize)} • {document.uploadedAt.toLocaleDateString('ru-RU')}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleViewDocument(document)}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Просмотреть"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDownloadDocument(document)}
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="Скачать"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteDocument(period.id, document.id)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Удалить"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3 text-gray-500 bg-gray-50 rounded border border-gray-200">
                        <FileText className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                        <p className="text-xs">Документы не загружены</p>
                        <p className="text-xs mt-1">Поддерживаются: JPG, PNG, PDF, TIFF, BMP</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {!readOnlyMode && (
                      <button
                        onClick={() => handleEditPeriod(period)}
                        disabled={operationLoading}
                        className="text-indigo-600 hover:text-indigo-800 transition-colors"
                        title="Редактировать период"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500 bg-white border border-gray-200 rounded-lg">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Периоды испытаний не добавлены</p>
          <p className="text-xs mt-1">
            {readOnlyMode 
              ? 'Периоды планируются на этапе согласования договора'
              : 'Нажмите "Добавить период" для планирования испытаний'
            }
          </p>
        </div>
      )}

      {/* Summary */}
      {periods.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Сводка по испытаниям:</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>Всего: <span className="font-medium">{periods.length}</span></div>
              <div>Запланировано: <span className="font-medium">{periods.filter(p => p.status === 'planned').length}</span></div>
              <div>В процессе: <span className="font-medium">{periods.filter(p => p.status === 'in_progress').length}</span></div>
              <div>Завершено: <span className="font-medium">{periods.filter(p => p.status === 'completed').length}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};