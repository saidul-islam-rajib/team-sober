import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { NotFoundException } from '@nestjs/common';
import { LiveProjectsService } from './live-projects.service';

describe('LiveProjectsService', () => {
  let dir: string;
  let service: LiveProjectsService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'live-projects-test-'));
    process.env.DATA_DIR = dir;
    service = new LiveProjectsService();
  });

  afterEach(() => {
    delete process.env.DATA_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  it('starts empty, with no hardcoded seed content', () => {
    expect(service.findAll()).toEqual([]);
  });

  it('creates a project with a slug and timestamps', async () => {
    const project = await service.create({
      title: 'My Site',
      url: 'https://example.com',
      description: 'A short blurb.',
      images: '/uploads/one.png',
    });

    expect(project.slug).toBe('my-site');
    expect(project.title).toBe('My Site');
    expect(project.images).toEqual(['/uploads/one.png']);
    expect(project.createdAt).toBe(project.updatedAt);
    expect(service.findAll()).toHaveLength(1);
  });

  it('persists across service instances', async () => {
    await service.create({ title: 'Persisted' });
    const reloaded = new LiveProjectsService();
    expect(reloaded.findAll()).toHaveLength(1);
    expect(reloaded.findAll()[0].title).toBe('Persisted');
  });

  it('gives duplicate titles unique slugs', async () => {
    const a = await service.create({ title: 'Same Name' });
    const b = await service.create({ title: 'Same Name' });
    expect(a.slug).toBe('same-name');
    expect(b.slug).toBe('same-name-2');
  });

  it('finds by slug and by id', async () => {
    const created = await service.create({ title: 'Findable' });
    expect(service.findBySlug('findable').id).toBe(created.id);
    expect(service.findById(created.id).slug).toBe('findable');
  });

  it('throws NotFoundException for a missing slug or id', () => {
    expect(() => service.findBySlug('nope')).toThrow(NotFoundException);
    expect(() => service.findById('nope')).toThrow(NotFoundException);
  });

  it('updates fields and regenerates the slug when the title changes', async () => {
    const created = await service.create({ title: 'Old Title' });

    // Advance the clock so updatedAt is guaranteed to differ from createdAt —
    // both use Date.now(), which can otherwise land in the same millisecond
    // on a fast machine and make this assertion flaky.
    jest.useFakeTimers({ doNotFake: ['nextTick'] });
    jest.setSystemTime(new Date(Date.now() + 1000));

    try {
      const updated = await service.update(created.id, {
        title: 'New Title',
        description: 'Updated blurb.',
      });

      expect(updated.slug).toBe('new-title');
      expect(updated.description).toBe('Updated blurb.');
      expect(updated.updatedAt).not.toBe(created.createdAt);
    } finally {
      jest.useRealTimers();
    }
  });

  it('removes a project', async () => {
    const created = await service.create({ title: 'Removable' });
    service.remove(created.id);
    expect(service.findAll()).toHaveLength(0);
  });

  it('throws NotFoundException when removing a missing id', () => {
    expect(() => service.remove('nope')).toThrow(NotFoundException);
  });

  it('sorts featured projects first, then most recently updated', async () => {
    const a = await service.create({ title: 'A' });
    await service.create({ title: 'B' });
    await service.update(a.id, { title: 'A', featured: 'on' });

    const all = service.findAll();
    expect(all[0].title).toBe('A');
  });

  describe('fetchPreview', () => {
    it('rejects an invalid URL without making a request', async () => {
      const result = await service.fetchPreview('not-a-url');
      expect(result.error).toBeDefined();
    });

    it('rejects a non-http(s) scheme', async () => {
      const result = await service.fetchPreview('ftp://example.com/file');
      expect(result.error).toBeDefined();
    });

    it('blocks loopback and private hosts', async () => {
      expect(
        (await service.fetchPreview('http://localhost:3000')).error,
      ).toBeDefined();
      expect(
        (await service.fetchPreview('http://127.0.0.1')).error,
      ).toBeDefined();
      expect(
        (await service.fetchPreview('http://192.168.1.5')).error,
      ).toBeDefined();
      expect(
        (await service.fetchPreview('http://169.254.169.254')).error,
      ).toBeDefined();
    });
  });

  it('does not auto-fetch a preview when one is already supplied', async () => {
    const project = await service.create({
      title: 'Has preview',
      url: 'http://localhost:9', // would be blocked if fetched
      previewImage: '/uploads/manual.png',
    });

    expect(project.previewImage).toBe('/uploads/manual.png');
  });

  it('does not auto-fetch a preview when there is no URL', async () => {
    const project = await service.create({ title: 'No URL' });
    expect(project.previewImage).toBe('');
  });
});
