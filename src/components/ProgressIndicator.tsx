'use client';

import { AnalysisMode, AnalysisProgress } from '@/types/analysis';

interface Step {
  id: string;
  label: string;
  modes: AnalysisMode[];
}

const allSteps: Step[] = [
  { id: 'download', label: 'Downloaded and parsed document', modes: ['quick', 'standard', 'deep'] },
  { id: 'extract', label: 'Extracted financial statements', modes: ['quick', 'standard', 'deep'] },
  { id: 'thesis', label: 'Generating investment thesis', modes: ['quick', 'standard', 'deep'] },
  { id: 'financials', label: 'Analyzing financial details', modes: ['standard', 'deep'] },
  { id: 'redflags', label: 'Detecting red flags', modes: ['standard', 'deep'] },
  { id: 'peers', label: 'Comparing to peers', modes: ['standard', 'deep'] },
  { id: 'tone', label: 'Analyzing management tone', modes: ['standard', 'deep'] },
  { id: 'segments', label: 'Analyzing segments', modes: ['deep'] },
  { id: 'competitors', label: 'Researching competitors', modes: ['deep'] },
  { id: 'complete', label: 'Finalizing report', modes: ['quick', 'standard', 'deep'] },
];

interface ProgressIndicatorProps {
  mode: AnalysisMode;
  progress: AnalysisProgress;
  companyName: string;
}

export default function ProgressIndicator({ mode, progress, companyName }: ProgressIndicatorProps) {
  const steps = allSteps.filter(s => s.modes.includes(mode));

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h2 className="text-2xl font-bold mb-2 text-slate-900">
        Analyzing {companyName}...
      </h2>
      <p className="text-slate-500 mb-6">{progress.currentStep}</p>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 rounded-full h-3 mb-8">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress.progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => {
          const isCompleted = progress.completedSteps.includes(step.id);
          const isCurrent = !isCompleted && progress.progress > 0 &&
            steps.findIndex(s => !progress.completedSteps.includes(s.id)) === steps.indexOf(step);

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 text-sm ${
                isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-slate-400'
              }`}
            >
              {isCompleted ? (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : isCurrent ? (
                <svg className="w-5 h-5 flex-shrink-0 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                </span>
              )}
              <span className={isCurrent ? 'font-medium' : ''}>{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Time Estimate */}
      {progress.estimatedTimeRemaining > 0 && (
        <p className="mt-8 text-center text-slate-500 text-sm">
          Estimated time remaining: {Math.ceil(progress.estimatedTimeRemaining)} seconds
        </p>
      )}
    </div>
  );
}
