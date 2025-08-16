import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

export interface TemplateData {
  DATE: string;
  DATA_TYPE: string;
  CHART: ArrayBuffer;
  TABLE: any[];
}

/**
 * Процессор шаблонов DOCX для браузерной среды
 * Использует docxtemplater для замены плейсхолдеров
 */
export class TemplateProcessor {
  
  /**
   * Обработка шаблона DOCX с заменой плейсхолдеров
   */
  static async processTemplate(templateBuffer: ArrayBuffer, data: TemplateData): Promise<ArrayBuffer> {
    try {
      console.log('Начинаем обработку шаблона...');
      console.log('Размер шаблона:', templateBuffer.byteLength, 'байт');
      
      // Создаем ZIP из шаблона
      const zip = new PizZip(templateBuffer);
      
      // Проверяем содержимое document.xml на корректность плейсхолдеров
      try {
        const documentXml = zip.file('word/document.xml');
        if (documentXml) {
          const xmlContent = documentXml.asText();
          this.validatePlaceholders(xmlContent);
        }
      } catch (validationError) {
        console.warn('Предупреждение при валидации шаблона:', validationError);
        // Продолжаем выполнение, но предупреждаем пользователя
      }
      
      // Создаем docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Подготавливаем данные для замены
      const templateData = {
        // Основные плейсхолдеры - ключи должны точно соответствовать именам в шаблоне
        DATE: data.DATE,
        DATA_TYPE: data.DATA_TYPE,
        CHART: '[ВСТАВКА ИЗОБРАЖЕНИЙ В ШАБЛОНЫ НЕ ПОДДЕРЖИВАЕТСЯ В БРАУЗЕРНОЙ ВЕРСИИ]',
        TABLE: this.formatTableForTemplate(data.TABLE),
        
        // Дополнительные плейсхолдеры
        executor: data.executor || '',
        Report_No: data.Report_No || '',
        Report_start: data.Report_start || data.DATE,
        ObjectName: data.ObjectName || '',
        CoolingSystemName: data.CoolingSystemName || '',
        TestType: data.TestType || '',
        EligibilityCriteria: data.EligibilityCriteria || '',
        acceptanceCriteria: data.acceptanceCriteria || '',
        totalFiles: data.totalFiles || 0,
        analysisDate: data.DATE,
        // Для таблицы создаем текстовое представление
        ResultsTable: this.formatTableForTemplate(data.TABLE),
        minTemp: data.minTemp || '',
        maxTemp: data.maxTemp || '',
        avgTemp: data.avgTemp || '',
        compliantCount: data.compliantCount || 0,
        nonCompliantCount: data.nonCompliantCount || 0
      };

      console.log('Данные для шаблона подготовлены:', templateData);

      // Заменяем плейсхолдеры
      doc.render(templateData);

      // Генерируем новый DOCX
      const output = doc.getZip().generate({
        type: 'arraybuffer',
        compression: 'DEFLATE',
      });

      console.log('Шаблон обработан успешно, размер результата:', output.byteLength, 'байт');
      
      return output;
      
    } catch (error) {
      console.error('Ошибка обработки шаблона:', error);
      
      // Извлекаем детальную информацию об ошибках из docxtemplater
      let errorMessage = 'Неизвестная ошибка';
      
      if (error && typeof error === 'object' && 'properties' in error) {
        const docxError = error as any;
        if (docxError.properties && docxError.properties.errors) {
          const errors = docxError.properties.errors;
          const errorDetails = errors.map((err: any) => {
            if (err.properties && err.properties.explanation) {
              return `${err.message}: ${err.properties.explanation}`;
            }
            return err.message || err.toString();
          }).join('; ');
          errorMessage = errorDetails;
        } else if (docxError.message) {
          errorMessage = docxError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Добавляем подсказки для частых ошибок
      if (errorMessage.includes('image')) {
        errorMessage += '. ПОДСКАЗКА: Вставка изображений в шаблоны не поддерживается в браузерной версии. Удалите все плейсхолдеры изображений из шаблона.';
      }
      
      if (errorMessage.includes('Multi error') || errorMessage.includes('Duplicate')) {
        errorMessage += '. ПОДСКАЗКА: В шаблоне найдены некорректные плейсхолдеры. Проверьте, что все плейсхолдеры заключены ТОЧНО в двойные фигурные скобки {{placeholder}}. Удалите лишние фигурные скобки (например, измените {{{DATE}}} на {{DATE}}).';
      }
      
      if (errorMessage.includes('open tag') || errorMessage.includes('close tag')) {
        errorMessage += '. ОШИБКА ШАБЛОНА: Найдены плейсхолдеры с неправильным количеством фигурных скобок. Откройте ваш DOCX файл и исправьте плейсхолдеры: используйте ТОЛЬКО {{DATE}}, {{DATA_TYPE}}, {{CHART}}, {{TABLE}} (ровно 2 открывающие и 2 закрывающие скобки).';
      }
      
      throw new Error(`Не удалось обработать шаблон: ${errorMessage}`);
    }
  }

  /**
   * Валидация плейсхолдеров в XML содержимом документа
   */
  private static validatePlaceholders(xmlContent: string): void {
    // Ищем потенциально проблемные плейсхолдеры
    const problematicPatterns = [
      /\{\{\{[^}]+\}\}\}/g,  // Тройные открывающие скобки
      /\{\{[^}]+\}\}\}/g,    // Тройные закрывающие скобки
      /\{[^{][^}]*\}/g,      // Одинарные скобки
    ];
    
    const issues: string[] = [];
    
    problematicPatterns.forEach((pattern, index) => {
      const matches = xmlContent.match(pattern);
      if (matches) {
        switch (index) {
          case 0:
            issues.push(`Найдены плейсхолдеры с тройными открывающими скобками: ${matches.slice(0, 3).join(', ')}`);
            break;
          case 1:
            issues.push(`Найдены плейсхолдеры с тройными закрывающими скобками: ${matches.slice(0, 3).join(', ')}`);
            break;
          case 2:
            issues.push(`Найдены плейсхолдеры с одинарными скобками: ${matches.slice(0, 3).join(', ')}`);
            break;
        }
      }
    });
    
    if (issues.length > 0) {
      console.warn('Обнаружены потенциальные проблемы в шаблоне:', issues);
      throw new Error(`Проблемы с плейсхолдерами в шаблоне: ${issues.join('; ')}`);
    }
  }
  /**
   * Форматирование таблицы для вставки в шаблон
   */
  private static formatTableForTemplate(results: any[]): string {
    if (!results || results.length === 0) {
      return 'Нет данных для отображения';
    }

    let tableText = 'РЕЗУЛЬТАТЫ АНАЛИЗА\n\n';
    tableText += '№ зоны | Уровень (м.) | Логгер | S/N | Мин. t°C | Макс. t°C | Среднее t°C | Соответствие\n';
    tableText += '-------|-------------|--------|-----|----------|-----------|-------------|-------------\n';

    results.forEach(result => {
      tableText += `${result.zoneNumber} | ${result.measurementLevel} | ${result.loggerName} | ${result.serialNumber} | ${result.minTemp} | ${result.maxTemp} | ${result.avgTemp} | ${result.meetsLimits}\n`;
    });

    return tableText;
  }
}