import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { TimeSeriesDataPoint, ChartLimits, VerticalMarker, ZoomState, DataType } from '../types/TimeSeriesData';

interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  dataType: DataType;
  limits?: ChartLimits;
  markers?: VerticalMarker[];
  zoomState?: ZoomState;
  onZoomChange?: (zoomState: ZoomState | undefined) => void;
  onMarkerAdd?: (timestamp: number) => void;
  yAxisLabel?: string;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  width,
  height,
  margin,
  dataType,
  limits = {},
  markers = [],
  zoomState,
  onZoomChange,
  onMarkerAdd,
  yAxisLabel = 'Value'
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter and prepare data based on dataType
  const chartData = useMemo(() => {
    return data
      .filter(d => {
        const value = dataType === 'temperature' ? d.temperature : d.humidity;
        return value !== undefined && value !== null;
      })
      .map(d => ({
        ...d,
        value: dataType === 'temperature' ? d.temperature! : d.humidity!
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [data, dataType]);

  // Group data by file for different colors
  const dataByFile = useMemo(() => {
    const grouped = new Map<string, typeof chartData>();
    chartData.forEach(d => {
      if (!grouped.has(d.fileId)) {
        grouped.set(d.fileId, []);
      }
      grouped.get(d.fileId)!.push(d);
    });
    return grouped;
  }, [chartData]);

  // Color scale for different files
  const colorScale = useMemo(() => {
    const fileIds = Array.from(dataByFile.keys());
    return d3.scaleOrdinal(d3.schemeCategory10).domain(fileIds);
  }, [dataByFile]);

  useEffect(() => {
    if (!svgRef.current || chartData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create main group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Set up scales
    const timeExtent = d3.extent(chartData, d => d.timestamp) as [number, number];
    const valueExtent = d3.extent(chartData, d => d.value) as [number, number];

    // Apply zoom state if present
    const xDomain = zoomState 
      ? [zoomState.startTime, zoomState.endTime]
      : timeExtent;

    const xScale = d3.scaleTime()
      .domain(xDomain)
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain(valueExtent)
      .nice()
      .range([innerHeight, 0]);

    // Create line generator
    const line = d3.line<typeof chartData[0]>()
      .x(d => xScale(d.timestamp))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d3.timeFormat('%H:%M\n%d.%m'));
    
    const yAxis = d3.axisLeft(yScale);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis);

    // Add axis labels
    g.append('text')
      .attr('class', 'y-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#666')
      .text(yAxisLabel);

    // Add limit lines if specified
    const currentLimits = limits[dataType];
    if (currentLimits) {
      if (currentLimits.min !== undefined) {
        g.append('line')
          .attr('class', 'limit-line-min')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', yScale(currentLimits.min))
          .attr('y2', yScale(currentLimits.min))
          .style('stroke', '#dc2626')
          .style('stroke-width', 2)
          .style('stroke-dasharray', '5,5');

        g.append('text')
          .attr('class', 'limit-label-min')
          .attr('x', innerWidth - 5)
          .attr('y', yScale(currentLimits.min) - 5)
          .style('text-anchor', 'end')
          .style('font-size', '10px')
          .style('fill', '#dc2626')
          .text(`Мин: ${currentLimits.min}`);
      }

      if (currentLimits.max !== undefined) {
        g.append('line')
          .attr('class', 'limit-line-max')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', yScale(currentLimits.max))
          .attr('y2', yScale(currentLimits.max))
          .style('stroke', '#dc2626')
          .style('stroke-width', 2)
          .style('stroke-dasharray', '5,5');

        g.append('text')
          .attr('class', 'limit-label-max')
          .attr('x', innerWidth - 5)
          .attr('y', yScale(currentLimits.max) + 15)
          .style('text-anchor', 'end')
          .style('font-size', '10px')
          .style('fill', '#dc2626')
          .text(`Макс: ${currentLimits.max}`);
      }
    }

    // Draw lines for each file
    dataByFile.forEach((fileData, fileId) => {
      const filteredData = zoomState 
        ? fileData.filter(d => d.timestamp >= zoomState.startTime && d.timestamp <= zoomState.endTime)
        : fileData;

      if (filteredData.length > 0) {
        g.append('path')
          .datum(filteredData)
          .attr('class', `line-${fileId}`)
          .attr('fill', 'none')
          .attr('stroke', colorScale(fileId))
          .attr('stroke-width', 1.5)
          .attr('d', line);
      }
    });

    // Add markers
    markers.forEach(marker => {
      if (marker.timestamp >= xDomain[0] && marker.timestamp <= xDomain[1]) {
        const x = xScale(marker.timestamp);
        
        g.append('line')
          .attr('class', 'marker-line')
          .attr('x1', x)
          .attr('x2', x)
          .attr('y1', 0)
          .attr('y2', innerHeight)
          .style('stroke', marker.color)
          .style('stroke-width', 2)
          .style('stroke-dasharray', '3,3');

        g.append('text')
          .attr('class', 'marker-label')
          .attr('x', x + 5)
          .attr('y', 15)
          .style('font-size', '10px')
          .style('fill', marker.color)
          .text(marker.label);
      }
    });

    // Add brush for zooming
    if (onZoomChange) {
      const brush = d3.brushX()
        .extent([[0, 0], [innerWidth, innerHeight]])
        .on('end', (event) => {
          if (!event.selection) {
            onZoomChange(undefined);
            return;
          }

          const [x0, x1] = event.selection;
          const startTime = xScale.invert(x0).getTime();
          const endTime = xScale.invert(x1).getTime();

          onZoomChange({
            startTime,
            endTime
          });

          // Clear the brush selection
          g.select('.brush').call(brush.move, null);
        });

      g.append('g')
        .attr('class', 'brush')
        .call(brush);
    }

    // Add double-click handler for markers
    if (onMarkerAdd) {
      svg.on('dblclick', (event) => {
        const [mouseX] = d3.pointer(event, g.node());
        const timestamp = xScale.invert(mouseX).getTime();
        onMarkerAdd(timestamp);
      });
    }

    // Add legend
    const legend = g.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth - 150}, 20)`);

    let legendY = 0;
    dataByFile.forEach((_, fileId) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${legendY})`);

      legendItem.append('line')
        .attr('x1', 0)
        .attr('x2', 15)
        .attr('y1', 0)
        .attr('y2', 0)
        .style('stroke', colorScale(fileId))
        .style('stroke-width', 2);

      legendItem.append('text')
        .attr('x', 20)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .style('font-size', '10px')
        .style('fill', '#333')
        .text(fileId.substring(0, 10) + (fileId.length > 10 ? '...' : ''));

      legendY += 15;
    });

  }, [chartData, width, height, margin, dataType, limits, markers, zoomState, colorScale, dataByFile, yAxisLabel, onZoomChange, onMarkerAdd]);

  return (
    <div ref={containerRef} className="w-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-gray-200 rounded"
      />
      <div className="mt-2 text-xs text-gray-500 text-center">
        Двойной клик для добавления маркера • Выделите область для масштабирования
      </div>
    </div>
  );
};