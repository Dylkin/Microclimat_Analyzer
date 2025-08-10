import { 
  Document, 
  Table, 
  TableRow, 
  TableCell, 
  Paragraph, 
  TextRun, 
  WidthType, 
  BorderStyle, 
  AlignmentType, 
  VerticalAlign,
  ShadingType,
  Packer
} from 'docx';

export interface TableConversionOptions {
  keepFontStyles?: boolean;
  defaultColWidth?: number;
  processCellContent?: (cell: HTMLTableCellElement) => string;
}

interface CellStyle {
  backgroundColor?: string;
  color?: string;
  fontWeight?: string;
  fontSize?: string;
  textAlign?: string;
  verticalAlign?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  padding?: string;
}

interface CellData {
  content: string;
  colspan: number;
  rowspan: number;
  style: CellStyle;
}

interface RowData {
  cells: CellData[];
  isHeader: boolean;
}

/**
 * Конвертирует HTML таблицу в DOCX формат с сохранением всех стилей
 */
export async function convertHtmlTableToDocx(
  tableElement: HTMLTableElement,
  options: TableConversionOptions = {}
): Promise<Blob> {
  try {
    console.log('Начинаем конвертацию HTML таблицы в DOCX...');
    
    // 1. Анализируем структуру таблицы
    const tableData = analyzeTableStructure(tableElement, options);
    console.log('Структура таблицы проанализирована:', tableData.length, 'строк');
    
    // 2. Создаем DOCX таблицу
    const docxTable = createDocxTable(tableData, options);
    console.log('DOCX таблица создана');
    
    // 3. Создаем документ
    const doc = new Document({
      sections: [{
        children: [docxTable]
      }]
    });
    
    // 4. Генерируем DOCX файл
    const buffer = await Packer.toBlob(doc);
    console.log('DOCX файл сгенерирован, размер:', buffer.size, 'байт');
    
    return buffer;
    
  } catch (error) {
    console.error('Ошибка конвертации HTML таблицы в DOCX:', error);
    throw new Error(`Ошибка конвертации таблицы: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

/**
 * Анализирует структуру HTML таблицы и извлекает данные
 */
function analyzeTableStructure(
  tableElement: HTMLTableElement, 
  options: TableConversionOptions
): RowData[] {
  const rows: RowData[] = [];
  
  // Обрабатываем thead, tbody, tfoot
  const sections = [
    ...Array.from(tableElement.querySelectorAll('thead tr')),
    ...Array.from(tableElement.querySelectorAll('tbody tr')),
    ...Array.from(tableElement.querySelectorAll('tfoot tr')),
    // Если нет секций, берем все tr напрямую
    ...(tableElement.querySelectorAll('thead, tbody, tfoot').length === 0 
        ? Array.from(tableElement.querySelectorAll('tr')) 
        : [])
  ];
  
  sections.forEach((row, rowIndex) => {
    const htmlRow = row as HTMLTableRowElement;
    const cells: CellData[] = [];
    const isHeader = htmlRow.closest('thead') !== null || 
                    htmlRow.querySelectorAll('th').length > 0;
    
    Array.from(htmlRow.cells).forEach(cell => {
      const cellData: CellData = {
        content: extractCellContent(cell, options),
        colspan: cell.colSpan || 1,
        rowspan: cell.rowSpan || 1,
        style: extractCellStyle(cell)
      };
      
      cells.push(cellData);
    });
    
    rows.push({
      cells,
      isHeader
    });
  });
  
  return rows;
}

/**
 * Извлекает содержимое ячейки
 */
function extractCellContent(
  cell: HTMLTableCellElement, 
  options: TableConversionOptions
): string {
  if (options.processCellContent) {
    return options.processCellContent(cell);
  }
  
  // Извлекаем текстовое содержимое, сохраняя структуру
  return cell.textContent?.trim() || '';
}

/**
 * Извлекает стили ячейки через getComputedStyle
 */
function extractCellStyle(cell: HTMLTableCellElement): CellStyle {
  const computedStyle = window.getComputedStyle(cell);
  
  return {
    backgroundColor: computedStyle.backgroundColor,
    color: computedStyle.color,
    fontWeight: computedStyle.fontWeight,
    fontSize: computedStyle.fontSize,
    textAlign: computedStyle.textAlign,
    verticalAlign: computedStyle.verticalAlign,
    borderTop: computedStyle.borderTop,
    borderRight: computedStyle.borderRight,
    borderBottom: computedStyle.borderBottom,
    borderLeft: computedStyle.borderLeft,
    padding: computedStyle.padding
  };
}

/**
 * Создает DOCX таблицу из проанализированных данных
 */
function createDocxTable(tableData: RowData[], options: TableConversionOptions): Table {
  const docxRows = tableData.map(rowData => 
    new TableRow({
      children: rowData.cells.map(cellData => 
        createDocxCell(cellData, rowData.isHeader, options)
      )
    })
  );
  
  return new Table({
    rows: docxRows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    }
  });
}

/**
 * Создает DOCX ячейку с применением стилей
 */
function createDocxCell(
  cellData: CellData, 
  isHeader: boolean, 
  options: TableConversionOptions
): TableCell {
  // Создаем параграф с текстом
  const paragraph = new Paragraph({
    children: [
      new TextRun({
        text: cellData.content,
        bold: isHeader || cellData.style.fontWeight === 'bold' || 
              parseInt(cellData.style.fontWeight || '400') >= 600,
        color: convertColorToHex(cellData.style.color),
        size: convertFontSizeToHalfPoints(cellData.style.fontSize)
      })
    ],
    alignment: convertTextAlignment(cellData.style.textAlign)
  });
  
  // Настройки ячейки
  const cellOptions: any = {
    children: [paragraph],
    verticalAlign: convertVerticalAlignment(cellData.style.verticalAlign)
  };
  
  // Объединение ячеек
  if (cellData.colspan > 1) {
    cellOptions.columnSpan = cellData.colspan;
  }
  if (cellData.rowspan > 1) {
    cellOptions.rowSpan = cellData.rowspan;
  }
  
  // Ширина колонки
  if (options.defaultColWidth) {
    cellOptions.width = {
      size: options.defaultColWidth,
      type: WidthType.DXA
    };
  }
  
  // Фон ячейки
  const backgroundColor = convertColorToHex(cellData.style.backgroundColor);
  if (backgroundColor && backgroundColor !== 'FFFFFF') {
    cellOptions.shading = {
      type: ShadingType.SOLID,
      color: backgroundColor
    };
  }
  
  // Границы ячейки
  const borders = convertBorders(cellData.style);
  if (Object.keys(borders).length > 0) {
    cellOptions.borders = borders;
  }
  
  return new TableCell(cellOptions);
}

/**
 * Конвертирует CSS цвет в HEX формат для DOCX
 */
function convertColorToHex(cssColor?: string): string | undefined {
  if (!cssColor || cssColor === 'transparent') return undefined;
  
  // Если уже HEX
  if (cssColor.startsWith('#')) {
    return cssColor.substring(1).toUpperCase();
  }
  
  // RGB/RGBA формат
  const rgbMatch = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return (r + g + b).toUpperCase();
  }
  
  // Именованные цвета
  const colorMap: { [key: string]: string } = {
    'white': 'FFFFFF',
    'black': '000000',
    'red': 'FF0000',
    'green': '008000',
    'blue': '0000FF',
    'gray': '808080',
    'grey': '808080'
  };
  
  return colorMap[cssColor.toLowerCase()];
}

/**
 * Конвертирует CSS размер шрифта в half-points для DOCX
 */
function convertFontSizeToHalfPoints(fontSize?: string): number | undefined {
  if (!fontSize) return undefined;
  
  const pxMatch = fontSize.match(/(\d+(?:\.\d+)?)px/);
  if (pxMatch) {
    // Конвертируем px в points (1px ≈ 0.75pt), затем в half-points
    return Math.round(parseFloat(pxMatch[1]) * 0.75 * 2);
  }
  
  const ptMatch = fontSize.match(/(\d+(?:\.\d+)?)pt/);
  if (ptMatch) {
    // Конвертируем points в half-points
    return Math.round(parseFloat(ptMatch[1]) * 2);
  }
  
  return undefined;
}

/**
 * Конвертирует CSS text-align в DOCX AlignmentType
 */
function convertTextAlignment(textAlign?: string): AlignmentType | undefined {
  switch (textAlign) {
    case 'left': return AlignmentType.LEFT;
    case 'center': return AlignmentType.CENTER;
    case 'right': return AlignmentType.RIGHT;
    case 'justify': return AlignmentType.JUSTIFIED;
    default: return undefined;
  }
}

/**
 * Конвертирует CSS vertical-align в DOCX VerticalAlign
 */
function convertVerticalAlignment(verticalAlign?: string): VerticalAlign | undefined {
  switch (verticalAlign) {
    case 'top': return VerticalAlign.TOP;
    case 'middle': return VerticalAlign.CENTER;
    case 'bottom': return VerticalAlign.BOTTOM;
    default: return VerticalAlign.CENTER;
  }
}

/**
 * Конвертирует CSS границы в DOCX формат
 */
function convertBorders(style: CellStyle): any {
  const borders: any = {};
  
  const convertBorder = (borderStyle?: string) => {
    if (!borderStyle || borderStyle === 'none') return undefined;
    
    // Парсим CSS border: "1px solid #000000"
    const match = borderStyle.match(/(\d+(?:\.\d+)?)px\s+(\w+)\s+(.+)/);
    if (match) {
      const width = Math.round(parseFloat(match[1]) * 8); // Конвертируем в eighths of a point
      const borderType = match[2] === 'solid' ? BorderStyle.SINGLE : BorderStyle.SINGLE;
      const color = convertColorToHex(match[3]) || '000000';
      
      return {
        style: borderType,
        size: width,
        color: color
      };
    }
    
    // Простая граница по умолчанию
    return {
      style: BorderStyle.SINGLE,
      size: 4,
      color: '000000'
    };
  };
  
  const topBorder = convertBorder(style.borderTop);
  const rightBorder = convertBorder(style.borderRight);
  const bottomBorder = convertBorder(style.borderBottom);
  const leftBorder = convertBorder(style.borderLeft);
  
  if (topBorder) borders.top = topBorder;
  if (rightBorder) borders.right = rightBorder;
  if (bottomBorder) borders.bottom = bottomBorder;
  if (leftBorder) borders.left = leftBorder;
  
  return borders;
}

/**
 * Утилита для сохранения DOCX файла
 */
export async function saveDocxFile(blob: Blob, filename: string): Promise<void> {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Очищаем URL через некоторое время
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}