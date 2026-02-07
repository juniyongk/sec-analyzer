import { promises as fs } from 'fs';
import path from 'path';
import { AnalysisResult } from '@/types/analysis';

const DATA_DIR = path.join(process.cwd(), '.data', 'analyses');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function saveAnalysisToFile(analysis: AnalysisResult): Promise<void> {
  await ensureDir();
  const filePath = path.join(DATA_DIR, `${analysis.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(analysis, null, 2), 'utf-8');
}

export async function loadAnalysisFromFile(id: string): Promise<AnalysisResult | null> {
  try {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function listSavedAnalyses(): Promise<AnalysisResult[]> {
  await ensureDir();
  try {
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const analyses: AnalysisResult[] = [];
    for (const file of jsonFiles) {
      try {
        const data = await fs.readFile(path.join(DATA_DIR, file), 'utf-8');
        const analysis = JSON.parse(data) as AnalysisResult;
        analyses.push(analysis);
      } catch {
        // Skip corrupted files
      }
    }

    // Sort newest first
    analyses.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return analyses;
  } catch {
    return [];
  }
}

export async function deleteAnalysisFile(id: string): Promise<boolean> {
  try {
    const filePath = path.join(DATA_DIR, `${id}.json`);
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
