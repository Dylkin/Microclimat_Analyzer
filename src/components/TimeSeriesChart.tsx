import React, { useRef, useEffect, useState, useCallback } from 'react';
import { scaleLinear, scaleTime } from 'd3-scale';
import { extent, bisector } from 'd3-array';
import { timeFormat } from 'd3-time-format';
import { select, pointer } from 'd3-selection';
// Категориальная палитра с максимальной различимостью
const CATEGORICAL_PALETTE = [
  '#FF0000', // Красный (яркий)
  '#00FF00', // Зеленый (яркий)
  '#0000FF', // Синий (яркий)
  '#FFFF00', // Желтый
  '#FF00FF', // Пурпурный
  '#00FFFF', // Голубой
  '#FF8000', // Оранжевый
  '#8000FF', // Фиолетовый
  '#008000', // Темно-зеленый
  '#000080', // Темно-синий
  '#800000', // Темно-красный
  '#808000', // Оливковый
  '#008080', // Бирюзовый
  '#800080', // Темно-фиолетовый
  '#FF4081', // Розовый
  '#40FF00', // Лаймовый
  '#0040FF', // Кобальтовый
];
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
  yOffset?: number; // Смещение данных по оси Y
  resetLegendToken?: number;
  onHiddenLoggersChange?: (hiddenLoggers: Set<string>) => void;
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
  showLegend = true,
  yOffset = 0,
  resetLegendToken,
  onHiddenLoggersChange
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData>({ x: 0, y: 0, timestamp: 0, visible: false });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  // Состояние для отслеживания скрытых логгеров
  const [hiddenLoggers, setHiddenLoggers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (resetLegendToken !== undefined) {
      const newSet = new Set<string>();
      setHiddenLoggers(newSet);
      if (onHiddenLoggersChange) {
        onHiddenLoggersChange(newSet);
      }
    }
  }, [resetLegendToken]);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Фильтруем данные по типу и видимости логгеров, применяем смещение по Y
  const filteredData = data
    .filter(d => {
      const value = dataType === 'temperature' ? d.temperature : d.humidity;
      const isVisible = !hiddenLoggers.has(d.fileId);
      return value !== undefined && isVisible;
    })
    .map(d => {
      // Применяем смещение по оси Y к значениям
      if (dataType === 'temperature' && d.temperature !== undefined) {
        return { ...d, temperature: d.temperature + yOffset };
      } else if (dataType === 'humidity' && d.humidity !== undefined) {
        return { ...d, humidity: d.humidity + yOffset };
      }
      return d;
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
  // Серый цвет зарезервирован для внешнего датчика (zoneNumber === 0)
  // Остальные датчики используют категориальную палитру
  const fileColors = React.useMemo(() => {
    const files = Array.from(dataByFile.keys());
    const colors = new Map<string, string>();
    
    // Разделяем файлы на внешние и не внешние
    const externalFiles: string[] = [];
    const nonExternalFiles: string[] = [];
    
    files.forEach(file => {
      const fileDataPoint = data.find(d => d.fileId === file);
      const isExternal = fileDataPoint?.zoneNumber === 0 || 
                         fileDataPoint?.loggerName?.toLowerCase().includes('внешний');
      if (isExternal) {
        externalFiles.push(file);
      } else {
        nonExternalFiles.push(file);
      }
    });
    
    // Для внешних датчиков всегда используем серый цвет
    externalFiles.forEach(file => {
      colors.set(file, '#6B7280'); // Серый цвет для внешнего датчика
    });
    
    // Для остальных датчиков используем категориальную палитру
    nonExternalFiles.forEach((file, index) => {
      colors.set(file, CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]);
    });
    
    return colors;
  }, [dataByFile, data]);

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
  const formatValue = (value: number | string | undefined) => {
    if (value === undefined || value === null) return '-';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '-';
    return `${numValue.toFixed(1)}${dataType === 'temperature' ? '°C' : '%'}`;
  };

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
      if (value !== undefined && typeof value === 'number' && !isNaN(value)) {
        // Получаем имя файла из данных
        const fileName = data.find(d => d.fileId === point.fileId)?.fileId || '';
        const shortFileName = fileName.substring(0, 6);
        
        setTooltip({
          x: mouseX,
          y: mouseY,
          timestamp: point.timestamp,
          fileName: shortFileName,
          [dataType]: value as number,
          visible: true
        });
      }
    }
  }, [filteredData, xScale, margin.left, innerWidth, dataType, bisectDate, isSelecting, data]);

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
        <div className="mb-2 p-2 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-700">
            <span className="font-medium">Номер логгера: </span>
            {Array.from(dataByFile.keys()).map(fileId => {
              const color = fileColors.get(fileId);
              // Проверяем, является ли это внешним датчиком по zoneNumber или названию
              const fileData = data.find(d => d.fileId === fileId);
              const isExternal = fileData?.zoneNumber === 0 || 
                                 fileData?.zoneNumber === null ||
                                 fileData?.zoneNumber === undefined ||
                                 fileData?.loggerName?.toLowerCase().includes('внешний');
              // Для внешнего датчика всегда используем серый цвет
              const displayColor = isExternal ? '#6B7280' : (color || '#3b82f6');
              // Используем название логгера, если оно есть, иначе fallback на fileId
              // Для внешнего датчика добавляем "Внешний" к названию
              let displayName = fileData?.loggerName || fileId;
              if (isExternal) {
                displayName = displayName ? `${displayName} Внешний` : 'Внешний';
              }
              const isHidden = hiddenLoggers.has(fileId);
              const toggleLogger = () => {
                setHiddenLoggers(prev => {
                  const newSet = new Set(prev);
                  if (newSet.has(fileId)) {
                    newSet.delete(fileId);
                  } else {
                    newSet.add(fileId);
                  }
                  if (onHiddenLoggersChange) {
                    onHiddenLoggersChange(newSet);
                  }
                  return newSet;
                });
              };
              
              return (
                <span 
                  key={fileId} 
                  className="inline-flex items-center space-x-1 mr-3 cursor-pointer hover:opacity-70 transition-opacity"
                  onClick={toggleLogger}
                  title={isHidden ? `Показать ${displayName}` : `Скрыть ${displayName}`}
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: displayColor,
                      opacity: isHidden ? 0.3 : 1
                    }}
                    title={`Цвет для ${displayName}`}
                  ></div>
                  <span 
                    style={{ 
                      opacity: isHidden ? 0.5 : 1,
                      textDecoration: isHidden ? 'line-through' : 'none'
                    }}
                  >
                    {displayName}
                  </span>
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
        className="border border-gray-200 bg-white cursor-crosshair w-full max-w-full"
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
          
          {/* Отображение лимитов на оси Y */}
          {limits && limits[dataType] && (
            <>
              {limits[dataType]!.min !== undefined && (() => {
                const minLimit = limits[dataType]!.min!;
                const yPos = yScale(minLimit);
                // Проверяем, не совпадает ли лимит с существующим тиком (с небольшой погрешностью)
                const isNearTick = yScale.ticks(5).some(tick => Math.abs(yScale(tick) - yPos) < 2);
                
                return (
                  <g key={`limit-min-${minLimit}`}>
                    <text
                      x={-10}
                      y={yPos}
                      dy="0.35em"
                      textAnchor="end"
                      fontSize="12"
                      fill="#ef4444"
                      fontWeight="bold"
                    >
                      {formatValue(minLimit)}
                    </text>
                    {!isNearTick && (
                      <line
                        x1={-5}
                        y1={yPos}
                        x2={0}
                        y2={yPos}
                        stroke="#ef4444"
                        strokeWidth={2}
                      />
                    )}
                  </g>
                );
              })()}
              {limits[dataType]!.max !== undefined && (() => {
                const maxLimit = limits[dataType]!.max!;
                const yPos = yScale(maxLimit);
                // Проверяем, не совпадает ли лимит с существующим тиком (с небольшой погрешностью)
                const isNearTick = yScale.ticks(5).some(tick => Math.abs(yScale(tick) - yPos) < 2);
                
                return (
                  <g key={`limit-max-${maxLimit}`}>
                    <text
                      x={-10}
                      y={yPos}
                      dy="0.35em"
                      textAnchor="end"
                      fontSize="12"
                      fill="#ef4444"
                      fontWeight="bold"
                    >
                      {formatValue(maxLimit)}
                    </text>
                    {!isNearTick && (
                      <line
                        x1={-5}
                        y1={yPos}
                        x2={0}
                        y2={yPos}
                        stroke="#ef4444"
                        strokeWidth={2}
                      />
                    )}
                  </g>
                );
              })()}
            </>
          )}

          {/* Вертикальные линии сетки */}
          {(() => {
            // Получаем домен оси X
            const domain = xScale.domain();
            const startTime = domain[0];
            const endTime = domain[1];
            
            // Вычисляем общий временной диапазон в миллисекундах
            const timeRange = endTime.getTime() - startTime.getTime();
            
            // Количество меток: увеличиваем в 2 раза (с 16 до 32)
            const tickCount = 32;
            
            // Создаем равномерно распределенные метки
            const ticks: Date[] = [];
            for (let i = 0; i < tickCount; i++) {
              // Вычисляем время для каждой метки на равном расстоянии
              const tickTime = startTime.getTime() + (timeRange * i) / (tickCount - 1);
              ticks.push(new Date(tickTime));
            }
            
            return ticks.map(tick => (
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
                  y={innerHeight + 25}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#6b7280"
                  transform={`rotate(-45, ${xScale(tick)}, ${innerHeight + 25})`}
                >
                  {formatTime(tick)}
                </text>
              </g>
            ));
          })()}
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
        {markers.map((marker, index) => {
          // Четные маркеры (индекс 0, 2, 4...) размещаем выше, нечетные (индекс 1, 3, 5...) - ниже
          // Это соответствует: 1-й маркер (индекс 0) - выше, 2-й маркер (индекс 1) - ниже, и т.д.
          const labelY = index % 2 === 0 ? -10 : -25;
          
          return (
            <g key={marker.id} transform={`translate(${margin.left}, ${margin.top})`}>
              <line
                x1={xScale(new Date(marker.timestamp))}
                y1={0}
                x2={xScale(new Date(marker.timestamp))}
                y2={innerHeight}
                stroke={marker.color || '#000000'}
                strokeWidth={2}
                strokeDasharray="3,3"
              />
              {marker.label && (
                <text
                  x={xScale(new Date(marker.timestamp))}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="12"
                  fill={marker.color || '#000000'}
                  fontWeight="bold"
                >
                  {marker.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Линии графиков для каждого файла */}
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          <defs>
            <clipPath id={`clip-${dataType}`}>
              <rect x={0} y={0} width={innerWidth} height={innerHeight} />
            </clipPath>
          </defs>
          {Array.from(dataByFile.entries())
            .filter(([fileId]) => !hiddenLoggers.has(fileId))
            .map(([fileId, fileData]) => {
            // Проверяем, является ли это внешним датчиком
            const fileDataPoint = data.find(d => d.fileId === fileId);
            const isExternal = fileDataPoint?.zoneNumber === 0 || 
                               fileDataPoint?.loggerName?.toLowerCase().includes('внешний');
            
            // Для внешнего датчика всегда используем серый цвет
            const pathColor = isExternal 
              ? '#6B7280' 
              : (dataByFile.size > 1 ? (fileColors.get(fileId) || color) : color);
            
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
          role="tooltip"
          aria-label="Информация о точке данных"
        >
          <div className="font-semibold">{new Date(tooltip.timestamp).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</div>
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