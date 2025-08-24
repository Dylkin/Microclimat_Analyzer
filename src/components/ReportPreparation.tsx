import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Building2, FolderOpen, Download, AlertCircle } from 'lucide-react';
import { Project } from '../types/Project';
import { Contractor } from '../types/Contractor';
import { QualificationObject, QualificationObjectTypeLabels } from '../types/QualificationObject';
import { ProjectDocument, DocumentTypeLabels } from '../types/ProjectDocument';
import { UploadedFile } from '../types/FileData';
import { contractorService } from '../utils/contractorService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { projectDocumentService } from '../utils/projectDocumentService';
import { uploadedFileService } from '../utils/uploadedFileService';
import { TimeSeriesAnalyzer } from './TimeSeriesAnalyzer';
import { useAuth } from '../contexts/AuthContext';

interface ReportPreparationProps {
  project: Project;
  onBack: () => void;
}

export const ReportPreparation: React.FC<ReportPreparationProps> = ({ project, onBack }) => {
  const { user } = useAuth();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [selectedQualificationObject, setSelectedQualificationObject] = useState<string>('');
  const [qualificationSearch, setQualificationSearch] = useState('');
  const [showQualificationDropdown, setShowQualificationDropdown] = useState(false);
  const [additionalDocuments, setAdditionalDocuments] = useState<ProjectDocument[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [showAnalyzer, setShowAnalyzer] = useState(false);

  // Загрузка данных при инициализации
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Загружаем данные контрагента
        if (contractorService.isAvailable()) {
          const contractorsData = await contractorService.getAllContractors();
          const projectContractor = contractorsData.find(c => c.id === project.contractorId);
          setContractor(projectContractor || null);
        }

        // Загружаем объекты квалификации проекта
        if (qualificationObjectService.isAvailable()) {
          const allObjects = await qualificationObjectService.getAllQualificationObjects();
          const projectObjectIds = project.qualificationObjects.map(obj => obj.qualificationObjectId);
          const projectObjects = allObjects.filter(obj => projectObjectIds.includes(obj.id));
          setQualificationObjects(projectObjects);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [project]);

  // Загрузка дополнительных документов при выборе объекта квалификации
  useEffect(() => {
    const loadAdditionalDocuments = async () => {
      if (!selectedQualificationObject || !projectDocumentService.isAvailable()) {
        setAdditionalDocuments([]);
        return;
      }

      try {
        console.log('Загружаем дополнительные документы для объекта квалификации:', selectedQualificationObject);
        const documents = await projectDocumentService.getProjectDocuments(project.id, selectedQualificationObject);
        
        // Фильтруем только дополнительные документы (схема расстановки и данные испытаний)
        const additionalDocs = documents.filter(doc => 
          doc.documentType === 'layout_scheme' || doc.documentType === 'test_data'
        );
        
        setAdditionalDocuments(additionalDocs);
        console.log('Загружено дополнительных документов:', additionalDocs.length);
      } catch (error) {
        console.error('Ошибка загрузки дополнительных документов:', error);
        setAdditionalDocuments([]);
      }
    };

    loadAdditionalDocuments();
  }, [selectedQualificationObject, project.id]);

  // Загрузка файлов данных при выборе объекта квалификации
  useEffect(() => {
    const loadProjectFiles = async () => {
      if (!selectedQualificationObject || !uploadedFileService.isAvailable()) {
        setUploadedFiles([]);
        return;
      }

      try {
        console.log('Загружаем файлы данных для объекта квалификации:', selectedQualificationObject);
        const projectFiles = await uploadedFileService.getProjectFiles(project.id, user?.id || 'anonymous');
        
        if (projectFiles.length > 0) {
          console.log('Найдены ранее сохраненные файлы:', projectFiles.length);
          setUploadedFiles(projectFiles);
        }
      } catch (error) {
        console.error('Ошибка загрузки файлов проекта:', error);
        setUploadedFiles([]);
      }
    };

    loadProjectFiles();
  }, [selectedQualificationObject, project.id, user?.id]);

  // Фильтрация объектов квалификации по поиску
  const filteredQualificationObjects = React.useMemo(() => {
    if (!qualificationSearch.trim()) return qualificationObjects;
    
    return qualificationObjects.filter(obj =>
      (obj.name && obj.name.toLowerCase().includes(qualificationSearch.toLowerCase())) ||
      (obj.address && obj.address.toLowerCase().includes(qualificationSearch.toLowerCase())) ||
      (obj.vin && obj.vin.toLowerCase().includes(qualificationSearch.toLowerCase())) ||
      (obj.serialNumber && obj.serialNumber.toLowerCase().includes(qualificationSearch.toLowerCase())) ||
      (obj.inventoryNumber && obj.inventoryNumber.toLowerCase().includes(qualificationSearch.toLowerCase()))
    );
  }, [qualificationObjects, qualificationSearch]);

  // Получение названия объекта квалификации по ID
  const getQualificationObjectName = (objectId: string) => {
    const obj = qualificationObjects.find(o => o.id === objectId);
    if (!obj) return 'Выберите объект квалификации';
    
    return obj.name || obj.vin || obj.serialNumber || `${obj.type} (без названия)`;
  };

  // Скачивание дополнительного документа
  const handleDownloadAdditionalDocument = async (document: ProjectDocument) => {
    try {
      setOperationLoading(true);
      
      const blob = await projectDocumentService.getDocumentContent(document.id);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка скачивания дополнительного документа:', error);
      alert(`Ошибка скачивания документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Получение документа по типу
  const getAdditionalDocumentByType = (documentType: 'layout_scheme' | 'test_data'): ProjectDocument | null => {
    return additionalDocuments.find(doc => doc.documentType === documentType) || null;
  };

  // Переход к анализатору данных
  const handleStartAnalysis = () => {
    const completedFiles = uploadedFiles.filter(f => f.parsingStatus === 'completed');
    if (completedFiles.length === 0) {
      alert('Нет обработанных файлов для анализа');
      return;
    }
    
    setShowAnalyzer(true);
  };

  // Если показываем анализатор, рендерим компонент анализа
  if (showAnalyzer) {
    return (
      <TimeSeriesAnalyzer 
        files={uploadedFiles.filter(f => f.parsingStatus === 'completed')}
        onBack={() => setShowAnalyzer(false)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Загрузка данных отчета...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800">Ошибка загрузки данных</h3>
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={onBack}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Вернуться к проектам
        </button>
      </div>
    );
  }

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Подготовка отчета</h1>
          <p className="text-gray-600">{project.name}</p>
        </div>
      </div>

      {/* Информация об объекте */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FolderOpen className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-blue-900">Информация об объекте</h3>
        </div>
        
        {/* Информация о проекте */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-blue-900 mb-2">Проект</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <span className="font-medium">Название:</span>
              <div>{project.name}</div>
            </div>
            <div>
              <span className="font-medium">Дата создания:</span>
              <div>{project.createdAt.toLocaleDateString('ru-RU')}</div>
            </div>
            <div>
              <span className="font-medium">Номер договора:</span>
              <div>{project.contractNumber || 'Не указан'}</div>
            </div>
          </div>
        </div>

        {/* Информация о контрагенте */}
        {contractor && (
          <div className="mb-6">
            <h4 className="text-md font-medium text-blue-900 mb-2">Контрагент</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <span className="font-medium">Наименование:</span>
                <div>{contractor.name}</div>
              </div>
              <div>
                <span className="font-medium">Адрес:</span>
                <div>{contractor.address || 'Не указан'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Селектор объекта квалификации */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-blue-900 mb-2">Объект квалификации</h4>
          <div className="relative">
            <input
              type="text"
              value={selectedQualificationObject ? getQualificationObjectName(selectedQualificationObject) : qualificationSearch}
              onChange={(e) => {
                setQualificationSearch(e.target.value);
                if (!selectedQualificationObject) {
                  setShowQualificationDropdown(true);
                }
              }}
              onFocus={() => {
                setShowQualificationDropdown(true);
                if (selectedQualificationObject) {
                  setQualificationSearch('');
                  setSelectedQualificationObject('');
                }
              }}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Выберите объект квалификации из проекта"
            />
            
            {showQualificationDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredQualificationObjects.length > 0 ? (
                  filteredQualificationObjects.map((obj) => (
                    <div
                      key={obj.id}
                      onClick={() => {
                        setSelectedQualificationObject(obj.id);
                        setQualificationSearch('');
                        setShowQualificationDropdown(false);
                      }}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">
                        {obj.name || obj.vin || obj.serialNumber || 'Без названия'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {QualificationObjectTypeLabels[obj.type]} {obj.address && `• ${obj.address}`}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-gray-500 text-sm">
                    В проекте нет объектов квалификации
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Детали выбранного объекта квалификации */}
        {selectedQualificationObject && (() => {
          const selectedObj = qualificationObjects.find(obj => obj.id === selectedQualificationObject);
          return selectedObj ? (
            <div className="p-4 bg-white border border-blue-200 rounded-lg">
              <h5 className="text-sm font-medium text-gray-900 mb-2">
                {QualificationObjectTypeLabels[selectedObj.type]}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                {selectedObj.name && (
                  <div>
                    <span className="font-medium">Наименование:</span>
                    <span className="ml-2">{selectedObj.name}</span>
                  </div>
                )}
                {selectedObj.address && (
                  <div>
                    <span className="font-medium">Адрес:</span>
                    <span className="ml-2">{selectedObj.address}</span>
                  </div>
                )}
                {selectedObj.area && (
                  <div>
                    <span className="font-medium">Площадь:</span>
                    <span className="ml-2">{selectedObj.area} м²</span>
                  </div>
                )}
                {selectedObj.climateSystem && (
                  <div>
                    <span className="font-medium">Климатическая установка:</span>
                    <span className="ml-2">{selectedObj.climateSystem}</span>
                  </div>
                )}
                {selectedObj.vin && (
                  <div>
                    <span className="font-medium">VIN:</span>
                    <span className="ml-2">{selectedObj.vin}</span>
                  </div>
                )}
                {selectedObj.registrationNumber && (
                  <div>
                    <span className="font-medium">Рег. номер:</span>
                    <span className="ml-2">{selectedObj.registrationNumber}</span>
                  </div>
                )}
                {selectedObj.bodyVolume && (
                  <div>
                    <span className="font-medium">Объем кузова:</span>
                    <span className="ml-2">{selectedObj.bodyVolume} м³</span>
                  </div>
                )}
                {selectedObj.inventoryNumber && (
                  <div>
                    <span className="font-medium">Инв. номер:</span>
                    <span className="ml-2">{selectedObj.inventoryNumber}</span>
                  </div>
                )}
                {selectedObj.chamberVolume && (
                  <div>
                    <span className="font-medium">Объем камеры:</span>
                    <span className="ml-2">{selectedObj.chamberVolume} м³</span>
                  </div>
                )}
                {selectedObj.serialNumber && (
                  <div>
                    <span className="font-medium">Серийный номер:</span>
                    <span className="ml-2">{selectedObj.serialNumber}</span>
                  </div>
                )}
              </div>
            </div>
          ) : null;
        })()}
      </div>

      {/* Дополнительные документы */}
      {selectedQualificationObject && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Дополнительные документы</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Схема расстановки */}
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-3">Схема расстановки</h3>
              {(() => {
                const document = getAdditionalDocumentByType('layout_scheme');
                return document ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {document.fileName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                          </div>
                          <div className="text-xs text-gray-500">
                            Загружен: {document.uploadedAt.toLocaleString('ru-RU')}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadAdditionalDocument(document)}
                        disabled={operationLoading}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Скачать"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg text-center">
                    Схема расстановки не загружена
                  </div>
                );
              })()}
            </div>

            {/* Данные о проведении испытаний */}
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-3">Данные о проведении испытаний</h3>
              {(() => {
                const document = getAdditionalDocumentByType('test_data');
                return document ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {document.fileName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                          </div>
                          <div className="text-xs text-gray-500">
                            Загружен: {document.uploadedAt.toLocaleString('ru-RU')}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadAdditionalDocument(document)}
                        disabled={operationLoading}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Скачать"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg text-center">
                    Данные о проведении испытаний не загружены
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Файлы данных */}
      {selectedQualificationObject && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Файлы данных измерений</h2>
            <button
              onClick={handleStartAnalysis}
              disabled={uploadedFiles.filter(f => f.parsingStatus === 'completed').length === 0}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              <span>Начать анализ данных</span>
            </button>
          </div>

          {uploadedFiles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Имя файла
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Период данных
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Количество записей
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      № зоны
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Уровень (м.)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uploadedFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{file.name}</div>
                          <div className="text-xs text-gray-500">{file.uploadDate}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {file.period || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {file.recordCount ? file.recordCount.toLocaleString('ru-RU') : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {file.zoneNumber === 999 ? 'Внешний' : (file.zoneNumber || '-')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {file.measurementLevel || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {file.parsingStatus === 'completed' ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Готов к анализу
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              {file.parsingStatus === 'processing' ? 'Обработка' : 'Ошибка'}
                            </span>
                          )}
                        </div>
                        {file.errorMessage && (
                          <div className="text-xs text-red-600 mt-1">{file.errorMessage}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Файлы данных не найдены</p>
              <p className="text-sm">Загрузите файлы на этапе "Выгрузка данных"</p>
            </div>
          )}
        </div>
      )}

      {/* Инструкции */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Инструкции по подготовке отчета</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start space-x-2">
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
            <p>Выберите объект квалификации для анализа данных</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
            <p>Убедитесь, что все необходимые документы загружены (схема расстановки, данные испытаний)</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
            <p>Проверьте наличие файлов данных измерений в статусе "Готов к анализу"</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
            <p>Нажмите "Начать анализ данных" для перехода к анализатору временных рядов</p>
          </div>
        </div>
      </div>
    </div>
  );
};