'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnalysisResult } from '@/types/analysis';
import AnalysisResults from '@/components/AnalysisResults';

function AnalyzeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [analysis, setAnalysis] = useState<Partial<AnalysisResult> | null>(null);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('Starting analysis...');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const startedRef = useRef(false);

  const edgarUrl = searchParams.get('url');
  const mode = searchParams.get('mode') || 'quick';
  const peers = searchParams.get('peers');

  const runAnalysis = useCallback(async () => {
    if (!edgarUrl) {
      setError('No EDGAR URL provided');
      return;
    }

    try {
      const res = await fetch('/api/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edgarUrl,
          mode,
          peers: peers ? peers.split(',') : undefined,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error('Failed to start analysis');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === 'progress') {
              setProgress(event.progress);
              setStep(event.step);
              if (event.companyName) {
                setAnalysis(prev => ({
                  ...prev,
                  companyName: event.companyName,
                  filingType: event.filingType,
                  fiscalPeriod: event.fiscalPeriod,
                }));
              }
            } else if (event.type === 'partial') {
              setAnalysis(prev => ({ ...prev, ...event.data }));
            } else if (event.type === 'complete') {
              setAnalysis(event.result);
              setProgress(100);
              setStep('Analysis complete');
              setComplete(true);
            } else if (event.type === 'error') {
              setError(event.message);
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    }
  }, [edgarUrl, mode, peers]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    runAnalysis();
  }, [runAnalysis]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Analysis Failed</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <p className="text-sm text-slate-500 mb-6">You were not charged for this analysis.</p>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            onClick={() => router.push('/')}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (complete && analysis && 'id' in analysis && analysis.status === 'complete') {
    return (
      <div className="min-h-screen bg-white">
        <div className="border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-6 py-3">
            <div className="flex gap-4">
              <button
                className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                onClick={() => router.push('/')}
              >
                &larr; New Analysis
              </button>
              <button
                className="text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
                onClick={() => router.push('/history')}
              >
                History
              </button>
            </div>
          </div>
        </div>
        <AnalysisResults analysis={analysis as AnalysisResult} />
      </div>
    );
  }

  // Progress view
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-lg w-full mx-auto px-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            {analysis?.companyName || 'Analyzing Filing...'}
          </h2>
          {analysis?.filingType && (
            <p className="text-sm text-slate-500">
              {analysis.filingType} {analysis.fiscalPeriod ? `- ${analysis.fiscalPeriod}` : ''}
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <p className="text-sm text-slate-600">{step}</p>
            <p className="text-sm text-slate-400">{progress}%</p>
          </div>
        </div>

        {/* Spinner */}
        <div className="flex justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Please keep this tab open. Analysis runs in a single connection.
        </p>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </div>
    }>
      <AnalyzeContent />
    </Suspense>
  );
}
