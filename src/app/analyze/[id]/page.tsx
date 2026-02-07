'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { AnalysisResult, AnalysisProgress } from '@/types/analysis';
import ProgressIndicator from '@/components/ProgressIndicator';
import AnalysisResults from '@/components/AnalysisResults';

export default function AnalyzePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/analyze/${id}/status`);
      if (!res.ok) throw new Error('Failed to fetch status');
      const data: AnalysisProgress = await res.json();
      setProgress(data);

      if (data.status === 'complete' || data.status === 'error') {
        // Fetch full results
        const fullRes = await fetch(`/api/analyze/${id}`);
        if (!fullRes.ok) throw new Error('Failed to fetch results');
        const fullData: AnalysisResult = await fullRes.json();
        setAnalysis(fullData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }, [id]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      if (!analysis || analysis.status === 'processing') {
        fetchStatus();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchStatus, analysis]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            onClick={() => router.push('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading analysis...
        </div>
      </div>
    );
  }

  // Show progress if still processing
  if (progress.status === 'processing' || !analysis) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-3xl mx-auto pt-16">
          <ProgressIndicator
            mode={analysis?.mode || 'quick'}
            progress={progress}
            companyName={analysis?.companyName || 'SEC Filing'}
          />
        </div>
      </div>
    );
  }

  // Show error state
  if (analysis.status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Analysis Failed</h2>
          <p className="text-slate-600 mb-4">{analysis.currentStep}</p>
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

  // Show results
  return (
    <div className="min-h-screen bg-white">
      {/* Back nav */}
      <div className="border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <button
            className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
            onClick={() => router.push('/')}
          >
            &larr; New Analysis
          </button>
        </div>
      </div>
      <AnalysisResults analysis={analysis} />
    </div>
  );
}
