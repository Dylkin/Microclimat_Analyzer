import React, { useRef, useEffect, useState, useCallback } from 'react';
import { scaleLinear, scaleTime } from 'd3-scale';
import { extent, bisector } from 'd3-array';
import { timeFormat } from 'd3-time-format';
import { select, pointer } from 'd3-selection';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { TimeSeriesPoint, ChartLimits, VerticalMarker, ZoomState, TooltipData, DataType } from '../types/TimeSeriesData';

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  dataType: DataType;
  limits?: ChartLimits;
  markers?: VerticalMarker[];
  zoomState?: ZoomState;
  onZoomChange?: (zoomState: ZoomState) => void;
  onMarkerAdd?: (timestamp: number) => void;
  color?: string;
  yAxisLabel?: string;
  showLegend?: boolean;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  width,
  height,
  margin,
  dataType,
  limits,
  markers = [],
  zoomState,
  onZoomChange,
  onMarkerAdd,
  color = '#3b82f6',
  yAxisLabel,
  showLegend = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData>({ x: 0, y: 0, timestamp: 0, visible: false });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Фильтруем данные по типу
  const filteredData = data.filter(d => {
    const value = dataType === 'temperature' ? d.temperature : d.humidity;
    return value !== undefined;
  });

  // Группируем данные по файлам для легенды и отображения
  const dataByFile = React.useMemo(() => {
    const grouped = new Map<string, TimeSeriesPoint[]>();
    filteredData.forEach(point => {
      const fileKey = point.fileId;
      if (!grouped.has(fileKey)) {
        grouped.set(fileKey, []);
      }
      grouped.get(fileKey)!.push(point);
    });
    return grouped;
  }, [filteredData]);

  // Получаем уникальные файлы и назначаем им цвета
  const fileColors = React.useMemo(() => {
    const files = Array.from(dataByFile.keys());
    const colors = new Map<string, string>();
    files.forEach((file, index) => {
      colors.set(file, schemeCategory10[index % schemeCategory10.length]);
    });
    return colors;
  }, [dataByFile]);

  // Создаем шкалы
  const xScale = scaleTime()
    .domain(extent(data, d => new Date(d.timestamp)) as [Date, Date])
    .range([0, innerWidth]);

  // Y-шкала с учетом пользовательских лимитов
  // Фильтруем данные по времени если применен зум для расчета Y-домена
  let dataForYScale = filteredData;
  if (zoomState) {
    dataForYScale = filteredData.filter(d => 
      d.timestamp >= zoomState.startTime && d.timestamp <= zoomState.endTime
    );
  }
  
  // Если после фильтрации по времени нет данных, используем все данные
  if (dataForYScale.length === 0) {
    dataForYScale = filteredData;
  }
  
  let yDomain = extent(dataForYScale, d => dataType === 'temperature' ? d.temperature! : d.humidity!) as [number, number];
  
  // Применяем пользовательские лимиты если они установлены
  if (limits && limits[dataType]) {
    const userLimits = limits[dataType]!;
    if (userLimits.min !== undefined && userLimits.max !== undefined) {
      // Если установлены оба лимита, используем их как основу для домена
      const range = userLimits.max - userLimits.min;
      const padding = range * 0.1; // 10% отступ
      yDomain[0] = Math.min(yDomain[0], userLimits.min - padding);
      yDomain[1] = Math.max(yDomain[1], userLimits.max + padding);
    } else {
      // Если установлен только один лимит, добавляем отступ
      if (userLimits.min !== undefined) {
        const padding = Math.abs(yDomain[1] - yDomain[0]) * 0.1;
        yDomain[0] = Math.min(yDomain[0], userLimits.min - padding);
      }
      if (userLimits.max !== undefined) {
        const padding = Math.abs(yDomain[1] - yDomain[0]) * 0.1;
        yDomain[1] = Math.max(yDomain[1], userLimits.max + padding);
      }
    }
  }
  
  const yScale = scaleLinear()
    .domain(yDomain)
    .nice()
    .range([innerHeight, 0]);

  // Применяем зум если есть
  if (zoomState) {
    xScale.domain([new Date(zoomState.startTime), new Date(zoomState.endTime)]);
  }

  // Форматтеры
  const formatTime = timeFormat('%d.%m %H:%M');
  const formatValue = (value: number) => `${value.toFixed(1)}${dataType === 'temperature' ? '°C' : '%'}`;

  // Бисектор для поиска ближайшей точки
  const bisectDate = bisector((d: TimeSeriesPoint) => d.timestamp).left;

  // Обработчик движения мыши
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!svgRef.current || isSelecting) return;

    const [mouseX, mouseY] = pointer(event, svgRef.current);
    const adjustedX = mouseX - margin.left;

    if (adjustedX < 0 || adjustedX > innerWidth) {
      setTooltip(prev => ({ ...prev, visible: false }));
      return;
    }

    const timestamp = xScale.invert(adjustedX).getTime();
    const index = bisectDate(filteredData, timestamp);
    const point = filteredData[index];

    if (point) {
      const value = dataType === 'temperature' ? point.temperature : point.humidity;
      if (value !== undefined) {
        // Получаем имя файла из данных
        const fileName = data.find(d => d.fileId === point.fileId)?.fileId || '';
        const shortFileName = fileName.substring(0, 6);
        
        setTooltip({
          x: mouseX,
          y: mouseY,
          timestamp: point.timestamp,
          fileName: shortFileName,
          [dataType]: value,
          visible: true
        });
      }
    }
  }, [filteredData, xScale, margin.left, innerWidth, dataType, bisectDate, isSelecting]);

  // Обработчик выхода мыши
  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  // Обработчик двойного клика для добавления маркера
  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    if (!svgRef.current || !onMarkerAdd) return;

    const [mouseX] = pointer(event, svgRef.current);
    const adjustedX = mouseX - margin.left;

    if (adjustedX >= 0 && adjustedX <= innerWidth) {
      const timestamp = xScale.invert(adjustedX).getTime();
      onMarkerAdd(timestamp);
    }
  }, [xScale, margin.left, innerWidth, onMarkerAdd]);

  // Обработчик начала выделения
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.detail === 2) return; // Игнорируем двойной клик

    const [mouseX] = pointer(event, svgRef.current);
    const adjustedX = mouseX - margin.left;

    if (adjustedX >= 0 && adjustedX <= innerWidth) {
      setIsSelecting(true);
      setSelectionStart(adjustedX);
      setSelectionEnd(adjustedX);
    }
  }, [margin.left, innerWidth]);

  // Обработчик движения при выделении
  const handleMouseMoveSelection = useCallback((event: React.MouseEvent) => {
    if (!isSelecting || selectionStart === null) return;

    const [mouseX] = pointer(event, svgRef.current);
    const adjustedX = mouseX - margin.left;

    if (adjustedX >= 0 && adjustedX <= innerWidth) {
      setSelectionEnd(adjustedX);
    }
  }, [isSelecting, selectionStart, margin.left, innerWidth]);

  // Обработчик окончания выделения
  const handleMouseUp = useCallback((event: React.MouseEvent) => {
    if (!isSelecting || selectionStart === null || selectionEnd === null) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    if (Math.abs(selectionEnd - selectionStart) > 10) {
      const startTime = xScale.invert(Math.min(selectionStart, selectionEnd)).getTime();
      const endTime = xScale.invert(Math.max(selectionStart, selectionEnd)).getTime();

      if (onZoomChange) {
        onZoomChange({
          startTime,
          endTime,
          scale: innerWidth / Math.abs(selectionEnd - selectionStart)
        });
      }
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [isSelecting, selectionStart, selectionEnd, xScale, innerWidth, onZoomChange]);

  // Создание линии графика с оптимизацией для больших данных
  const createPathForFile = useCallback((fileData: TimeSeriesPoint[]) => {
    let dataToRender = fileData;

    // Фильтруем по времени если применен зум
    if (zoomState) {
      dataToRender = fileData.filter(d => 
        d.timestamp >= zoomState.startTime && d.timestamp <= zoomState.endTime
      );
    }

    if (dataToRender.length === 0) return '';

    // Сортируем по времени
    dataToRender.sort((a, b) => a.timestamp - b.timestamp);

    // Для больших наборов данных используем упрощение только если не применен зум
    if (dataToRender.length > 5000 && !zoomState) {
      const step = Math.ceil(dataToRender.length / 5000);
      dataToRender = dataToRender.filter((_, index) => index % step === 0);
    }

    return dataToRender.map((d, i) => {
      const x = xScale(new Date(d.timestamp));
      const value = dataType === 'temperature' ? d.temperature! : d.humidity!;
      const y = yScale(value);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }, [dataType, xScale, yScale, zoomState]);

  // Рендер компонента
  return (
    <div className="relative flex flex-col">
      {/* Легенда */}
      {showLegend && dataByFile.size > 1 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-700">
            <span className="font-medium">Файлы данных: </span>
            {Array.from(dataByFile.keys()).map(fileId => {
              const shortName = fileId.substring(0, 6);
              const color = fileColors.get(fileId);
              // Проверяем, является ли это внешним датчиком по zoneNumber
              const fileData = data.find(d => d.fileId === fileId);
              const isExternal = fileData?.zoneNumber === 999;
              const displayColor = isExternal ? '#6B7280' : color;
              return (
                <span key={fileId} className="inline-flex items-center space-x-1 mr-3">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: displayColor }}
                  ></div>
                  <span>{shortName}{isExternal ? ' (Внешний)' : ''}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-gray-200 bg-white cursor-crosshair"
        onMouseMove={isSelecting ? handleMouseMoveSelection : handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {/* Фон */}
        <rect
          x={margin.left}
          y={margin.top}
          width={innerWidth}
          height={innerHeight}
          fill="white"
          stroke="none"
        />

        {/* Сетка */}
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Горизонтальные линии сетки */}
          {yScale.ticks(5).map(tick => (
            <g key={tick}>
              <line
                x1={0}
                y1={yScale(tick)}
                x2={innerWidth}
                y2={yScale(tick)}
                stroke="#f3f4f6"
                strokeWidth={1}
              />
              <text
                x={-10}
                y={yScale(tick)}
                dy="0.35em"
                textAnchor="end"
                fontSize="12"
                fill="#6b7280"
              >
                {formatValue(tick)}
              </text>
            </g>
          ))}

          {/* Вертикальные линии сетки */}
          {xScale.ticks(6).map(tick => (
            <g key={tick.getTime()}>
              <line
                x1={xScale(tick)}
                y1={0}
                x2={xScale(tick)}
                y2={innerHeight}
                stroke="#f3f4f6"
                strokeWidth={1}
              />
              <text
                x={xScale(tick)}
                y={innerHeight + 15}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
              >
                {formatTime(tick)}
              </text>
            </g>
          ))}
        </g>

        {/* Лимиты */}
        {limits && limits[dataType] && (
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {limits[dataType]!.min !== undefined && (
              <line
                x1={0}
                y1={yScale(limits[dataType]!.min!)}
                x2={innerWidth}
                y2={yScale(limits[dataType]!.min!)}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
            )}
            {limits[dataType]!.max !== undefined && (
              <line
                x1={0}
                y1={yScale(limits[dataType]!.max!)}
                x2={innerWidth}
                y2={yScale(limits[dataType]!.max!)}
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
            )}
          </g>
        )}

        {/* Вертикальные маркеры */}
        {markers.map(marker => (
          <g key={marker.id} transform={`translate(${margin.left}, ${margin.top})`}>
            <line
              x1={xScale(new Date(marker.timestamp))}
              y1={0}
              x2={xScale(new Date(marker.timestamp))}
              y2={innerHeight}
              stroke={marker.color || '#8b5cf6'}
              strokeWidth={2}
              strokeDasharray="3,3"
            />
            {marker.label && (
              <text
                x={xScale(new Date(marker.timestamp))}
                y={-5}
                textAnchor="middle"
                fontSize="12"
                fill={marker.color || '#8b5cf6'}
                fontWeight="bold"
              >
                {marker.label}
              </text>
            )}
          </g>
        ))}

        {/* Линии графиков для каждого файла */}
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          <defs>
            <clipPath id={`clip-${dataType}`}>
              <rect x={0} y={0} width={innerWidth} height={innerHeight} />
            </clipPath>
          </defs>
          {Array.from(dataByFile.entries()).map(([fileId, fileData]) => {
            // Проверяем, является ли это внешним датчиком по zoneNumber
            const fileDataPoint = data.find(d => d.fileId === fileId);
            const isExternal = fileDataPoint?.zoneNumber === 999;
            let pathColor = dataByFile.size > 1 ? fileColors.get(fileId) : color;
            
            // Для внешнего датчика всегда используем серый цвет
            if (isExternal) {
              pathColor = '#6B7280';
            }
            
            return (
              <path
                key={fileId}
                d={createPathForFile(fileData)}
                fill="none"
                stroke={pathColor}
                strokeWidth={1.5}
                opacity={0.8}
                clipPath={`url(#clip-${dataType})`}
              />
            );
          })}
        </g>

        {/* Область выделения */}
        {isSelecting && selectionStart !== null && selectionEnd !== null && (
          <rect
            x={margin.left + Math.min(selectionStart, selectionEnd)}
            y={margin.top}
            width={Math.abs(selectionEnd - selectionStart)}
            height={innerHeight}
            fill="rgba(59, 130, 246, 0.2)"
            stroke="rgba(59, 130, 246, 0.5)"
            strokeWidth={1}
          />
        )}

        {/* Оси */}
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Ось Y */}
          <line x1={0} y1={0} x2={0} y2={innerHeight} stroke="#374151" strokeWidth={1} />
          {/* Ось X */}
          <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="#374151" strokeWidth={1} />
        </g>

        {/* Подпись оси Y */}
        {yAxisLabel && (
          <text
            x={15}
            y={margin.top + innerHeight / 2}
            textAnchor="middle"
            fontSize="14"
            fill="#374151"
            fontWeight="bold"
            transform={`rotate(-90, 15, ${margin.top + innerHeight / 2})`}
          >
            {yAxisLabel}
          </text>
        )}
      </svg>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg pointer-events-none z-10 text-sm"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 60,
            transform: tooltip.x > width - 200 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="font-semibold">{formatTime(new Date(tooltip.timestamp))}</div>
          {tooltip.fileName && (
            <div className="text-xs text-gray-300">Файл: {tooltip.fileName.substring(0, 6)}</div>
          )}
          {tooltip.temperature !== undefined && (
            <div>Температура: {formatValue(tooltip.temperature)}</div>
          )}
          {tooltip.humidity !== undefined && (
            <div>Влажность: {formatValue(tooltip.humidity)}</div>
          )}
        </div>
      )}
    </div>
  );
};