import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { dirSize } from './dir-size';

describe('dirSize', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dirsize-test-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports zero for an empty directory', () => {
    expect(dirSize(dir)).toEqual({ bytes: 0, files: 0 });
  });

  it('sums file sizes at the top level', () => {
    writeFileSync(join(dir, 'a.txt'), 'hello');
    writeFileSync(join(dir, 'b.txt'), 'hi');

    expect(dirSize(dir)).toEqual({ bytes: 7, files: 2 });
  });

  it('walks nested directories', () => {
    mkdirSync(join(dir, 'uploads'));
    writeFileSync(join(dir, 'posts.json'), '1234');
    writeFileSync(join(dir, 'uploads', 'photo.jpg'), '12345678');

    expect(dirSize(dir)).toEqual({ bytes: 12, files: 2 });
  });

  it('returns zero rather than throwing for a directory that does not exist', () => {
    expect(dirSize(join(dir, 'nope'))).toEqual({ bytes: 0, files: 0 });
  });
});
