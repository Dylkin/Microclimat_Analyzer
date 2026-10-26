import { apiClient } from './apiClient';
import {
  Project,
  ProjectItem,
  ProjectQualificationObject,
  ProjectStageAssignment,
  ProjectStatus,
  ProjectType,
  CreateProjectData,
  UpdateProjectData,
} from '../types/Project';

type ProjectDto = {
  id: string;
  name: string;
  description?: string | null;
  type?: ProjectType | null;
  contractorId?: string | null;
  contractor_id?: string | null;
  contractorName?: string | null;
  contract_number?: string | null;
  contractNumber?: string | null;
  contract_date?: string | null;
  contractDate?: string | null;
  tender_date?: string | null;
  tenderDate?: string | null;
  total_cost_with_vat?: number | string | null;
  totalCostWithVat?: number | string | null;
  loggers_count?: number | null;
  loggersCount?: number | null;
  protocol_print_copies?: number | null;
  protocolPrintCopies?: number | null;
  report_print_copies?: number | null;
  reportPrintCopies?: number | null;
  travel_expenses?: number | string | null;
  travelExpenses?: number | string | null;
  protocol_preparation_start_date?: string | null;
  protocolPreparationStartDate?: string | null;
  protocol_preparation_end_date?: string | null;
  protocolPreparationEndDate?: string | null;
  testing_start_date?: string | null;
  testingStartDate?: string | null;
  testing_end_date?: string | null;
  testingEndDate?: string | null;
  report_preparation_start_date?: string | null;
  reportPreparationStartDate?: string | null;
  report_preparation_end_date?: string | null;
  reportPreparationEndDate?: string | null;
  start_date_planned?: string | null;
  startDatePlanned?: string | null;
  start_date_actual?: string | null;
  startDateActual?: string | null;
  end_date_planned?: string | null;
  endDatePlanned?: string | null;
  end_date_actual?: string | null;
  endDateActual?: string | null;
  payment_date?: string | null;
  paymentDate?: string | null;
  status: ProjectStatus;
  created_by?: string | null;
  createdBy?: string | null;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
  items?: Array<{
    id: string;
    projectId?: string;
    project_id?: string;
    name: string;
    quantity: number;
    declaredPrice?: number;
    declared_price?: number | string;
    supplierId?: string | null;
    supplier_id?: string | null;
    supplierName?: string | null;
    supplier_name?: string | null;
    supplierPrice?: number | null;
    supplier_price?: number | string | null;
    description?: string | null;
    categoryId?: string | null;
    category_id?: string | null;
    categoryName?: string | null;
    category_name?: string | null;
    channelsCount?: number | null;
    channels_count?: number | null;
    dosingVolume?: string | null;
    dosing_volume?: string | null;
    volumeStep?: string | null;
    volume_step?: string | null;
    dosingAccuracy?: string | null;
    dosing_accuracy?: string | null;
    reproducibility?: string | null;
    autoclavable?: boolean | null;
    inRegistrySI?: boolean | null;
    in_registry_si?: boolean | null;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
  }>;
  qualificationObjects?: Array<{
    id: string;
    name?: string;
    objectType?: string;
    qualificationObjectId?: string;
    projectId?: string;
    createdAt?: string;
  }>;
  stageAssignments?: Array<{
    id: string;
    projectId: string;
    stage: ProjectStatus;
    assignedUserId?: string;
    assignedUserName?: string;
    assignedAt?: string;
    completedAt?: string | null;
    notes?: string | null;
    createdAt?: string;
  }>;
};

const toDate = (value?: string | null) =>
  value ? new Date(value) : undefined;

const mapQualificationObjects = (
  items?: ProjectDto['qualificationObjects'],
): ProjectQualificationObject[] =>
  (items || []).map((item) => ({
    id: item.id,
    projectId: item.projectId || '',
    qualificationObjectId:
      item.qualificationObjectId || item.id,
    qualificationObjectName: item.name,
    qualificationObjectType: item.objectType,
    createdAt: toDate(item.createdAt) || new Date(),
  }));

