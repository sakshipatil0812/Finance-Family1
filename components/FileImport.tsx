import React, { useState, useCallback } from 'react';
import { Household, Expense, ParsedTransaction } from '../types';
import { parseBankStatement, categorizeTransactions } from '../services/geminiService';
import Card from './common/Card';
import { ArrowUpTrayIcon } from './icons/Icons';
import Button from './common/Button';
import ImportReview from './ImportReview';

interface FileImportProps {
  household: Household;
  onAddExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
}

const fileReader = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    });
};

const FileImport: React.FC<FileImportProps> = ({ household, onAddExpense }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [categorizedTransactions, setCategorizedTransactions] = useState<Omit<ParsedTransaction, 'memberId'>[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setCategorizedTransactions(null);
    setFileName(file.name);

    try {
      setLoadingStep("Parsing file...");
      const fileContent = await fileReader(file);
      const parsed = await parseBankStatement(fileContent, file.type);
      
      if(parsed.length === 0) {
        setError("AI could not find any transactions in this file. Please try a different file or format.");
        setIsLoading(false);
        return;
      }
      
      setLoadingStep("Categorizing transactions...");
      const categorized = await categorizeTransactions(parsed, household);
      setCategorizedTransactions(categorized);

    } catch (err) {
      console.error("File processing failed:", err);
      setError("Failed to analyze the file. The format might be unsupported or the file could be corrupted. Please try again.");
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  }, [household]);

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(isEntering);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleReset = () => {
    setCategorizedTransactions(null);
    setError(null);
    setFileName(null);
  }

  if (categorizedTransactions) {
    return <ImportReview 
              transactions={categorizedTransactions}
              fileName={fileName!}
              onAddExpense={onAddExpense}
              household={household}
              onReset={handleReset}
           />
  }

  return (
    <div className="animate-fade-in-up">
      <Card>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Import Statement</h2>
        </div>

        <div 
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors duration-300 ${isDragging ? 'border-indigo-500 bg-slate-700/50' : 'border-slate-600'}`}
          onDragEnter={(e) => handleDragEvents(e, true)}
          onDragOver={(e) => handleDragEvents(e, true)}
          onDragLeave={(e) => handleDragEvents(e, false)}
          onDrop={handleDrop}
        >
          {isLoading ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto"></div>
              <p className="text-lg font-semibold text-white">Analyzing "{fileName}"...</p>
              <p className="text-gray-400">{loadingStep}</p>
            </div>
          ) : (
            <>
              <ArrowUpTrayIcon className="w-12 h-12 mx-auto text-slate-500 mb-4" />
              <h3 className="text-xl font-semibold text-white">Drag & drop your file here</h3>
              <p className="text-gray-400 my-2">or</p>
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept=".csv, .pdf, image/png, image/jpeg, image/webp"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <Button type="button" variant="secondary" onClick={() => document.getElementById('file-upload')?.click()}>
                Browse File
              </Button>
              <p className="text-xs text-gray-500 mt-4">Supported formats: PDF, CSV, PNG, JPG, WEBP</p>
            </>
          )}
        </div>
        {error && <p className="text-red-400 text-center mt-4">{error}</p>}
      </Card>
    </div>
  );
};

export default FileImport;