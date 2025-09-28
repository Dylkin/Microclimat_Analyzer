import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, AlertTriangle, Eye, Download, FileText, Building, Car, Refrigerator, Snowflake } from 'lucide-react';
import { Project } from '../types/Project';
import { projectDocumentService, ProjectDocument } from '../utils/projectDocumentService';
import { QualificationObject, QualificationObjectTypeLabels } from '../types/QualificationObject';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { useAuth } from '../contexts/AuthContext';
import { ProjectInfo } from './contract/ProjectInfo';
import { QualificationObjectsCRUD } from './contract/QualificationObjectsCRUD';

interface TestingExecutionProps {
  project: Project;
  onBack: () => void;
}

export const TestingExecution: React.FC<TestingExecutionProps> = ({ project, onBack }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Безопасная проверка данных проекта
  if (!project || !project.id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <Play className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Ошибка загрузки проекта</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">Данные проекта не найдены или повреждены</p>
        </div>
      </div>
    );
  }

  // Загрузка документов проекта
  const loadDocuments = async () => {
    if (!projectDocumentService.isAvailable()) {
      setError('Supabase не настроен для работы с документами');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const docs = await projectDocumentService.getProjectDocuments(project.id);
      setDocuments(docs);
    } catch (error) {
      console.error('Ошибка загрузки документов:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка объектов квалификации
  const loadQualificationObjects = async () => {
    if (!qualificationObjectService.isAvailable()) {
      setError('Supabase не настроен для работы с объектами квалификации');
      return;
    }

    try {
      const objects = await qualificationObjectService.getQualificationObjectsByContractor(project.contractorId);
      
      // Фильтруем объекты, которые входят в проект
      const projectObjectIds = project.qualificationObjects.map(obj => obj.qualificationObjectId);
      const filteredObjects = objects.filter(obj => projectObjectIds.includes(obj.id));
      
      setQualificationObjects(filteredObjects);
    } catch (error) {
      console.error('Ошибка загрузки объектов квалификации:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    }
  };

  useEffect(() => {
    loadDocuments();
    loadQualificationObjects();
  }, [project.id]);

  // Скачивание протокола
  const handleDownloadProtocol = async (document: ProjectDocument) => {
    try {
      const blob = await projectDocumentService.downloadDocument(document.fileUrl);
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = document.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка скачивания протокола:', error);
      alert(`Ошибка скачивания протокола: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Просмотр протокола
  const handleViewProtocol = (document: ProjectDocument) => {
    window.open(document.fileUrl, '_blank');
  };

  // Форматирование размера файла
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Получение иконки для типа объекта
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'помещение':
        return <Building className="w-4 h-4 text-blue-600" />;
      case 'автомобиль':
        return <Car className="w-4 h-4 text-green-600" />;
      case 'холодильная_камера':
        return <Refrigerator className="w-4 h-4 text-cyan-600" />;
      case 'холодильник':
        return <Refrigerator className="w-4 h-4 text-blue-500" />;
      case 'морозильник':
        return <Snowflake className="w-4 h-4 text-indigo-600" />;
      default:
        return <Building className="w-4 h-4 text-gray-600" />;
    }
  };

  // Отображение деталей объекта
  const renderObjectDetails = (obj: QualificationObject) => {
    switch (obj.type) {
      case 'помещение':
        return (
          <div className="text-sm text-gray-600">
            {obj.address && <div>📍 {obj.address}</div>}
            {obj.area && <div>📐 {obj.area} м²</div>}
            {obj.manufacturer && <div>🏭 {obj.manufacturer}</div>}
            {obj.climateSystem && <div>❄️ {obj.climateSystem}</div>}
          </div>
        );
      case 'автомобиль':
        return (
          <div className="text-sm text-gray-600">
            {obj.vin && <div>🔢 VIN: {obj.vin}</div>}
            {obj.registrationNumber && <div>🚗 {obj.registrationNumber}</div>}
            {obj.bodyVolume && <div>📦 {obj.bodyVolume} м³</div>}
            {obj.climateSystem && <div>❄️ {obj.climateSystem}</div>}
          </div>
        );
      case 'холодильная_камера':
        return (
          <div className="text-sm text-gray-600">
            {obj.inventoryNumber && <div>📋 Инв. №: {obj.inventoryNumber}</div>}
            {obj.chamberVolume && <div>📦 {obj.chamberVolume} м³</div>}
            {obj.manufacturer && <div>🏭 {obj.manufacturer}</div>}
            {obj.climateSystem && <div>❄️ {obj.climateSystem}</div>}
          </div>
        );
      case 'холодильник':
      case 'морозильник':
        return (
          <div className="text-sm text-gray-600">
            {obj.serialNumber && <div>🔢 S/N: {obj.serialNumber}</div>}
            {obj.inventoryNumber && <div>📋 Инв. №: {obj.inventoryNumber}</div>}
            {obj.manufacturer && <div>🏭 {obj.manufacturer}</div>}
            {obj.measurementZones && obj.measurementZones.length > 0 && (
              <div>📍 Зон измерения: {obj.measurementZones.length}</div>
            )}
          </div>
        );
      default:
        return (
          <div className="text-sm text-gray-600">
            {obj.measurementZones && obj.measurementZones.length > 0 && (
              <div>📍 Зон измерения: {obj.measurementZones.length}</div>
            )}
          </div>
        );
    }
  };

  // Получение протоколов (используем layout_scheme для протоколов)
  const protocolDocuments = documents.filter(doc => doc.documentType === 'layout_scheme');

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
        <Play className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Проведение испытаний</h1>
      </div>

      {/* Project Info */}
      <ProjectInfo project={project} />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Ошибка загрузки данных</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Qualification Objects */}
      <QualificationObjectsCRUD 
        contractorId={project.contractorId}
        contractorName={project.contractorName || 'Неизвестный контрагент'}
        projectId={project.id}
        readOnlyTestingPeriods={true}
      />

      {/* Protocol Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Протокол</h3>
        
        {protocolDocuments.length > 0 ? (
          <div className="space-y-4">
            {protocolDocuments.map((protocol) => (
              <div key={protocol.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {protocol.fileName}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(protocol.fileSize)} • 
                        Загружен {protocol.uploadedAt.toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewProtocol(protocol)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Просмотреть протокол"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDownloadProtocol(protocol)}
                      className="text-green-600 hover:text-green-800 transition-colors"
                      title="Скачать протокол"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Протокол не найден</p>
            <p className="text-sm text-gray-400">
              Протокол должен быть загружен на этапе подготовки протокола
            </p>
          </div>
        )}
      </div>

      {/* Testing Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Инструкции по проведению испытаний:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Проверьте протокол:</strong> Убедитесь, что протокол загружен и доступен для просмотра</li>
          <li>• <strong>Изучите объекты квалификации:</strong> Ознакомьтесь с расстановкой оборудования</li>
          <li>• <strong>Подготовьте оборудование:</strong> Убедитесь, что все назначенное оборудование готово к работе</li>
          <li>• <strong>Следуйте протоколу:</strong> Выполняйте испытания согласно загруженному протоколу</li>
          <li>• <strong>Фиксируйте результаты:</strong> Записывайте все данные измерений</li>
          <li>• <strong>Переход к анализу:</strong> После завершения испытаний переходите к анализу данных</li>
        </ul>
      </div>

      {/* Testing Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Инструкции по проведению испытаний:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Проверьте протокол:</strong> Убедитесь, что протокол загружен и доступен для просмотра</li>
          <li>• <strong>Изучите объекты квалификации:</strong> Ознакомьтесь с расстановкой оборудования</li>
          <li>• <strong>Подготовьте оборудование:</strong> Убедитесь, что все назначенное оборудование готово к работе</li>
          <li>• <strong>Следуйте протоколу:</strong> Выполняйте испытания согласно загруженному протоколу</li>
          <li>• <strong>Фиксируйте результаты:</strong> Записывайте все данные измерений</li>
          <li>• <strong>Переход к анализу:</strong> После завершения испытаний переходите к анализу данных</li>
        </ul>
      </div>
    </div>
  );
};