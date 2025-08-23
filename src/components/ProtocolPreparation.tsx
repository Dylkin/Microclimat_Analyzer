import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, FileText, Upload, Download, Trash2, CheckCircle, AlertCircle, Calendar, Package, Hash, MapPin, Car, Refrigerator, Snowflake, Building } from 'lucide-react';
import { Project } from '../types/Project';
import { Contractor } from '../types/Contractor';
import { QualificationObject, QualificationObjectTypeLabels } from '../types/QualificationObject';
import { ProjectDocument, DocumentTypeLabels } from '../types/ProjectDocument';
import { contractorService } from '../utils/contractorService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { projectService } from '../utils/projectService';
import { projectDocumentService } from '../utils/projectDocumentService';

interface ProtocolPreparationProps {
  project: Project;
  onBack: () => void;
}

interface ProtocolFile {
  objectId: string;
  file: File;
  uploadDate: Date;
}

export const ProtocolPreparation: React.FC<ProtocolPreparationProps> = ({ project, onBack }) => {
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);
  const [protocolFiles, setProtocolFiles] = useState<ProtocolFile[]>([]);
  const [completedObjects, setCompletedObjects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);

  // Загрузка данных
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

        // Загружаем документы проекта
        if (projectDocumentService.isAvailable()) {
          const documentsData = await projectDocumentService.getProjectDocuments(project.id);
          setProjectDocuments(documentsData);
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

  // Получение документа по типу
  const getDocumentByType = (documentType: 'commercial_offer' | 'contract'): ProjectDocument | null => {
    return projectDocuments.find(doc => doc.documentType === documentType) || null;
  };

  // Скачивание документа проекта
  const handleDownloadProjectDocument = async (document: ProjectDocument) => {
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
      console.error('Ошибка скачивания документа:', error);
      alert(`Ошибка скачивания документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Получение иконки для типа объекта квалификации
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'помещение':
        return <Building className="w-5 h-5 text-blue-600" />;
      case 'автомобиль':
        return <Car className="w-5 h-5 text-green-600" />;
      case 'холодильная_камера':
        return <Refrigerator className="w-5 h-5 text-cyan-600" />;
      case 'холодильник':
        return <Refrigerator className="w-5 h-5 text-blue-500" />;
      case 'морозильник':
        return <Snowflake className="w-5 h-5 text-indigo-600" />;
      default:
        return <Building className="w-5 h-5 text-gray-600" />;
    }
  };

  // Рендер деталей объекта квалификации
  const renderObjectDetails = (obj: QualificationObject) => {
    const details = [];

    switch (obj.type) {
      case 'помещение':
        if (obj.address) details.push({ icon: <MapPin className="w-4 h-4" />, label: 'Адрес', value: obj.address });
        if (obj.area) details.push({ icon: <Package className="w-4 h-4" />, label: 'Площадь', value: `${obj.area} м²` });
        if (obj.climateSystem) details.push({ icon: <Package className="w-4 h-4" />, label: 'Климат-система', value: obj.climateSystem });
        break;
      case 'автомобиль':
        if (obj.vin) details.push({ icon: <Hash className="w-4 h-4" />, label: 'VIN', value: obj.vin });
        if (obj.registrationNumber) details.push({ icon: <Car className="w-4 h-4" />, label: 'Рег. номер', value: obj.registrationNumber });
        if (obj.bodyVolume) details.push({ icon: <Package className="w-4 h-4" />, label: 'Объем кузова', value: `${obj.bodyVolume} м³` });
        if (obj.climateSystem) details.push({ icon: <Package className="w-4 h-4" />, label: 'Климат-система', value: obj.climateSystem });
        break;
      case 'холодильная_камера':
        if (obj.inventoryNumber) details.push({ icon: <Hash className="w-4 h-4" />, label: 'Инв. номер', value: obj.inventoryNumber });
        if (obj.chamberVolume) details.push({ icon: <Package className="w-4 h-4" />, label: 'Объем камеры', value: `${obj.chamberVolume} м³` });
        if (obj.climateSystem) details.push({ icon: <Package className="w-4 h-4" />, label: 'Климат-система', value: obj.climateSystem });
        break;
      case 'холодильник':
      case 'морозильник':
        if (obj.serialNumber) details.push({ icon: <Hash className="w-4 h-4" />, label: 'Серийный номер', value: obj.serialNumber });
        if (obj.inventoryNumber) details.push({ icon: <Hash className="w-4 h-4" />, label: 'Инв. номер', value: obj.inventoryNumber });
        break;
    }

    return (
      <div className="space-y-2">
        {details.map((detail, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
            {detail.icon}
            <span className="font-medium">{detail.label}:</span>
            <span>{detail.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Загрузка протокола для объекта квалификации
  const handleProtocolUpload = (objectId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем формат файла
    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Можно загружать только файлы в формате DOCX');
      return;
    }

    // Проверяем размер файла (максимум 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10 MB');
      return;
    }

    // Удаляем старый файл для этого объекта если есть
    setProtocolFiles(prev => prev.filter(pf => pf.objectId !== objectId));

    // Добавляем новый файл
    const newProtocolFile: ProtocolFile = {
      objectId,
      file,
      uploadDate: new Date()
    };

    setProtocolFiles(prev => [...prev, newProtocolFile]);
  };

  // Удаление протокола
  const handleRemoveProtocol = (objectId: string) => {
    setProtocolFiles(prev => prev.filter(pf => pf.objectId !== objectId));
  };

  // Скачивание протокола
  const handleDownloadProtocol = (protocolFile: ProtocolFile) => {
    const url = URL.createObjectURL(protocolFile.file);
    const link = document.createElement('a');
    link.href = url;
    link.download = protocolFile.file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Завершение подготовки протокола для объекта
  const handleCompleteProtocol = async (objectId: string) => {
    const protocolFile = protocolFiles.find(pf => pf.objectId === objectId);
    
    if (!protocolFile) {
      alert('Сначала загрузите протокол для этого объекта квалификации');
      return;
    }

    if (confirm('Вы уверены, что хотите завершить подготовку протокола для этого объекта?')) {
      setOperationLoading(true);
      try {
        // Добавляем объект в список завершенных
        setCompletedObjects(prev => new Set([...prev, objectId]));
        
        // В реальном проекте здесь можно было бы обновить статус в базе данных
        console.log('Протокол завершен для объекта:', objectId);
        
        alert('Подготовка протокола завершена для выбранного объекта квалификации');
      } catch (error) {
        console.error('Ошибка завершения протокола:', error);
        alert(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setOperationLoading(false);
      }
    }
  };

  // Проверка готовности всех протоколов
  const allProtocolsCompleted = qualificationObjects.length > 0 && 
    qualificationObjects.every(obj => completedObjects.has(obj.id));

  // Завершение подготовки всех протоколов
  const handleCompleteAllProtocols = async () => {
    if (!allProtocolsCompleted) {
      alert('Завершите подготовку протоколов для всех объектов квалификации');
      return;
    }

    if (confirm('Вы уверены, что хотите завершить подготовку всех протоколов и перейти к следующему этапу?')) {
      setOperationLoading(true);
      try {
        // Обновляем статус проекта на следующий этап
        await projectService.updateProject(project.id, {
          status: 'testing_start'
        });
        
        alert('Подготовка протоколов завершена. Проект переведен в стадию "Начало испытаний"');
        onBack();
      } catch (error) {
        console.error('Ошибка обновления статуса проекта:', error);
        alert(`Ошибка обновления статуса проекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setOperationLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Загрузка данных протокола...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Подготовка протокола</h1>
          <p className="text-gray-600">{project.name}</p>
        </div>
      </div>

      {/* Project Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-4">Информация о проекте</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm font-medium text-blue-900">Дата создания:</span>
            <div className="text-blue-800">{project.createdAt.toLocaleDateString('ru-RU')}</div>
          </div>
          <div>
            <span className="text-sm font-medium text-blue-900">Номер договора:</span>
            <div className="text-blue-800">{project.contractNumber || 'Не указан'}</div>
          </div>
          <div>
            <span className="text-sm font-medium text-blue-900">Статус:</span>
            <div className="text-blue-800">Подготовка протокола</div>
          </div>
        </div>

        {/* Project Documents */}
        <div className="mt-4 p-4 bg-white border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Документы проекта</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Commercial Offer */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                {DocumentTypeLabels.commercial_offer}
              </label>
              {(() => {
                const document = getDocumentByType('commercial_offer');
                return document ? (
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{document.fileName}</div>
                        <div className="text-xs text-gray-500">
                          {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadProjectDocument(document)}
                      disabled={operationLoading}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Скачать"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg text-center">
                    Не загружено
                  </div>
                );
              })()}
            </div>

            {/* Contract */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                {DocumentTypeLabels.contract}
              </label>
              {(() => {
                const document = getDocumentByType('contract');
                return document ? (
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{document.fileName}</div>
                        <div className="text-xs text-gray-500">
                          {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadProjectDocument(document)}
                      disabled={operationLoading}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Скачать"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg text-center">
                    Не загружено
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Contractor Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Информация о контрагенте</h2>
        
        {contractor ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Наименование</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {contractor.name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {contractor.address || 'Не указан'}
                </div>
              </div>
            </div>

            {/* Contacts */}
            {contractor.contacts.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Контакты</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {contractor.contacts.map((contact) => (
                    <div key={contact.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-gray-900">{contact.employeeName}</div>
                      {contact.phone && (
                        <div className="text-sm text-gray-600">📞 {contact.phone}</div>
                      )}
                      {contact.comment && (
                        <div className="text-xs text-gray-500">{contact.comment}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p>Информация о контрагенте недоступна</p>
          </div>
        )}
      </div>

      {/* Qualification Objects with Protocol Upload */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Объекты квалификации и протоколы</h2>
          <div className="text-sm text-gray-600">
            Завершено: {completedObjects.size} из {qualificationObjects.length}
          </div>
        </div>
        
        {qualificationObjects.length > 0 ? (
          <div className="space-y-6">
            {qualificationObjects.map((obj) => {
              const protocolFile = protocolFiles.find(pf => pf.objectId === obj.id);
              const isCompleted = completedObjects.has(obj.id);
              
              return (
                <div key={obj.id} className={`border rounded-lg p-6 ${
                  isCompleted ? 'border-green-300 bg-green-50' : 'border-gray-200'
                }`}>
                  {/* Object Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getTypeIcon(obj.type)}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {obj.name || obj.vin || obj.serialNumber || 'Без названия'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {QualificationObjectTypeLabels[obj.type]}
                        </p>
                      </div>
                    </div>
                    {isCompleted && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Протокол готов</span>
                      </div>
                    )}
                  </div>

                  {/* Object Details */}
                  <div className="mb-4">
                    {renderObjectDetails(obj)}
                  </div>

                  {/* Protocol Upload Section */}
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Протокол испытаний</h4>
                    
                    {protocolFile ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-6 h-6 text-green-600" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {protocolFile.file.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                Загружен: {protocolFile.uploadDate.toLocaleString('ru-RU')}
                              </div>
                              <div className="text-xs text-gray-500">
                                Размер: {(protocolFile.file.size / 1024 / 1024).toFixed(2)} MB
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDownloadProtocol(protocolFile)}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="Скачать протокол"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleRemoveProtocol(obj.id)}
                              disabled={isCompleted}
                              className="text-red-600 hover:text-red-800 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
                              title="Удалить протокол"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept=".docx"
                          onChange={(e) => handleProtocolUpload(obj.id, e)}
                          className="hidden"
                          id={`protocol-upload-${obj.id}`}
                          disabled={isCompleted}
                        />
                        <label
                          htmlFor={`protocol-upload-${obj.id}`}
                          className={`cursor-pointer flex flex-col items-center space-y-2 ${
                            isCompleted ? 'cursor-not-allowed opacity-50' : ''
                          }`}
                        >
                          <Upload className="w-8 h-8 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Загрузить протокол испытаний
                          </span>
                          <span className="text-xs text-gray-500">
                            DOCX файл, до 10 MB
                          </span>
                        </label>
                      </div>
                    )}

                    {/* Complete Protocol Button */}
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleCompleteProtocol(obj.id)}
                        disabled={!protocolFile || isCompleted || operationLoading}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Протокол завершен</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Завершить подготовку протокола</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Объекты квалификации не найдены</p>
            <p className="text-sm">Проверьте настройки проекта</p>
          </div>
        )}
      </div>

      {/* Protocol Requirements */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-4">Требования к протоколам</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800">
          <div>
            <h4 className="font-medium mb-2">Формат файлов:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Только файлы в формате DOCX</li>
              <li>Максимальный размер: 10 MB</li>
              <li>Один протокол на объект квалификации</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Содержание протокола:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Описание объекта квалификации</li>
              <li>Методика проведения испытаний</li>
              <li>Критерии приемлемости</li>
              <li>План размещения датчиков</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Progress and Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Прогресс подготовки</h2>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Готовность протоколов</span>
            <span>{completedObjects.size} из {qualificationObjects.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: qualificationObjects.length > 0 
                  ? `${(completedObjects.size / qualificationObjects.length) * 100}%` 
                  : '0%' 
              }}
            ></div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{qualificationObjects.length}</div>
            <div className="text-sm text-blue-800">Всего объектов</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{completedObjects.size}</div>
            <div className="text-sm text-green-800">Протоколы готовы</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {qualificationObjects.length - completedObjects.size}
            </div>
            <div className="text-sm text-yellow-800">Требуют подготовки</div>
          </div>
        </div>

        {/* Final Action */}
        <div className="flex justify-center">
          {allProtocolsCompleted ? (
            <button
              onClick={handleCompleteAllProtocols}
              disabled={operationLoading}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 text-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {operationLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Завершение...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Завершить подготовку протоколов</span>
                </>
              )}
            </button>
          ) : (
            <div className="text-center">
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center space-x-2 text-yellow-800">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">
                    Завершите подготовку протоколов для всех объектов квалификации
                  </span>
                </div>
              </div>
              <button
                disabled
                className="bg-gray-400 text-white px-6 py-3 rounded-lg cursor-not-allowed flex items-center space-x-2 text-lg font-medium"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Завершить подготовку протоколов</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Инструкции по подготовке протокола</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start space-x-2">
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
            <p>Загрузите протокол испытаний в формате DOCX для каждого объекта квалификации</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
            <p>Убедитесь, что протокол содержит все необходимые разделы: описание объекта, методику, критерии приемлемости</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
            <p>Нажмите "Завершить подготовку протокола" для каждого объекта после загрузки и проверки</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
            <p>После завершения всех протоколов проект автоматически перейдет к этапу "Проведение испытаний"</p>
          </div>
        </div>
      </div>
    </div>
  );
};