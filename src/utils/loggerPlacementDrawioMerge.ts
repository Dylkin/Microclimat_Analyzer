import type { EquipmentType } from '../types/Equipment';
import { MeasurementLevel, MeasurementZone } from '../types/QualificationObject';

/** Заливка прямоугольника «уровень размещения» на схеме по типу логгера. */
function levelPlacementFillColor(equipmentType: EquipmentType | undefined): string {
  if (equipmentType === 'Testo 174H') return '#33FFFF';
  if (equipmentType === 'EClerk-M-RHT') return '#E8D5FF';
  if (equipmentType === 'Testo 174T') return '#FFFFFF';
  return '#FFFFFF';
}

/** Префикс id ячеек, которыми управляет размещение логгеров (удаляются перед повторной вставкой). */
export const LOGGER_PLACEMENT_CELL_PREFIX = 'mc-place-';

const ZONE_SIZE = 37;
const RECT_W = 100;
const RECT_H = 30;

function escapeXmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Высота в метрах в формате как на схеме: «2,2» */
export function formatHeightForDiagramMeters(m: number): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(m);
}

function zoneNumberLabel(zoneNumber: number): string {
  if (zoneNumber === 0) return '00';
  return String(zoneNumber).padStart(2, '0');
}

function buildEllipseValue(zoneNumber: number): string {
  const label = zoneNumberLabel(zoneNumber);
  return `<span style='font-size: 20px'><b>${escapeXmlAttr(label)}</b></span>`;
}

function buildRectangleValue(level: MeasurementLevel): string {
  const name = (level.equipmentName && level.equipmentName.trim()) || '—';
  const h = formatHeightForDiagramMeters(level.level);
  return `<b>${escapeXmlAttr(name)}</b>&#xa0;<b>${escapeXmlAttr(h)} M</b>`;
}

function parsePageSize(mxGraphModel: Element): { pageWidth: number; pageHeight: number } {
  const pw = parseFloat(mxGraphModel.getAttribute('pageWidth') || '827');
  const ph = parseFloat(mxGraphModel.getAttribute('pageHeight') || '1169');
  return {
    pageWidth: Number.isFinite(pw) && pw > 0 ? pw : 827,
    pageHeight: Number.isFinite(ph) && ph > 0 ? ph : 1169
  };
}

function defaultZoneTopLeft(zoneIndex: number, pageWidth: number, pageHeight: number): { ex: number; ey: number } {
  const cols = 4;
  const col = zoneIndex % cols;
  const row = Math.floor(zoneIndex / cols);
  const gapX = 140;
  const gapY = 120;
  const ex = 40 + col * gapX;
  const ey = 40 + row * gapY;
  return {
    ex: Math.min(ex, Math.max(20, pageWidth - RECT_W - ZONE_SIZE - 20)),
    ey: Math.min(ey, Math.max(20, pageHeight - RECT_H * 3 - ZONE_SIZE))
  };
}

function zoneTopLeft(
  zone: MeasurementZone,
  zoneIndex: number,
  pageWidth: number,
  pageHeight: number
): { ex: number; ey: number } {
  const hasPos =
    zone.planPosX != null &&
    zone.planPosY != null &&
    Number.isFinite(zone.planPosX) &&
    Number.isFinite(zone.planPosY);
  if (hasPos) {
    const cx = (pageWidth * zone.planPosX!) / 100;
    const cy = (pageHeight * zone.planPosY!) / 100;
    return { ex: cx - ZONE_SIZE / 2, ey: cy - ZONE_SIZE / 2 };
  }
  return defaultZoneTopLeft(zoneIndex, pageWidth, pageHeight);
}

function stripLoggerPlacementCells(doc: Document): void {
  const cells = doc.querySelectorAll(`mxCell[id^="${LOGGER_PLACEMENT_CELL_PREFIX}"]`);
  cells.forEach((el) => el.remove());
}

