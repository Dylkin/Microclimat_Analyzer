import { apiClient } from './apiClient';
import { AuditLog, CreateAuditLogData, AuditAction, AuditEntityType } from '../types/AuditLog';

class AuditService {
  isAvailable(): boolean {
    return true; // API всегда доступен
  }

  /**
   * Создает запись аудита
   */
  async createAuditLog(data: CreateAuditLogData): Promise<AuditLog> {
    try {
      const auditLog = await apiClient.post<any>('/audit-logs', {
        userId: data.userId,
        userName: data.userName,
        userRole: data.userRole,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        entityName: data.entityName,
        details: data.details || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null
      });

      return {
        id: auditLog.id,
        userId: auditLog.userId || auditLog.user_id,
        userName: auditLog.userName || auditLog.user_name,
        userRole: auditLog.userRole || auditLog.user_role,
        action: auditLog.action as AuditAction,
        entityType: auditLog.entityType || auditLog.entity_type as AuditEntityType,
        entityId: auditLog.entityId || auditLog.entity_id,
        entityName: auditLog.entityName || auditLog.entity_name,
        details: auditLog.details || auditLog.changes,
        timestamp: auditLog.timestamp ? new Date(auditLog.timestamp) : (auditLog.created_at ? new Date(auditLog.created_at) : new Date()),
        ipAddress: auditLog.ipAddress || auditLog.ip_address,
        userAgent: auditLog.userAgent || auditLog.user_agent
      };
    } catch (error: any) {
      console.error('Ошибка в createAuditLog:', error);
      throw new Error(`Ошибка создания записи аудита: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Получает логи аудита с фильтрацией
   */
  async getAuditLogs(filters?: {
    userId?: string;
    action?: AuditAction;
    entityType?: AuditEntityType;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    console.log('AuditService: Начинаем загрузку логов аудита с фильтрами:', filters);

    try {
      const params = new URLSearchParams();
      
      if (filters?.userId) params.append('user_id', filters.userId);
      if (filters?.action) params.append('action', filters.action);
      if (filters?.entityType) params.append('entity_type', filters.entityType);
      if (filters?.entityId) params.append('entity_id', filters.entityId);
      if (filters?.startDate) params.append('start_date', filters.startDate.toISOString());
      if (filters?.endDate) params.append('end_date', filters.endDate.toISOString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const queryString = params.toString();
      const url = queryString ? `/audit-logs?${queryString}` : '/audit-logs';
      
      const data = await apiClient.get<any[]>(url);

      console.log('AuditService: Результат запроса:', { count: data.length });

      return data.map((log: any) => ({
        id: log.id,
        userId: log.userId || log.user_id,
        userName: log.userName || log.user_name,
        userRole: log.userRole || log.user_role,
        action: log.action as AuditAction,
        entityType: log.entityType || log.entity_type as AuditEntityType,
        entityId: log.entityId || log.entity_id,
        entityName: log.entityName || log.entity_name,
        details: log.details || log.changes,
        timestamp: log.timestamp ? new Date(log.timestamp) : (log.created_at ? new Date(log.created_at) : new Date()),
        ipAddress: log.ipAddress || log.ip_address,
        userAgent: log.userAgent || log.user_agent
      }));
    } catch (error: any) {
      console.error('Ошибка в getAuditLogs:', error);
      throw new Error(`Ошибка получения логов аудита: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Получает статистику действий пользователя
   */
  async getUserAuditStats(userId: string, days: number = 30): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    lastActivity: Date | null;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const data = await this.getAuditLogs({
        userId,
        startDate,
        limit: 1000
      });

      const actionsByType: Record<string, number> = {};
      let lastActivity: Date | null = null;

      data.forEach((log) => {
        actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
        if (!lastActivity || log.timestamp > lastActivity) {
          lastActivity = log.timestamp;
        }
      });

      return {
        totalActions: data.length,
        actionsByType,
        lastActivity
      };
    } catch (error: any) {
      console.error('Ошибка в getUserAuditStats:', error);
      throw new Error(`Ошибка получения статистики аудита: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Получает IP адрес и User Agent из браузера
   */
  getClientInfo(): { ipAddress?: string; userAgent?: string } {
    return {
      userAgent: navigator.userAgent,
      // IP адрес можно получить только через внешний сервис
      // В реальном приложении это должно делаться на сервере
    };
  }
}

export const auditService = new AuditService();
