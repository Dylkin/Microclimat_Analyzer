import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, AlertTriangle } from 'lucide-react';
import { Project } from '../types/Project';
import { Contractor } from '../types/Contractor';
import { contractorService } from '../utils/contractorService';
import { qualificationProtocolService, QualificationProtocolWithDocument } from '../utils/qualificationProtocolService';
import { ProjectInfo } from './contract/ProjectInfo';
import { QualificationObjectsCRUD } from './contract/QualificationObjectsCRUD';

interface TestingExecutionProps {
  project: Project;
  onBack: () => void;
  onPageChange?: (page: string, data?: any) => void;
}

const TestingExecution: React.FC<TestingExecutionProps> = ({ project, onBack, onPageChange }) => {
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [qualificationProtocols, setQualificationProtocols] = useState<QualificationProtocolWithDocument[]>([]);
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Безопасная проверка данных проекта
  if (!project || !project.id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            title="Назад"
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

  // Загрузка данных контрагента
  const loadContractor = async () => {
    if (!contractorService.isAvailable()) {
      setError('Supabase не настроен для работы с контрагентами');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const contractorData = await contractorService.getContractorById(project.contractorId);
      setContractor(contractorData);
    } catch (error) {
      console.error('Ошибка загрузки контрагента:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка протоколов квалификации
  const loadQualificationProtocols = async () => {
    if (!qualificationProtocolService.isAvailable()) {
      console.warn('Supabase не настроен для работы с протоколами квалификации');
      return;
    }

    try {
      const protocols = await qualificationProtocolService.getProjectProtocols(project.id);
      setQualificationProtocols(protocols);
    } catch (error) {
      console.error('Ошибка загрузки протоколов квалификации:', error);
      // Не устанавливаем ошибку, так как это не критично для работы страницы
    }
  };

  useEffect(() => {
    loadContractor();
    loadQualificationProtocols();
  }, [project.contractorId, project.id]);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 transition-colors"
          title="Назад"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <Play className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Проведение испытаний</h1>
      </div>

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

      {/* Project Info */}
      <ProjectInfo project={project} contractor={contractor || undefined} />

      {/* Qualification Objects */}
      <QualificationObjectsCRUD 
        contractorId={project.contractorId}
        contractorName={project.contractorName || 'Неизвестный контрагент'}
        projectId={project.id}
        project={project}
        projectQualificationObjects={project.qualificationObjects}
        qualificationProtocols={qualificationProtocols}
        onPageChange={onPageChange}
      />
    </div>
  );
};

export default TestingExecution;