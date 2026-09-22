import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { slugify } from '../posts/post.model';
import {
  LiveProject,
  LiveProjectInput,
  PreviewMeta,
  extractPreview,
  sanitiseInput,
} from './live-project.model';

const FETCH_TIMEOUT_MS = 8_000;
const MAX_BODY_BYTES = 300_000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; TeamSoberPreviewBot/1.0; +https://team-sober.com)';

const BLOCKED_HOSTNAME =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1$|\[::1\])/i;
const PRIVATE_172_RANGE = /^172\.(1[6-9]|2\d|3[0-1])\./;

export interface PreviewResult extends Partial<PreviewMeta> {
  error?: string;
}

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return BLOCKED_HOSTNAME.test(host) || PRIVATE_172_RANGE.test(host);
}

@Injectable()
export class LiveProjectsService {
  private readonly logger = new Logger(LiveProjectsService.name);
  private projects: LiveProject[] = [];
  private loaded = false;

  private get dataDir(): string {
    return process.env.DATA_DIR ?? join(process.cwd(), 'data');
  }

  private get file(): string {
    return join(this.dataDir, 'live-projects.json');
  }

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (!existsSync(this.dataDir))
        mkdirSync(this.dataDir, { recursive: true });

      if (existsSync(this.file)) {
        this.projects = JSON.parse(
          readFileSync(this.file, 'utf8'),
        ) as LiveProject[];
        this.logger.log(`Loaded ${this.projects.length} live project(s)`);
      } else {
        this.projects = [];
      }
      this.loaded = true;
    } catch (err) {
      this.logger.error(`Could not load live projects: ${String(err)}`);
      this.projects = [];
    }
  }

  private persist(): void {
    try {
      if (!existsSync(this.dataDir))
        mkdirSync(this.dataDir, { recursive: true });

      const tmp = `${this.file}.tmp`;
      writeFileSync(tmp, JSON.stringify(this.projects, null, 2), 'utf8');
      renameSync(tmp, this.file);
    } catch (err) {
      this.logger.error(`Could not save live projects: ${String(err)}`);
    }
  }

  private uniqueSlug(title: string, ignoreId?: string): string {
    const base = slugify(title);
    let slug = base;
    let n = 2;

    while (this.projects.some((p) => p.slug === slug && p.id !== ignoreId)) {
      slug = `${base}-${n++}`;
    }

    return slug;
  }

  findAll(): LiveProject[] {
    return [...this.projects].sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }

  findBySlug(slug: string): LiveProject {
    const project = this.projects.find((p) => p.slug === slug);
    if (!project) throw new NotFoundException(`No live project "${slug}"`);
    return project;
  }

  findById(id: string): LiveProject {
    const project = this.projects.find((p) => p.id === id);
    if (!project)
      throw new NotFoundException(`No live project with id "${id}"`);
    return project;
  }

  private async withAutoPreview(
    fields: Omit<LiveProject, 'id' | 'slug' | 'createdAt' | 'updatedAt'>,
  ): Promise<Omit<LiveProject, 'id' | 'slug' | 'createdAt' | 'updatedAt'>> {
    if (fields.previewImage || !fields.url) return fields;

    const preview = await this.fetchPreview(fields.url);
    if (!preview.image) return fields;

    return {
      ...fields,
      previewImage: preview.image,
      favicon: fields.favicon || preview.favicon || '',
    };
  }

  async create(input: LiveProjectInput): Promise<LiveProject> {
    const now = new Date().toISOString();
    const fields = await this.withAutoPreview(sanitiseInput(input));

    const project: LiveProject = {
      id: randomUUID(),
      slug: this.uniqueSlug(fields.title),
      ...fields,
      createdAt: now,
      updatedAt: now,
    };

    this.projects.push(project);
    this.persist();
    return project;
  }

  async update(id: string, input: LiveProjectInput): Promise<LiveProject> {
    const existing = this.findById(id);
    const fields = await this.withAutoPreview(sanitiseInput(input));

    if (fields.title !== existing.title) {
      existing.slug = this.uniqueSlug(fields.title, existing.id);
    }

    Object.assign(existing, fields, { updatedAt: new Date().toISOString() });
    this.persist();
    return existing;
  }

  remove(id: string): void {
    const index = this.projects.findIndex((p) => p.id === id);
    if (index === -1)
      throw new NotFoundException(`No live project with id "${id}"`);

    this.projects.splice(index, 1);
    this.persist();
  }

  async fetchPreview(rawUrl: string): Promise<PreviewResult> {
    let target: URL;

    try {
      target = new URL(rawUrl);
    } catch {
      return { error: 'That is not a valid URL.' };
    }

    if (!/^https?:$/.test(target.protocol)) {
      return { error: 'Only http and https URLs are supported.' };
    }

    if (isBlockedHost(target.hostname)) {
      return { error: 'That host cannot be previewed.' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(target.toString(), {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!res.ok) {
        return { error: `Site returned ${res.status}.` };
      }

      const html = await this.readCapped(res, MAX_BODY_BYTES);
      const meta = extractPreview(html, target.toString());

      return meta;
    } catch (err) {
      const timedOut = (err as { name?: string })?.name === 'AbortError';
      return {
        error: timedOut
          ? 'Timed out reaching that site.'
          : `Could not reach that site: ${String(err)}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readCapped(res: Response, maxBytes: number): Promise<string> {
    const reader = res.body?.getReader();
    if (!reader) return res.text();

    const chunks: Uint8Array[] = [];
    let received = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      received += value.byteLength;

      if (received >= maxBytes) {
        await reader.cancel();
        break;
      }
    }

    return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
  }

  get ready(): boolean {
    return this.loaded;
  }
}