/** Удаляет из документа draw.io только управляемые маркеры mc-place-* (база для следующей загрузки/слияния). */
export function stripLoggerPlacementMarkersFromDrawioXml(mxfileXml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(mxfileXml, 'text/xml');
  if (doc.querySelector('parsererror')) {
    return mxfileXml;
  }
  stripLoggerPlacementCells(doc);
  return new XMLSerializer().serializeToString(doc.documentElement);
}

function buildMxCellIdMap(doc: Document): Map<string, Element> {
  const map = new Map<string, Element>();
  doc.querySelectorAll('mxCell[id]').forEach((el) => {
    const id = el.getAttribute('id');
    if (id) map.set(id, el);
  });
  return map;
}

/**
 * Абсолютный левый верхний угол вершины в координатах слоя (parent id=1).
 * mxGeometry у вложенных фигур задаётся относительно родителя; без суммирования цепочки
 * позиции «прилипают» к левому краю после сохранения.
 */
function getAbsoluteTopLeftForVertex(cell: Element, cellById: Map<string, Element>): {
  x: number;
  y: number;
} {
  const parentId = cell.getAttribute('parent');
  const geo = cell.querySelector('mxGeometry[as="geometry"]');
  const gx = parseFloat(geo?.getAttribute('x') || '0');
  const gy = parseFloat(geo?.getAttribute('y') || '0');
  if (!parentId || parentId === '0') {
    return { x: 0, y: 0 };
  }
  if (parentId === '1') {
    return { x: gx, y: gy };
  }
  const parent = cellById.get(parentId);
  if (!parent) {
    return { x: gx, y: gy };
  }
  const p = getAbsoluteTopLeftForVertex(parent, cellById);
  return { x: p.x + gx, y: p.y + gy };
}

function geometryCenterPercent(
  cell: Element,
  cellById: Map<string, Element>,
  pageWidth: number,
  pageHeight: number
): { planPosX: number; planPosY: number } | null {
  const geo = cell.querySelector('mxGeometry[as="geometry"]');
  if (!geo) return null;
  const w = parseFloat(geo.getAttribute('width') || '0');
  const h = parseFloat(geo.getAttribute('height') || '0');
  if (!Number.isFinite(w) || !Number.isFinite(h)) {
    return null;
  }
  const tl = getAbsoluteTopLeftForVertex(cell, cellById);
  if (!Number.isFinite(tl.x) || !Number.isFinite(tl.y)) {
    return null;
  }
  const cx = tl.x + w / 2;
  const cy = tl.y + h / 2;
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  return {
    planPosX: clamp((cx / pageWidth) * 100),
    planPosY: clamp((cy / pageHeight) * 100)
  };
}

/** true, если в XML есть ячейки размещения логгеров с id `mc-place-*`. */
export function drawioXmlHasLoggerPlacementMarkers(mxfileXml: string): boolean {
  return (
    mxfileXml.includes(LOGGER_PLACEMENT_CELL_PREFIX) &&
    (mxfileXml.includes(`id="${LOGGER_PLACEMENT_CELL_PREFIX}`) ||
      mxfileXml.includes(`id='${LOGGER_PLACEMENT_CELL_PREFIX}`))
  );
}

function parseZoneNumberFromEllipsePlacementValue(value: string): number {
  const text = value.replace(/<[^>]+>/g, '').replace(/\s+/g, '');
  const n = parseInt(text, 10);
  return Number.isFinite(n) ? n : 0;
}

