import { supabase } from './supabaseClient';

export interface ReportData {
  id?: string;
  projectId: string;
  qualificationObjectId: string;
  reportName: string;
  reportType: 'template' | 'analysis';
  reportUrl: string;
  reportFilename: string;
  reportData: {
    dataType: string;
    analysisResults: any;
    contractFields: any;
    conclusions: string;
    markers: any[];
    limits: any;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReportData {
  projectId: string;
  qualificationObjectId: string;
  reportName: string;
  reportType: 'template' | 'analysis';
  reportUrl: string;
  reportFilename: string;
  reportData: {
    dataType: string;
    analysisResults: any;
    contractFields: any;
    conclusions: string;
    markers: any[];
    limits: any;
  };
  createdBy: string;
}

class ReportService {
  private supabase: any;

  constructor() {
    this.supabase = supabase;
  }

  // Проверка доступности Supabase
  isAvailable(): boolean {
    return !!this.supabase;
  }

  // Сохранение отчета
  async saveReport(reportData: CreateReportData): Promise<ReportData> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Сохраняем отчет:', reportData);

      const { data, error } = await this.supabase
        .from('analysis_reports')
        .insert({
          project_id: reportData.projectId,
          qualification_object_id: reportData.qualificationObjectId,
          report_name: reportData.reportName,
          report_type: reportData.reportType,
          report_url: reportData.reportUrl,
          report_filename: reportData.reportFilename,
          report_data: reportData.reportData,
          created_by: reportData.createdBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Ошибка сохранения отчета:', error);
        throw new Error(`Ошибка сохранения отчета: ${error.message}`);
      }

      console.log('Отчет успешно сохранен:', data);
      return {
        id: data.id,
        projectId: data.project_id,
        qualificationObjectId: data.qualification_object_id,
        reportName: data.report_name,
        reportType: data.report_type,
        reportUrl: data.report_url,
        reportFilename: data.report_filename,
        reportData: data.report_data,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Ошибка в saveReport:', error);
      throw error;
    }
  }

  // Получение отчетов для конкретного проекта и объекта квалификации
  async getReportsByProjectAndObject(projectId: string, qualificationObjectId: string): Promise<ReportData[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Загружаем отчеты для проекта и объекта:', { projectId, qualificationObjectId });

      const { data, error } = await this.supabase
        .from('analysis_reports')
        .select('*')
        .eq('project_id', projectId)
        .eq('qualification_object_id', qualificationObjectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Ошибка загрузки отчетов:', error);
        throw new Error(`Ошибка загрузки отчетов: ${error.message}`);
      }

      const reports: ReportData[] = data.map((report: any) => ({
        id: report.id,
        projectId: report.project_id,
        qualificationObjectId: report.qualification_object_id,
        reportName: report.report_name,
        reportType: report.report_type,
        reportUrl: report.report_url,
        reportFilename: report.report_filename,
        reportData: report.report_data,
        createdBy: report.created_by,
        createdAt: new Date(report.created_at),
        updatedAt: new Date(report.updated_at)
      }));

      console.log('Загружено отчетов:', reports.length);
      return reports;
    } catch (error) {
      console.error('Ошибка в getReportsByProjectAndObject:', error);
      throw error;
    }
  }

  // Получение всех отчетов для проекта
  async getReportsByProject(projectId: string): Promise<ReportData[]> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Загружаем все отчеты для проекта:', projectId);

      const { data, error } = await this.supabase
        .from('analysis_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Ошибка загрузки отчетов проекта:', error);
        throw new Error(`Ошибка загрузки отчетов проекта: ${error.message}`);
      }

      const reports: ReportData[] = data.map((report: any) => ({
        id: report.id,
        projectId: report.project_id,
        qualificationObjectId: report.qualification_object_id,
        reportName: report.report_name,
        reportType: report.report_type,
        reportUrl: report.report_url,
        reportFilename: report.report_filename,
        reportData: report.report_data,
        createdBy: report.created_by,
        createdAt: new Date(report.created_at),
        updatedAt: new Date(report.updated_at)
      }));

      console.log('Загружено отчетов для проекта:', reports.length);
      return reports;
    } catch (error) {
      console.error('Ошибка в getReportsByProject:', error);
      throw error;
    }
  }

  // Удаление отчета
  async deleteReport(reportId: string): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Удаляем отчет:', reportId);

      const { error } = await this.supabase
        .from('analysis_reports')
        .delete()
        .eq('id', reportId);

      if (error) {
        console.error('Ошибка удаления отчета:', error);
        throw new Error(`Ошибка удаления отчета: ${error.message}`);
      }

      console.log('Отчет успешно удален');
    } catch (error) {
      console.error('Ошибка в deleteReport:', error);
      throw error;
    }
  }

  // Обновление отчета
  async updateReport(reportId: string, updateData: Partial<CreateReportData>): Promise<ReportData> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Обновляем отчет:', reportId, updateData);

      const updateFields: any = {
        updated_at: new Date().toISOString()
      };

      if (updateData.reportName) updateFields.report_name = updateData.reportName;
      if (updateData.reportUrl) updateFields.report_url = updateData.reportUrl;
      if (updateData.reportFilename) updateFields.report_filename = updateData.reportFilename;
      if (updateData.reportData) updateFields.report_data = updateData.reportData;

      const { data, error } = await this.supabase
        .from('analysis_reports')
        .update(updateFields)
        .eq('id', reportId)
        .select()
        .single();

      if (error) {
        console.error('Ошибка обновления отчета:', error);
        throw new Error(`Ошибка обновления отчета: ${error.message}`);
      }

      console.log('Отчет успешно обновлен:', data);
      return {
        id: data.id,
        projectId: data.project_id,
        qualificationObjectId: data.qualification_object_id,
        reportName: data.report_name,
        reportType: data.report_type,
        reportUrl: data.report_url,
        reportFilename: data.report_filename,
        reportData: data.report_data,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Ошибка в updateReport:', error);
      throw error;
    }
  }

  // Поиск существующего отчета по имени
  async findExistingReport(projectId: string, qualificationObjectId: string, reportName: string): Promise<ReportData | null> {
    if (!this.supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      console.log('Ищем существующий отчет:', { projectId, qualificationObjectId, reportName });

      const { data, error } = await this.supabase
        .from('analysis_reports')
        .select('*')
        .eq('project_id', projectId)
        .eq('qualification_object_id', qualificationObjectId)
        .eq('report_name', reportName)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Ошибка поиска существующего отчета:', error);
        throw new Error(`Ошибка поиска существующего отчета: ${error.message}`);
      }

      if (data && data.length > 0) {
        const report = data[0];
        console.log('Найден существующий отчет:', report);
        return {
          id: report.id,
          projectId: report.project_id,
          qualificationObjectId: report.qualification_object_id,
          reportName: report.report_name,
          reportType: report.report_type,
          reportUrl: report.report_url,
          reportFilename: report.report_filename,
          reportData: report.report_data,
          createdBy: report.created_by,
          createdAt: new Date(report.created_at),
          updatedAt: new Date(report.updated_at)
        };
      }

      console.log('Существующий отчет не найден');
      return null;
    } catch (error) {
      console.error('Ошибка в findExistingReport:', error);
      throw error;
    }
  }
}

export const reportService = new ReportService();


