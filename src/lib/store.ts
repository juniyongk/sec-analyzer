import { AnalysisResult } from '@/types/analysis';

// Simple in-memory store for MVP. Replace with Prisma/SQLite later.
const analyses = new Map<string, AnalysisResult>();

export function getAnalysis(id: string): AnalysisResult | undefined {
  return analyses.get(id);
}

export function setAnalysis(id: string, analysis: AnalysisResult): void {
  analyses.set(id, analysis);
}

export function updateAnalysis(id: string, updates: Partial<AnalysisResult>): AnalysisResult | undefined {
  const existing = analyses.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...updates };
  analyses.set(id, updated);
  return updated;
}

export function listAnalyses(): AnalysisResult[] {
  return Array.from(analyses.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
