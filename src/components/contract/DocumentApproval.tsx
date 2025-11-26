import React, { useMemo, useState, useEffect } from 'react';
import { CheckCircle, Clock, FileText, Upload, Trash2, Eye } from 'lucide-react';
import { ProjectDocument } from '../../utils/projectDocumentService';
import { QualificationProtocol } from '../../utils/qualificationProtocolService';
import { DocumentComments } from './DocumentComments';
import { DocumentApprovalActions } from './DocumentApprovalActions';
import { ContractFields } from './ContractFields';
import { documentApprovalService } from '../../utils/documentApprovalService';
import { DocumentApprovalStatus } from '../../types/DocumentApproval';
import { Project } from '../../types/Project';
import { objectTypeMapping, reverseObjectTypeMapping } from '../../utils/objectTypeMapping';

interface DocumentApprovalProps {
  project?: Project;
  commercialOfferDoc?: ProjectDocument;
  contractDoc?: ProjectDocument;
  qualificationProtocols?: QualificationProtocol[]; // array of protocols
  approvedDocuments: Set<string>;
  documentApprovals: Map<string, {
    approvedAt: Date;
    approvedBy: string;
    approvedByRole: string;
  }>;
  selectedQualificationObjects?: Array<{
    id: string;
    type: string;
    name: string;
  }>;
  onUpload: (documentType: 'commercial_offer' | 'contract' | 'qualification_protocol', file: File, objectType?: string) => void;
  onDelete: (documentId: string) => void;
  onApprove: (documentId: string) => void;
  onUnapprove: (documentId: string) => void;
  onProjectStatusChange?: (newStatus: string) => void;
  onProjectUpdate?: (updatedProject: Project) => void;
  userRole?: string;
  onDocumentStatusesChange?: (statuses: Map<string, DocumentApprovalStatus>) => void;
}

