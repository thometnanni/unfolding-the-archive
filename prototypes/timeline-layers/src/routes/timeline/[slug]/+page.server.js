import fs from 'fs';
import path from 'path';

export const prerender = true;

export function entries() {
  const dir = 'static/data';
  const files = fs.readdirSync(dir);
  return files
    .filter(name => name.endsWith('.json'))
    .map(name => ({ slug: name.replace(/\.json$/, '') }));
}
