import { ParsedFileData } from '../types/FileData';

export class CSVExporter {
  // Экспорт данных в CSV формат
  static exportToCSV(parsedData: ParsedFileData): string {
    const { deviceMetadata, measurements } = parsedData;
    
    // Заголовок CSV
    let csvContent = '';
    
    // Метаданные устройства
    csvContent += `# Устройство: ${deviceMetadata.deviceModel}\n`;
    csvContent += `# Серийный номер: ${deviceMetadata.serialNumber}\n`;
    csvContent += `# Тип устройства: ${deviceMetadata.deviceType}\n`;
    csvContent += `# Период записи: ${parsedData.startDate.toLocaleString('ru-RU')} - ${parsedData.endDate.toLocaleString('ru-RU')}\n`;
    csvContent += `# Количество записей: ${parsedData.recordCount}\n`;
    csvContent += `#\n`;
    
    // Заголовки столбцов
    if (deviceMetadata.deviceType === 1) {
      // Одноканальный (только температура)
      csvContent += 'ID,Дата/время,Температура[°C],Валидность\n';
    } else {
      // Двухканальный (температура + влажность)
      csvContent += 'ID,Дата/время,Температура[°C],Влажность[%],Валидность\n';
    }
    
    // Данные измерений
    measurements.forEach((measurement, index) => {
      const id = index + 1;
      const dateTime = measurement.timestamp.toLocaleString('ru-RU');
      const temperature = measurement.temperature.toFixed(1);
      const isValid = measurement.isValid ? 'Да' : 'Нет';
      
      if (deviceMetadata.deviceType === 1) {
        // Одноканальный
        csvContent += `${id},${dateTime},${temperature},${isValid}\n`;
      } else {
        // Двухканальный
        const humidity = measurement.humidity ? measurement.humidity.toFixed(1) : '';
        csvContent += `${id},${dateTime},${temperature},${humidity},${isValid}\n`;
      }
    });
    
    return csvContent;
  }
  
  // Создание и скачивание CSV файла
  static downloadCSV(parsedData: ParsedFileData): string {
    const csvContent = this.exportToCSV(parsedData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    return url;
  }
  
  // Получение имени файла для экспорта
  static getExportFileName(parsedData: ParsedFileData): string {
    const deviceModel = parsedData.deviceMetadata.deviceModel;
    const serialNumber = parsedData.deviceMetadata.serialNumber;
    const startDate = parsedData.startDate.toISOString().split('T')[0];
    
    return `${deviceModel}_${serialNumber}_${startDate}_data.csv`;
  }
}