export const DocumentApproval: React.FC<DocumentApprovalProps> = ({
  project,
  commercialOfferDoc,
  contractDoc,
  qualificationProtocols = new Map(),
  approvedDocuments,
  // documentApprovals,
  selectedQualificationObjects = [],
  onUpload,
  onDelete,
  onApprove,
  onUnapprove,
  onProjectStatusChange,
  onProjectUpdate,
  onDocumentStatusesChange
  // userRole
}) => {
  // Состояние для хранения статусов документов из базы данных
  const [documentStatuses, setDocumentStatuses] = useState<Map<string, DocumentApprovalStatus>>(new Map());
  
  // Состояние для редактирования полей договора
  const [isEditingContractFields, setIsEditingContractFields] = useState(false);

  // Загрузка статусов документов из базы данных
  const loadDocumentStatuses = async () => {
    const allDocuments = [
      commercialOfferDoc,
      contractDoc,
      ...(Array.isArray(qualificationProtocols) ? qualificationProtocols.map(p => p.document).filter(Boolean) : [])
    ].filter(Boolean) as ProjectDocument[];

    const statusPromises = allDocuments.map(async (doc) => {
      try {
        const status = await documentApprovalService.getApprovalStatus(doc.id);
        return { documentId: doc.id, status };
      } catch (error) {
        console.error(`Ошибка загрузки статуса для документа ${doc.id}:`, error);
        return { documentId: doc.id, status: null };
      }
    });

    const results = await Promise.all(statusPromises);
    const statusMap = new Map<string, DocumentApprovalStatus>();
    
    results.forEach(({ documentId, status }) => {
      if (status) {
        statusMap.set(documentId, status);
      }
    });

    setDocumentStatuses(statusMap);
    
    // Передаем статусы в родительский компонент
    if (onDocumentStatusesChange) {
      onDocumentStatusesChange(statusMap);
    }
  };

  // Загружаем статусы при изменении документов
  // Используем useMemo для стабильных значений массивов
  const qualificationProtocolIds = useMemo(() => {
    return Array.isArray(qualificationProtocols) 
      ? qualificationProtocols.map(p => p.id).join(',')
      : '';
  }, [qualificationProtocols]);

  const selectedObjectIds = useMemo(() => {
    return selectedQualificationObjects?.map(obj => obj.id).join(',') || '';
  }, [selectedQualificationObjects]);

  // Логирование для диагностики
  useEffect(() => {
    console.log('DocumentApproval: selectedQualificationObjects:', {
      count: selectedQualificationObjects?.length || 0,
      objects: selectedQualificationObjects,
      ids: selectedObjectIds
    });
  }, [selectedQualificationObjects, selectedObjectIds]);

  useEffect(() => {
    loadDocumentStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commercialOfferDoc?.id, contractDoc?.id, qualificationProtocolIds, selectedObjectIds]);

  // Вычисляем прогресс согласования
  const progressData = useMemo(() => {
    // Определяем статус коммерческого предложения
    const commercialOfferApproved = commercialOfferDoc ? (() => {
      const dbStatus = documentStatuses.get(commercialOfferDoc.id);
      const isApproved = approvedDocuments.has(commercialOfferDoc.id);
      const currentStatus = dbStatus?.status || (isApproved ? 'approved' : 'pending');
      return currentStatus === 'approved';
    })() : false;
    
    // Определяем статус договора
    const contractApproved = contractDoc ? (() => {
      const dbStatus = documentStatuses.get(contractDoc.id);
      const isApproved = approvedDocuments.has(contractDoc.id);
      const currentStatus = dbStatus?.status || (isApproved ? 'approved' : 'pending');
      return currentStatus === 'approved';
    })() : false;
    
    // Определяем количество согласованных протоколов
    const protocolApprovedCount = Array.isArray(qualificationProtocols) ? qualificationProtocols.filter(protocol => {
      if (!protocol.document) return false;
      const dbStatus = documentStatuses.get(protocol.document.id);
      const isApproved = approvedDocuments.has(protocol.document.id);
      const currentStatus = dbStatus?.status || (isApproved ? 'approved' : 'pending');
      return currentStatus === 'approved';
    }).length : 0;
    
    const totalDocuments = 2 + (Array.isArray(qualificationProtocols) ? qualificationProtocols.length : 0);
    const approvedCount = (commercialOfferApproved ? 1 : 0) + (contractApproved ? 1 : 0) + protocolApprovedCount;
    const progressPercentage = totalDocuments > 0 ? (approvedCount / totalDocuments) * 100 : 0;
    
    // Логирование для отладки
    console.log('DocumentApproval: Расчет прогресса согласования:', {
      commercialOfferDoc: commercialOfferDoc?.id,
      contractDoc: contractDoc?.id,
      qualificationProtocols: Array.isArray(qualificationProtocols) ? qualificationProtocols.length : qualificationProtocols?.size || 0,
      commercialOfferApproved,
      contractApproved,
      protocolApprovedCount,
      totalDocuments,
      approvedCount,
      progressPercentage,
      approvedDocuments: Array.from(approvedDocuments),
      documentStatuses: Object.fromEntries(documentStatuses)
    });
    
    return {
      commercialOfferApproved,
      contractApproved,
      protocolApprovedCount,
      totalDocuments,
      approvedCount,
      progressPercentage,
      ariaValuenow: String(approvedCount),
      ariaValuemax: String(totalDocuments)
    };
  }, [commercialOfferDoc, contractDoc, qualificationProtocols, approvedDocuments, documentStatuses]);
  
  // Константы для ARIA атрибутов
  // const ariaValuenow = String(progressData.approvedCount);
  // const ariaValuemax = String(progressData.totalDocuments);
  
  const getStatusIcon = (hasDocument: boolean, isApproved: boolean) => {
    if (isApproved) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (hasDocument) {
      return <Clock className="w-5 h-5 text-yellow-500" />;
    } else {
      return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (hasDocument: boolean, isApproved: boolean) => {
    if (isApproved) {
      return 'Согласовано';
    } else if (hasDocument) {
      return 'Ожидает согласования';
    } else {
      return 'Ожидает загрузки';
    }
  };

  const getStatusColor = (hasDocument: boolean, isApproved: boolean) => {
    if (isApproved) {
      return 'bg-green-100 text-green-800';
    } else if (hasDocument) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  const handleFileSelect = (documentType: 'commercial_offer' | 'contract', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(documentType, file);
    }
  };

  // Функция для проверки и изменения статуса проекта
  const checkAndUpdateProjectStatus = () => {
    const commercialOfferApproved = commercialOfferDoc ? approvedDocuments.has(commercialOfferDoc.id) : false;
    const contractApproved = contractDoc ? approvedDocuments.has(contractDoc.id) : false;
    
    // Если оба документа согласованы, меняем статус проекта
    if (commercialOfferApproved && contractApproved && onProjectStatusChange) {
      onProjectStatusChange('Проведение испытаний');
    } else if (onProjectStatusChange) {
      // Если не все документы согласованы, возвращаем к предыдущему статусу
      onProjectStatusChange('Согласование договора');
    }
  };

  // Функция для проверки, заблокирована ли отмена согласования
  const isApprovalCancelBlocked = (documentType: 'commercial_offer' | 'contract') => {
    const contractApproved = contractDoc ? approvedDocuments.has(contractDoc.id) : false;
    
    // Если договор согласован, блокируем отмену согласования коммерческого предложения
    if (documentType === 'commercial_offer' && contractApproved) {
      return true;
    }
    
    return false;
  };

  // Обработчик согласования документа
  const handleDocumentApproval = (documentId: string) => {
    onApprove(documentId);
    // Убираем автоматическое изменение статуса проекта
    // Пользователь остается на той же странице
  };

  const renderDocumentSection = (
    title: string,
    document?: ProjectDocument,
    documentType: 'commercial_offer' | 'contract' = 'commercial_offer'
  ) => {
    // Получаем статус из базы данных
    const dbStatus = document ? documentStatuses.get(document.id) : undefined;
    const isApproved = document ? approvedDocuments.has(document.id) : false;
    // const approvalInfo = document ? documentApprovals.get(document.id) : undefined;
    
    // Определяем текущий статус: приоритет у данных из базы, затем у локального состояния
    const currentStatus = dbStatus?.status || (isApproved ? 'approved' : 'pending');
    

    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon(!!document, currentStatus === 'approved')}
            <h4 className="font-medium text-gray-900">{title}</h4>
          </div>
          <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(!!document, currentStatus === 'approved')}`}>
            {getStatusText(!!document, currentStatus === 'approved')}
          </span>
        </div>

        {document ? (
          <div className="space-y-3">
            {/* Document info */}
            <div className="flex items-center justify-between p-3 bg-white rounded border">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{document.fileName}</p>
                  <p className="text-xs text-gray-500">
                    Загружен: {new Date(document.uploadedAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={document.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                  title="Просмотреть документ"
                >
                  <Eye className="w-4 h-4" />
                </a>
                {!isApproved && (
                  <button
                    onClick={() => onDelete(document.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Удалить документ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center py-4">
            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">Документ не загружен</p>
            <label className="inline-flex items-center px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors cursor-pointer">
              <Upload className="w-4 h-4 mr-1" />
              Загрузить документ
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => handleFileSelect(documentType, e)}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Comments - Always shown below document upload section */}
        <div className="mt-4">
          <DocumentComments
            documentId={document?.id || `temp-${documentType}`}
            documentType={documentType}
            onCommentAdd={(_comment) => {
              console.log('Comment added:', _comment);
            }}
          />
        </div>

        {/* Approval Actions - Moved below comments */}
        {document && (
          <div className="mt-4">
            <DocumentApprovalActions
              documentId={document.id}
              documentType={documentType}
              currentStatus={currentStatus}
              isCancelBlocked={isApprovalCancelBlocked(documentType)}
              onStatusChange={(status, _comment) => {
                if (status === 'approved') {
                  handleDocumentApproval(document.id);
                } else if (status === 'pending') {
                  // Отмена согласования
                  onUnapprove(document.id);
                } else if (status === 'rejected') {
                  // Логика отклонения
                  console.log('Document rejected:', document.id, _comment);
                }
                // Обновляем статусы после изменения
                loadDocumentStatuses();
              }}
            />
          </div>
        )}
      </div>
    );
  };

  // Специальная функция для рендеринга блока договора с реквизитами
  const renderContractSection = (
    title: string,
    document?: ProjectDocument,
    documentType: 'contract' = 'contract'
  ) => {
    // Получаем статус из базы данных
    const dbStatus = document ? documentStatuses.get(document.id) : undefined;
    const isApproved = document ? approvedDocuments.has(document.id) : false;
    
    // Определяем текущий статус: приоритет у данных из базы, затем у локального состояния
    const currentStatus = dbStatus?.status || (isApproved ? 'approved' : 'pending');
    

    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon(!!document, currentStatus === 'approved')}
            <h4 className="font-medium text-gray-900">{title}</h4>
          </div>
          <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(!!document, currentStatus === 'approved')}`}>
            {getStatusText(!!document, currentStatus === 'approved')}
          </span>
        </div>

        {document ? (
          <div className="space-y-3">
            {/* Document info */}
            <div className="flex items-center justify-between p-3 bg-white rounded border">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{document.fileName}</p>
                  <p className="text-xs text-gray-500">
                    Загружен: {new Date(document.uploadedAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={document.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                  title="Просмотреть документ"
                >
                  <Eye className="w-4 h-4" />
                </a>
                {!isApproved && (
                  <button
                    onClick={() => onDelete(document.id)}
                    className="text-red-600 hover:text-red-800"
                    title="Удалить документ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">Документ не загружен</p>
            <label className="inline-flex items-center px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors cursor-pointer">
              <Upload className="w-4 h-4 mr-1" />
              Загрузить документ
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => handleFileSelect(documentType, e)}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Реквизиты договора - интегрированы в блок договора */}
        {project && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <ContractFields
              project={project}
              onUpdate={onProjectUpdate || (() => {})}
              isEditing={isEditingContractFields}
              onEditToggle={setIsEditingContractFields}
            />
          </div>
        )}

        {/* Comments - Always shown below document upload section */}
        <div className="mt-4">
          <DocumentComments
            documentId={document?.id || `temp-${documentType}`}
            documentType={documentType}
            onCommentAdd={(_comment) => {
              console.log('Comment added:', _comment);
            }}
          />
        </div>

        {/* Approval Actions - Moved below comments */}
        {document && (
          <div className="mt-4">
            <DocumentApprovalActions
              documentId={document.id}
              documentType={documentType}
              currentStatus={currentStatus}
              isCancelBlocked={isApprovalCancelBlocked(documentType)}
              onStatusChange={(status, _comment) => {
                if (status === 'approved') {
                  handleDocumentApproval(document.id);
                } else if (status === 'pending') {
                  // Отмена согласования
                  onUnapprove(document.id);
                } else if (status === 'rejected') {
                  // Логика отклонения
                  console.log('Document rejected:', document.id, _comment);
                }
                // Обновляем статусы после изменения
                loadDocumentStatuses();
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Согласование документов</h3>
      
      {/* Progress indicator - moved to top */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Прогресс согласования</span>
          <span className="text-sm text-gray-500">
            {progressData.approvedCount} из {progressData.totalDocuments} документов согласовано
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full progress-bar"
            data-value={progressData.approvedCount}
            role="progressbar"
            aria-label={`Прогресс согласования документов: ${progressData.approvedCount} из ${progressData.totalDocuments} документов согласовано`}
          ></div>
        </div>
        {/* Отладочная информация */}
        <div className="mt-2 text-xs text-gray-400">
          Отладка: {progressData.approvedCount}/{progressData.totalDocuments} = {progressData.progressPercentage.toFixed(1)}%
        </div>
      </div>
      
      <div className="space-y-6">
        {renderDocumentSection('Коммерческое предложение', commercialOfferDoc, 'commercial_offer')}
        {renderContractSection('Договор', contractDoc, 'contract')}
        
        {/* Протоколы квалификации */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Протоколы квалификации</h4>
          <div className="space-y-4">
            {(() => {
              console.log('DocumentApproval: Рендер протоколов квалификации:', {
                selectedQualificationObjectsCount: selectedQualificationObjects?.length || 0,
                selectedQualificationObjects: selectedQualificationObjects,
                qualificationProtocolsCount: Array.isArray(qualificationProtocols) ? qualificationProtocols.length : 0,
                qualificationProtocols: qualificationProtocols
              });
              return null;
            })()}
            {selectedQualificationObjects && selectedQualificationObjects.length > 0 ? (
              selectedQualificationObjects.map((obj) => {
                // Преобразуем русский тип объекта в английский для сравнения с протоколами из БД
                const englishType = objectTypeMapping[obj.type] || obj.type;
                // Протоколы из БД имеют objectType в английском формате (room, vehicle, etc.)
                // Объекты квалификации имеют type в русском формате (помещение, автомобиль, etc.)
                // Сравниваем оба варианта для совместимости
                const protocol = Array.isArray(qualificationProtocols) 
                  ? qualificationProtocols.find(p => {
                      const protocolEnglishType = p.objectType;
                      const protocolRussianType = reverseObjectTypeMapping[protocolEnglishType] || protocolEnglishType;
                      return protocolEnglishType === englishType || 
                             protocolEnglishType === obj.type ||
                             protocolRussianType === obj.type ||
                             reverseObjectTypeMapping[protocolEnglishType] === obj.type;
                    }) 
                  : undefined;
                const protocolDoc = protocol?.document;
                return (
                  <div key={obj.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h5 className="text-sm font-medium text-gray-900">
                          Протокол для {obj.type === 'помещение' ? 'помещения' : 
                                        obj.type === 'автомобиль' ? 'автомобиля' :
                                        obj.type === 'холодильник' ? 'холодильника' :
                                        obj.type === 'морозильник' ? 'морозильника' :
                                        obj.type === 'холодильная_камера' ? 'холодильной камеры' :
                                        obj.type}
                        </h5>
                        <p className="text-xs text-gray-500">{obj.name}</p>
                      </div>
                      {(() => {
                        if (!protocolDoc) return getStatusIcon(false, false);
                        // Получаем статус из базы данных
                        const dbStatus = documentStatuses.get(protocolDoc.id);
                        const isApproved = approvedDocuments.has(protocolDoc.id);
                        // Определяем текущий статус: приоритет у данных из базы, затем у локального состояния
                        const currentStatus = dbStatus?.status || (isApproved ? 'approved' : 'pending');
                        return getStatusIcon(true, currentStatus === 'approved');
                      })()}
                    </div>
                    
                    {protocolDoc ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{protocolDoc.fileName}</p>
                              <p className="text-xs text-gray-500">
                                Загружен: {protocolDoc.uploadedAt.toLocaleDateString('ru-RU')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => window.open(protocolDoc.fileUrl, '_blank')}
                              className="text-indigo-600 hover:text-indigo-800"
                              title="Просмотреть документ"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {!approvedDocuments.has(protocolDoc.id) && (
                              <button
                                onClick={() => onDelete(protocolDoc.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Удалить документ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Comments */}
                        <div className="mt-4">
                          <DocumentComments
                            documentId={protocolDoc.id}
                            documentType="qualification_protocol"
                            onCommentAdd={(_comment) => {
                              console.log('Comment added:', _comment);
                            }}
                          />
                        </div>
                        
                        {/* Approval Actions */}
                        <div className="mt-4">
                          <DocumentApprovalActions
                            documentId={protocolDoc.id}
                            documentType="qualification_protocol"
                            currentStatus={(() => {
                              // Получаем статус из базы данных
                              const dbStatus = documentStatuses.get(protocolDoc.id);
                              const isApproved = approvedDocuments.has(protocolDoc.id);
                              // Определяем текущий статус: приоритет у данных из базы, затем у локального состояния
                              return dbStatus?.status || (isApproved ? 'approved' : 'pending');
                            })()}
                            isCancelBlocked={false} // Протоколы можно отменять
                            onStatusChange={(status, _comment) => {
                              if (status === 'approved') {
                                onApprove(protocolDoc.id);
                              } else if (status === 'pending') {
                                onUnapprove(protocolDoc.id);
                              }
                              // Обновляем статусы после изменения
                              loadDocumentStatuses();
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 mb-3">
                            Загрузите протокол квалификации для {obj.type === 'помещение' ? 'помещения' : 
                                                              obj.type === 'автомобиль' ? 'автомобиля' :
                                                              obj.type === 'холодильник' ? 'холодильника' :
                                                              obj.type === 'морозильник' ? 'морозильника' :
                                                              obj.type === 'холодильная_камера' ? 'холодильной камеры' :
                                                              obj.type}
                          </p>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                onUpload('qualification_protocol', file, obj.type);
                              }
                            }}
                            className="hidden"
                            id={`protocol-upload-${obj.id}`}
                          />
                          <label
                            htmlFor={`protocol-upload-${obj.id}`}
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 cursor-pointer transition-colors"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Выбрать файл
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="border border-gray-200 rounded-lg p-6 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h5 className="text-lg font-medium text-gray-900 mb-2">Нет объектов квалификации</h5>
                <p className="text-sm text-gray-500 mb-4">
                  Для загрузки протоколов квалификации необходимо сначала добавить объекты квалификации в проект.
                </p>
                <p className="text-xs text-gray-400">
                  Перейдите в раздел "Объекты квалификации" выше, чтобы добавить объекты для квалификации.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
