import React, { useState, useEffect } from 'react';
import { Calendar, FileText, Save, X } from 'lucide-react';
import { Project } from '../../types/Project';
import { projectService } from '../../utils/projectService';

interface ContractFieldsProps {
  project: Project;
  onUpdate: (updatedProject: Project) => void;
  isEditing?: boolean;
  onEditToggle?: (editing: boolean) => void;
}

export const ContractFields: React.FC<ContractFieldsProps> = ({
  project,
  onUpdate,
  isEditing = false,
  onEditToggle
}) => {
  const [contractNumber, setContractNumber] = useState(project.contractNumber || '');
  const [contractDate, setContractDate] = useState(
    project.contractDate ? project.contractDate.toISOString().split('T')[0] : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Сбрасываем значения при изменении проекта
  useEffect(() => {
    console.log('ContractFields: Обновление данных проекта', {
      projectId: project.id,
      contractNumber: project.contractNumber,
      contractDate: project.contractDate,
      project: project
    });
    
    setContractNumber(project.contractNumber || '');
    setContractDate(project.contractDate ? project.contractDate.toISOString().split('T')[0] : '');
  }, [project.id, project.contractNumber, project.contractDate]);

  const handleSave = async () => {
    if (!projectService.isAvailable()) {
      setError('Сервис проектов недоступен');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updateData: any = {};
      
      if (contractNumber !== (project.contractNumber || '')) {
        updateData.contractNumber = contractNumber || null;
      }
      
      if (contractDate !== (project.contractDate ? project.contractDate.toISOString().split('T')[0] : '')) {
        updateData.contractDate = contractDate ? new Date(contractDate) : null;
      }

      console.log('ContractFields: Сохранение полей договора', {
        projectId: project.id,
        updateData,
        originalContractNumber: project.contractNumber,
        originalContractDate: project.contractDate,
        newContractNumber: contractNumber,
        newContractDate: contractDate
      });

      if (Object.keys(updateData).length === 0) {
        console.log('ContractFields: Нет изменений для сохранения');
        onEditToggle?.(false);
        return;
      }

      console.log('ContractFields: Вызываем projectService.updateProject с данными:', updateData);
      const updatedProject = await projectService.updateProject(project.id, updateData);
      console.log('ContractFields: Проект обновлен:', updatedProject);
      
      onUpdate(updatedProject);
      onEditToggle?.(false);
    } catch (error) {
      console.error('Ошибка обновления полей договора:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setContractNumber(project.contractNumber || '');
    setContractDate(project.contractDate ? project.contractDate.toISOString().split('T')[0] : '');
    setError(null);
    onEditToggle?.(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="w-5 h-5 text-blue-500" />
                   <h4 className="font-medium text-gray-900">Редактирование реквизитов договора</h4>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="contractNumber" className="block text-sm font-medium text-gray-700 mb-1">
              № договора
            </label>
            <input
              type="text"
              id="contractNumber"
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Введите номер договора"
            />
          </div>

          <div>
            <label htmlFor="contractDate" className="block text-sm font-medium text-gray-700 mb-1">
              Дата договора
            </label>
            <div className="relative">
              <input
                type="date"
                id="contractDate"
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <X className="w-4 h-4 mr-2 inline" />
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2 inline" />
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-blue-500" />
                   <h4 className="font-medium text-gray-900">Реквизиты договора</h4>
        </div>
        <button
          onClick={() => onEditToggle?.(true)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Редактировать
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <span className="text-sm font-medium text-gray-700">№ договора:</span>
          <p className="text-sm text-gray-900 mt-1">
            {project.contractNumber || 'Не указан'}
          </p>
        </div>
        
        <div>
          <span className="text-sm font-medium text-gray-700">Дата договора:</span>
          <p className="text-sm text-gray-900 mt-1">
            {project.contractDate 
              ? project.contractDate.toLocaleDateString('ru-RU')
              : 'Не указана'
            }
          </p>
        </div>
      </div>
    </div>
  );
};
