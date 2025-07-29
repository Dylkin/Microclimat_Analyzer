import React, { useRef, useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
  Plugin,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { ru } from 'date-fns/locale';
import { Clock, RotateCcw } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
);

interface ChartData {
  timestamp: number;
  value: number;
  fileId: string;
  fileName: string;
}

interface VerticalLine {
  id: string;
  timestamp: number;
  comment: string;
}

interface Limits {
  min: number | null;
  max: number | null;
}

interface InteractiveChartProps {
  data: ChartData[];
  title: string;
  unit: string;
  color: string;
  limits: Limits;
  lines: VerticalLine[];
  onAddLine: (timestamp: number) => void;
  onUpdateLineComment: (lineId: string, comment: string) => void;
  onRemoveLine: (lineId: string) => void;
}

export const InteractiveChart: React.FC<InteractiveChartProps> = ({
  data,
  title,
  unit,
  color,
  limits,
  lines,
  onAddLine,
  onUpdateLineComment,
  onRemoveLine
}) => {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);

  // Плагин для вертикальных линий
  const verticalLinesPlugin: Plugin<'line'> = {
    id: 'verticalLines',
    afterDraw: (chart) => {
      const ctx = chart.ctx;
      const chartArea = chart.chartArea;
      
      lines.forEach(line => {
        const xScale = chart.scales.x;
        const x = xScale.getPixelForValue(line.timestamp);
        
        if (x >= chartArea.left && x <= chartArea.right) {
          // Рисуем вертикальную линию
          ctx.save();
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(x, chartArea.top);
          ctx.lineTo(x, chartArea.bottom);
          ctx.stroke();
          
          // Рисуем кружок для удаления
          ctx.fillStyle = '#8b5cf6';
          ctx.beginPath();
          ctx.arc(x, chartArea.top + 10, 4, 0, 2 * Math.PI);
          ctx.fill();
          ctx.restore();
        }
      });
    }
  };

  // Плагин для лимитов
  const limitsPlugin: Plugin<'line'> = {
    id: 'limits',
    afterDraw: (chart) => {
      const ctx = chart.ctx;
      const chartArea = chart.chartArea;
      const yScale = chart.scales.y;
      
      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      if (limits.min !== null) {
        const y = yScale.getPixelForValue(limits.min);
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
      }
      
      if (limits.max !== null) {
        const y = yScale.getPixelForValue(limits.max);
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y);
        ctx.lineTo(chartArea.right, y);
        ctx.stroke();
      }
      
      ctx.restore();
    }
  };

  const chartData = {
    datasets: [
      {
        label: title,
        data: data.map(d => ({ x: d.timestamp, y: d.value })),
        borderColor: color,
        backgroundColor: color + '20',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
      }
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleString('ru-RU');
          },
          label: (context) => {
            return `${title}: ${context.parsed.y.toFixed(1)} ${unit}`;
          }
        }
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x'
        },
        zoom: {
          wheel: {
            enabled: true
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
          onZoomComplete: () => {
            setIsZoomed(true);
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            minute: 'dd.MM HH:mm',
            hour: 'dd.MM HH:mm',
            day: 'dd.MM'
          }
        },
        adapters: {
          date: {
            locale: ru
          }
        },
        title: {
          display: true,
          text: 'Время'
        }
      },
      y: {
        title: {
          display: true,
          text: `${title} (${unit})`
        },
        beginAtZero: false
      }
    },
    onDoubleClick: (event, elements, chart) => {
      const canvasPosition = ChartJS.helpers.getRelativePosition(event, chart);
      const dataX = chart.scales.x.getValueForPixel(canvasPosition.x);
      if (dataX) {
        onAddLine(dataX);
      }
    },
    onClick: (event, elements, chart) => {
      // Проверяем клик по кружкам вертикальных линий
      const canvasPosition = ChartJS.helpers.getRelativePosition(event, chart);
      const chartArea = chart.chartArea;
      
      lines.forEach(line => {
        const x = chart.scales.x.getPixelForValue(line.timestamp);
        const y = chartArea.top + 10;
        
        const distance = Math.sqrt(
          Math.pow(canvasPosition.x - x, 2) + Math.pow(canvasPosition.y - y, 2)
        );
        
        if (distance <= 6) {
          onRemoveLine(line.id);
        }
      });
    }
  };

  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
      setIsZoomed(false);
    }
  };

  const calculateTimePeriods = () => {
    if (lines.length < 2) return [];
    
    const sortedLines = [...lines].sort((a, b) => a.timestamp - b.timestamp);
    const periods = [];
    
    for (let i = 0; i < sortedLines.length - 1; i++) {
      const start = new Date(sortedLines[i].timestamp);
      const end = new Date(sortedLines[i + 1].timestamp);
      const duration = end.getTime() - start.getTime();
      
      periods.push({
        start: start.toLocaleString('ru-RU'),
        end: end.toLocaleString('ru-RU'),
        duration: formatDuration(duration),
        startComment: sortedLines[i].comment,
        endComment: sortedLines[i + 1].comment
      });
    }
    
    return periods;
  };

  const formatDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    return `${hours}ч ${minutes}м ${seconds}с`;
  };

  return (
    <div className="space-y-4">
      {/* Управление графиком */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Двойной клик для добавления вертикальной линии. Клик по кружку для удаления.
        </div>
        <div className="flex space-x-2">
          {isZoomed && (
            <button
              onClick={resetZoom}
              className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Сбросить масштаб</span>
            </button>
          )}
          <div className="text-xs text-gray-500">
            Колесо мыши для масштабирования
          </div>
        </div>
      </div>

      {/* График */}
      <div className="h-80 bg-white border border-gray-200 rounded-lg p-4">
        <Line
          ref={chartRef}
          data={chartData}
          options={options}
          plugins={[verticalLinesPlugin, limitsPlugin]}
        />
      </div>

      {/* Комментарии к линиям */}
      {lines.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Комментарии к меткам:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {lines.map(line => (
              <div key={line.id} className="flex items-center space-x-2 bg-purple-50 p-2 rounded">
                <div className="text-xs text-purple-600 font-medium">
                  {new Date(line.timestamp).toLocaleString('ru-RU')}
                </div>
                {editingComment === line.id ? (
                  <input
                    type="text"
                    value={line.comment}
                    onChange={(e) => onUpdateLineComment(line.id, e.target.value)}
                    onBlur={() => setEditingComment(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingComment(null)}
                    className="flex-1 px-2 py-1 text-xs border border-purple-300 rounded"
                    autoFocus
                  />
                ) : (
                  <div
                    className="flex-1 text-xs cursor-pointer hover:bg-purple-100 px-2 py-1 rounded"
                    onClick={() => setEditingComment(line.id)}
                  >
                    {line.comment || 'Нажмите для добавления комментария'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Временные периоды */}
      {lines.length >= 2 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Временные периоды:</h4>
          {calculateTimePeriods().map((period, index) => (
            <div key={index} className="text-xs bg-blue-50 p-3 rounded border">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-3 h-3 text-blue-600" />
                <span className="font-medium">Период {index + 1}:</span>
              </div>
              <div className="space-y-1">
                <div>Начало: {period.start} {period.startComment && `(${period.startComment})`}</div>
                <div>Конец: {period.end} {period.endComment && `(${period.endComment})`}</div>
                <div className="font-medium text-blue-700">Длительность: {period.duration}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};