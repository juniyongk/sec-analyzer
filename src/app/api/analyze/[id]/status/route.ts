import { NextRequest, NextResponse } from 'next/server';
import { getAnalysis } from '@/lib/store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const analysis = getAnalysis(id);

  if (!analysis) {
    return NextResponse.json(
      { error: 'Analysis not found' },
      { status: 404 }
    );
  }

  // Derive completed steps from progress
  const completedSteps: string[] = [];
  if (analysis.progress >= 15) completedSteps.push('download');
  if (analysis.progress >= 20) completedSteps.push('extract');
  if (analysis.progress >= 45) completedSteps.push('thesis');
  if (analysis.progress >= 65) completedSteps.push('financials');
  if (analysis.progress >= 75) completedSteps.push('redflags');
  if (analysis.progress >= 85) completedSteps.push('peers');
  if (analysis.progress >= 90) completedSteps.push('tone');
  if (analysis.progress >= 100) completedSteps.push('complete');

  return NextResponse.json({
    status: analysis.status,
    progress: analysis.progress,
    currentStep: analysis.currentStep,
    completedSteps,
    cost: analysis.cost?.total || 0,
    estimatedTimeRemaining: analysis.status === 'complete' ? 0 : Math.max(0, (100 - analysis.progress) * 0.5),
  });
}
