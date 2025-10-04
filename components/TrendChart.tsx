import React, { useState, useRef, useMemo } from 'react';
import { TrendData } from '../utils/chartUtils';

interface TrendChartProps {
  data: TrendData;
}

const formatCurrencyForChart = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: string; current: number | null; prev: number | null } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { labels, currentMonthData, previousMonthData } = data;

  const chartParams = useMemo(() => {
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const svgWidth = svgRef.current?.clientWidth || 600;
    const svgHeight = svgRef.current?.clientHeight || 300;
    const width = svgWidth - padding.left - padding.right;
    const height = svgHeight - padding.top - padding.bottom;

    const allDataPoints = [...currentMonthData, ...previousMonthData].filter(d => d !== null);
    const maxY = Math.max(...allDataPoints, 0) * 1.1; // Add 10% padding to max Y

    const xScale = (index: number) => padding.left + (index / (labels.length - 1)) * width;
    const yScale = (value: number) => padding.top + height - (value / maxY) * height;
    
    const createPath = (dataset: (number | null)[]) => {
        let path = '';
        let firstPoint = true;
        dataset.forEach((d, i) => {
            if (d !== null) {
                const x = xScale(i);
                const y = yScale(d);
                if (firstPoint) {
                    path += `M ${x} ${y}`;
                    firstPoint = false;
                } else {
                    path += ` L ${x} ${y}`;
                }
            }
        });
        return path;
    };
    
    return { padding, svgWidth, svgHeight, width, height, maxY, xScale, yScale, createPath };
  }, [labels, currentMonthData, previousMonthData, svgRef.current?.clientWidth]);

  const { padding, width, height, maxY, xScale, yScale, createPath } = chartParams;

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const x = event.clientX - svgRect.left;
    
    const index = Math.round(((x - padding.left) / width) * (labels.length - 1));
    if (index >= 0 && index < labels.length) {
      const day = labels[index];
      const current = currentMonthData[index];
      const prev = previousMonthData[index];
      setTooltip({
        x: xScale(index),
        y: Math.min(yScale(current ?? prev ?? 0), yScale(prev ?? current ?? 0)),
        day,
        current,
        prev,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };
  
  const yAxisLabels = useMemo(() => {
    if (maxY === 0) return [{ value: 0, y: yScale(0) }];
    const ticks = 5;
    return Array.from({ length: ticks + 1 }).map((_, i) => {
        const value = (maxY / ticks) * i;
        return { value, y: yScale(value) };
    });
  }, [maxY, yScale]);

  return (
      <div className="w-full h-full relative">
        <svg ref={svgRef} width="100%" height="100%" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
          {/* Y-Axis Grid Lines and Labels */}
          {yAxisLabels.map(({ value, y }) => (
            <g key={value} className="text-gray-500">
              <line x1={padding.left} x2={padding.left + width} y1={y} y2={y} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10">
                {`₹${Math.round(value / 1000)}k`}
              </text>
            </g>
          ))}

          {/* X-Axis Labels */}
          {labels.map((label, i) => (
            i % (Math.floor(labels.length / 10) || 1) === 0 && (
                <text key={i} x={xScale(i)} y={height + padding.top + 15} textAnchor="middle" fontSize="10" className="fill-current text-gray-500">
                    {label}
                </text>
            )
          ))}

          {/* Data Lines */}
          <path d={createPath(previousMonthData)} fill="none" stroke="#64748b" strokeWidth="2" strokeDasharray="4 4" />
          <path d={createPath(currentMonthData)} fill="none" stroke="#ec4899" strokeWidth="2.5" />

          {/* Tooltip Elements */}
          {tooltip && (
            <>
              <line x1={tooltip.x} y1={padding.top} x2={tooltip.x} y2={height + padding.top} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />
              {tooltip.prev !== null && <circle cx={tooltip.x} cy={yScale(tooltip.prev)} r="4" fill="#64748b" />}
              {tooltip.current !== null && <circle cx={tooltip.x} cy={yScale(tooltip.current)} r="4" fill="#ec4899" />}
            </>
          )}
        </svg>

        {/* Tooltip Box */}
        {tooltip && (
          <div
            className="absolute bg-slate-800 text-white p-2 rounded-lg text-xs shadow-lg pointer-events-none transition-transform duration-100 border border-slate-700"
            style={{ 
                left: `${tooltip.x + 10}px`, 
                top: `${tooltip.y}px`,
                transform: `translateY(-50%) ${tooltip.x > width / 1.5 ? 'translateX(-115%)' : ''}`,
            }}
          >
            <div className="font-bold mb-1">Day {tooltip.day}</div>
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-pink-500 mr-2"></span>
              This Month: <span className="font-semibold ml-1">{formatCurrencyForChart(tooltip.current)}</span>
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-slate-500 mr-2"></span>
              Last Month: <span className="font-semibold ml-1">{formatCurrencyForChart(tooltip.prev)}</span>
            </div>
          </div>
        )}
        
        {/* Legend */}
        <div className="absolute top-0 -mt-5 left-12 flex gap-4 text-xs p-2">
            <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-pink-500 rounded-full"></div>
                <span className="text-gray-400">This Month</span>
            </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 border-t-2 border-dashed border-slate-500"></div>
                <span className="text-gray-400">Last Month</span>
            </div>
        </div>

      </div>
  );
};

export default TrendChart;