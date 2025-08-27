import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Calendar, Building2, User, Save, CheckCircle, Clock, AlertTriangle, Upload, Download, Trash2 } from 'lucide-react';
import { Project, ProjectStatus } from '../types/Project';
import { projectService } from '../utils/projectService';

interface ContractNegotiationProps {
  project: Project;
  onBack: () => void;
  onProjectUpdate?: (updatedProject: Project) => void;
}

export const ContractNegotiation: React.FC<ContractNegotiationProps> = ({ 
  project, 
  onBack, 
  onProjectUpdate 
}) => {
  const [contractData, setContractData] = useState({
    contractNumber: project.contractNumber || '',
    contractDate: '',
    contractAmount: '',
    contractDescription: project.description || '',
    clientContact: '',
    clientPhone: '',
    clientEmail: '',
    notes: ''
  });

  const [documents, setDocuments] = useState<{
    id: string;
    name: string;
    type: 'contract' | 'commercial_offer' | 'technical_specification' | 'other';
    uploadDate: Date;
    size: number;
  }[]>([]);

  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    isSaving: boolean;
    lastSaved: Date | null;
    error: string | null;
  }>({
    isSaving: false,
    lastSaved: null,
    error: null
  });

  const documentTypes = {
    'contract': 'Договор',
    'commercial_offer': 'Коммерческое предложение',
    'technical_specification': 'Техническое задание',
    'other': 'Прочее'
  };

  const handleSaveContract = async () => {
    setSaveStatus(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      // Обновляем проект с данными договора
      const updatedProject = await projectService.updateProject(project.id, {
        contractNumber: contractData.contractNumber,
        description: contractData.contractDescription
      });

      setSaveStatus({
        isSaving: false,
        lastSaved: new Date(),
        error: null
      });

      // Уведомляем родительский компонент об обновлении
      if (onProjectUpdate) {
        onProjectUpdate(updatedProject);
      }

      console.log('Данные договора сохранены');
    } catch (error) {
      console.error('Ошибка сохранения данных договора:', error);
      setSaveStatus({
        isSaving: false,
        lastSaved: null,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    setLoading(true);
    try {
      const updatedProject = await projectService.updateProject(project.id, {
        status: newStatus
      });

      if (onProjectUpdate) {
        onProjectUpdate(updatedProject);
      }

      console.log('Статус проекта обновлен:', newStatus);
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
      alert(`Ошибка обновления статуса: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Имитация загрузки документов (в реальном приложении здесь была бы загрузка в Supabase Storage)
    Array.from(files).forEach(file => {
      const newDocument = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: 'other' as const,
        uploadDate: new Date(),
        size: file.size
      };
      
      setDocuments(prev => [...prev, newDocument]);
    });
  };

  const handleDeleteDocument = (documentId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот документ?')) {
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <FileText className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Согласование договора</h1>
      </div>

      {/* Project Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start space-x-4">
          <div className="bg-indigo-100 p-3 rounded-lg">
            <Building2 className="w-8 h-8 text-indigo-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{project.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Контрагент:</span> {project.contractorName}
              </div>
              <div>
                <span className="font-medium">Создан:</span> {project.createdAt.toLocaleDateString('ru-RU')}
              </div>
              <div>
                <span className="font-medium">Объектов квалификации:</span> {project.qualificationObjects.length}
              </div>
              <div>
                <span className="font-medium">Создал:</span> {project.createdByName || 'Не указан'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus.lastSaved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-800">
              Последнее сохранение: {saveStatus.lastSaved.toLocaleString('ru-RU')}
            </span>
          </div>
        </div>
      )}

      {saveStatus.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-800">
              Ошибка сохранения: {saveStatus.error}
            </span>
          </div>
        </div>
      )}

      {/* Contract Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Информация о договоре</h3>
          <button
            onClick={handleSaveContract}
            disabled={saveStatus.isSaving}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saveStatus.isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Сохранение...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Сохранить</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Номер договора
              </label>
              <input
                type="text"
                value={contractData.contractNumber}
                onChange={(e) => setContractData(prev => ({ ...prev, contractNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите номер договора"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата договора
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={contractData.contractDate}
                  onChange={(e) => setContractData(prev => ({ ...prev, contractDate: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Сумма договора
              </label>
              <input
                type="text"
                value={contractData.contractAmount}
                onChange={(e) => setContractData(prev => ({ ...prev, contractAmount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите сумму договора"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Контактное лицо клиента
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={contractData.clientContact}
                  onChange={(e) => setContractData(prev => ({ ...prev, clientContact: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="ФИО контактного лица"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Телефон клиента
              </label>
              <input
                type="tel"
                value={contractData.clientPhone}
                onChange={(e) => setContractData(prev => ({ ...prev, clientPhone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email клиента
              </label>
              <input
                type="email"
                value={contractData.clientEmail}
                onChange={(e) => setContractData(prev => ({ ...prev, clientEmail: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="client@example.com"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Описание работ
          </label>
          <textarea
            value={contractData.contractDescription}
            onChange={(e) => setContractData(prev => ({ ...prev, contractDescription: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows={4}
            placeholder="Подробное описание работ по договору"
          />
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Примечания
          </label>
          <textarea
            value={contractData.notes}
            onChange={(e) => setContractData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows={3}
            placeholder="Дополнительные примечания по согласованию"
          />
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Документы</h3>
          <label className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Загрузить документ</span>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
          </label>
        </div>

        {documents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Документ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Размер
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата загрузки
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={doc.type}
                        onChange={(e) => {
                          setDocuments(prev => prev.map(d => 
                            d.id === doc.id ? { ...d, type: e.target.value as any } : d
                          ));
                        }}
                        className="text-sm px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {Object.entries(documentTypes).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(doc.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.uploadDate.toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => console.log('Download document:', doc.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Скачать"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Документы не загружены</p>
            <p className="text-sm">Нажмите кнопку "Загрузить документ" для добавления файлов</p>
          </div>
        )}
      </div>

      {/* Status Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Управление статусом проекта</h3>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-gray-700">Текущий статус:</span>
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
              Согласование договора
            </span>
          </div>
        </div>

        <div className="mt-6 flex space-x-4">
          <button
            onClick={() => handleStatusChange('protocol_preparation')}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <span>Договор согласован → Подготовка протокола</span>
          </button>

          <button
            onClick={() => handleStatusChange('contract_negotiation')}
            disabled={loading}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Вернуть на доработку
          </button>
        </div>
      </div>

      {/* Qualification Objects */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Объекты квалификации</h3>
        
        <div className="space-y-3">
          {project.qualificationObjects.map((obj, index) => (
            <div key={obj.id} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {index + 1}. {obj.qualificationObjectName}
                  </div>
                  {obj.qualificationObjectType && (
                    <div className="text-sm text-gray-500 mt-1">
                      Тип: {obj.qualificationObjectType}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  ID: {obj.qualificationObjectId.substring(0, 8)}...
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Этап "Согласование договора":</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Заполните информацию о договоре</li>
          <li>• Загрузите необходимые документы (договор, коммерческое предложение, ТЗ)</li>
          <li>• Укажите контактные данные клиента</li>
          <li>• После согласования переведите проект на следующий этап</li>
        </ul>
      </div>
    </div>
  );
};