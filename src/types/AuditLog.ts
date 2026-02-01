export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  details?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export type AuditAction = 
  | 'document_approved'
  | 'document_rejected'
  | 'document_approval_cancelled'
  | 'document_uploaded'
  | 'document_deleted'
  | 'project_created'
  | 'project_updated'
  | 'project_status_changed'
  | 'user_login'
  | 'user_logout'
  | 'contract_fields_updated'
  | 'qualification_object_created'
  | 'qualification_object_updated'
  | 'qualification_object_deleted'
  | 'qualification_stage_completed'
  | 'qualification_stage_cancelled'
  | 'logger_data_uploaded'
  | 'logger_data_parsed'
  | 'report_generated'
  | 'report_approved'
  | 'report_rejected'
  | 'documentation_status_changed';

export type AuditEntityType = 
  | 'document'
  | 'project'
  | 'qualification_object'
  | 'logger_data'
  | 'report'
  | 'user'
  | 'contract'
  | 'system'
  | 'documentation_item';

export interface CreateAuditLogData {
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}
