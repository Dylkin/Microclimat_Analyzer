import { apiClient } from './apiClient';
import type {
  Department,
  PayrollTotals,
  Position,
  SalaryHistoryResponse,
  StaffDirectoryData
} from '../types/StaffDirectory';

interface CreateDepartmentPayload {
  name: string;
}

interface UpdateDepartmentPayload {
  name: string;
}

interface CreatePositionPayload {
  name: string;
  salary: number;
  salaryEffectiveFrom: string;
}

interface UpdatePositionPayload {
  name: string;
  salary: number;
  salaryEffectiveFrom: string;
}

class StaffDirectoryService {
  async getDirectory(): Promise<StaffDirectoryData> {
    return apiClient.get<StaffDirectoryData>('/staff-directory');
  }

  async addDepartment(payload: CreateDepartmentPayload): Promise<Department> {
    return apiClient.post<Department>('/staff-directory/departments', payload);
  }

  async updateDepartment(departmentId: string, payload: UpdateDepartmentPayload): Promise<Department> {
    return apiClient.put<Department>(`/staff-directory/departments/${departmentId}`, payload);
  }

  async deleteDepartment(departmentId: string): Promise<void> {
    await apiClient.delete<void>(`/staff-directory/departments/${departmentId}`);
  }

  async addPosition(departmentId: string, payload: CreatePositionPayload): Promise<Position> {
    return apiClient.post<Position>(`/staff-directory/departments/${departmentId}/positions`, payload);
  }

  async updatePosition(positionId: string, payload: UpdatePositionPayload): Promise<Position> {
    return apiClient.put<Position>(`/staff-directory/positions/${positionId}`, payload);
  }

  async deletePosition(positionId: string): Promise<void> {
    await apiClient.delete<void>(`/staff-directory/positions/${positionId}`);
  }

  async getPayrollTotals(): Promise<PayrollTotals> {
    return apiClient.get<PayrollTotals>('/staff-directory/payroll');
  }

  async getDepartmentPayroll(departmentId: string): Promise<{ departmentId: string; departmentName: string; total: number }> {
    return apiClient.get<{ departmentId: string; departmentName: string; total: number }>(
      `/staff-directory/departments/${departmentId}/payroll`
    );
  }

  async getSalaryHistory(options?: { limit?: number; positionId?: string }): Promise<SalaryHistoryResponse> {
    const limit = options?.limit ?? 100;
    const params = new URLSearchParams();
    if (limit !== 100) params.set('limit', String(limit));
    if (options?.positionId) params.set('positionId', options.positionId);
    const q = params.toString();
    return apiClient.get<SalaryHistoryResponse>(`/staff-directory/salary-history${q ? `?${q}` : ''}`);
  }
}

export const staffDirectoryService = new StaffDirectoryService();
