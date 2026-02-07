'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnalysisMode } from '@/types/analysis';

const modes: { id: AnalysisMode; title: string; cost: string; description: string; time: string }[] = [
  {
    id: 'quick',
    title: 'Quick Scan',
    cost: '$0.25-0.35',
    description: 'Bull/bear thesis + red flags',
    time: '~2-3 min',
  },
  {
    id: 'standard',
    title: 'Standard Analysis',
    cost: '$0.60-0.80',
    description: 'Full analysis + comparables',
    time: '~4-5 min',
  },
  {
    id: 'deep',
    title: 'Deep Dive',
    cost: '$1.20-1.50',
    description: 'Investment memo quality',
    time: '~6-8 min',
  },
];

export default function Home() {
  const router = useRouter();
  const [edgarUrl, setEdgarUrl] = useState('');
  const [mode, setMode] = useState<AnalysisMode>('quick');
  const [peerInput, setPeerInput] = useState('');
  const [peers, setPeers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addPeer = () => {
    const tickers = peerInput.split(/[,\s]+/).filter(t => t.length > 0).map(t => t.toUpperCase());
    setPeers(prev => [...new Set([...prev, ...tickers])]);
    setPeerInput('');
  };

  const removePeer = (ticker: string) => {
    setPeers(prev => prev.filter(p => p !== ticker));
  };

  const handleAnalyze = async () => {
    if (!edgarUrl.trim()) {
      setError('Please enter an EDGAR URL');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edgarUrl: edgarUrl.trim(),
          mode,
          peers: peers.length > 0 ? peers : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start analysis');
      }

      const data = await response.json();
      router.push(`/analyze/${data.analysisId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  const estimatedCost = modes.find(m => m.id === mode)?.cost || '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            SEC Filing Analyzer
          </h1>
          <p className="text-lg text-slate-600">
            AI-powered investment thesis from any SEC filing
          </p>
          <Link
            href="/history"
            className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View Past Analyses
          </Link>
        </div>

        {/* EDGAR URL Input */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            EDGAR Filing URL
          </label>
          <input
            type="text"
            placeholder="Paste EDGAR link (e.g., https://www.sec.gov/Archives/edgar/data/...)"
            className="w-full text-base p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
            value={edgarUrl}
            onChange={(e) => setEdgarUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          />
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Analysis Mode Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Analysis Depth
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {modes.map((m) => (
              <button
                key={m.id}
                className={`p-6 border-2 rounded-xl text-left transition-all cursor-pointer ${
                  mode === m.id
                    ? 'border-blue-500 bg-blue-50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
                onClick={() => setMode(m.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-slate-900">{m.title}</h3>
                  {mode === m.id && (
                    <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </div>
                <p className="text-blue-600 font-semibold mb-1">{m.cost}</p>
                <p className="text-sm text-slate-600 mb-1">{m.description}</p>
                <p className="text-xs text-slate-400">{m.time}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Optional Peer Tickers */}
        {mode !== 'quick' && (
          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Peer Companies (optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ticker symbols (e.g., AAPL, MSFT)"
                className="flex-1 p-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none bg-white"
                value={peerInput}
                onChange={(e) => setPeerInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addPeer(); }
                }}
              />
              <button
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors cursor-pointer"
                onClick={addPeer}
              >
                Add
              </button>
            </div>
            {peers.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {peers.map(peer => (
                  <span key={peer} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-1">
                    {peer}
                    <button onClick={() => removePeer(peer)} className="ml-1 hover:text-blue-900 cursor-pointer">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analyze Button */}
        <button
          className="w-full py-4 bg-blue-600 text-white rounded-xl text-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 cursor-pointer"
          onClick={handleAnalyze}
          disabled={!edgarUrl.trim() || loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Starting Analysis...
            </span>
          ) : (
            'Analyze Filing'
          )}
        </button>

        {/* Estimated Cost */}
        <p className="mt-4 text-center text-sm text-slate-500">
          Estimated cost: {estimatedCost}
        </p>

        {/* Features Summary */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Investment Thesis First</h3>
            <p className="text-sm text-slate-600">Bull/bear cases with data-driven analysis and confidence levels</p>
          </div>
          <div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Red Flag Detection</h3>
            <p className="text-sm text-slate-600">Severity-coded alerts for accounting issues, risks, and concerns</p>
          </div>
          <div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Transparent Pricing</h3>
            <p className="text-sm text-slate-600">See exact API costs per analysis with detailed breakdowns</p>
          </div>
        </div>
      </div>
    </div>
  );
}
