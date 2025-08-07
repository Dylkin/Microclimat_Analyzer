import { z } from 'zod';

export const reportSchema = z.object({
  // Основная информация
  reportNo: z.string().min(1, 'Номер отчета обязателен'),
  reportDate: z.string().min(1, 'Дата отчета обязательна'),
  nameOfObject: z.string().min(1, 'Название объекта обязательно'),
  nameOfAirConditioningSystem: z.string().min(1, 'Название климатической установки обязательно'),
  nameOfTest: z.string().min(1, 'Вид испытания обязателен'),
  
  // Временные данные
  dateTimeOfTestStart: z.string().min(1, 'Дата и время начала испытания обязательны'),
  dateTimeOfTestCompletion: z.string().min(1, 'Дата и время завершения испытания обязательны'),
  durationOfTest: z.string().min(1, 'Длительность испытания обязательна'),
  
  // Критерии и результаты
  acceptanceCriteria: z.string().min(1, 'Критерии приемки обязательны'),
  result: z.string().min(1, 'Выводы и заключение обязательны'),
  
  // Исполнители
  executor: z.string().min(1, 'Исполнитель обязателен'),
  director: z.string().min(1, 'Руководитель обязателен'),
  testDate: z.string().min(1, 'Дата проведения испытания обязательна'),
});

export type ReportFormData = z.infer<typeof reportSchema>;