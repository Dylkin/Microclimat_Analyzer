import React from 'react';

export const ContractInstructions: React.FC = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h4 className="text-sm font-medium text-blue-900 mb-2">Инструкции по работе:</h4>
      <ul className="text-sm text-blue-800 space-y-1">
        <li>• <strong>Согласование объемов:</strong> Просмотрите и отредактируйте список объектов квалификации</li>
        <li>• <strong>Коммерческое предложение:</strong> Загрузите документ в формате PDF, DOC или DOCX</li>
        <li>• <strong>Договор:</strong> После согласования загрузите подписанный договор</li>
        <li>• <strong>Просмотр документов:</strong> Используйте кнопки "Просмотр" для проверки документов</li>
        <li>• <strong>Замена документов:</strong> Документы можно заменить, загрузив новые версии</li>
        <li>• <strong>Переход к следующему этапу:</strong> После загрузки всех документов проект готов к исполнению</li>
      </ul>
    </div>
  );
};