import React, { useState, useEffect } from 'react';
import { Project } from '../../types/Project';
import { Contractor } from '../../types/Contractor';
import { Phone, User, MapPin, Building2, Calendar } from 'lucide-react';
import { projectPeriodService, ProjectPeriod } from '../../utils/projectPeriodService';

interface ProjectInfoProps {
  project: Project;
  contractor?: Contractor;
}

export const ProjectInfo: React.FC<ProjectInfoProps> = ({ project, contractor }) => {
  const [projectPeriod, setProjectPeriod] = useState<ProjectPeriod | null>(null);
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  // Загрузка периода проведения проекта
  useEffect(() => {
    const loadProjectPeriod = async () => {
      if (!projectPeriodService.isAvailable()) {
        return;
      }

      setLoadingPeriod(true);
      try {
        const period = await projectPeriodService.getProjectPeriod(project.id);
        setProjectPeriod(period);
      } catch (error) {
        console.error('Ошибка загрузки периода проекта:', error);
      } finally {
        setLoadingPeriod(false);
      }
    };

    loadProjectPeriod();
  }, [project.id]);

  // Функция для генерации ссылки на карту
  const getMapUrl = (address: string, latitude?: number, longitude?: number) => {
    if (latitude && longitude) {
      return `https://www.google.com/maps?q=${latitude},${longitude}`;
    } else if (address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Информация о проекте</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левый блок - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Основная информация о проекте */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Название проекта</label>
              <p className="text-gray-900">{project.name || 'Не указано'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Дата создания</label>
              <p className="text-gray-900">
                {project.createdAt ? new Date(project.createdAt).toLocaleDateString('ru-RU') : 'Не указана'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Период проведения
              </label>
              {loadingPeriod ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                  <span className="text-gray-500 text-sm">Загрузка...</span>
                </div>
              ) : (
                <p className="text-gray-900">
                  {projectPeriod ? projectPeriodService.formatPeriod(projectPeriod) : 'Не установлен'}
                </p>
              )}
            </div>
          </div>

          {/* Описание проекта */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Описание</label>
            <p className="text-gray-900">{project.description || 'Не указано'}</p>
          </div>

          {/* Контакты контрагента */}
          {contractor && contractor.contacts && contractor.contacts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Контакты контрагента</label>
              <div className="space-y-3">
                {contractor.contacts.map((contact) => (
                  <div key={contact.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <User className="w-5 h-5 text-gray-400 mt-0.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">{contact.employeeName}</h4>
                        </div>
                        {contact.phone && (
                          <div className="mt-1 flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <a 
                              href={`tel:${contact.phone}`}
                              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {contact.phone}
                            </a>
                          </div>
                        )}
                        {contact.comment && (
                          <p className="mt-1 text-sm text-gray-600">{contact.comment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Правый блок - 1/3 */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Контрагент
            </h3>
            
            {/* Наименование контрагента */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Наименование</label>
              <p className="text-gray-900 font-medium">{contractor?.name || project.contractorName || 'Не указан'}</p>
            </div>

            {/* Расположение с картой */}
            {contractor && (contractor.address || (contractor.latitude && contractor.longitude)) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Расположение</label>
                <div className="relative">
                  {/* Заглушка для карты */}
                  <div className="bg-gray-200 rounded-lg h-48 flex items-center justify-center border border-gray-300">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">Адрес контрагента</p>
                      {contractor.address && (
                        <p className="text-xs text-gray-500 mb-3">{contractor.address}</p>
                      )}
                      {getMapUrl(contractor.address || '', contractor.latitude, contractor.longitude) && (
                        <a
                          href={getMapUrl(contractor.address || '', contractor.latitude, contractor.longitude)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          Открыть в картах
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};