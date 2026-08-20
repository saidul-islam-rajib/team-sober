import { readdirSync, statSync, Stats } from 'fs';
import { join } from 'path';

export interface DirStats {
  bytes: number;
  files: number;
}

export function dirSize(path: string): DirStats {
  let entries: string[];

  try {
    entries = readdirSync(path);
  } catch {
    return { bytes: 0, files: 0 };
  }

  let bytes = 0;
  let files = 0;

  for (const entry of entries) {
    const full = join(path, entry);
    let stat: Stats;

    try {
      stat = statSync(full);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      const nested = dirSize(full);
      bytes += nested.bytes;
      files += nested.files;
    } else if (stat.isFile()) {
      bytes += stat.size;
      files += 1;
    }
  }

  return { bytes, files };
}
