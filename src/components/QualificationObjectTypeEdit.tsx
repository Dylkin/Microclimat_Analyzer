import React, { useState, useEffect } from 'react';
import {
  Building2,
  Car,
  Snowflake,
  Package,
  Box,
  Upload,
  X,
  Download,
  Save,
  ArrowLeft,
  FileText,
  Clock,
  User,
} from 'lucide-react';
import { QualificationObjectType, qualificationObjectTypeService } from '../utils/qualificationObjectTypeService';
import { useAuth } from '../contexts/AuthContext';

interface QualificationObjectTypeEditProps {
  typeId: string;
  onBack: () => void;
  mode?: 'view' | 'edit';
}

const getTypeIcon = (typeKey: string) => {
  switch (typeKey) {
    case 'помещение':
      return <Building2 className="w-5 h-5" />;
    case 'автомобиль':
      return <Car className="w-5 h-5" />;
    case 'холодильная_камера':
      return <Snowflake className="w-5 h-5" />;
    case 'холодильник':
    case 'морозильник':
      return <Box className="w-5 h-5" />;
    default:
      return <Package className="w-5 h-5" />;
  }
};

// Поля для каждого типа объекта квалификации
const getTypeFields = (typeKey: string) => {
  switch (typeKey) {
    case 'помещение':
      return [
        { label: 'Название', field: 'name', type: 'text' },
        { label: 'Адрес', field: 'address', type: 'text' },
        { label: 'Площадь (м²)', field: 'area', type: 'number' },
        { label: 'Производитель', field: 'manufacturer', type: 'text' },
        { label: 'Климатическая система', field: 'climateSystem', type: 'text' }
      ];
    case 'автомобиль':
      return [
        { label: 'Название', field: 'name', type: 'text' },
        { label: 'VIN номер', field: 'vin', type: 'text' },
        { label: 'Регистрационный номер', field: 'registrationNumber', type: 'text' },
        { label: 'Объем кузова (м³)', field: 'bodyVolume', type: 'number' },
        { label: 'Производитель', field: 'manufacturer', type: 'text' }
      ];
    case 'холодильная_камера':
      return [
        { label: 'Название', field: 'name', type: 'text' },
        { label: 'Адрес', field: 'address', type: 'text' },
        { label: 'Объем камеры (м³)', field: 'chamberVolume', type: 'number' },
        { label: 'Производитель', field: 'manufacturer', type: 'text' },
        { label: 'Климатическая система', field: 'climateSystem', type: 'text' }
      ];
    case 'холодильник':
    case 'морозильник':
      return [
        { label: 'Название', field: 'name', type: 'text' },
        { label: 'Инвентарный номер', field: 'inventoryNumber', type: 'text' },
        { label: 'Серийный номер', field: 'serialNumber', type: 'text' },
        { label: 'Производитель', field: 'manufacturer', type: 'text' }
      ];
    default:
      return [];
  }
};

