# Обновление логики создания отчетов

## Новые требования

1. **При первом создании отчета** создается файл в формате DOCX из шаблона
2. **Отчет по испытанию** сохраняется в базу данных и доступен по ссылке "Скачать отчет по испытанию"
3. **Сводный отчет по испытаниям** также сохраняется в базу данных и доступен в блоке "Сохраненные отчеты"
4. **При последующих созданиях** отчет по испытанию перезаписывается, а сводный отчет дополняется

## Реализованные изменения

### 1. Новая логика создания отчетов

#### Отчет по испытанию (всегда перезаписывается):
```typescript
// 1. Создаем отчет по испытанию (всегда перезаписывается)
const trialReportName = `Отчет по испытанию ${dataTypeLabel}`;
const trialReportFilename = `отчет_шаблон_${dataTypeLabel}_${now.toISOString().slice(0, 10)}.docx`;

// Ищем существующий отчет по испытанию
const existingTrialReport = await reportService.findExistingReport(projectId, qualificationObjectId, trialReportName);

if (existingTrialReport) {
  // Обновляем существующий отчет по испытанию
  await reportService.updateReport(existingTrialReport.id!, {
    reportUrl,
    reportFilename: trialReportFilename,
    reportData: { dataType, analysisResults, contractFields, conclusions, markers, limits }
  });
} else {
  // Создаем новый отчет по испытанию
  const trialReportData = {
    projectId, qualificationObjectId, reportName: trialReportName,
    reportType: 'template' as const, reportUrl, reportFilename: trialReportFilename,
    reportData: { dataType, analysisResults, contractFields, conclusions, markers, limits },
    createdBy: user.id
  };
  await reportService.saveReport(trialReportData);
}
```

#### Сводный отчет по испытаниям (дополняется):
```typescript
// 2. Создаем/обновляем сводный отчет по испытаниям
const summaryReportName = `Сводный отчет по испытаниям ${dataTypeLabel}`;

// Ищем существующий сводный отчет
const existingSummaryReport = await reportService.findExistingReport(projectId, qualificationObjectId, summaryReportName);

if (existingSummaryReport) {
  // Создаем отчет из предыдущих данных сводного отчета
  const previousSummaryBlob = await processor.processTemplate(/* ... */);
  
  // Добавляем новый отчет в конец сводного отчета
  const updatedSummaryBlob = await processor.appendFullReportToExisting(
    previousSummaryBlob, docxBlob
  );
  
  // Обновляем сводный отчет
  await reportService.updateReport(existingSummaryReport.id!, {
    reportUrl: summaryReportUrl,
    reportData: { dataType, analysisResults, contractFields, conclusions, markers, limits }
  });
} else {
  // Создаем новый сводный отчет
  const summaryReportData = {
    projectId, qualificationObjectId, reportName: summaryReportName,
    reportType: 'template' as const, reportUrl,
    reportFilename: `сводный_отчет_${dataTypeLabel}_${now.toISOString().slice(0, 10)}.docx`,
    reportData: { dataType, analysisResults, contractFields, conclusions, markers, limits },
    createdBy: user.id
  };
  await reportService.saveReport(summaryReportData);
}
```

### 2. Новое состояние для отчета по испытанию

```typescript
// Состояние для отчета по испытанию
const [trialReportStatus, setTrialReportStatus] = useState<{
  hasReport: boolean;
  reportUrl: string | null;
  reportFilename: string | null;
}>({
  hasReport: false,
  reportUrl: null,
  reportFilename: null
});
```

### 3. Обновленная ссылка на скачивание

#### Было:
```typescript
<span>Скачать отчет ({reportStatus.reportFilename})</span>
```

#### Стало:
```typescript
<span>Скачать отчет по испытанию ({trialReportStatus.reportFilename})</span>
```

### 4. Функция загрузки отчета по испытанию

