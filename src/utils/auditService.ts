import { AuditLog } from '../types/AuditLog';

// Базовый интерфейс параметров для создания записи аудита
export interface CreateAuditLogParams {
  userId: string;
  userName: string;
  userRole: string;
  action: AuditLog['action'];
  entityType: AuditLog['entityType'];
  entityId: string;
  entityName?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

class AuditService {
  // В текущей реализации аудит пишется только через backend,
  // поэтому на фронтенде считаем сервис всегда доступным.
  isAvailable(): boolean {
    return true;
  }

  // Заглушка получения информации о клиенте
  getClientInfo() {
    return {
      ipAddress: undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };
  }

  // Отправка записи аудита на backend (если будет реализовано) или лог в консоль
  async createAuditLog(params: CreateAuditLogParams): Promise<void> {
    try {
      // Здесь можно реализовать вызов /api/audit-logs при необходимости.
      console.log('AuditService.createAuditLog (stub):', params);
      // Простой no-op, чтобы не ломать существующую логику.
    } catch (error) {
      console.error('AuditService: ошибка при создании записи аудита (stub):', error);
    }
  }

  // Заглушка получения логов аудита для страницы AuditLogs
  async getAuditLogs(filters: {
    action?: AuditLog['action'];
    entityType?: AuditLog['entityType'];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    console.warn('AuditService.getAuditLogs (stub): возвращает пустой список. Фильтры:', filters);
    return [];
  }
}

export const auditService = new AuditService();



