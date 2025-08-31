import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, Play } from 'lucide-react';
import { Project } from '../types/Project';
import { projectDocumentService, ProjectDocument } from '../utils/projectDocumentService';
import { useAuth } from '../contexts/AuthContext';
import { ProjectInfo } from './contract/ProjectInfo';
import { QualificationObjectsDisplay } from './contract/QualificationObjectsDisplay';

interface TestingExecutionProps {
  project: Project;
  onBack: () => void;
}

export const TestingExecution: React.FC<TestingExecutionProps> = ({ project, onBack }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [protocolDocuments, setProtocolDocuments] = useState<ProjectDocument[]>([]);
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
          <FileText className="w-8 h-8 text-red-600" />
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
      
      // Фильтруем протоколы (используем тип layout_scheme для протоколов)
      const protocols = docs.filter(doc => doc.documentType === 'layout_scheme');
      setProtocolDocuments(protocols);
    } catch (error) {
      console.error('Ошибка загрузки документов:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [project.id]);

  // Получение договора и протокола из документов
  const contractDoc = documents.find(doc => doc.documentType === 'contract');
  const hasProtocol = protocolDocuments.length > 0;

  // Переход к анализатору данных
  const handleStartAnalysis = () => {
    if (!contractDoc || !hasProtocol) {
      alert('Для начала испытаний необходимы договор и протокол');
      return;
    }

    // Переходим к анализатору с данными проекта
    const projectData = {
      id: project.id,
      name: project.name,
      contractorId: project.contractorId,
      contractorName: project.contractorName,
      qualificationObjects: project.qualificationObjects,
      status: project.status
    };

    // Здесь можно добавить логику перехода к анализатору
    console.log('Переход к анализатору данных для проекта:', projectData);
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
              <h3 className="text-sm font-medium text-red-800">Ошибка загрузки документов</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Qualification Objects Display */}
      <QualificationObjectsDisplay 
        contractorId={project.contractorId}
        contractorName={project.contractorName || 'Неизвестный контрагент'}
        selectedObjectIds={project.qualificationObjects.map(obj => obj.qualificationObjectId)}
      />

      {/* Status Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Статус готовности к испытаниям</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {contractDoc ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-medium text-gray-900">Договор</span>
            </div>
            <span className={`text-sm px-2 py-1 rounded-full ${
              contractDoc 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {contractDoc ? 'Готов' : 'Не найден'}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {hasProtocol ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-medium text-gray-900">Протокол</span>
            </div>
            <span className={`text-sm px-2 py-1 rounded-full ${
              hasProtocol 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {hasProtocol ? 'Готов' : 'Не найден'}
            </span>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Готовность к испытаниям</span>
            <span className="text-sm text-gray-500">
              {(contractDoc ? 1 : 0) + (hasProtocol ? 1 : 0)} из 2 требований
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${((contractDoc ? 1 : 0) + (hasProtocol ? 1 : 0)) / 2 * 100}%` 
              }}
            ></div>
          </div>
        </div>

        {/* Start Testing Button */}
        {contractDoc && hasProtocol && (
          <div className="mt-6 text-center">
            <button
              onClick={handleStartAnalysis}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 mx-auto text-lg font-medium"
            >
              <Play className="w-5 h-5" />
              <span>Начать испытания</span>
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Инструкции по проведению испытаний:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Проверьте готовность:</strong> Убедитесь, что договор и протокол загружены</li>
          <li>• <strong>Объекты квалификации:</strong> Проверьте список объектов для испытаний</li>
          <li>• <strong>Начало испытаний:</strong> Нажмите "Начать испытания" для перехода к анализатору</li>
          <li>• <strong>Загрузка данных:</strong> В анализаторе загрузите файлы измерений в формате .vi2</li>
          <li>• <strong>Анализ результатов:</strong> Проведите анализ данных и сформируйте отчет</li>
        </ul>
      </div>
    </div>
  );
};