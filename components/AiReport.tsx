import React, { useState, useCallback } from 'react';
import { Household } from '../types';
import { generateSpendingReport } from '../services/geminiService';
import Card from './common/Card';
import Button from './common/Button';
import SkeletonLoader from './common/SkeletonLoader';
import { SparklesIcon, DocumentDuplicateIcon } from './icons/Icons';

interface AiReportProps {
  household: Household;
}

const ReportSkeleton: React.FC = () => (
    <div className="space-y-8">
        {/* Table Skeleton */}
        <div className="space-y-3 border border-slate-700 rounded-lg p-4">
            <div className="grid grid-cols-4 gap-4 px-3 border-b border-slate-700 pb-3">
                <SkeletonLoader className="h-5 rounded w-3/4" />
                <SkeletonLoader className="h-5 rounded w-3/4" />
                <SkeletonLoader className="h-5 rounded w-3/4" />
                <SkeletonLoader className="h-5 rounded w-3/4" />
            </div>
            <div className="space-y-3 pt-2">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="grid grid-cols-4 gap-4 px-3">
                        <SkeletonLoader className="h-5 rounded" />
                        <SkeletonLoader className="h-5 rounded" />
                        <SkeletonLoader className="h-5 rounded" />
                        <SkeletonLoader className="h-5 rounded" />
                    </div>
                ))}
            </div>
        </div>

        {/* Text Section Skeletons */}
        <div className="space-y-3">
            <SkeletonLoader className="h-6 w-1/3" />
            <SkeletonLoader className="h-4 w-full" />
            <SkeletonLoader className="h-4 w-4/5" />
        </div>
        <div className="space-y-3">
            <SkeletonLoader className="h-6 w-1/4" />
            <SkeletonLoader className="h-4 w-full" />
            <SkeletonLoader className="h-4 w-3/4" />
        </div>
    </div>
);


const renderMarkdown = (markdownText: string) => {
    const lines = markdownText.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i].trim();

        if (line.startsWith('|')) {
            const tableLines = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                tableLines.push(lines[i].trim());
                i++;
            }

            if (tableLines.length > 2 && tableLines[1].includes('---')) { // Header, separator, and at least one body row
                const headerCells = tableLines[0].split('|').slice(1, -1).map(cell => cell.trim());
                const bodyRows = tableLines.slice(2);

                elements.push(
                    <div key={`table-${i}`} className="overflow-x-auto">
                        <table className="w-full text-left border-collapse my-4 responsive-table">
                            <thead>
                                <tr className="bg-slate-800/50">
                                    {headerCells.map((header, index) => (
                                        <th key={index} className="p-3 font-semibold text-sm text-gray-200 border border-slate-600">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {bodyRows.map((row, rowIndex) => {
                                    const rowCells = row.split('|').slice(1, -1).map(cell => cell.trim());
                                    const differenceCellIndex = headerCells.findIndex(h => h.toLowerCase() === 'difference');
                                    return (
                                        <tr key={rowIndex} className="hover:bg-slate-700/50">
                                            {rowCells.map((cell, cellIndex) => {
                                                const isDifferenceColumn = cellIndex === differenceCellIndex;
                                                const isNegative = isDifferenceColumn && cell.includes('-');
                                                return (
                                                  <td 
                                                      key={cellIndex} 
                                                      data-label={headerCells[cellIndex]}
                                                      className={`p-3 text-sm text-gray-300 border border-slate-600 ${isDifferenceColumn ? (isNegative ? 'text-pink-400 font-semibold' : 'text-teal-400 font-semibold') : ''}`}>
                                                      {cell}
                                                  </td>
                                                )
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                );
            }
        } else if (line.startsWith('###')) {
            elements.push(<h3 key={i} className="text-xl font-bold text-white mt-6 mb-2">{line.replace('###', '').trim()}</h3>);
            i++;
        } else if (line.startsWith('* ') || line.startsWith('- ')) {
            const listItems = [];
            while (i < lines.length && (lines[i].trim().startsWith('* ') || lines[i].trim().startsWith('- '))) {
                listItems.push(<li key={i}>{lines[i].trim().substring(2)}</li>);
                i++;
            }
            elements.push(<ul key={`list-${i}`} className="list-disc list-inside space-y-1 my-2 text-gray-300 pl-2">{listItems}</ul>);
        } else if (line) {
            elements.push(<p key={i} className="my-2 text-gray-300">{line}</p>);
            i++;
        } else {
            i++; // Skip empty lines
        }
    }

    return <div className="text-gray-300">{elements}</div>;
};


const AiReport: React.FC<AiReportProps> = ({ household }) => {
  const [report, setReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setReport(null);
    try {
      // Simulate longer generation time
      await new Promise(resolve => setTimeout(resolve, 1500));
      const result = await generateSpendingReport(household);
      setReport(result);
    } catch (err) {
      setError('Failed to generate AI report. Please check your connection and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [household]);

  return (
    <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold text-white mb-6">AI Financial Analyst</h2>
        <Card>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white">Your Monthly Insights</h3>
                    <p className="text-gray-400 mt-1">Get a personalized spending analysis powered by Gemini.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="secondary" onClick={() => window.print()} disabled={!report}>
                        <DocumentDuplicateIcon className="w-5 h-5" />
                        <span>Export as PDF</span>
                    </Button>
                    <Button onClick={handleGenerateReport} disabled={isLoading}>
                        <SparklesIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>{isLoading ? 'Generating...' : 'Generate Report'}</span>
                    </Button>
                </div>
            </div>
            
            <div className="mt-4 p-4 bg-slate-900/50 rounded-lg min-h-[200px]">
                {isLoading && <ReportSkeleton />}

                {error && <p className="text-red-400 text-center py-10">{error}</p>}
                
                {report && (
                    <div className="max-w-none">
                      {renderMarkdown(report)}
                    </div>
                )}

                {!isLoading && !error && !report && (
                    <div className="text-center py-10">
                        <p className="text-gray-400">Click the button to generate your financial report.</p>
                    </div>
                )}
            </div>
        </Card>
    </div>
  );
};

export default AiReport;