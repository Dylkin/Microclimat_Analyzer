import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building, Car, Refrigerator, Snowflake, MapPin } from 'lucide-react';
import { QualificationObject, QualificationObjectTypeLabels, CreateQualificationObjectData } from '../../types/QualificationObject';
import { qualificationObjectService } from '../../utils/qualificationObjectService';
import { QualificationObjectsTable } from '../QualificationObjectsTable';

interface QualificationObjectsCRUDProps {
  contractorId: string;
  contractorName: string;
}

export const QualificationObjectsCRUD: React.FC<QualificationObjectsCRUDProps> = ({ 
  contractorId, 
  contractorName 
}) => {
  const [objects, setObjects] = useState<QualificationObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingObject, setEditingObject] = useState<QualificationObject | null>(null);

  // Загрузка объектов квалификации
  const loadObjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await qualificationObjectService.getQualificationObjectsByContractor(contractorId);
      setObjects(data);
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadObjects();
  }, [contractorId]);

  // Создание нового объекта
  const handleCreate = async (object: QualificationObject) => {
    // Реализация создания объекта
    console.log('Создание объекта:', object);
  };

  // Обновление объекта
  const handleUpdate = async (object: QualificationObject) => {
    // Реализация обновления объекта
    console.log('Обновление объекта:', object);
  };

  // Удаление объекта
  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот объект квалификации?')) {
      return;
    }

    try {
      await qualificationObjectService.deleteQualificationObject(id);
      await loadObjects(); // Перезагружаем список
      alert('Объект квалификации успешно удален');
    } catch (error) {
      console.error('Ошибка удаления объекта:', error);
      alert(`Ошибка удаления объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };


  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Объекты квалификации</h2>
          <p className="text-sm text-gray-600 mt-1">
            Контрагент: <span className="font-medium">{contractorName}</span>
          </p>
        </div>
        <button
          onClick={() => console.log('Добавить объект')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить объект</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Загрузка объектов...</p>
        </div>
      )}

      {/* Objects List */}
      <QualificationObjectsTable
        objects={objects}
        onAdd={handleCreate}
        onEdit={handleEditQualificationObject}
        onDelete={handleDelete}
        onShowOnMap={(obj) => console.log('Show on map:', obj)}
        loading={loading}
      />
    </div>
  )
  );
};