const mapStageAssignments = (
  items?: ProjectDto['stageAssignments'],
): ProjectStageAssignment[] =>
  (items || []).map((item) => ({
    id: item.id,
    projectId: item.projectId,
    stage: item.stage,
    assignedUserId: item.assignedUserId,
    assignedUserName: item.assignedUserName,
    assignedAt: toDate(item.assignedAt) || new Date(),
    completedAt: toDate(item.completedAt || undefined),
    notes: item.notes || undefined,
    createdAt: toDate(item.createdAt) || new Date(),
  }));

const mapItems = (items?: ProjectDto['items']): ProjectItem[] =>
  (items || []).map((item) => ({
    id: item.id,
    projectId: item.projectId || item.project_id || '',
    name: item.name,
    quantity: item.quantity,
    declaredPrice: Number(
      item.declaredPrice ?? item.declared_price ?? 0,
    ),
    supplierId:
      (item.supplierId ?? item.supplier_id ?? undefined) || undefined,
    supplierName:
      (item.supplierName ?? item.supplier_name ?? undefined) || undefined,
    supplierPrice:
      item.supplierPrice !== undefined && item.supplierPrice !== null
        ? Number(item.supplierPrice)
        : item.supplier_price != null
        ? Number(item.supplier_price)
        : undefined,
    description: item.description || undefined,
    categoryId: (item as any).categoryId ?? (item as any).category_id ?? undefined,
    categoryName: (item as any).categoryName ?? (item as any).category_name ?? undefined,
    channelsCount: (item as any).channelsCount ?? (item as any).channels_count ?? undefined,
    dosingVolume: (item as any).dosingVolume ?? (item as any).dosing_volume ?? undefined,
    volumeStep: (item as any).volumeStep ?? (item as any).volume_step ?? undefined,
    dosingAccuracy: (item as any).dosingAccuracy ?? (item as any).dosing_accuracy ?? undefined,
    reproducibility: (item as any).reproducibility ?? undefined,
    autoclavable: (item as any).autoclavable ?? undefined,
    inRegistrySI: (item as any).inRegistrySI ?? (item as any).in_registry_si ?? undefined,
    createdAt:
      toDate(item.createdAt || item.created_at) || new Date(),
    updatedAt:
      toDate(item.updatedAt || item.updated_at) || new Date(),
  }));