```typescript
// Загружаем отчет по испытанию
const loadTrialReport = async () => {
  if (!projectId || !qualificationObjectId) return;
  
  try {
    const dataTypeLabel = dataType === 'temperature' ? 'температура' : 'влажность';
    const trialReportName = `Отчет по испытанию ${dataTypeLabel}`;
    const trialReport = await reportService.findExistingReport(projectId, qualificationObjectId, trialReportName);
    
    if (trialReport) {
      setTrialReportStatus({
        hasReport: true,
        reportUrl: trialReport.reportUrl,
        reportFilename: trialReport.reportFilename
      });
    } else {
      setTrialReportStatus({
        hasReport: false,
        reportUrl: null,
        reportFilename: null
      });
    }
  } catch (error) {
    console.error('Ошибка загрузки отчета по испытанию:', error);
  }
};
```

## Логика работы

### При первом создании отчета:

1. **Создается отчет по испытанию** с именем `"Отчет по испытанию температура"` или `"Отчет по испытанию влажность"`
2. **Создается сводный отчет** с именем `"Сводный отчет по испытаниям температура"` или `"Сводный отчет по испытаниям влажность"`
3. **Отчет по испытанию** доступен по ссылке "Скачать отчет по испытанию" ниже блока загрузки шаблона
4. **Сводный отчет** доступен в блоке "Сохраненные отчеты"

### При последующих созданиях:

1. **Отчет по испытанию перезаписывается** - старые данные заменяются новыми
2. **Сводный отчет дополняется** - новый отчет добавляется в конец существующего документа
3. **Ссылка на отчет по испытанию** обновляется с новым файлом
4. **Сводный отчет** обновляется в блоке "Сохраненные отчеты"

## Структура файлов

### Отчет по испытанию:
- **Имя файла**: `отчет_шаблон_температура_2024-01-15.docx`
- **Содержимое**: Полный отчет с текущими данными
- **Обновление**: Перезаписывается при каждом создании

### Сводный отчет по испытаниям:
- **Имя файла**: `сводный_отчет_температура_2024-01-15.docx`
- **Содержимое**: Все созданные отчеты, добавленные в конец документа
- **Обновление**: Дополняется новым отчетом при каждом создании

## Ожидаемое поведение

### При первом создании отчета:
1. Создается файл `отчет_шаблон_температура_2024-01-15.docx`
2. Появляется ссылка "Скачать отчет по испытанию (отчет_шаблон_температура_2024-01-15.docx)"
3. В блоке "Сохраненные отчеты" появляется "Сводный отчет по испытаниям температура"

### При втором создании отчета:
1. Файл `отчет_шаблон_температура_2024-01-15.docx` перезаписывается новыми данными
2. Ссылка "Скачать отчет по испытанию" обновляется
3. В сводный отчет добавляется новый отчет (без изменений в существующем тексте)

### При третьем и последующих созданиях:
1. Отчет по испытанию снова перезаписывается
2. Сводный отчет дополняется новым отчетом
3. Процесс повторяется для каждого нового создания

## Технические детали

### Состояние отчета по испытанию:
- `trialReportStatus.hasReport` - есть ли отчет по испытанию
- `trialReportStatus.reportUrl` - URL для скачивания
- `trialReportStatus.reportFilename` - имя файла

### Автоматическая загрузка:
- При загрузке страницы автоматически загружается отчет по испытанию
- При изменении типа данных (температура/влажность) загружается соответствующий отчет

### Обработка ошибок:
- При ошибках сохранения отчетов процесс не прерывается
- Ошибки логируются в консоль
- Пользователь получает уведомления об ошибках

## Заключение

Новая логика создания отчетов обеспечивает:
- **Отчет по испытанию** - всегда актуальный, перезаписывается при каждом создании
- **Сводный отчет** - накапливает все созданные отчеты
- **Удобный доступ** - отчет по испытанию доступен сразу после создания
- **История испытаний** - сводный отчет сохраняет все проведенные испытания








