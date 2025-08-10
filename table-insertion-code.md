# Код вставки таблиц в отчеты

## 1. Используемые библиотеки

### В package.json:
```json
{
  "dependencies": {
    "docx": "^9.5.1",
    "file-saver": "^2.0.5"
  }
}
```

### Импорты в reportGenerator.ts:
```typescript
import { saveAs } from 'file-saver';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  AlignmentType 
} from 'docx';
```

## 2. Основной метод создания таблицы в reportGenerator.ts

```typescript
/**
 * Создание таблицы результатов
 */
private createResultsTable(resultsTableData: any[]): Table {
  const rows = [];

  // Заголовок таблицы
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: '№ зоны', bold: true })] })],
          width: { size: 10, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Уровень (м.)', bold: true })] })],
          width: { size: 15, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Логгер', bold: true })] })],
          width: { size: 15, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'S/N', bold: true })] })],
          width: { size: 15, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Мин. t°C', bold: true })] })],
          width: { size: 15, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Макс. t°C', bold: true })] })],
          width: { size: 15, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: 'Среднее t°C', bold: true })] })],
          width: { size: 15, type: WidthType.PERCENTAGE }
        })
      ]
    })
  );

  // Данные таблицы
  resultsTableData.forEach(row => {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(row.zoneNumber || '-') })] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(row.measurementLevel || '-') })] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(row.loggerName || '-') })] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(row.serialNumber || '-') })] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: typeof row.minTemp === 'number' ? `${row.minTemp}°C` : '-' })] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: typeof row.maxTemp === 'number' ? `${row.maxTemp}°C` : '-' })] })]
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: typeof row.avgTemp === 'number' ? `${row.avgTemp}°C` : '-' })] })]
          })
        ]
      })
    );
  });

  return new Table({
    rows: rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    }
  });
}
```

## 3. Вставка таблицы в документ (в методе createDocxDocument)

```typescript
// Таблица результатов
children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));

children.push(
  new Paragraph({
    children: [new TextRun({ text: 'Результаты измерений:', bold: true })],
    heading: HeadingLevel.HEADING_2
  })
);

// Создаем таблицу результатов
const resultsTable = this.createResultsTable(reportData.resultsTableData);
children.push(resultsTable);
```

## 4. Генерация данных для таблицы в TimeSeriesAnalyzer.tsx

```typescript
// Generate analysis results table data
const analysisResults = useMemo(() => {
  if (!data || !data.points.length) return [];

  // Фильтруем данные по времени если применен зум
  let filteredPoints = data.points;
  if (zoomState) {
    filteredPoints = data.points.filter(point => 
      point.timestamp >= zoomState.startTime && point.timestamp <= zoomState.endTime
    );
  }

  return files.map((file) => {
    // Find data points for this file
    const filePoints = filteredPoints.filter(point => point.fileId === file.name);
    
    if (filePoints.length === 0) {
      return {
        zoneNumber: file.zoneNumber || '-',
        measurementLevel: file.measurementLevel || '-',
        loggerName: file.name.substring(0, 6),
        serialNumber: file.parsedData?.deviceMetadata?.serialNumber || 'Unknown',
        minTemp: '-',
        maxTemp: '-',
        avgTemp: '-',
        minHumidity: '-',
        maxHumidity: '-',
        avgHumidity: '-',
        meetsLimits: '-'
      };
    }

    // Calculate temperature statistics
    const temperatures = filePoints
      .filter(p => p.temperature !== undefined)
      .map(p => p.temperature!);
    
    const humidities = filePoints
      .filter(p => p.humidity !== undefined)
      .map(p => p.humidity!);

    let tempStats = { min: '-', max: '-', avg: '-' };
    let humidityStats = { min: '-', max: '-', avg: '-' };
    
    if (temperatures.length > 0) {
      const min = Math.min(...temperatures);
      const max = Math.max(...temperatures);
      const avg = temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length;
      
      tempStats = {
        min: Math.round(min * 10) / 10,
        max: Math.round(max * 10) / 10,
        avg: Math.round(avg * 10) / 10
      };
    }
    
    if (humidities.length > 0) {
      const min = Math.min(...humidities);
      const max = Math.max(...humidities);
      const avg = humidities.reduce((sum, h) => sum + h, 0) / humidities.length;
      
      humidityStats = {
        min: Math.round(min * 10) / 10,
        max: Math.round(max * 10) / 10,
        avg: Math.round(avg * 10) / 10
      };
    }

    // Check if meets limits
    let meetsLimits = 'Да';
    if (limits.temperature && temperatures.length > 0) {
      const min = Math.min(...temperatures);
      const max = Math.max(...temperatures);
      
      if (limits.temperature.min !== undefined && min < limits.temperature.min) {
        meetsLimits = 'Нет';
      }
      if (limits.temperature.max !== undefined && max > limits.temperature.max) {
        meetsLimits = 'Нет';
      }
    }

    return {
      zoneNumber: file.zoneNumber || '-',
      measurementLevel: file.measurementLevel || '-',
      loggerName: file.name.substring(0, 6), // Первые 6 символов названия файла
      serialNumber: file.parsedData?.deviceMetadata?.serialNumber || 'Unknown',
      minTemp: tempStats.min,
      maxTemp: tempStats.max,
      avgTemp: tempStats.avg,
      minHumidity: humidityStats.min,
      maxHumidity: humidityStats.max,
      avgHumidity: humidityStats.avg,
      meetsLimits
    };
  });
}, [data, files, limits, zoomState]);
```

