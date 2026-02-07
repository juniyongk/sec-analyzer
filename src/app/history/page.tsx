'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AnalysisSummary {
  id: string;
  companyName: string;
  filingType: string;
  fiscalPeriod: string;
  mode: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  totalCost: number;
  edgarUrl: string;
}

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(data => { setAnalyses(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Analysis History</h1>
            <p className="text-slate-500 mt-1">Your past SEC filing analyses</p>
          </div>
          <Link
            href="/"
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            New Analysis
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">No analyses yet</h3>
            <p className="text-slate-500 mb-6">Run your first analysis to see it here.</p>
            <Link
              href="/"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Analyzing
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map(a => (
              <Link
                key={a.id}
                href={`/analyze/${a.id}`}
                className="block border border-slate-200 rounded-xl p-5 bg-white hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg">{a.companyName}</h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {a.filingType} &middot; {a.fiscalPeriod} &middot;{' '}
                      <span className="capitalize">{a.mode}</span> analysis
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      ${a.totalCost.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(a.createdAt).toLocaleDateString()} {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
