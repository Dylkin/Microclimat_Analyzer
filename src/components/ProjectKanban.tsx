import React, { useState } from 'react';
import { Project } from '../types/Project';
import { ProjectCard } from './ProjectCard';
import { Plus, MoreHorizontal } from 'lucide-react';

interface ProjectKanbanProps {
  projects: Project[];
}

interface KanbanColumn {
  id: string;
  title: string;
  status: Project['status'][];
  color: string;
}

export const ProjectKanban: React.FC<ProjectKanbanProps> = ({ projects }) => {
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);

  const columns: KanbanColumn[] = [
    {
      id: 'draft',
      title: 'Черновики',
      status: ['draft'],
      color: 'bg-gray-100'
    },
    {
      id: 'preparation',
      title: 'Подготовка',
      status: ['preparation'],
      color: 'bg-blue-100'
    },
    {
      id: 'testing',
      title: 'Испытания',
      status: ['testing'],
      color: 'bg-yellow-100'
    },
    {
      id: 'reporting',
      title: 'Отчетность',
      status: ['reporting'],
      color: 'bg-purple-100'
    },
    {
      id: 'completed',
      title: 'Завершенные',
      status: ['completed', 'cancelled', 'on_hold'],
      color: 'bg-green-100'
    }
  ];

  const getProjectsByColumn = (columnStatuses: Project['status'][]) => {
    return projects.filter(project => columnStatuses.includes(project.status));
  };

  const handleDragStart = (e: React.DragEvent, project: Project) => {
    setDraggedProject(project);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: Project['status'][]) => {
    e.preventDefault();
    
    if (draggedProject && targetStatus.length === 1) {
      // В реальном приложении здесь был бы вызов API для обновления статуса
      console.log(`Moving project ${draggedProject.id} to status ${targetStatus[0]}`);
    }
    
    setDraggedProject(null);
  };

  const handleDragEnd = () => {
    setDraggedProject(null);
  };

  return (
    <div className="flex space-x-6 overflow-x-auto pb-6">
      {columns.map((column) => {
        const columnProjects = getProjectsByColumn(column.status);
        
        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-80"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            {/* Column Header */}
            <div className={`${column.color} rounded-t-lg p-4 border-b border-gray-200`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900">{column.title}</h3>
                  <span className="bg-white text-gray-600 text-xs font-medium px-2 py-1 rounded-full">
                    {columnProjects.length}
                  </span>
                </div>
                <button className="text-gray-500 hover:text-gray-700">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Column Content */}
            <div className="bg-gray-50 rounded-b-lg min-h-96 p-4 space-y-4">
              {columnProjects.map((project) => (
                <div
                  key={project.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, project)}
                  onDragEnd={handleDragEnd}
                  className={`cursor-move transition-opacity ${
                    draggedProject?.id === project.id ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  <ProjectCard project={project} />
                </div>
              ))}

              {/* Add Project Button (только для черновиков) */}
              {column.id === 'draft' && (
                <button className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors">
                  <Plus className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm">Добавить проект</span>
                </button>
              )}

              {/* Empty State */}
              {columnProjects.length === 0 && column.id !== 'draft' && (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-sm">Нет проектов</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};