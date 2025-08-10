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
  ShadingType
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
  isHeader: boolean;
}

/**
 * Конвертирует HTML таблицу в DOCX формат с сохранением всех стилей
 */
export async function convertHtmlTableToDocx(
  tableElement: HTMLTableElement,
  options: TableConversionOptions = {}
): Promise<Table> {
  const {
    keepFontStyles = true,
    defaultColWidth = 2000,
    processCellContent
  } = options;

  console.log('Начинаем конвертацию HTML таблицы в DOCX...');

  // 1. Анализируем структуру таблицы
  const tableData = analyzeTableStructure(tableElement, processCellContent);
  console.log('Структура таблицы проанализирована:', tableData.length, 'строк');

  // 2. Определяем количество колонок
  const maxCols = Math.max(...tableData.map(row => 
    row.reduce((sum, cell) => sum + cell.colspan, 0)
  ));
  console.log('Максимальное количество колонок:', maxCols);

  // 3. Создаем DOCX таблицу
  const docxRows = tableData.map((rowData, rowIndex) => {
    const cells = rowData.map(cellData => {
      return new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: cellData.content,
                bold: cellData.style.fontWeight === 'bold' || cellData.style.fontWeight === '700',
                color: convertColorToHex(cellData.style.color),
                size: convertFontSize(cellData.style.fontSize)
              })
            ],
            alignment: convertTextAlignment(cellData.style.textAlign)
          })
        ],
        width: {
          size: defaultColWidth * cellData.colspan,
          type: WidthType.DXA
        },
        columnSpan: cellData.colspan > 1 ? cellData.colspan : undefined,
        rowSpan: cellData.rowspan > 1 ? cellData.rowspan : undefined,
        verticalAlign: convertVerticalAlignment(cellData.style.verticalAlign),
        shading: cellData.style.backgroundColor ? {
          type: ShadingType.SOLID,
          color: convertColorToHex(cellData.style.backgroundColor),
          fill: convertColorToHex(cellData.style.backgroundColor)
        } : undefined,
        borders: {
          top: convertBorder(cellData.style.borderTop),
          right: convertBorder(cellData.style.borderRight),
          bottom: convertBorder(cellData.style.borderBottom),
          left: convertBorder(cellData.style.borderLeft)
        }
      });
    });

    return new TableRow({
      children: cells
    });
  });

  const table = new Table({
    rows: docxRows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    }
  });

  console.log('DOCX таблица создана успешно');
  return table;
}

/**
 * Анализирует структуру HTML таблицы и извлекает данные
 */
function analyzeTableStructure(
  tableElement: HTMLTableElement,
  processCellContent?: (cell: HTMLTableCellElement) => string
): CellData[][] {
  const rows: CellData[][] = [];
  
  // Обрабатываем все строки таблицы (thead, tbody, tfoot)
  const allRows = Array.from(tableElement.querySelectorAll('tr'));
  
  allRows.forEach((row, rowIndex) => {
    const cells: CellData[] = [];
    const htmlCells = Array.from(row.querySelectorAll('td, th'));
    
    htmlCells.forEach(cell => {
      const computedStyle = window.getComputedStyle(cell);
      const isHeader = cell.tagName.toLowerCase() === 'th';
      
      // Извлекаем содержимое ячейки
      let content = '';
      if (processCellContent) {
        content = processCellContent(cell as HTMLTableCellElement);
      } else {
        content = cell.textContent?.trim() || '';
      }
      
      // Извлекаем стили
      const cellStyle: CellStyle = {
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
      
      // Получаем colspan и rowspan
      const colspan = parseInt(cell.getAttribute('colspan') || '1');
      const rowspan = parseInt(cell.getAttribute('rowspan') || '1');
      
      cells.push({
        content,
        colspan,
        rowspan,
        style: cellStyle,
        isHeader
      });
    });
    
    rows.push(cells);
  });
  
  return rows;
}

/**
 * Конвертирует CSS цвет в HEX формат для DOCX
 */
function convertColorToHex(color?: string): string | undefined {
  if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') {
    return undefined;
  }
  
  // Если уже в HEX формате
  if (color.startsWith('#')) {
    return color.substring(1).toUpperCase();
  }
  
  // Конвертируем RGB/RGBA в HEX
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    
    return ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase();
  }
  
  // Именованные цвета
  const namedColors: { [key: string]: string } = {
    'white': 'FFFFFF',
    'black': '000000',
    'red': 'FF0000',
    'green': '008000',
    'blue': '0000FF',
    'gray': '808080',
    'grey': '808080'
  };
  
  return namedColors[color.toLowerCase()];
}

/**
 * Конвертирует размер шрифта из CSS в DOCX формат
 */
function convertFontSize(fontSize?: string): number | undefined {
  if (!fontSize) return undefined;
  
  const pxMatch = fontSize.match(/(\d+)px/);
  if (pxMatch) {
    // Конвертируем пиксели в half-points (DOCX использует half-points)
    return parseInt(pxMatch[1]) * 2;
  }
  
  const ptMatch = fontSize.match(/(\d+)pt/);
  if (ptMatch) {
    return parseInt(ptMatch[1]) * 2;
  }
  
  return undefined;
}

/**
 * Конвертирует CSS text-align в DOCX AlignmentType
 */
function convertTextAlignment(textAlign?: string): AlignmentType | undefined {
  switch (textAlign) {
    case 'left':
      return AlignmentType.LEFT;
    case 'center':
      return AlignmentType.CENTER;
    case 'right':
      return AlignmentType.RIGHT;
    case 'justify':
      return AlignmentType.JUSTIFIED;
    default:
      return AlignmentType.LEFT;
  }
}

/**
 * Конвертирует CSS vertical-align в DOCX VerticalAlign
 */
function convertVerticalAlignment(verticalAlign?: string): VerticalAlign | undefined {
  switch (verticalAlign) {
    case 'top':
      return VerticalAlign.TOP;
    case 'middle':
      return VerticalAlign.CENTER;
    case 'bottom':
      return VerticalAlign.BOTTOM;
    default:
      return VerticalAlign.CENTER;
  }
}

/**
 * Конвертирует CSS border в DOCX border формат
 */
function convertBorder(border?: string): any {
  if (!border || border === 'none' || border === '0px') {
    return {
      style: BorderStyle.NONE,
      size: 0,
      color: '000000'
    };
  }
  
  // Парсим border: "1px solid #000000"
  const borderMatch = border.match(/(\d+)px\s+(\w+)\s+(.+)/);
  if (borderMatch) {
    const width = parseInt(borderMatch[1]);
    const style = borderMatch[2];
    const color = borderMatch[3];
    
    return {
      style: style === 'solid' ? BorderStyle.SINGLE : BorderStyle.SINGLE,
      size: width * 8, // Конвертируем в eighths of a point
      color: convertColorToHex(color) || '000000'
    };
  }
  
  // По умолчанию
  return {
    style: BorderStyle.SINGLE,
    size: 4,
    color: '000000'
  };
}

/**
 * Создает полный DOCX документ с таблицей
 */
export async function createDocxWithTable(
  tableElement: HTMLTableElement,
  options?: TableConversionOptions
): Promise<Blob> {
  const table = await convertHtmlTableToDocx(tableElement, options);
  
  const doc = new Document({
    sections: [{
      children: [table]
    }]
  });
  
  // Здесь нужно будет использовать Packer для создания blob
  // Но поскольку мы возвращаем Table, это будет делаться в вызывающем коде
  throw new Error('Use convertHtmlTableToDocx to get Table object, then use Packer in calling code');
}