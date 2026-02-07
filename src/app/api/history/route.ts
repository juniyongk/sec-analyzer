import { NextResponse } from 'next/server';
import { listSavedAnalyses } from '@/lib/persistence';

export async function GET() {
  try {
    const analyses = await listSavedAnalyses();
    // Return summary data only (not full results) for the list view
    const summaries = analyses.map(a => ({
      id: a.id,
      companyName: a.companyName,
      filingType: a.filingType,
      fiscalPeriod: a.fiscalPeriod,
      mode: a.mode,
      status: a.status,
      createdAt: a.createdAt,
      completedAt: a.completedAt,
      totalCost: a.cost?.total || 0,
      edgarUrl: a.edgarUrl,
    }));
    return NextResponse.json(summaries);
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json([], { status: 200 });
  }
}