## 5. Передача данных таблицы в генератор отчета

```typescript
const result = await reportGenerator.generateReport(
  templateFile,
  {
    ...reportData,
    limits,
    markers,
    resultsTableData: analysisResults, // <-- Данные таблицы
    user: user!,
    dataType
  }
);
```

## 6. Интерфейс данных отчета

```typescript
interface ReportData {
  reportNumber: string;
  reportDate: string;
  objectName: string;
  climateSystemName: string;
  testType: string;
  limits: ChartLimits;
  markers: VerticalMarker[];
  resultsTableData: any[]; // <-- Данные таблицы
  conclusion: string;
  user: AuthUser;
  director?: string;
  dataType: 'temperature' | 'humidity';
}
```

## 7. Дополнительный генератор таблиц (docxTableGenerator.ts)

```typescript
import { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, AlignmentType, BorderStyle } from 'docx';

export class DocxTableGenerator {
  
  /**
   * Создание таблицы результатов анализа
   */
  static createResultsTable(resultsTableData: any[]): Table {
    const rows = [];

    // Создание заголовка таблицы
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ 
                    text: '№ зоны измерения', 
                    bold: true,
                    size: 20 // 10pt
                  })
                ],
                alignment: AlignmentType.CENTER
              })
            ],
            width: { size: 12, type: WidthType.PERCENTAGE },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100
            }
          }),
          // ... остальные ячейки заголовка
        ],
        tableHeader: true
      })
    );

    // Создание строк данных
    resultsTableData.forEach((row, index) => {
      rows.push(
        new TableRow({
          children: [
            // Ячейки данных...
          ]
        })
      );
    });

    // Создание и возврат таблицы
    return new Table({
      rows: rows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      },
      borders: {
        top: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        },
        bottom: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        },
        left: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        },
        right: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        },
        insideVertical: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "000000"
        }
      }
    });
  }

  /**
   * Создание расширенной таблицы с влажностью
   */
  static createExtendedResultsTable(resultsTableData: any[]): Table {
    // Аналогичная логика для расширенной таблицы
  }
}
```

## 8. Основные компоненты docx для таблиц

- **Table** - основной контейнер таблицы
- **TableRow** - строка таблицы
- **TableCell** - ячейка таблицы
- **Paragraph** - параграф внутри ячейки
- **TextRun** - текстовый элемент с форматированием
- **WidthType** - тип ширины (PERCENTAGE, DXA, AUTO)
- **AlignmentType** - выравнивание текста
- **BorderStyle** - стиль границ таблицы

## 9. Ключевые особенности

1. **Динамическое создание строк** на основе данных файлов
2. **Автоматический расчет статистики** (мин, макс, среднее)
3. **Проверка соответствия лимитам** с цветовой индикацией
4. **Адаптивная ширина колонок** в процентах
5. **Форматирование границ** и отступов
6. **Поддержка заголовков** с жирным шрифтом
7. **Центрирование текста** в ячейках