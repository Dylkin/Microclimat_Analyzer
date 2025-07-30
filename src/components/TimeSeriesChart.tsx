import React, { useRef, useEffect, useState, useCallback } from 'react';
import { scaleLinear, scaleTime } from 'd3-scale';
import { extent, bisector } from 'd3-array';
import { timeFormat } from 'd3-time-format';
import { select, pointer } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
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
  yAxisLabel
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

  // Создаем шкалы
  const xScale = scaleTime()
    .domain(extent(filteredData, d => new Date(d.timestamp)) as [Date, Date])
    .range([0, innerWidth]);

  const yScale = scaleLinear()
    .domain(extent(filteredData, d => dataType === 'temperature' ? d.temperature! : d.humidity!) as [number, number])
    .nice()
    .range([innerHeight, 0]);

  // Применяем зум если есть
  if (zoomState) {
    xScale.domain([new Date(zoomState.startTime), new Date(zoomState.endTime)]);
  }

  // Форматтеры
  const formatTime = timeFormat('%d.%m.%Y %H:%M');
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
        setTooltip({
          x: mouseX,
          y: mouseY,
          timestamp: point.timestamp,
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
  const createPath = useCallback(() => {
    if (filteredData.length === 0) return '';

    // Для больших наборов данных используем упрощение
    let dataToRender = filteredData;
    if (filteredData.length > 10000) {
      // Берем каждую N-ю точку для оптимизации рендеринга
      const step = Math.ceil(filteredData.length / 10000);
      dataToRender = filteredData.filter((_, index) => index % step === 0);
    }

    return dataToRender.map((d, i) => {
      const x = xScale(new Date(d.timestamp));
      const value = dataType === 'temperature' ? d.temperature! : d.humidity!;
      const y = yScale(value);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }, [filteredData, dataType, xScale, yScale]);

  // Рендер компонента
  return (
    <div className="relative">
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

        {/* Основная линия графика */}
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          <path
            d={createPath()}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            opacity={0.8}
          />
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