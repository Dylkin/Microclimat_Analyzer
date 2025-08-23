export interface ProjectEquipmentAssignment {
  id: string;
  projectId: string;
  qualificationObjectId: string;
  equipmentId: string;
  equipmentName?: string;
  equipmentType?: string;
  equipmentSerialNumber?: string;
  assignedAt: Date;
  completedAt?: Date;
  notes?: string;
  createdAt: Date;
}

export interface CreateProjectEquipmentAssignmentData {
  projectId: string;
  qualificationObjectId: string;
  equipmentId: string;
  notes?: string;
}

export interface UpdateProjectEquipmentAssignmentData {
  completedAt?: Date;
  notes?: string;
}

export interface DatabaseProjectEquipmentAssignment {
  id: string;
  project_id: string;
  qualification_object_id: string;
  equipment_id: string;
  assigned_at: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}