import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, FileCheck } from 'lucide-react';
import { Project } from '../types/Project';
import { Contractor } from '../types/Contractor';
import { enhancedProjectDocumentService } from '../utils/enhancedProjectDocumentService';
import { ProjectDocument } from '../utils/projectDocumentService';
import { QualificationProtocolWithDocument } from '../utils/qualificationProtocolService';
import { contractorService } from '../utils/contractorService';
import { useAuth } from '../contexts/AuthContext';
import { ProjectInfo } from './contract/ProjectInfo';
import { QualificationObjectsCRUD } from './contract/QualificationObjectsCRUD';
import { DocumentApproval } from './contract/DocumentApproval';
import { ContractInstructions } from './contract/ContractInstructions';
import { Accordion } from './ui/Accordion';
import { reverseObjectTypeMapping } from '../utils/objectTypeMapping';

interface ContractNegotiationProps {
  project: Project;
  onBack: () => void;
  onPageChange?: (page: string, data?: any) => void;
}

const ContractNegotiation: React.FC<ContractNegotiationProps> = ({ project, onBack, onPageChange }) => {
  // ВСЕ хуки должны быть вызваны до любых условных возвратов
  const { user } = useAuth();
  const [currentProject, setCurrentProject] = useState<Project>(project);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const [approvedDocuments, setApprovedDocuments] = useState<Set<string>>(new Set());
  const [documentApprovals, setDocumentApprovals] = useState<Map<string, {
    approvedAt: Date;
    approvedBy: string;
    approvedByRole: string;
  }>>(new Map());
  const [documentStatuses, setDocumentStatuses] = useState<{
    commercialOffer: 'В работе' | 'Согласование' | 'Согласовано';
    contract: 'В работе' | 'Согласование' | 'Согласован';
  }>({
    commercialOffer: 'В работе',
    contract: 'В работе'
  });
  const [realDocumentStatuses, setRealDocumentStatuses] = useState<Map<string, any>>(new Map());
  const [qualificationProtocols, setQualificationProtocols] = useState<QualificationProtocolWithDocument[]>([]);
  const [isDocumentAccordionExpanded, setIsDocumentAccordionExpanded] = useState(true);
  const [isQualificationObjectOpen, setIsQualificationObjectOpen] = useState(false);

  // Загрузка данных контрагента - определена до useEffect
  const loadContractor = useCallback(async () => {
    if (!currentProject?.id) return;
    try {
      const contractorData = await contractorService.getContractorById(currentProject.contractorId);
      setContractor(contractorData);
    } catch (error) {
      console.error('Ошибка загрузки контрагента:', error);
    }
  }, [currentProject?.id, currentProject?.contractorId]);

  // Загрузка документов проекта - определена до useEffect
  const loadDocuments = useCallback(async () => {
    if (!currentProject?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { regularDocuments, qualificationProtocols: protocols } = await enhancedProjectDocumentService.getProjectDocuments(currentProject.id);
      
      console.log('ContractNegotiation: Загружены документы:', {
        regularDocuments: regularDocuments.length,
        qualificationProtocols: protocols.length,
        protocols: protocols.map(p => ({ id: p.id, objectType: p.objectType, objectName: p.objectName }))
      });
      
      setDocuments(regularDocuments);
      setQualificationProtocols(protocols);
    } catch (error) {
      console.error('Ошибка загрузки документов:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  // Логирование для диагностики (только при изменении проекта)
  useEffect(() => {
    console.log('ContractNegotiation: Получен проект:', {
      id: project.id,
      name: project.name,
      contractNumber: project.contractNumber,
      contractDate: project.contractDate,
      qualificationObjects: project.qualificationObjects
    });
  }, [project.id]);

  // Загружаем полную информацию о проекте при изменении project.id
  useEffect(() => {
    const loadFullProject = async () => {
      if (!project.id) return;
      try {
        const { projectService } = await import('../utils/projectService');
        const fullProject = await projectService.getProjectById(project.id);
        console.log('ContractNegotiation: Загружен полный проект:', {
          id: fullProject.id,
          qualificationObjects: fullProject.qualificationObjects,
          qualificationObjectsCount: fullProject.qualificationObjects?.length || 0
        });
        setCurrentProject(fullProject);
      } catch (error) {
        console.error('ContractNegotiation: Ошибка загрузки полного проекта:', error);
      }
    };
    loadFullProject();
  }, [project.id]);

  // Загрузка данных при изменении проекта
  useEffect(() => {
    if (!currentProject?.id) return;
    loadDocuments();
    loadContractor();
  }, [currentProject?.id, loadDocuments, loadContractor]);

  // Get documents by type - moved up to avoid reference errors
  const commercialOfferDoc = useMemo(() => documents.find(doc => doc.documentType === 'commercial_offer'), [documents]);
  const contractDoc = useMemo(() => documents.find(doc => doc.documentType === 'contract'), [documents]);

  // Инициализация статусов документов при загрузке - ПЕРЕД условным return
  useEffect(() => {
    if (documents.length > 0) {
      const commercialOfferDoc = documents.find(doc => doc.documentType === 'commercial_offer');
      const contractDoc = documents.find(doc => doc.documentType === 'contract');
      
      setDocumentStatuses({
        commercialOffer: commercialOfferDoc ? 'Согласование' : 'В работе',
        contract: contractDoc ? 'Согласование' : 'В работе'
      });
    }
  }, [documents]);

  // Мемоизируем результат проверки согласования для стабильности
  // Используем строку для approvedDocuments, чтобы избежать проблем с Set
  const approvedDocumentsString = useMemo(() => {
    return Array.from(approvedDocuments).sort().join(',');
  }, [approvedDocuments]);

  const allDocumentsApproved = useMemo(() => {
    // Если документов нет, возвращаем false (аккордеон должен быть развернут)
    if (!commercialOfferDoc && !contractDoc && qualificationProtocols.length === 0) {
      return false;
    }
    
    const commercialOfferApproved = commercialOfferDoc ? approvedDocuments.has(commercialOfferDoc.id) : true;
    const contractApproved = contractDoc ? approvedDocuments.has(contractDoc.id) : true;
    
    // Проверяем протоколы квалификации
    const allProtocolsApproved = qualificationProtocols.length > 0 
      ? qualificationProtocols.every(protocol => {
          if (!protocol.document) return true;
          return approvedDocuments.has(protocol.document.id);
        })
      : true;
    
    // Если есть оба документа, проверяем, что оба согласованы
    if (commercialOfferDoc && contractDoc) {
      return commercialOfferApproved && contractApproved && allProtocolsApproved;
    }
    
    // Если есть только один документ, проверяем его согласование
    if (commercialOfferDoc && !contractDoc) {
      return commercialOfferApproved && allProtocolsApproved;
    }
    
    if (contractDoc && !commercialOfferDoc) {
      return contractApproved && allProtocolsApproved;
    }
    
    // Если есть только протоколы, проверяем их
    if (qualificationProtocols.length > 0) {
      return allProtocolsApproved;
    }
    
    return false;
  }, [commercialOfferDoc, contractDoc, approvedDocumentsString, qualificationProtocols]);

  // Инициализация состояния аккордеона при загрузке документов - ПЕРЕД условным return
  useEffect(() => {
    // Аккордеон должен быть развернут по умолчанию
    // Закрываем только если все документы согласованы
    setIsDocumentAccordionExpanded(!allDocumentsApproved);
  }, [allDocumentsApproved]);

  const handleDocumentStatusesChange = useCallback((statuses: Map<string, any>) => {
    setRealDocumentStatuses(statuses);
  }, []);

  // Мемоизируем selectedQualificationObjects для DocumentApproval - ПЕРЕД условным return
  const selectedQualificationObjectsForApproval = useMemo(() => {
    const objects = currentProject.qualificationObjects || [];
    console.log('ContractNegotiation: Формирование selectedQualificationObjectsForApproval:', {
      qualificationObjects: objects,
      count: objects.length,
      currentProject: {
        id: currentProject.id,
        name: currentProject.name,
        qualificationObjectsCount: objects.length
      }
    });
    
    const mapped = objects.map(obj => {
      // Преобразуем тип объекта из английского (из БД) в русский (для отображения)
      // Если тип уже на русском, оставляем как есть
      const objectType = obj.qualificationObjectType || 'unknown';
      const russianType = reverseObjectTypeMapping[objectType] || objectType;
      
      console.log('ContractNegotiation: Маппинг объекта:', {
        originalType: objectType,
        russianType: russianType,
        id: obj.qualificationObjectId,
        name: obj.qualificationObjectName
      });
      
      return {
        id: obj.qualificationObjectId,
        type: russianType, // Используем русский тип для отображения
        name: obj.qualificationObjectName || 'Без названия'
      };
    });
    
    console.log('ContractNegotiation: Mapped selectedQualificationObjectsForApproval:', mapped);
    return mapped;
  }, [currentProject.qualificationObjects]);

  // Безопасная проверка данных проекта - ПОСЛЕ ВСЕХ хуков
  if (!currentProject || !currentProject.id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            title="Назад к списку проектов"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <FileText className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Ошибка загрузки проекта</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">Данные проекта не найдены или повреждены</p>
        </div>
      </div>
    );
  }

  // Удален автоматический эффект закрытия аккордеона
  // Теперь аккордеон закрывается только в ручном режиме

  // Загрузка документа
  const handleFileUpload = async (documentType: 'commercial_offer' | 'contract' | 'qualification_protocol', file: File, objectType?: string) => {
    if (!file) return;

    // Проверяем тип файла
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert('Поддерживаются только файлы PDF, DOC и DOCX');
      return;
    }

    const uploadKey = documentType === 'qualification_protocol' ? `${documentType}_${objectType}` : documentType;
    setUploading((prev: { [key: string]: boolean }) => ({ ...prev, [uploadKey]: true }));

    try {
      if (documentType === 'qualification_protocol' && objectType) {
        // Для протоколов квалификации используем новый сервис
        await enhancedProjectDocumentService.uploadDocument(
          currentProject.id, 
          'qualification_protocol', 
          file, 
          user?.id,
          objectType,
          `Протокол для ${objectType}`, // objectName
          undefined // qualificationObjectId
        );
        
        // Перезагружаем документы для получения обновленных данных
        await loadDocuments();
      } else {
        // Для обычных документов
        const uploadedDoc = await enhancedProjectDocumentService.uploadDocument(
          currentProject.id, 
          documentType, 
          file, 
          user?.id
        );
        
        // Обновляем список документов
        setDocuments(prev => {
          const filtered = prev.filter(doc => doc.documentType !== documentType);
          return [...filtered, uploadedDoc];
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки документа:', error);
      alert(`Ошибка загрузки документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setUploading((prev: { [key: string]: boolean }) => ({ ...prev, [uploadKey]: false }));
    }
  };

  // Удаление документа
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }

    try {
      await enhancedProjectDocumentService.deleteDocument(documentId);
      
      // Перезагружаем документы для получения обновленных данных
      await loadDocuments();
      
      alert('Документ успешно удален');
    } catch (error) {
      console.error('Ошибка удаления документа:', error);
      alert(`Ошибка удаления документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Скачивание документа
  // const handleDownloadDocument = async (doc: ProjectDocument) => {
  //   try {
  //     // Создаем ссылку для скачивания напрямую из URL
  //     const link = document.createElement('a');
  //     link.href = doc.fileUrl;
  //     link.download = doc.fileName;
  //     link.target = '_blank';
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //   } catch (error) {
  //     console.error('Ошибка скачивания документа:', error);
  //     alert(`Ошибка скачивания документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  //   }
  // };

  // Просмотр документа
  // const handleViewDocument = (document: ProjectDocument) => {
  //   window.open(document.fileUrl, '_blank');
  // };

  // Согласование документа
  const handleApproveDocument = (documentId: string) => {
    setApprovedDocuments(prev => new Set([...prev, documentId]));
    
    // Добавляем информацию о согласовании
    setDocumentApprovals(prev => {
      const newMap = new Map(prev);
      newMap.set(documentId, {
        approvedAt: new Date(),
        approvedBy: user?.fullName || 'Пользователь',
        approvedByRole: user?.role || 'user'
      });
      return newMap;
    });
  };

  // Отмена согласования документа
  const handleUnapproveDocument = (documentId: string) => {
    setApprovedDocuments(prev => {
      const newSet = new Set(prev);
      newSet.delete(documentId);
      return newSet;
    });
  };

  // Функция для изменения статуса проекта
  const handleProjectStatusChange = async (newStatus: string) => {
    try {
      // Здесь можно добавить логику обновления статуса проекта в базе данных
      console.log(`Статус проекта изменен на: ${newStatus}`);
      
      // Показываем уведомление пользователю
      setError(null);
      setStatusNotification(`Статус проекта изменен на: ${newStatus}`);
      
      // Автоматически скрываем уведомление через 5 секунд
      setTimeout(() => {
        setStatusNotification(null);
      }, 5000);
      
    } catch (error) {
      console.error('Ошибка изменения статуса проекта:', error);
      setError('Ошибка изменения статуса проекта');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 transition-colors"
          title="Назад к списку проектов"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <FileText className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Согласование договора</h1>
      </div>

      {/* Project Info */}
      <ProjectInfo project={currentProject} contractor={contractor || undefined} />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Ошибка загрузки документов</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Notification */}
      {statusNotification && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-green-800">Статус проекта обновлен</h3>
              <p className="text-sm text-green-700 mt-1">{statusNotification}</p>
            </div>
          </div>
        </div>
      )}

      {/* Qualification Objects CRUD - Этап согласования объемов */}
      <QualificationObjectsCRUD 
        contractorId={currentProject.contractorId}
        contractorName={currentProject.contractorName || 'Неизвестный контрагент'}
        contractorAddress={contractor?.address}
        projectId={currentProject.id}
        project={currentProject}
        projectQualificationObjects={currentProject.qualificationObjects}
        qualificationProtocols={qualificationProtocols}
        contextPage="contract_negotiation"
        isCheckboxesBlocked={(() => {
          const contractDoc = documents.find(doc => doc.documentType === 'contract');
          if (!contractDoc) {
            console.log('🔒 isCheckboxesBlocked debug: contractDoc not found');
            return false;
          }
          
          const dbStatus = realDocumentStatuses.get(contractDoc.id);
          const isApproved = dbStatus?.status === 'approved';
          
          return isApproved;
        })()}
        onPageChange={onPageChange}
        onQualificationObjectStateChange={setIsQualificationObjectOpen}
      />

      {/* Document Approval - Accordion Block - скрывается при открытом объекте квалификации */}
      {!isQualificationObjectOpen && (
        <Accordion
          title="Согласование документов"
          icon={<FileCheck className="w-5 h-5 text-indigo-600" />}
          expanded={isDocumentAccordionExpanded}
          onToggle={setIsDocumentAccordionExpanded}
          className="shadow-sm"
        >
          <div className="p-6">
            <DocumentApproval
              project={currentProject}
              commercialOfferDoc={commercialOfferDoc}
              contractDoc={contractDoc}
              qualificationProtocols={qualificationProtocols}
              approvedDocuments={approvedDocuments}
              documentApprovals={documentApprovals}
              selectedQualificationObjects={selectedQualificationObjectsForApproval}
              onUpload={handleFileUpload}
              onDelete={handleDeleteDocument}
              onApprove={handleApproveDocument}
              onUnapprove={handleUnapproveDocument}
              onProjectStatusChange={handleProjectStatusChange}
              onProjectUpdate={(updatedProject) => {
                console.log('ContractNegotiation: Обновление проекта через onProjectUpdate:', {
                  oldProject: currentProject,
                  newProject: updatedProject,
                  contractNumber: updatedProject.contractNumber,
                  contractDate: updatedProject.contractDate
                });
                setCurrentProject(updatedProject);
              }}
              onDocumentStatusesChange={handleDocumentStatusesChange}
              userRole={user?.role}
            />
          </div>
        </Accordion>
      )}

      {/* Instructions */}
      <ContractInstructions />
    </div>
  );
};

export default ContractNegotiation;