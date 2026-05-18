export interface Position {
  id: string;
  departmentId: string;
  name: string;
  salary: number;
  /** Дата начала действия оклада, YYYY-MM-DD */
  salaryEffectiveFrom: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Department {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
  positions: Position[];
}

export interface PayrollTotals {
  total: number;
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    total: number;
  }>;
}

export interface StaffDirectoryData {
  departments: Department[];
  payroll: PayrollTotals;
}

export interface SalaryHistoryEntry {
  id: string;
  positionId: string;
  departmentId: string;
  departmentName: string;
  positionName: string;
  oldSalary: number | null;
  newSalary: number;
  changedByUserId: string | null;
  changedByName: string | null;
  createdAt: string;
}

export interface SalaryHistoryResponse {
  items: SalaryHistoryEntry[];
}