const mapProject = (dto: ProjectDto): Project => {
  // Валидация и нормализация статуса
  const validStatuses: ProjectStatus[] = [
    'documents_submission',
    'contract_negotiation',
    'testing_execution',
    'report_preparation',
    'report_approval',
    'report_printing',
    'completed',
    'not_suitable'
  ];
  
  let status: ProjectStatus = dto.status as ProjectStatus;
  
  // Если статус не валиден, используем значение по умолчанию
  if (!validStatuses.includes(status)) {
    console.warn(`Неизвестный статус проекта: ${dto.status}, используем 'contract_negotiation'`);
    status = 'contract_negotiation';
  }
  
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description || undefined,
    type: (dto.type || 'qualification') as ProjectType,
    contractorId: dto.contractorId || dto.contractor_id || '',
    contractorName: dto.contractorName || undefined,
    contractNumber: dto.contractNumber || dto.contract_number || undefined,
    contractDate: toDate(dto.contractDate || dto.contract_date),
    tenderDate: toDate(dto.tenderDate || dto.tender_date),
    totalCostWithVat:
      dto.totalCostWithVat !== undefined && dto.totalCostWithVat !== null
        ? Number(dto.totalCostWithVat)
        : dto.total_cost_with_vat !== undefined && dto.total_cost_with_vat !== null
        ? Number(dto.total_cost_with_vat)
        : undefined,
    loggersCount:
      dto.loggersCount !== undefined && dto.loggersCount !== null
        ? Number(dto.loggersCount)
        : dto.loggers_count !== undefined && dto.loggers_count !== null
        ? Number(dto.loggers_count)
        : undefined,
    protocolPrintCopies:
      dto.protocolPrintCopies !== undefined && dto.protocolPrintCopies !== null
        ? Number(dto.protocolPrintCopies)
        : dto.protocol_print_copies !== undefined && dto.protocol_print_copies !== null
        ? Number(dto.protocol_print_copies)
        : undefined,
    reportPrintCopies:
      dto.reportPrintCopies !== undefined && dto.reportPrintCopies !== null
        ? Number(dto.reportPrintCopies)
        : dto.report_print_copies !== undefined && dto.report_print_copies !== null
        ? Number(dto.report_print_copies)
        : undefined,
    travelExpenses:
      dto.travelExpenses !== undefined && dto.travelExpenses !== null
        ? Number(dto.travelExpenses)
        : dto.travel_expenses !== undefined && dto.travel_expenses !== null
        ? Number(dto.travel_expenses)
        : undefined,
    protocolPreparationStartDate: toDate(dto.protocolPreparationStartDate || dto.protocol_preparation_start_date),
    protocolPreparationEndDate: toDate(dto.protocolPreparationEndDate || dto.protocol_preparation_end_date),
    testingStartDate: toDate(dto.testingStartDate || dto.testing_start_date),
    testingEndDate: toDate(dto.testingEndDate || dto.testing_end_date),
    reportPreparationStartDate: toDate(dto.reportPreparationStartDate || dto.report_preparation_start_date),
    reportPreparationEndDate: toDate(dto.reportPreparationEndDate || dto.report_preparation_end_date),
    startDatePlanned: toDate(dto.startDatePlanned || dto.start_date_planned),
    startDateActual: toDate(dto.startDateActual || dto.start_date_actual),
    endDatePlanned: toDate(dto.endDatePlanned || dto.end_date_planned),
    endDateActual: toDate(dto.endDateActual || dto.end_date_actual),
    paymentDate: toDate(dto.paymentDate || dto.payment_date),
    status: status,
    createdBy: dto.createdBy || dto.created_by || undefined,
    createdAt: toDate(dto.createdAt || dto.created_at) || new Date(),
    updatedAt: toDate(dto.updatedAt || dto.updated_at) || new Date(),
    qualificationObjects: mapQualificationObjects(dto.qualificationObjects),
    stageAssignments: mapStageAssignments(dto.stageAssignments),
    items: mapItems(dto.items),
  };
};

class ProjectService {
  isAvailable(): boolean {
    return true;
  }

  async getAllProjects(): Promise<Project[]> {
    const data = await apiClient.get<ProjectDto[]>('/projects');
    return data.map(mapProject);
  }

  async getProjectById(id: string): Promise<Project> {
    const data = await apiClient.get<ProjectDto>(`/projects/${id}`);
    return mapProject(data);
  }

  async addProject(project: CreateProjectData, userId?: string): Promise<Project> {
    const payload = {
      name: project.name,
      description: project.description,
      type: project.type || 'qualification',
      contractorId: project.contractorId,
      tenderLink: project.tenderLink,
      tenderDate: project.tenderDate,
      totalCostWithVat: project.totalCostWithVat,
      loggersCount: project.loggersCount,
      protocolPrintCopies: project.protocolPrintCopies,
      reportPrintCopies: project.reportPrintCopies,
      travelExpenses: project.travelExpenses,
      protocolPreparationStartDate: project.protocolPreparationStartDate,
      protocolPreparationEndDate: project.protocolPreparationEndDate,
      testingStartDate: project.testingStartDate,
      testingEndDate: project.testingEndDate,
      reportPreparationStartDate: project.reportPreparationStartDate,
      reportPreparationEndDate: project.reportPreparationEndDate,
      startDatePlanned: project.startDatePlanned,
      startDateActual: project.startDateActual,
      endDatePlanned: project.endDatePlanned,
      endDateActual: project.endDateActual,
      paymentDate: project.paymentDate,
      qualificationObjectIds: project.qualificationObjectIds,
      items: project.items,
      stageAssignments: project.stageAssignments,
      createdBy: userId,
    };

    const data = await apiClient.post<ProjectDto>('/projects', payload);
    return mapProject(data);
  }

