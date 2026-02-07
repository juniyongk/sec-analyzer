import { NextRequest, NextResponse } from 'next/server';
import { getAnalysis } from '@/lib/store';
import { loadAnalysisFromFile } from '@/lib/persistence';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check in-memory store first (for in-progress analyses)
  let analysis = getAnalysis(id);

  // If not in memory, check persisted files (for historical analyses)
  if (!analysis) {
    analysis = await loadAnalysisFromFile(id) || undefined;
  }

  if (!analysis) {
    return NextResponse.json(
      { error: 'Analysis not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(analysis);
}
