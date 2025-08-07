import React, { forwardRef, useImperativeHandle, useRef } from 'react';
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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { TimeSeriesPoint, DataType } from '../types/TimeSeriesData';
import { schemeCategory10 } from 'd3-scale-chromatic';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface ReportChartProps {
  data: TimeSeriesPoint[];
  dataType: DataType;
  width?: number;
  height?: number;
}

export interface ReportChartRef {
  getChartElement: () => HTMLCanvasElement | null;
}

export const ReportChart = forwardRef<ReportChartRef, ReportChartProps>(
  ({ data, dataType, width = 800, height = 600 }, ref) => {
    const chartRef = useRef<ChartJS<'line'>>(null);

    useImperativeHandle(ref, () => ({
      getChartElement: () => {
        return chartRef.current?.canvas || null;
      },
    }));

    // Группируем данные по файлам
    const dataByFile = React.useMemo(() => {
      const grouped = new Map<string, TimeSeriesPoint[]>();
      data.forEach(point => {
        const fileKey = point.fileId;
        if (!grouped.has(fileKey)) {
          grouped.set(fileKey, []);
        }
        grouped.get(fileKey)!.push(point);
      });
      return grouped;
    }, [data]);

    // Создаем датасеты для Chart.js
    const datasets = React.useMemo(() => {
      return Array.from(dataByFile.entries()).map(([fileId, points], index) => {
        const sortedPoints = points.sort((a, b) => a.timestamp - b.timestamp);
        const isExternal = points[0]?.zoneNumber === 999;
        const color = isExternal ? '#6B7280' : schemeCategory10[index % schemeCategory10.length];
        
        return {
          label: `${fileId.substring(0, 6)}${isExternal ? ' (Внешний)' : ''}`,
          data: sortedPoints.map(point => ({
            x: point.timestamp,
            y: dataType === 'temperature' ? point.temperature : point.humidity,
          })).filter(point => point.y !== undefined),
          borderColor: color,
          backgroundColor: color + '20',
          borderWidth: 2,
          pointRadius: 1,
          pointHoverRadius: 4,
          tension: 0.1,
        };
      });
    }, [dataByFile, dataType]);

    const chartData = {
      datasets,
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y' as const, // Поворот на 90° против часовой стрелки
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            pointStyle: 'line',
          },
        },
        title: {
          display: true,
          text: `График ${dataType === 'temperature' ? 'температуры' : 'влажности'}`,
          font: {
            size: 16,
            weight: 'bold' as const,
          },
        },
      },
      scales: {
        x: {
          type: 'linear' as const,
          title: {
            display: true,
            text: dataType === 'temperature' ? 'Температура (°C)' : 'Влажность (%)',
            font: {
              size: 14,
              weight: 'bold' as const,
            },
          },
          grid: {
            display: true,
            color: '#e5e7eb',
          },
        },
        y: {
          type: 'time' as const,
          title: {
            display: true,
            text: 'Время',
            font: {
              size: 14,
              weight: 'bold' as const,
            },
          },
          time: {
            displayFormats: {
              hour: 'dd.MM HH:mm',
              day: 'dd.MM.yyyy',
            },
          },
          grid: {
            display: true,
            color: '#e5e7eb',
          },
        },
      },
      elements: {
        point: {
          radius: 1,
        },
      },
    };

    return (
      <div style={{ width, height }}>
        <Line
          ref={chartRef}
          data={chartData}
          options={options}
        />
      </div>
    );
  }
);

ReportChart.displayName = 'ReportChart';