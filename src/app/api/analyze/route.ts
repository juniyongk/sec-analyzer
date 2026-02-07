import { NextRequest, NextResponse } from 'next/server';
import { startAnalysis } from '@/lib/analysis-runner';
import { AnalysisMode } from '@/types/analysis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { edgarUrl, mode, companyName, peers } = body;

    if (!edgarUrl || typeof edgarUrl !== 'string') {
      return NextResponse.json(
        { error: 'edgarUrl is required' },
        { status: 400 }
      );
    }

    if (!['quick', 'standard', 'deep'].includes(mode)) {
      return NextResponse.json(
        { error: 'mode must be quick, standard, or deep' },
        { status: 400 }
      );
    }

    const result = startAnalysis(
      edgarUrl,
      mode as AnalysisMode,
      companyName,
      peers
    );

    return NextResponse.json({
      analysisId: result.id,
      status: 'processing',
      estimatedCost: result.estimatedCost,
      estimatedTime: result.estimatedTime,
    });
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json(
      { error: 'Failed to start analysis' },
      { status: 500 }
    );
  }
}
