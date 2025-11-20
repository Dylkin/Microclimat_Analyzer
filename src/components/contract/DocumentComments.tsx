import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, User, Clock } from 'lucide-react';
import { documentApprovalService } from '../../utils/documentApprovalService';
import { useAuth } from '../../contexts/AuthContext';

interface DocumentComment {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  comment: string;
  createdAt: Date;
}

interface DocumentCommentsProps {
  documentId: string;
  documentType: 'commercial_offer' | 'contract' | 'qualification_protocol';
  onCommentAdd?: (comment: DocumentComment) => void;
}

export const DocumentComments: React.FC<DocumentCommentsProps> = ({
  documentId,
  // documentType,
  onCommentAdd
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  // Загрузка комментариев
  useEffect(() => {
    const loadComments = async () => {
      try {
        // Если это временный ID, не загружаем комментарии
        if (documentId.startsWith('temp-')) {
          setComments([]);
          return;
        }

        console.log('Загрузка комментариев для документа:', documentId);
        const commentsData = await documentApprovalService.getComments(documentId);
        console.log('Загружены комментарии:', commentsData);
        setComments(commentsData);
      } catch (error) {
        console.error('Ошибка загрузки комментариев:', error);
        // Не показываем тестовые комментарии - только пустой список
        setComments([]);
      }
    };

    if (documentId) {
      loadComments();
    }
  }, [documentId]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setLoading(true);
    
    try {
      // Получаем ФИО пользователя
      const userName = user?.fullName || user?.email || 'Пользователь';
      const userId = user?.id || 'current_user';

      // Если это временный ID, добавляем комментарий локально
      if (documentId.startsWith('temp-')) {
        const comment: DocumentComment = {
          id: Date.now().toString(),
          documentId,
          userId,
          userName,
          comment: newComment.trim(),
          createdAt: new Date()
        };

        setComments(prev => [...prev, comment]);
        setNewComment('');
        
        if (onCommentAdd) {
          onCommentAdd(comment);
        }
      } else {
        // Для реальных документов используем сервис
        const comment = await documentApprovalService.addComment(
          documentId, 
          newComment.trim(), 
          userId
        );

        setComments(prev => [...prev, comment]);
        setNewComment('');
        
        if (onCommentAdd) {
          onCommentAdd(comment);
        }
      }
    } catch (error) {
      console.error('Ошибка добавления комментария:', error);
      // Fallback к локальному добавлению
      const userName = user?.fullName || user?.email || 'Пользователь';
      const userId = user?.id || 'current_user';
      
      const comment: DocumentComment = {
        id: Date.now().toString(),
        documentId,
        userId,
        userName,
        comment: newComment.trim(),
        createdAt: new Date()
      };

      setComments(prev => [...prev, comment]);
      setNewComment('');
      
      if (onCommentAdd) {
        onCommentAdd(comment);
      }
    } finally {
      setLoading(false);
    }
  };

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
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-4">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <h4 className="text-sm font-medium text-gray-900">Комментарии к согласованию</h4>
        <span className="text-xs text-gray-500">({comments.length})</span>
      </div>

      {/* Список комментариев */}
      <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Комментариев пока нет
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    {comment.userName}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatDateTime(comment.createdAt)}</span>
                </div>
              </div>
              <p className="text-sm text-gray-700">{comment.comment}</p>
            </div>
          ))
        )}
      </div>

      {/* Форма добавления комментария */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex space-x-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Добавить комментарий к процессу согласования..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={2}
          />
          <button
            onClick={handleAddComment}
            disabled={loading || !newComment.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
          >
            <Send className="w-4 h-4" />
            <span className="text-sm">Отправить</span>
          </button>
        </div>
      </div>
    </div>
  );
};