  async updateProject(id: string, updates: UpdateProjectData): Promise<Project> {
    const payload: Record<string, unknown> = {};
    if (updates.description !== undefined) {
      payload.description = updates.description;
    }
    if (updates.contractNumber !== undefined) {
      payload.contractNumber = updates.contractNumber;
    }
    if (updates.contractDate !== undefined) {
      payload.contractDate = updates.contractDate.toISOString();
    }
    if (updates.totalCostWithVat !== undefined) {
      payload.totalCostWithVat = updates.totalCostWithVat;
    }
    if (updates.loggersCount !== undefined) {
      payload.loggersCount = updates.loggersCount;
    }
    if (updates.protocolPrintCopies !== undefined) {
      payload.protocolPrintCopies = updates.protocolPrintCopies;
    }
    if (updates.reportPrintCopies !== undefined) {
      payload.reportPrintCopies = updates.reportPrintCopies;
    }
    if (updates.travelExpenses !== undefined) {
      payload.travelExpenses = updates.travelExpenses;
    }
    if (updates.protocolPreparationStartDate !== undefined) {
      payload.protocolPreparationStartDate = updates.protocolPreparationStartDate
        ? updates.protocolPreparationStartDate.toISOString()
        : null;
    }
    if (updates.protocolPreparationEndDate !== undefined) {
      payload.protocolPreparationEndDate = updates.protocolPreparationEndDate
        ? updates.protocolPreparationEndDate.toISOString()
        : null;
    }
    if (updates.testingStartDate !== undefined) {
      payload.testingStartDate = updates.testingStartDate
        ? updates.testingStartDate.toISOString()
        : null;
    }
    if (updates.testingEndDate !== undefined) {
      payload.testingEndDate = updates.testingEndDate
        ? updates.testingEndDate.toISOString()
        : null;
    }
    if (updates.reportPreparationStartDate !== undefined) {
      payload.reportPreparationStartDate = updates.reportPreparationStartDate
        ? updates.reportPreparationStartDate.toISOString()
        : null;
    }
    if (updates.reportPreparationEndDate !== undefined) {
      payload.reportPreparationEndDate = updates.reportPreparationEndDate
        ? updates.reportPreparationEndDate.toISOString()
        : null;
    }
    if (updates.startDatePlanned !== undefined) {
      payload.startDatePlanned = updates.startDatePlanned
        ? updates.startDatePlanned.toISOString()
        : null;
    }
    if (updates.startDateActual !== undefined) {
      payload.startDateActual = updates.startDateActual
        ? updates.startDateActual.toISOString()
        : null;
    }
    if (updates.endDatePlanned !== undefined) {
      payload.endDatePlanned = updates.endDatePlanned
        ? updates.endDatePlanned.toISOString()
        : null;
    }
    if (updates.endDateActual !== undefined) {
      payload.endDateActual = updates.endDateActual
        ? updates.endDateActual.toISOString()
        : null;
    }
    if (updates.paymentDate !== undefined) {
      payload.paymentDate = updates.paymentDate
        ? updates.paymentDate.toISOString()
        : null;
    }
    if (updates.status !== undefined) {
      payload.status = updates.status;
    }
    if (updates.qualificationObjectIds !== undefined) {
      payload.qualificationObjectIds = updates.qualificationObjectIds;
    }
    if (updates.items !== undefined) {
      payload.items = updates.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        declaredPrice: item.declaredPrice,
        supplierId: item.supplierId,
        supplierPrice: item.supplierPrice,
        description: item.description,
        categoryId: item.categoryId,
        channelsCount: item.channelsCount,
        dosingVolume: item.dosingVolume,
        volumeStep: item.volumeStep,
        dosingAccuracy: item.dosingAccuracy,
        reproducibility: item.reproducibility,
        autoclavable: item.autoclavable,
        inRegistrySI: item.inRegistrySI,
      }));
    }

    const data = await apiClient.put<ProjectDto>(`/projects/${id}`, payload);
    return mapProject(data);
  }

  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`);
  }

  async updateStageAssignment(): Promise<void> {
    throw new Error(
      'Обновление назначений этапов пока не поддерживается новым API',
    );
  }
}

export const projectService = new ProjectService();