function parsePlacementLevelCellValue(value: string): { equipmentName: string; level: number } | null {
  const decoded = value
    .replace(/&#xa0;/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ');
  const m = decoded.match(/<b>([^<]*)<\/b>\s*<b>\s*([\d,\.\s]+)\s*M\s*<\/b>/i);
  if (!m) return null;
  let equipmentName = (m[1] || '').trim();
  if (equipmentName === '—' || equipmentName === '-') {
    equipmentName = '';
  }
  const hStr = (m[2] || '').replace(/\s/g, '').replace(',', '.');
  const level = parseFloat(hStr);
  if (!Number.isFinite(level)) return null;
  return { equipmentName, level };
}

function equipmentTypeFromMxCellStyle(style: string | null | undefined): EquipmentType | undefined {
  if (!style) return undefined;
  const s = style.toLowerCase();
  if (s.includes('fillcolor=#33ffff')) return 'Testo 174H';
  if (s.includes('fillcolor=#e8d5ff')) return 'EClerk-M-RHT';
  if (s.includes('fillcolor=#ffffff') || s.includes('fillcolor=#fff;')) return 'Testo 174T';
  return undefined;
}

/**
 * Восстанавливает зоны и уровни из маркеров mc-place-* в сохранённой схеме (.drawio).
 * Использует id зон/уровней из документа, чтобы дальнейшее сохранение совпадало с редактором.
 */
export function parseMeasurementZonesFromLoggerPlacementDrawioXml(mxfileXml: string): MeasurementZone[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(mxfileXml, 'text/xml');
  if (doc.querySelector('parsererror')) {
    return [];
  }

  const graphModel = doc.querySelector('mxGraphModel');
  if (!graphModel) {
    return [];
  }

  const { pageWidth, pageHeight } = parsePageSize(graphModel);
  const cellById = buildMxCellIdMap(doc);

  const zoneMeta = new Map<string, { zoneNumber: number; planPos?: { planPosX: number; planPosY: number } }>();
  const levelAcc = new Map<string, MeasurementLevel[]>();

  doc.querySelectorAll(`mxCell[id^="${LOGGER_PLACEMENT_CELL_PREFIX}"]`).forEach((cell) => {
    const id = cell.getAttribute('id') || '';
    const value = cell.getAttribute('value') || '';
    const style = cell.getAttribute('style') || '';
    const pct = geometryCenterPercent(cell, cellById, pageWidth, pageHeight);

    if (id.endsWith('-zone')) {
      const zoneId = id.slice(LOGGER_PLACEMENT_CELL_PREFIX.length, -'-zone'.length);
      if (!zoneId) return;
      const zoneNumber = parseZoneNumberFromEllipsePlacementValue(value);
      zoneMeta.set(zoneId, {
        zoneNumber,
        ...(pct ? { planPos: { planPosX: pct.planPosX, planPosY: pct.planPosY } } : {})
      });
      return;
    }

    const rest = id.startsWith(LOGGER_PLACEMENT_CELL_PREFIX) ? id.slice(LOGGER_PLACEMENT_CELL_PREFIX.length) : '';
    const sep = '-lvl-';
    const idx = rest.indexOf(sep);
    if (idx < 0) return;
    const zoneId = rest.slice(0, idx);
    const levelId = rest.slice(idx + sep.length);
    if (!zoneId || !levelId) return;

    const parsed = parsePlacementLevelCellValue(value);
    if (!parsed) return;
    const eqType = equipmentTypeFromMxCellStyle(style);
    const ml: MeasurementLevel = {
      id: levelId,
      level: parsed.level,
      equipmentId: '',
      equipmentName: parsed.equipmentName,
      ...(eqType ? { equipmentType: eqType } : {}),
      ...(pct ? { planPosX: pct.planPosX, planPosY: pct.planPosY } : {})
    };
    if (!levelAcc.has(zoneId)) {
      levelAcc.set(zoneId, []);
    }
    levelAcc.get(zoneId)!.push(ml);
  });

  if (zoneMeta.size === 0 && levelAcc.size === 0) {
    return [];
  }

  const zoneIds = new Set<string>([...zoneMeta.keys(), ...levelAcc.keys()]);
  const unsorted: MeasurementZone[] = [];

  zoneIds.forEach((zoneId) => {
    const meta = zoneMeta.get(zoneId);
    const rawLevels = levelAcc.get(zoneId) || [];
    if (!meta && rawLevels.length === 0) {
      return;
    }
    const zoneNumber = meta?.zoneNumber ?? 1;
    const measurementLevels = [...rawLevels].sort((a, b) => a.level - b.level);
    unsorted.push({
      id: zoneId,
      zoneNumber,
      measurementLevels,
      ...(meta?.planPos
        ? { planPosX: meta.planPos.planPosX, planPosY: meta.planPos.planPosY }
        : {})
    });
  });

  return unsorted.sort((a, b) => a.zoneNumber - b.zoneNumber);
}

/**
 * Читает из XML текущие позиции маркеров mc-place-* и возвращает копию зон с planPosX/Y для зон и уровней.
 */
export function parseLoggerPlacementPositionsFromDrawioXml(
  mxfileXml: string,
  zones: MeasurementZone[]
): MeasurementZone[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(mxfileXml, 'text/xml');
  if (doc.querySelector('parsererror')) {
    return zones;
  }

  const graphModel = doc.querySelector('mxGraphModel');
  if (!graphModel) {
    return zones;
  }

  const { pageWidth, pageHeight } = parsePageSize(graphModel);
  const cellById = buildMxCellIdMap(doc);
  const zonePos = new Map<string, { planPosX: number; planPosY: number }>();
  const levelPos = new Map<string, { planPosX: number; planPosY: number }>();

  const cells = doc.querySelectorAll(`mxCell[id^="${LOGGER_PLACEMENT_CELL_PREFIX}"]`);
  cells.forEach((cell) => {
    const id = cell.getAttribute('id') || '';
    const pct = geometryCenterPercent(cell, cellById, pageWidth, pageHeight);
    if (!pct) return;

    if (id.endsWith('-zone') && id.startsWith(LOGGER_PLACEMENT_CELL_PREFIX)) {
      const zoneId = id.slice(LOGGER_PLACEMENT_CELL_PREFIX.length, -'-zone'.length);
      zonePos.set(zoneId, pct);
      return;
    }

    const rest = id.startsWith(LOGGER_PLACEMENT_CELL_PREFIX)
      ? id.slice(LOGGER_PLACEMENT_CELL_PREFIX.length)
      : '';
    const lvlSep = '-lvl-';
    const idx = rest.indexOf(lvlSep);
    if (idx >= 0) {
      const zoneId = rest.slice(0, idx);
      const levelId = rest.slice(idx + lvlSep.length);
      if (zoneId && levelId) {
        levelPos.set(`${zoneId}|${levelId}`, pct);
      }
    }
  });

  return zones.map((zone) => {
    const zp = zonePos.get(zone.id);
    const measurementLevels = zone.measurementLevels.map((level) => {
      const lp = levelPos.get(`${zone.id}|${level.id}`);
      return lp ? { ...level, planPosX: lp.planPosX, planPosY: lp.planPosY } : level;
    });
    if (zp) {
      return { ...zone, planPosX: zp.planPosX, planPosY: zp.planPosY, measurementLevels };
    }
    return { ...zone, measurementLevels };
  });
}

function createMxCell(doc: Document, attrs: Record<string, string>, geometry: Record<string, string>): Element {
  const cell = doc.createElement('mxCell');
  Object.entries(attrs).forEach(([k, v]) => cell.setAttribute(k, v));
  const geo = doc.createElement('mxGeometry');
  Object.entries(geometry).forEach(([k, v]) => geo.setAttribute(k, v));
  geo.setAttribute('as', 'geometry');
  cell.appendChild(geo);
  return cell;
}

/**
 * Удаляет старые маркеры mc-place-* и добавляет ellipse (зона) + вертикальный столбец rectangle (уровни).
 */
export function mergeLoggerPlacementIntoDrawioXml(
  mxfileXml: string,
  zones: MeasurementZone[]
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(mxfileXml, 'text/xml');
  const parseErr = doc.querySelector('parsererror');
  if (parseErr) {
    console.warn('loggerPlacementDrawioMerge: parse error, returning original');
    return mxfileXml;
  }

  const diagram = doc.querySelector('mxfile > diagram');
  if (!diagram) {
    return mxfileXml;
  }

  const graphModel = diagram.querySelector('mxGraphModel');
  if (!graphModel) {
    return mxfileXml;
  }

  const root = graphModel.querySelector('root');
  if (!root) {
    return mxfileXml;
  }

  stripLoggerPlacementCells(doc);

  const { pageWidth, pageHeight } = parsePageSize(graphModel);

  const sortedZones = [...zones].sort((a, b) => a.zoneNumber - b.zoneNumber);

  sortedZones.forEach((zone, zi) => {
    const { ex, ey } = zoneTopLeft(zone, zi, pageWidth, pageHeight);

    const zoneCell = createMxCell(
      doc,
      {
        id: `${LOGGER_PLACEMENT_CELL_PREFIX}${zone.id}-zone`,
        value: buildEllipseValue(zone.zoneNumber),
        style:
          'ellipse;whiteSpace=wrap;html=1;movable=1;resizable=1;rotatable=1;deletable=1;editable=1;connectable=1;fillColor=#FFFFFF;strokeColor=#000000;',
        parent: '1',
        vertex: '1'
      },
      {
        x: String(ex),
        y: String(ey),
        width: String(ZONE_SIZE),
        height: String(ZONE_SIZE)
      }
    );
    root.appendChild(zoneCell);

    const stackLeft = ex + ZONE_SIZE;
    const stackTop = ey;

    const levelsByHeight = [...zone.measurementLevels].sort((a, b) => {
      const va = Number.isFinite(a.level) ? a.level : Number.POSITIVE_INFINITY;
      const vb = Number.isFinite(b.level) ? b.level : Number.POSITIVE_INFINITY;
      return va - vb;
    });

    let levelStackIndex = 0;
    levelsByHeight.forEach((level: MeasurementLevel) => {
      const fill = levelPlacementFillColor(level.equipmentType);
      const hasLevelPos =
        level.planPosX != null &&
        level.planPosY != null &&
        Number.isFinite(level.planPosX) &&
        Number.isFinite(level.planPosY);
      let rx: number;
      let ry: number;
      if (hasLevelPos) {
        rx = (pageWidth * level.planPosX!) / 100 - RECT_W / 2;
        ry = (pageHeight * level.planPosY!) / 100 - RECT_H / 2;
      } else {
        rx = stackLeft;
        ry = stackTop + levelStackIndex * RECT_H;
        levelStackIndex += 1;
      }
      const rectCell = createMxCell(
        doc,
        {
          id: `${LOGGER_PLACEMENT_CELL_PREFIX}${zone.id}-lvl-${level.id}`,
          value: buildRectangleValue(level),
          style:
            `rounded=0;whiteSpace=wrap;html=1;fontSize=14;align=center;verticalAlign=middle;fillColor=${fill};strokeColor=#000000;`,
          parent: '1',
          vertex: '1'
        },
        {
          x: String(rx),
          y: String(ry),
          width: String(RECT_W),
          height: String(RECT_H)
        }
      );
      root.appendChild(rectCell);
    });
  });

  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc.documentElement);
}

/** Создаёт пустой документ draw.io (.drawio XML) для новой схемы расположения оборудования. */
export function createBlankDrawioXml(title = 'Схема расположения измерительного оборудования'): string {
  const now = new Date().toISOString();
  const diagramId = `diagram-${Date.now()}`;
  return `<mxfile host="app.diagrams.net" modified="${now}" agent="MicroclimatAnalyzer" etag="blank" version="24.0.0" type="device">
  <diagram name="Page-1" id="${diagramId}">
    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}
