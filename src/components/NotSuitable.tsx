import React, { useEffect, useState } from 'react';
import { ArrowLeft, AlertCircle, ClipboardList } from 'lucide-react';
import { Project, ProjectStageAssignment } from '../types/Project';
import { ProjectInfo } from './contract/ProjectInfo';
import { projectService } from '../utils/projectService';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/apiClient';

interface NotSuitableProps {
  project: Project;
  onBack: () => void;
}

export const NotSuitable: React.FC<NotSuitableProps> = ({ project, onBack }) => {
  const { user, users } = useAuth();
  const [currentProject, setCurrentProject] = useState<Project>(project);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [existingAssignment, setExistingAssignment] = useState<ProjectStageAssignment | null>(null);

  useEffect(() => {
    const loadFullProject = async () => {
      if (!project.id) return;
      try {
        setLoading(true);
        setError(null);
        const fullProject = await projectService.getProjectById(project.id);
        setCurrentProject(fullProject);

        const assignment =
          (fullProject.stageAssignments || []).find(
            (a) => a.stage === 'not_suitable',
          ) || null;

        if (assignment) {
          setExistingAssignment(assignment);
          if (assignment.notes) {
            setComment(assignment.notes);
          }
        }
      } catch (e: any) {
        console.error('NotSuitable: ошибка загрузки проекта:', e);
        setError(e?.message || 'Ошибка загрузки проекта');
      } finally {
        setLoading(false);
      }
    };

    loadFullProject();
  }, [project.id]);

  const handleSave = async () => {
    if (!comment.trim()) {
      alert('Пожалуйста, введите комментарий — это обязательное поле.');
      return;
    }
    if (!currentProject.id) return;

    try {
      setSaving(true);
      setError(null);

      await apiClient.post(`/projects/${currentProject.id}/not-suitable`, {
        comment: comment.trim(),
        userId: user?.id || null,
      });

      alert('Комментарий по статусу «Не подходит» сохранён.');
      onBack();
    } catch (e: any) {
      console.error('NotSuitable: ошибка сохранения комментария:', e);
      setError(e?.message || 'Ошибка сохранения комментария');
    } finally {
      setSaving(false);
    }
  };

  const renderAuthorInfo = () => {
    if (!existingAssignment) return null;

    const savedAt =
      existingAssignment.completedAt || existingAssignment.assignedAt;
    const author =
      (existingAssignment.assignedUserId &&
        users.find((u) => u.id === existingAssignment.assignedUserId)?.fullName) ||
      'Неизвестный пользователь';

    return (
      <div className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
        <div>
          <span className="font-semibold">Комментарий сохранён:</span>{' '}
          {savedAt
            ? new Date(savedAt).toLocaleString('ru-RU')
            : 'дата/время не определены'}
        </div>
        <div>
          <span className="font-semibold">ФИО пользователя:</span> {author}
        </div>
      </div>
    );
  };

  if (loading && !currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных проекта...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Ошибка</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к проектам
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Не подходит</h1>
            <p className="text-sm text-gray-500">
              Указание причины, по которой проект типа «Продажа» признан
              неподходящим.
            </p>
          </div>
        </div>
      </div>

      {/* Информация о проекте */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <ClipboardList className="w-6 h-6 text-indigo-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">
            Информация о проекте
          </h2>
        </div>
        <ProjectInfo project={currentProject} />
      </div>

      {/* Комментарий по статусу «Не подходит» */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">
            Причина статуса «Не подходит»
          </h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Комментарий <span className="text-red-500">*</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={4}
              placeholder="Опишите причину, по которой проект признан неподходящим (обязательно для заполнения)"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Поле обязательно для заполнения. Комментарий будет сохранён вместе
              с датой, временем и ФИО пользователя.
            </p>
          </div>

          {renderAuthorInfo()}

          <div className="flex justify-end space-x-3 mt-4">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !comment.trim()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Сохранение...' : 'Сохранить комментарий'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotSuitable;


