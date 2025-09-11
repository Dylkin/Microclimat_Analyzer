import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Save, X, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { 
  TestingPeriod, 
  TestingPeriodStatus,
  TestingPeriodStatusLabels,
  TestingPeriodStatusColors,
  CreateTestingPeriodData,
  UpdateTestingPeriodData 
} from '../types/TestingPeriod';
import { testingPeriodService } from '../utils/testingPeriodService';
import { useAuth } from '../contexts/AuthContext';

interface TestingPeriodsCRUDProps {
  qualificationObjectId: string;
  qualificationObjectName: string;
  projectId: string;
}

export const TestingPeriodsCRUD: React.FC<TestingPeriodsCRUDProps> = ({
  qualificationObjectId,
  qualificationObjectName,
  projectId
}) => {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<TestingPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<string | null>(null);
  
  // Form state
  const [newPeriod, setNewPeriod] = useState<{
    plannedStartDate: string;
    plannedEndDate: string;
    actualStartDate: string;
    actualEndDate: string;
    status: TestingPeriodStatus;
    notes: string;
  }>({
    plannedStartDate: '',
    plannedEndDate: '',
    actualStartDate: '',
    actualEndDate: '',
    status: 'planned',
    notes: ''
  });

  const [editPeriod, setEditPeriod] = useState<{
    plannedStartDate: string;
    plannedEndDate: string;
    actualStartDate: string;
    actualEndDate: string;
    status: TestingPeriodStatus;
    notes: string;
  }>({
    plannedStartDate: '',
    plannedEndDate: '',
    actualStartDate: '',
    actualEndDate: '',
    status: 'planned',
    notes: ''
  });

  // Загрузка периодов испытаний
  const loadTestingPeriods = async () => {
    if (!testingPeriodService.isAvailable()) {
      setError('Supabase не настроен для работы с периодами испытаний');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await testingPeriodService.getTestingPeriodsByQualificationObject(qualificationObjectId);
      setPeriods(data);
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

  // Добавление нового периода
  const handleAddPeriod = async () => {
    if (!newPeriod.plannedStartDate || !newPeriod.plannedEndDate) {
      alert('Заполните даты планируемого периода');
      return;
    }

    const startDate = new Date(newPeriod.plannedStartDate);
    const endDate = new Date(newPeriod.plannedEndDate);

    if (endDate <= startDate) {
      alert('Дата окончания должна быть позже даты начала');
      return;
    }

    setOperationLoading(true);
    try {
      const periodData: CreateTestingPeriodData = {
        qualificationObjectId,
        projectId,
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        actualStartDate: newPeriod.actualStartDate ? new Date(newPeriod.actualStartDate) : undefined,
        actualEndDate: newPeriod.actualEndDate ? new Date(newPeriod.actualEndDate) : undefined,
        status: newPeriod.status,
        notes: newPeriod.notes || undefined
      };

      const addedPeriod = await testingPeriodService.addTestingPeriod(periodData, user?.id);
      setPeriods(prev => [...prev, addedPeriod]);
      
      // Сбрасываем форму
      setNewPeriod({
        plannedStartDate: '',
        plannedEndDate: '',
        actualStartDate: '',
        actualEndDate: '',
        status: 'planned',
        notes: ''
      });
      setShowAddForm(false);
      
      console.log('Период испытаний успешно добавлен');
    } catch (error) {
      console.error('Ошибка добавления периода испытаний:', error);
      alert(`Ошибка добавления периода: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Редактирование периода
  const handleEditPeriod = (period: TestingPeriod) => {
    setEditPeriod({
      plannedStartDate: period.plannedStartDate.toISOString().split('T')[0],
      plannedEndDate: period.plannedEndDate.toISOString().split('T')[0],
      actualStartDate: period.actualStartDate?.toISOString().split('T')[0] || '',
      actualEndDate: period.actualEndDate?.toISOString().split('T')[0] || '',
      status: period.status,
      notes: period.notes || ''
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
        notes: editPeriod.notes || undefined
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

  // Удаление периода
  const handleDeletePeriod = async (periodId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот период испытаний?')) {
      setOperationLoading(true);
      try {
        await testingPeriodService.deleteTestingPeriod(periodId);
        setPeriods(prev => prev.filter(p => p.id !== periodId));
        
        console.log('Период испытаний успешно удален');
      } catch (error) {
        console.error('Ошибка удаления периода испытаний:', error);
        alert(`Ошибка удаления периода: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setOperationLoading(false);
      }
    }
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
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition-colors flex items-center space-x-1"
        >
          <Plus className="w-3 h-3" />
          <span>Добавить период</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Add Period Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-medium text-gray-900">Добавить период испытаний</h5>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Планируемая дата начала *</label>
              <input
                type="date"
                value={newPeriod.plannedStartDate}
                onChange={(e) => setNewPeriod(prev => ({ ...prev, plannedStartDate: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Планируемая дата окончания *</label>
              <input
                type="date"
                value={newPeriod.plannedEndDate}
                onChange={(e) => setNewPeriod(prev => ({ ...prev, plannedEndDate: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Фактическая дата начала</label>
              <input
                type="date"
                value={newPeriod.actualStartDate}
                onChange={(e) => setNewPeriod(prev => ({ ...prev, actualStartDate: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Фактическая дата окончания</label>
              <input
                type="date"
                value={newPeriod.actualEndDate}
                onChange={(e) => setNewPeriod(prev => ({ ...prev, actualEndDate: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Статус</label>
              <select
                value={newPeriod.status}
                onChange={(e) => setNewPeriod(prev => ({ ...prev, status: e.target.value as TestingPeriodStatus }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
                value={newPeriod.notes}
                onChange={(e) => setNewPeriod(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="Дополнительная информация"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 text-gray-700 bg-gray-200 rounded text-sm hover:bg-gray-300 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleAddPeriod}
              disabled={operationLoading || !validateDates(newPeriod.plannedStartDate, newPeriod.plannedEndDate)}
              className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {operationLoading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
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
                        onChange={(e) => setEditPeriod(prev => ({ ...prev, plannedStartDate: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Планируемая дата окончания *</label>
                      <input
                        type="date"
                        value={editPeriod.plannedEndDate}
                        onChange={(e) => setEditPeriod(prev => ({ ...prev, plannedEndDate: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Фактическая дата начала</label>
                      <input
                        type="date"
                        value={editPeriod.actualStartDate}
                        onChange={(e) => setEditPeriod(prev => ({ ...prev, actualStartDate: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Фактическая дата окончания</label>
                      <input
                        type="date"
                        value={editPeriod.actualEndDate}
                        onChange={(e) => setEditPeriod(prev => ({ ...prev, actualEndDate: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
                      disabled={operationLoading || !validateDates(editPeriod.plannedStartDate, editPeriod.plannedEndDate)}
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
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEditPeriod(period)}
                      disabled={operationLoading}
                      className="text-indigo-600 hover:text-indigo-800 transition-colors"
                      title="Редактировать период"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePeriod(period.id)}
                      disabled={operationLoading}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Удалить период"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
          <p className="text-xs mt-1">Нажмите "Добавить период" для планирования испытаний</p>
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