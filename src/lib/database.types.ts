export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'administrator' | 'manager' | 'specialist'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'administrator' | 'manager' | 'specialist'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'administrator' | 'manager' | 'specialist'
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          contact_person: string
          email: string | null
          phone: string | null
          address: string | null
          inn: string | null
          kpp: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_person: string
          email?: string | null
          phone?: string | null
          address?: string | null
          inn?: string | null
          kpp?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          inn?: string | null
          kpp?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          description: string | null
          type: 'mapping' | 'testing' | 'full_qualification'
          status: 'draft' | 'contract' | 'in_progress' | 'paused' | 'closed'
          client_id: string | null
          client_name: string
          manager_id: string | null
          manager_name: string
          estimated_duration: number
          budget: number | null
          current_stage: string | null
          progress: number
          priority: 'low' | 'medium' | 'high' | 'urgent'
          tags: string[]
          start_date: string | null
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          description?: string | null
          type?: 'mapping' | 'testing' | 'full_qualification'
          status?: 'draft' | 'contract' | 'in_progress' | 'paused' | 'closed'
          client_id?: string | null
          client_name: string
          manager_id?: string | null
          manager_name: string
          estimated_duration?: number
          budget?: number | null
          current_stage?: string | null
          progress?: number
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          tags?: string[]
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          description?: string | null
          type?: 'mapping' | 'testing' | 'full_qualification'
          status?: 'draft' | 'contract' | 'in_progress' | 'paused' | 'closed'
          client_id?: string | null
          client_name?: string
          manager_id?: string | null
          manager_name?: string
          estimated_duration?: number
          budget?: number | null
          current_stage?: string | null
          progress?: number
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          tags?: string[]
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      qualification_objects: {
        Row: {
          id: string
          project_id: string
          type: 'room' | 'automobile' | 'refrigerator_chamber' | 'refrigerator' | 'freezer' | 'thermocontainer'
          name: string | null
          description: string | null
          overall_status: 'not_started' | 'in_progress' | 'completed' | 'paused'
          overall_progress: number
          current_stage_id: string | null
          technical_parameters: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          type: 'room' | 'automobile' | 'refrigerator_chamber' | 'refrigerator' | 'freezer' | 'thermocontainer'
          name?: string | null
          description?: string | null
          overall_status?: 'not_started' | 'in_progress' | 'completed' | 'paused'
          overall_progress?: number
          current_stage_id?: string | null
          technical_parameters?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          type?: 'room' | 'automobile' | 'refrigerator_chamber' | 'refrigerator' | 'freezer' | 'thermocontainer'
          name?: string | null
          description?: string | null
          overall_status?: 'not_started' | 'in_progress' | 'completed' | 'paused'
          overall_progress?: number
          current_stage_id?: string | null
          technical_parameters?: Json
          created_at?: string
          updated_at?: string
        }
      }
      qualification_stages: {
        Row: {
          id: string
          object_id: string
          type: 'documentation_collection' | 'protocol_preparation' | 'equipment_setup' | 'testing_execution' | 'data_extraction' | 'report_preparation' | 'report_approval' | 'documentation_finalization' | 'closed' | 'paused'
          name: string
          description: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'paused'
          assignee_id: string | null
          assignee_name: string | null
          estimated_duration: number
          actual_duration: number | null
          start_date: string | null
          end_date: string | null
          planned_start_date: string | null
          planned_end_date: string | null
          order_number: number
          is_required: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          object_id: string
          type: 'documentation_collection' | 'protocol_preparation' | 'equipment_setup' | 'testing_execution' | 'data_extraction' | 'report_preparation' | 'report_approval' | 'documentation_finalization' | 'closed' | 'paused'
          name: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'paused'
          assignee_id?: string | null
          assignee_name?: string | null
          estimated_duration?: number
          actual_duration?: number | null
          start_date?: string | null
          end_date?: string | null
          planned_start_date?: string | null
          planned_end_date?: string | null
          order_number: number
          is_required?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          object_id?: string
          type?: 'documentation_collection' | 'protocol_preparation' | 'equipment_setup' | 'testing_execution' | 'data_extraction' | 'report_preparation' | 'report_approval' | 'documentation_finalization' | 'closed' | 'paused'
          name?: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'paused'
          assignee_id?: string | null
          assignee_name?: string | null
          estimated_duration?: number
          actual_duration?: number | null
          start_date?: string | null
          end_date?: string | null
          planned_start_date?: string | null
          planned_end_date?: string | null
          order_number?: number
          is_required?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_activities: {
        Row: {
          id: string
          project_id: string
          user_id: string | null
          user_name: string
          action: string
          description: string
          metadata: Json
          timestamp: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id?: string | null
          user_name: string
          action: string
          description: string
          metadata?: Json
          timestamp?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string | null
          user_name?: string
          action?: string
          description?: string
          metadata?: Json
          timestamp?: string
        }
      }
      project_documents: {
        Row: {
          id: string
          project_id: string
          name: string
          type: 'contract' | 'quote' | 'plan' | 'protocol' | 'report' | 'video' | 'other'
          file_name: string
          file_size: number | null
          uploaded_by: string
          url: string
          version: number
          is_active: boolean
          approved_by: string | null
          approved_at: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          type: 'contract' | 'quote' | 'plan' | 'protocol' | 'report' | 'video' | 'other'
          file_name: string
          file_size?: number | null
          uploaded_by: string
          url: string
          version?: number
          is_active?: boolean
          approved_by?: string | null
          approved_at?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          type?: 'contract' | 'quote' | 'plan' | 'protocol' | 'report' | 'video' | 'other'
          file_name?: string
          file_size?: number | null
          uploaded_by?: string
          url?: string
          version?: number
          is_active?: boolean
          approved_by?: string | null
          approved_at?: string | null
          uploaded_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          task_id: string | null
          type: 'deadline' | 'approval_required' | 'task_assigned' | 'project_update' | 'payment_due'
          title: string
          message: string
          is_read: boolean
          action_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          task_id?: string | null
          type: 'deadline' | 'approval_required' | 'task_assigned' | 'project_update' | 'payment_due'
          title: string
          message: string
          is_read?: boolean
          action_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          task_id?: string | null
          type?: 'deadline' | 'approval_required' | 'task_assigned' | 'project_update' | 'payment_due'
          title?: string
          message?: string
          is_read?: boolean
          action_url?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'administrator' | 'manager' | 'specialist'
      project_status: 'draft' | 'contract' | 'in_progress' | 'paused' | 'closed'
      project_priority: 'low' | 'medium' | 'high' | 'urgent'
      project_type: 'mapping' | 'testing' | 'full_qualification'
      qualification_object_type: 'room' | 'automobile' | 'refrigerator_chamber' | 'refrigerator' | 'freezer' | 'thermocontainer'
      qualification_stage_type: 'documentation_collection' | 'protocol_preparation' | 'equipment_setup' | 'testing_execution' | 'data_extraction' | 'report_preparation' | 'report_approval' | 'documentation_finalization' | 'closed' | 'paused'
      qualification_stage_status: 'pending' | 'in_progress' | 'completed' | 'paused'
      qualification_object_status: 'not_started' | 'in_progress' | 'completed' | 'paused'
      document_type: 'contract' | 'quote' | 'plan' | 'protocol' | 'report' | 'video' | 'other'
      notification_type: 'deadline' | 'approval_required' | 'task_assigned' | 'project_update' | 'payment_due'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}