export const QualificationObjectTypeEdit: React.FC<QualificationObjectTypeEditProps> = ({
  typeId,
  onBack,
  mode = 'view'
}) => {
  const { user } = useAuth();
  const [type, setType] = useState<QualificationObjectType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    type_label: '',
    description: ''
  });

  const [protocolFile, setProtocolFile] = useState<File | null>(null);
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [uploadingProtocol, setUploadingProtocol] = useState(false);
  const [uploadingReport, setUploadingReport] = useState(false);

  useEffect(() => {
    loadType();
  }, [typeId]);

  const loadType = async () => {
    try {
      setLoading(true);
      const data = await qualificationObjectTypeService.getTypeById(typeId);
      setType(data);
      setFormData({
        type_label: data.type_label || '',
        description: data.description || ''
      });
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки типа объекта квалификации');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!type) return;

    try {
      setSaving(true);
      // Не отправляем type_label, так как его нельзя редактировать
      const { type_label, ...updateData } = formData;
      const updated = await qualificationObjectTypeService.updateType(type.id, updateData);
      setType(updated);
      setEditing(false);
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleProtocolUpload = async () => {
    if (!protocolFile || !type) return;

    try {
      setUploadingProtocol(true);
      const userId = user?.id || undefined;
      const userName = user?.fullName || undefined;
      await qualificationObjectTypeService.uploadProtocolTemplate(type.id, protocolFile, userId, userName);
      await loadType(); // Перезагружаем данные
      setProtocolFile(null);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки шаблона протокола');
    } finally {
      setUploadingProtocol(false);
    }
  };

  const handleReportUpload = async () => {
    if (!reportFile || !type) return;

    try {
      setUploadingReport(true);
      const userId = user?.id || undefined;
      const userName = user?.fullName || undefined;
      await qualificationObjectTypeService.uploadReportTemplate(type.id, reportFile, userId, userName);
      await loadType(); // Перезагружаем данные
      setReportFile(null);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки шаблона отчета');
    } finally {
      setUploadingReport(false);
    }
  };

  const handleDownloadProtocol = async () => {
    if (!type?.protocol_template_url || !type?.protocol_template_filename) return;
    try {
      await qualificationObjectTypeService.downloadTemplate(
        type.protocol_template_url,
        type.protocol_template_filename
      );
    } catch (err: any) {
      setError(err.message || 'Ошибка скачивания шаблона протокола');
    }
  };

  const handleDownloadReport = async () => {
    if (!type?.report_template_url || !type?.report_template_filename) return;
    try {
      await qualificationObjectTypeService.downloadTemplate(
        type.report_template_url,
        type.report_template_filename
      );
    } catch (err: any) {
      setError(err.message || 'Ошибка скачивания шаблона отчета');
    }
  };

  const handleDeleteProtocol = async () => {
    if (!type || !confirm('Вы уверены, что хотите удалить шаблон протокола?')) return;
    try {
      await qualificationObjectTypeService.deleteProtocolTemplate(type.id);
      await loadType();
    } catch (err: any) {
      setError(err.message || 'Ошибка удаления шаблона протокола');
    }
  };

  const handleDeleteReport = async () => {
    if (!type || !confirm('Вы уверены, что хотите удалить шаблон отчета?')) return;
    try {
      await qualificationObjectTypeService.deleteReportTemplate(type.id);
      await loadType();
    } catch (err: any) {
      setError(err.message || 'Ошибка удаления шаблона отчета');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !type) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Назад
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!type) return null;

  const typeFields = getTypeFields(type.type_key);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={onBack}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    {getTypeIcon(type.type_key)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{type.type_label}</h1>
                    <p className="text-sm text-gray-500">Тип объекта квалификации</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="p-6 space-y-6">
            {/* Основная информация */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Основная информация</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название типа
                  </label>
                  <input
                    type="text"
                    value={formData.type_label}
                    disabled
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={!editing}
                    rows={4}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      !editing ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Технический ключ
                  </label>
                  <input
                    type="text"
                    value={type.type_key}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                  />
                </div>
              </div>
              {editing && (
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Сохранение...' : 'Сохранить'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        type_label: type.type_label || '', // Не изменяем type_label
                        description: type.description || ''
                      });
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Отмена
                  </button>
                </div>
              )}
            </div>

            {/* Поля типа объекта */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Поля объекта квалификации</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {typeFields.map((field) => (
                  <div key={field.field} className="bg-white rounded-lg p-4 border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                      placeholder={`Поле "${field.label}"`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Шаблоны */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Шаблоны документов</h2>
              
              {/* Шаблон протокола */}
              <div className="mb-6 bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Шаблон протокола</span>
                </h3>
                {type.protocol_template_url ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                      <div className="flex items-center space-x-3 flex-1">
                        <FileText className="w-5 h-5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {type.protocol_template_filename}
                          </p>
                          <p className="text-xs text-gray-500">Шаблон загружен</p>
                          {type.protocol_template_uploaded_at && (
                            <div className="mt-1 space-y-0.5">
                              <div className="flex items-center space-x-1 text-xs text-gray-600">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(type.protocol_template_uploaded_at).toLocaleString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              {type.protocol_template_uploaded_by_name && (
                                <div className="flex items-center space-x-1 text-xs text-gray-600">
                                  <User className="w-3 h-3" />
                                  <span>{type.protocol_template_uploaded_by_name}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleDownloadProtocol}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md"
                          title="Скачать"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        {editing && (
                          <button
                            onClick={handleDeleteProtocol}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                            title="Удалить"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {editing && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Заменить шаблон
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="file"
                            accept=".docx"
                            onChange={(e) => setProtocolFile(e.target.files?.[0] || null)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          />
                          {protocolFile && (
                            <button
                              onClick={handleProtocolUpload}
                              disabled={uploadingProtocol}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center space-x-2"
                            >
                              <Upload className="w-4 h-4" />
                              <span>{uploadingProtocol ? 'Загрузка...' : 'Загрузить'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {editing ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Загрузить шаблон протокола (.docx)
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="file"
                            accept=".docx"
                            onChange={(e) => setProtocolFile(e.target.files?.[0] || null)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          />
                          {protocolFile && (
                            <button
                              onClick={handleProtocolUpload}
                              disabled={uploadingProtocol}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center space-x-2"
                            >
                              <Upload className="w-4 h-4" />
                              <span>{uploadingProtocol ? 'Загрузка...' : 'Загрузить'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Шаблон не загружен</p>
                    )}
                  </div>
                )}
              </div>

              {/* Шаблон отчета */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Шаблон отчета</span>
                </h3>
                {type.report_template_url ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
                      <div className="flex items-center space-x-3 flex-1">
                        <FileText className="w-5 h-5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {type.report_template_filename}
                          </p>
                          <p className="text-xs text-gray-500">Шаблон загружен</p>
                          {type.report_template_uploaded_at && (
                            <div className="mt-1 space-y-0.5">
                              <div className="flex items-center space-x-1 text-xs text-gray-600">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {new Date(type.report_template_uploaded_at).toLocaleString('ru-RU', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              {type.report_template_uploaded_by_name && (
                                <div className="flex items-center space-x-1 text-xs text-gray-600">
                                  <User className="w-3 h-3" />
                                  <span>{type.report_template_uploaded_by_name}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleDownloadReport}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md"
                          title="Скачать"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        {editing && (
                          <button
                            onClick={handleDeleteReport}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                            title="Удалить"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {editing && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Заменить шаблон
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="file"
                            accept=".docx"
                            onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          />
                          {reportFile && (
                            <button
                              onClick={handleReportUpload}
                              disabled={uploadingReport}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center space-x-2"
                            >
                              <Upload className="w-4 h-4" />
                              <span>{uploadingReport ? 'Загрузка...' : 'Загрузить'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {editing ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Загрузить шаблон отчета (.docx)
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="file"
                            accept=".docx"
                            onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          />
                          {reportFile && (
                            <button
                              onClick={handleReportUpload}
                              disabled={uploadingReport}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 flex items-center space-x-2"
                            >
                              <Upload className="w-4 h-4" />
                              <span>{uploadingReport ? 'Загрузка...' : 'Загрузить'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Шаблон не загружен</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

