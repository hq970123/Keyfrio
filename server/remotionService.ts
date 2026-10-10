import fs from 'fs';
import path from 'path';
import type { Express } from 'express';
import { bundle } from '@remotion/bundler';
import { ensureBrowser, renderMedia, selectComposition } from '@remotion/renderer';
import {
  getRemotionTemplate,
  REMOTION_TEMPLATES,
  type RemotionTemplateMeta,
} from '../remotion/templateMeta';

// Renders are executed strictly one at a time: Remotion + headless Chrome
// is memory hungry, and parallel renders on small machines can OOM.
const OUTPUT_DIR = path.join(process.cwd(), '.remotion-output');
const ENTRY_POINT = path.join(process.cwd(), 'remotion', 'index.ts');
const JOB_TTL_MS = 2 * 60 * 60 * 1000;

interface RenderJob {
  id: string;
  templateId: string;
  status: 'queued' | 'rendering' | 'done' | 'error';
  progress: number;
  file?: string;
  error?: string;
  createdAt: number;
}

const jobs = new Map<string, RenderJob>();
const queue: Array<() => Promise<void>> = [];
let rendering = false;
let jobSeq = 0;

let bundlePromise: Promise<string> | null = null;
function getBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({ entryPoint: ENTRY_POINT }).catch((err) => {
      bundlePromise = null;
      throw err;
    });
  }
  return bundlePromise;
}

function pumpQueue(): void {
  if (rendering) return;
  const next = queue.shift();
  if (!next) return;
  rendering = true;
  next()
    .catch(() => undefined)
    .finally(() => {
      rendering = false;
      pumpQueue();
    });
}

function sanitizeProps(
  meta: RemotionTemplateMeta,
  raw: unknown
): Record<string, string | number> {
  const input =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const props: Record<string, string | number> = { ...meta.defaultProps };
  for (const field of meta.fields) {
    const value = input[field.key];
    if (value === undefined || value === null) continue;
    if (field.type === 'number') {
      const n = Number(value);
      if (Number.isFinite(n)) props[field.key] = n;
    } else {
      props[field.key] = String(value).slice(0, 300);
    }
  }
  return props;
}

async function runRender(
  job: RenderJob,
  meta: RemotionTemplateMeta,
  props: Record<string, string | number>
): Promise<void> {
  job.status = 'rendering';
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  await ensureBrowser();
  const serveUrl = await getBundle();
  const composition = await selectComposition({
    serveUrl,
    id: meta.id,
    inputProps: props,
  });
  const isAlpha = meta.format === 'webm-alpha';
  const outFile = path.join(OUTPUT_DIR, `${job.id}.${isAlpha ? 'webm' : 'mp4'}`);
  await renderMedia({
    composition,
    serveUrl,
    codec: isAlpha ? 'vp8' : 'h264',
    imageFormat: isAlpha ? 'png' : 'jpeg',
    // Alpha only survives with the yuva420p pixel format; the default
    // yuv420p silently composites the frames onto opaque black.
    ...(isAlpha ? { pixelFormat: 'yuva420p' as const } : {}),
    outputLocation: outFile,
    inputProps: props,
    concurrency: 1,
    onProgress: ({ progress }) => {
      job.progress = progress;
    },
  });
  job.file = outFile;
  job.progress = 1;
  job.status = 'done';
}

function cleanupOldJobs(): void {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) {
      if (job.file) {
        fs.promises.rm(job.file, { force: true }).catch(() => undefined);
      }
      jobs.delete(id);
    }
  }
}

export function registerRemotionRoutes(app: Express): void {
  app.get('/api/remotion/templates', (_req, res) => {
    res.json({ templates: REMOTION_TEMPLATES });
  });

  app.post('/api/remotion/render', (req, res) => {
    cleanupOldJobs();
    const { templateId, props } = (req.body ?? {}) as {
      templateId?: string;
      props?: unknown;
    };
    const meta = templateId ? getRemotionTemplate(templateId) : undefined;
    if (!meta) {
      res.status(400).json({ error: `Unknown Remotion template: ${templateId}` });
      return;
    }
    const cleanProps = sanitizeProps(meta, props);
    const job: RenderJob = {
      id: `rm-${Date.now().toString(36)}-${++jobSeq}`,
      templateId: meta.id,
      status: 'queued',
      progress: 0,
      createdAt: Date.now(),
    };
    jobs.set(job.id, job);
    queue.push(async () => {
      try {
        await runRender(job, meta, cleanProps);
      } catch (err) {
        job.status = 'error';
        job.error = err instanceof Error ? err.message : String(err);
      }
    });
    pumpQueue();
    res.status(202).json({ jobId: job.id });
  });

  app.get('/api/remotion/render/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: 'Render job not found' });
      return;
    }
    res.json({
      jobId: job.id,
      templateId: job.templateId,
      status: job.status,
      progress: job.progress,
      error: job.error,
      downloadUrl:
        job.status === 'done' ? `/api/remotion/renders/${job.id}` : undefined,
    });
  });

  app.get('/api/remotion/renders/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job || job.status !== 'done' || !job.file || !fs.existsSync(job.file)) {
      res.status(404).json({ error: 'Rendered file not found' });
      return;
    }
    res.sendFile(job.file);
  });
}
