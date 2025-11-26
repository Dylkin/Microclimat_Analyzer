import { apiClient } from './apiClient';

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
  isAvailable(): boolean {
    return true; // API всегда доступен
  }

  private mapFromApi(report: any): ReportData {
    return {
      id: report.id,
      projectId: report.projectId || report.project_id,
      qualificationObjectId: report.qualificationObjectId || report.qualification_object_id,
      reportName: report.reportName || report.report_name,
      reportType: report.reportType || report.report_type,
      reportUrl: report.reportUrl || report.report_url,
      reportFilename: report.reportFilename || report.report_filename,
      reportData: report.reportData || report.report_data,
      createdBy: report.createdBy || report.created_by,
      createdAt: report.createdAt ? new Date(report.createdAt) : (report.created_at ? new Date(report.created_at) : new Date()),
      updatedAt: report.updatedAt ? new Date(report.updatedAt) : (report.updated_at ? new Date(report.updated_at) : new Date())
    };
  }

  // Сохранение отчета
  async saveReport(reportData: CreateReportData): Promise<ReportData> {
    try {
      console.log('Сохраняем отчет:', reportData);

      const data = await apiClient.post<any>('/reports', {
        projectId: reportData.projectId,
        qualificationObjectId: reportData.qualificationObjectId,
        reportName: reportData.reportName,
        reportType: reportData.reportType,
        reportUrl: reportData.reportUrl,
        reportFilename: reportData.reportFilename,
        reportData: reportData.reportData,
        createdBy: reportData.createdBy
      });

      console.log('Отчет успешно сохранен:', data);
      return this.mapFromApi(data);
    } catch (error: any) {
      console.error('Ошибка в saveReport:', error);
      throw new Error(`Ошибка сохранения отчета: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Получение отчетов для конкретного проекта и объекта квалификации
  async getReportsByProjectAndObject(projectId: string, qualificationObjectId: string): Promise<ReportData[]> {
    try {
      console.log('Загружаем отчеты для проекта и объекта:', { projectId, qualificationObjectId });

      const data = await apiClient.get<any[]>(`/reports?project_id=${projectId}&qualification_object_id=${qualificationObjectId}`);
      const reports = data.map(this.mapFromApi);

      console.log('Загружено отчетов:', reports.length);
      return reports;
    } catch (error: any) {
      console.error('Ошибка в getReportsByProjectAndObject:', error);
      throw new Error(`Ошибка загрузки отчетов: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Получение всех отчетов для проекта
  async getReportsByProject(projectId: string): Promise<ReportData[]> {
    try {
      console.log('Загружаем все отчеты для проекта:', projectId);

      const data = await apiClient.get<any[]>(`/reports?project_id=${projectId}`);
      const reports = data.map(this.mapFromApi);

      console.log('Загружено отчетов для проекта:', reports.length);
      return reports;
    } catch (error: any) {
      console.error('Ошибка в getReportsByProject:', error);
      throw new Error(`Ошибка загрузки отчетов проекта: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Удаление отчета
  async deleteReport(reportId: string): Promise<void> {
    try {
      console.log('Удаляем отчет:', reportId);
      await apiClient.delete(`/reports/${reportId}`);
      console.log('Отчет успешно удален');
    } catch (error: any) {
      console.error('Ошибка в deleteReport:', error);
      throw new Error(`Ошибка удаления отчета: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Обновление отчета
  async updateReport(reportId: string, updateData: Partial<CreateReportData>): Promise<ReportData> {
    try {
      console.log('Обновляем отчет:', reportId, updateData);

      const updates: any = {};
      if (updateData.reportName) updates.reportName = updateData.reportName;
      if (updateData.reportUrl) updates.reportUrl = updateData.reportUrl;
      if (updateData.reportData) updates.reportData = updateData.reportData;

      const data = await apiClient.put<any>(`/reports/${reportId}`, updates);
      console.log('Отчет успешно обновлен:', data);
      return this.mapFromApi(data);
    } catch (error: any) {
      console.error('Ошибка в updateReport:', error);
      throw new Error(`Ошибка обновления отчета: ${error.message || 'Неизвестная ошибка'}`);
    }
  }

  // Поиск существующего отчета по имени
  async findExistingReport(projectId: string, qualificationObjectId: string, reportName: string): Promise<ReportData | null> {
    try {
      console.log('Ищем существующий отчет:', { projectId, qualificationObjectId, reportName });

      const reports = await this.getReportsByProjectAndObject(projectId, qualificationObjectId);
      const existingReport = reports.find(r => r.reportName === reportName);

      if (existingReport) {
        console.log('Найден существующий отчет:', existingReport);
        return existingReport;
      }

      console.log('Существующий отчет не найден');
      return null;
    } catch (error: any) {
      console.error('Ошибка в findExistingReport:', error);
      throw new Error(`Ошибка поиска существующего отчета: ${error.message || 'Неизвестная ошибка'}`);
    }
  }
}

export const reportService = new ReportService();


