export type DocumentationStatus = 'available' | 'not_available' | 'not_applicable' | 'not_selected';

export interface DocumentationItemStatusChange {
  status: DocumentationStatus;
  changedAt: Date;
  changedBy: string;
  changedByName: string;
}

export interface DocumentationItem {
  id: string;
  name: string;
  description: string;
  status: DocumentationStatus;
  statusHistory?: DocumentationItemStatusChange[];
}

export interface DocumentationCheck {
  id: string;
  qualificationObjectId: string;
  projectId: string;
  items: DocumentationItem[];
  checkedAt: Date;
  checkedBy: string;
  checkedByName: string;
}

export const DOCUMENTATION_ITEMS: Omit<DocumentationItem, 'id' | 'status'>[] = [
  {
    name: 'Руководство по эксплуатации объекта мониторинга',
    description: 'Техническая документация по эксплуатации объекта мониторинга'
  },
  {
    name: 'Сервисная книга объекта мониторинга',
    description: 'Документация по техническому обслуживанию объекта мониторинга'
  },
  {
    name: 'Паспорт объекта мониторинга',
    description: 'Паспортные данные и технические характеристики объекта мониторинга'
  },
  {
    name: 'Руководство по эксплуатации климатического оборудования',
    description: 'Техническая документация по эксплуатации климатического оборудования'
  },
  {
    name: 'Сервисная книга климатического оборудования',
    description: 'Документация по техническому обслуживанию климатического оборудования'
  },
  {
    name: 'Паспорт объекта климатического оборудования',
    description: 'Паспортные данные и технические характеристики климатического оборудования'
  }
];

export const DOCUMENTATION_STATUS_LABELS: Record<DocumentationStatus, string> = {
  available: 'Есть',
  not_available: 'Нет',
  not_applicable: 'Не применимо',
  not_selected: 'Не выбрано'
};

export const DOCUMENTATION_STATUS_COLORS: Record<DocumentationStatus, string> = {
  available: 'text-green-600 bg-green-100',
  not_available: 'text-red-600 bg-red-100',
  not_applicable: 'text-gray-600 bg-gray-100',
  not_selected: 'text-gray-400 bg-gray-50'
};
