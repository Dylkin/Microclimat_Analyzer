import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { Project } from '../../types/Project';
import { ProjectDocument } from '../../utils/projectDocumentService';

interface NegotiationStagesProps {
  project: Project;
  commercialOfferDoc?: ProjectDocument;
  contractDoc?: ProjectDocument;
}

export const NegotiationStages: React.FC<NegotiationStagesProps> = ({
  project,
  commercialOfferDoc,
  contractDoc
}) => {
  const getStatusIcon = (hasDocument: boolean) => {
    return hasDocument ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <Clock className="w-5 h-5 text-yellow-500" />
    );
  };

  const getPlannedDate = (daysFromCreation: number): string => {
    if (!project.createdAt) return 'Не определена';
    
    const plannedDate = new Date(project.createdAt);
    plannedDate.setDate(plannedDate.getDate() + daysFromCreation);
    return plannedDate.toLocaleDateString('ru-RU');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Этапы согласования</h2>
      
      {/* Коммерческое предложение */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          {getStatusIcon(!!commercialOfferDoc)}
          <h3 className="text-lg font-semibold text-gray-900">Коммерческое предложение</h3>
        </div>
        
        <div className="space-y-4 ml-8">
          {/* Этап 1: Согласование объемов */}
          <div className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">1. Согласование объемов</h4>
                <p className="text-sm text-gray-600">Ответственный: Менеджер</p>
                <p className="text-sm text-gray-500">Срок: 1 день с даты создания проекта</p>
                <p className="text-sm text-gray-500">
                  Плановая дата завершения: {getPlannedDate(1)}
                </p>
              </div>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                В работе
              </span>
            </div>
          </div>

          {/* Этап 2: Формирование стоимости */}
          <div className="border-l-4 border-gray-300 pl-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">2. Формирование стоимости</h4>
                <p className="text-sm text-gray-600">Ответственный: Руководитель</p>
                <p className="text-sm text-gray-500">Срок: 1 день с даты завершения предыдущего этапа</p>
              </div>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                Ожидает
              </span>
            </div>
          </div>

          {/* Этап 3: Рассмотрение заказчиком */}
          <div className="border-l-4 border-gray-300 pl-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">3. Рассмотрение заказчиком</h4>
                <p className="text-sm text-gray-600">Ответственный: Менеджер</p>
                <p className="text-sm text-gray-500">Срок: 2 дня с даты завершения предыдущего этапа</p>
              </div>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                Ожидает
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Договор */}
      <div>
        <div className="flex items-center space-x-3 mb-4">
          {getStatusIcon(!!contractDoc)}
          <h3 className="text-lg font-semibold text-gray-900">Договор</h3>
          {!commercialOfferDoc && (
            <span className="text-sm text-gray-500">(доступен после принятия коммерческого предложения)</span>
          )}
        </div>
        
        <div className={`space-y-4 ml-8 ${!commercialOfferDoc ? 'opacity-50' : ''}`}>
          {/* Этап 4: Подготовка договора */}
          <div className={`border-l-4 pl-4 py-3 ${commercialOfferDoc ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">4. Подготовка договора</h4>
                <p className="text-sm text-gray-600">Ответственный: Руководитель</p>
                <p className="text-sm text-gray-500">Срок: 1 день с даты завершения предыдущего этапа</p>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                commercialOfferDoc 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {commercialOfferDoc ? 'В работе' : 'Ожидает'}
              </span>
            </div>
          </div>

          {/* Этап 5: Согласование заказчиком */}
          <div className="border-l-4 border-gray-300 pl-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">5. Согласование заказчиком</h4>
                <p className="text-sm text-gray-600">Ответственный: Менеджер</p>
                <p className="text-sm text-gray-500">Срок: 3 дня с даты завершения предыдущего этапа</p>
              </div>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                Ожидает
              </span>
            </div>
          </div>

          {/* Переход к исполнению */}
          {contractDoc && (
            <div className="border-l-4 border-green-500 pl-4 py-3 bg-green-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">✅ Готов к исполнению работ</h4>
                  <p className="text-sm text-gray-600">Все документы согласованы</p>
                </div>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  Завершено
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};