import React from 'react';
import { Project } from '../../types/Project';

interface ProjectInfoProps {
  project: Project;
}

export const ProjectInfo: React.FC<ProjectInfoProps> = ({ project }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Информация о проекте</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Название проекта</label>
          <p className="text-gray-900">{project.name || 'Не указано'}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Контрагент</label>
          <p className="text-gray-900">{project.contractorName || 'Не указан'}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Статус</label>
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Согласование договора
          </span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Дата создания</label>
          <p className="text-gray-900">
            {project.createdAt ? new Date(project.createdAt).toLocaleDateString('ru-RU') : 'Не указана'}
          </p>
        </div>
      </div>
      {project.description && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Описание</label>
          <p className="text-gray-900">{project.description}</p>
        </div>
      )}
    </div>
  );
};