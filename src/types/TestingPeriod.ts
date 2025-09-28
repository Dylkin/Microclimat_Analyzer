export type TestingPeriodStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface TestingPeriod {
  id: string;
  qualificationObjectId: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  status: TestingPeriodStatus;
  notes?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt: Date;
  updatedAt: Date;
  documents?: TestingPeriodDocument[];
}

export interface TestingPeriodDocument {
  id: string;
  testingPeriodId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  createdAt: Date;
}

export interface CreateTestingPeriodData {
  qualificationObjectId: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  status?: TestingPeriodStatus;
  notes?: string;
}

export interface UpdateTestingPeriodData {
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  status?: TestingPeriodStatus;
  notes?: string;
}

export const TestingPeriodStatusLabels: Record<TestingPeriodStatus, string> = {
  'planned': 'Запланировано',
  'in_progress': 'В процессе',
  'completed': 'Завершено',
  'cancelled': 'Отменено'
};

export const TestingPeriodStatusColors: Record<TestingPeriodStatus, string> = {
  'planned': 'bg-blue-100 text-blue-800',
  'in_progress': 'bg-yellow-100 text-yellow-800',
  'completed': 'bg-green-100 text-green-800',
  'cancelled': 'bg-red-100 text-red-800'
};