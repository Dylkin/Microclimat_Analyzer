import { supabase } from './supabaseClient';
import { AuditLog, CreateAuditLogData, AuditAction, AuditEntityType } from '../types/AuditLog';

class AuditService {
  private supabase: any;

  constructor() {
    this.supabase = supabase;
  }

  /**
   * Проверяет доступность Supabase
   */
  isAvailable(): boolean {
    return !!this.supabase;
  }

  /**
   * Создает запись аудита
   */
  async createAuditLog(data: CreateAuditLogData): Promise<AuditLog> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const auditData = {
        user_id: data.userId,
        user_name: data.userName,
        user_role: data.userRole,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId,
        entity_name: data.entityName,
        details: data.details || null,
        ip_address: data.ipAddress || null,
        user_agent: data.userAgent || null,
        timestamp: new Date().toISOString()
      };

      const { data: auditLog, error } = await this.supabase
        .from('audit_logs')
        .insert(auditData)
        .select()
        .single();

      if (error) {
        console.error('Ошибка создания записи аудита:', error);
        throw new Error(`Ошибка создания записи аудита: ${error.message}`);
      }

      return {
        id: auditLog.id,
        userId: auditLog.user_id,
        userName: auditLog.user_name,
        userRole: auditLog.user_role,
        action: auditLog.action as AuditAction,
        entityType: auditLog.entity_type as AuditEntityType,
        entityId: auditLog.entity_id,
        entityName: auditLog.entity_name,
        details: auditLog.details,
        timestamp: new Date(auditLog.timestamp),
        ipAddress: auditLog.ip_address,
        userAgent: auditLog.user_agent
      };
    } catch (error) {
      console.error('Ошибка в createAuditLog:', error);
      throw error;
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
    if (!this.supabase) {
      console.error('AuditService: Supabase не настроен');
      throw new Error('Supabase не настроен');
    }

    console.log('AuditService: Начинаем загрузку логов аудита с фильтрами:', filters);

    try {
      let query = this.supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters?.entityId) {
        query = query.eq('entity_id', filters.entityId);
      }

      if (filters?.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      console.log('AuditService: Результат запроса:', { data, error });

      if (error) {
        console.error('AuditService: Ошибка получения логов аудита:', error);
        throw new Error(`Ошибка получения логов аудита: ${error.message}`);
      }

      return data.map((log: any) => ({
        id: log.id,
        userId: log.user_id,
        userName: log.user_name,
        userRole: log.user_role,
        action: log.action as AuditAction,
        entityType: log.entity_type as AuditEntityType,
        entityId: log.entity_id,
        entityName: log.entity_name,
        details: log.details,
        timestamp: new Date(log.timestamp),
        ipAddress: log.ip_address,
        userAgent: log.user_agent
      }));
    } catch (error) {
      console.error('Ошибка в getAuditLogs:', error);
      throw error;
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
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('action, timestamp')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Ошибка получения статистики аудита:', error);
        throw new Error(`Ошибка получения статистики аудита: ${error.message}`);
      }

      const actionsByType: Record<string, number> = {};
      let lastActivity: Date | null = null;

      data.forEach((log: any) => {
        actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
        if (!lastActivity) {
          lastActivity = new Date(log.timestamp);
        }
      });

      return {
        totalActions: data.length,
        actionsByType,
        lastActivity
      };
    } catch (error) {
      console.error('Ошибка в getUserAuditStats:', error);
      throw error;
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
