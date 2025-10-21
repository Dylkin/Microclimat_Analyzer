import React, { useState, useEffect } from 'react';
import { CheckCircle, X, Clock, User, Calendar } from 'lucide-react';
import { documentApprovalService } from '../../utils/documentApprovalService';
import { auditService } from '../../utils/auditService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabaseClient';

interface ApprovalRecord {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  status: 'approved' | 'rejected' | 'pending';
  comment?: string;
  createdAt: Date;
}

interface DocumentApprovalActionsProps {
  documentId: string;
  documentType: 'commercial_offer' | 'contract' | 'qualification_protocol';
  currentStatus: 'pending' | 'approved' | 'rejected';
  isCancelBlocked?: boolean;
  onStatusChange?: (status: 'approved' | 'rejected' | 'pending', comment?: string) => void;
}

export const DocumentApprovalActions: React.FC<DocumentApprovalActionsProps> = ({
  documentId,
  documentType,
  currentStatus,
  isCancelBlocked = false,
  onStatusChange
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  // const [approvalComment, setApprovalComment] = useState('');
  const [approvalHistory, setApprovalHistory] = useState<ApprovalRecord[]>([]);
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map());

  // Функция для получения ФИО пользователей
  const loadUserNames = async (userIds: string[]) => {
    if (!supabase || userIds.length === 0) return;

    try {
      console.log('Загружаем ФИО для пользователей:', userIds);
      
      // Сначала пробуем загрузить из public.users
      let query = supabase.from('users').select('id, full_name');
      
      if (userIds.length === 1) {
        query = query.eq('id', userIds[0]);
      } else {
        query = query.in('id', userIds);
      }
      
      const { data, error } = await query;

      if (error) {
        console.warn('Ошибка загрузки ФИО из public.users:', error);
        console.warn('Детали ошибки:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        console.log('Используем fallback - отображаем email из истории согласований');
        return; // Не устанавливаем userNames, будет использоваться userName из записи
      }

      console.log('Загружены ФИО пользователей из public.users:', data);

      // Если данные пустые, используем fallback
      if (!data || data.length === 0) {
        console.log('Данные из public.users пустые, используем fallback - отображаем email из истории согласований');
        return;
      }

      const nameMap = new Map<string, string>();
      data?.forEach(user => {
        nameMap.set(user.id, user.full_name);
      });

      setUserNames(nameMap);
    } catch (error) {
      console.warn('Ошибка при получении ФИО пользователей:', error);
    }
  };

  // Загрузка истории согласований
  useEffect(() => {
    const loadApprovalHistory = async () => {
      try {
        console.log('Загрузка истории согласований для документа:', documentId);
        const history = await documentApprovalService.getApprovalHistory(documentId);
        console.log('Загружена история согласований:', history);
        setApprovalHistory(history);

        // Загружаем ФИО пользователей
        const userIds = [...new Set(history.map(record => record.userId))];
        await loadUserNames(userIds);
      } catch (error) {
        console.error('Ошибка загрузки истории согласований:', error);
        // Не создаем автоматические записи - только пользовательские
        setApprovalHistory([]);
      }
    };

    if (documentId) {
      loadApprovalHistory();
    }
  }, [documentId]);

  const handleApproval = async (status: 'approved' | 'rejected' | 'pending') => {
    setLoading(true);
    
    try {
      // Получаем ФИО пользователя
      // const userName = user?.fullName || user?.email || 'Пользователь';
      const userId = user?.id || 'current_user';
      const userName = user?.fullName || user?.email || 'Пользователь';
      const userRole = user?.role || 'user';
      
      let approvalRecord: ApprovalRecord;
      let auditAction: 'document_approved' | 'document_rejected' | 'document_approval_cancelled';
      
      if (status === 'approved') {
        approvalRecord = await documentApprovalService.approveDocument(
          documentId, 
          userId, 
          undefined
        );
        auditAction = 'document_approved';
      } else if (status === 'rejected') {
        approvalRecord = await documentApprovalService.rejectDocument(
          documentId, 
          userId, 
          undefined
        );
        auditAction = 'document_rejected';
      } else {
        // Отмена согласования - используем новый метод сервиса
        approvalRecord = await documentApprovalService.cancelApproval(
          documentId, 
          userId, 
          'Согласование отменено'
        );
        auditAction = 'document_approval_cancelled';
      }

      // Записываем событие в аудит
      try {
        const clientInfo = auditService.getClientInfo();
        await auditService.createAuditLog({
          userId,
          userName,
          userRole,
          action: auditAction,
          entityType: 'document',
          entityId: documentId,
          entityName: `Документ ${documentType}`,
          details: {
            documentType,
            previousStatus: currentStatus,
            newStatus: status,
            comment: approvalRecord.comment
          },
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent
        });
      } catch (auditError) {
        console.error('Ошибка записи в аудит:', auditError);
        // Не прерываем выполнение основного действия из-за ошибки аудита
      }

      setApprovalHistory(prev => [...prev, approvalRecord]);
      
      // Загружаем ФИО нового пользователя
      await loadUserNames([approvalRecord.userId]);
      
      if (onStatusChange) {
        onStatusChange(status, undefined);
      }
    } catch (error) {
      console.error('Ошибка изменения статуса:', error);
      // Fallback к локальному изменению
      // const userName = user?.fullName || user?.email || 'Пользователь';
      const userId = user?.id || 'current_user';
      const userName = user?.fullName || user?.email || 'Пользователь';
      const userRole = user?.role || 'user';
      
      const approvalRecord: ApprovalRecord = {
        id: Date.now().toString(),
        documentId,
        userId,
        userName: user?.fullName || user?.email || 'Пользователь',
        status,
        comment: status === 'pending' ? 'Согласование отменено' : undefined,
        createdAt: new Date()
      };

      // Записываем событие в аудит даже при fallback
      try {
        const auditAction: 'document_approved' | 'document_rejected' | 'document_approval_cancelled' = 
          status === 'approved' ? 'document_approved' :
          status === 'rejected' ? 'document_rejected' : 'document_approval_cancelled';
        
        const clientInfo = auditService.getClientInfo();
        await auditService.createAuditLog({
          userId,
          userName,
          userRole,
          action: auditAction,
          entityType: 'document',
          entityId: documentId,
          entityName: `Документ ${documentType}`,
          details: {
            documentType,
            previousStatus: currentStatus,
            newStatus: status,
            comment: approvalRecord.comment,
            fallback: true // Отмечаем, что это fallback запись
          },
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent
        });
      } catch (auditError) {
        console.error('Ошибка записи в аудит (fallback):', auditError);
      }

      setApprovalHistory(prev => [...prev, approvalRecord]);
      
      if (onStatusChange) {
        onStatusChange(status, undefined);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <X className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case 'approved':
  //       return 'bg-green-100 text-green-800 border-green-200';
  //     case 'rejected':
  //       return 'bg-red-100 text-red-800 border-red-200';
  //     default:
  //       return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  //   }
  // };

  // const getStatusText = (status: string) => {
  //   switch (status) {
  //     case 'approved':
  //       return 'Согласовано';
  //     case 'rejected':
  //       return 'Отклонено';
  //     default:
  //       return 'Ожидает согласования';
  //   }
  // };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Текущий статус - убран по требованию */}

      {/* История согласований */}
      {approvalHistory.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <h5 className="text-sm font-medium text-gray-900 mb-2">История согласований</h5>
          <div className="space-y-2">
            {approvalHistory.map((record) => (
              <div key={record.id} className="flex items-start space-x-3">
                {getStatusIcon(record.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <User className="w-3 h-3 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {userNames.get(record.userId) || record.userName}
                    </span>
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {formatDateTime(record.createdAt)}
                    </span>
                  </div>
                  {record.comment && (
                    <p className="text-sm text-gray-600">{record.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Действия согласования */}
      {currentStatus === 'pending' && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => handleApproval('approved')}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Согласовано</span>
            </button>
          </div>
        </div>
      )}

      {/* Кнопка отмены согласования для согласованных документов */}
      {currentStatus === 'approved' && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => handleApproval('pending')}
              disabled={loading || isCancelBlocked}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                isCancelBlocked 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isCancelBlocked ? 'Отмена согласования заблокирована после согласования договора' : ''}
            >
              <X className="w-4 h-4" />
              <span>Отменить согласование</span>
            </button>
          </div>
          {isCancelBlocked && (
            <div className="mt-2 text-right">
              <p className="text-xs text-gray-500">
                Отмена согласования заблокирована после согласования договора
              </p>
            </div>
          )}
        </div>
      )}

      {/* Информация о повторном согласовании */}
      {currentStatus === 'rejected' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            Документ отклонен. Для изменения статуса обратитесь к администратору.
          </p>
        </div>
      )}
    </div>
  );
};
