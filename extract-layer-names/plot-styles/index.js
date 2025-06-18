import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import zlib from 'zlib';

export function aciToHex(aci) {
  aci = aci === -1 ? 257 : aci;
  const table = {
    0: '#000000', 1: '#CC0000', 2: '#CCCC00', 3: '#00CC00',
    4: '#00CCCC', 5: '#0000CC', 6: '#CC00CC', 7: '#CCCCCC',
    8: '#000000', 9: '#C0C0C0', 256: '#CCCCCC', 257: '#000000'
  };
  if (table.hasOwnProperty(aci)) return table[aci];
  const idx = Math.max(10, Math.min(255, aci));
  const hue = ((idx - 10) / (255 - 10)) * 360;
  const [r, g, b] = hslToRgb(hue / 360, 1, 0.5);
  return rgbToHex(r, g, b);
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r, g, b) {
  return [r, g, b]
    .map(v => v.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function parseCtbBuffer(buffer) {
  // Validate and decompress
  const header = buffer.toString('ascii', 0, 32);
  if (!header.includes('PIAFILEVERSION')) throw new Error('Not a valid PIA-style CTB file');
  const zsig = Buffer.from([0x78, 0xDA]);
  const zStart = buffer.indexOf(zsig);
  if (zStart < 0) throw new Error('No zlib stream found');

  const raw = zlib.inflateSync(buffer.slice(zStart));
  const lines = raw.toString('utf8').split(/\r?\n/);

  const globals = {};
  const tables = {};
  let currentTable = null;

  // Generic table and globals parsing
  lines.forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) return;

    const tblMatch = line.match(/^([a-zA-Z0-9_]+)\{$/);
    if (tblMatch) {
      currentTable = tblMatch[1];
      tables[currentTable] = {};
      return;
    }
    if (line === '}') {
      currentTable = null;
      return;
    }

    const pair = line.match(/^([^=]+)=(.+)$/);
    if (!pair) return;
    let [, key, val] = pair;
    key = key.trim();
    val = val.trim().replace(/^"|"$/g, '');

    if (currentTable) {
      tables[currentTable][key] = val;
    } else {
      globals[key] = val;
    }
  });

  // Resolve lineweight table alias
  const lwTable = tables['lineweight_table'] || tables['custom_lineweight_table'];

  const styleList = [];
  const aciNames = tables['aci_table'] || {};

  Object.entries(aciNames).forEach(([idx, rawName]) => {
    const aci = Number(idx);
    const name = rawName.trim();
    const props = tables[idx] || {};

    // Determine lineweight in mm via table or custom override
    let lineweight_mm = null;
    if (props.custom_lineweight_table && /^-?\d*\.?\d+$/.test(props.custom_lineweight_table)) {
      lineweight_mm = parseFloat(props.custom_lineweight_table);
    } else if (props.lineweight && lwTable) {
      const lwIndex = parseInt(props.lineweight, 10);
      const lwVal = lwTable[lwIndex];
      if (lwVal != null && !isNaN(Number(lwVal))) {
        lineweight_mm = parseFloat(lwVal);
      }
    }

    // Parse screening percentage
    let screeningPercent = null;
    const screening = props.screening_table || props.screening || props.plot_screening || props.screen;
    if (screening) {
      const m = screening.match(/(\d+)%?/);
      screeningPercent = m ? Number(m[1]) : null;
    }

    const colorHex = aciToHex(aci);
    const colorRgb = [
      parseInt(colorHex.slice(1, 3), 16),
      parseInt(colorHex.slice(3, 5), 16),
      parseInt(colorHex.slice(5, 7), 16)
    ];

    const style = {
      aci,
      name,
      ...(lineweight_mm != null && { lineweight_mm }),
      color_hex: colorHex,
      color_rgb: colorRgb,
      ...(screeningPercent != null && { screening_percent: screeningPercent })
    };

    // Include any other props except parsed ones
    Object.entries(props).forEach(([key, val]) => {
      if (![
        'custom_lineweight_table','lineweight',
        'plot_lineweight','weight',
        'screening_table','screening',
        'plot_screening','screen'
      ].includes(key)) {
        style[key] = val;
      }
    });

    styleList.push(style);
  });

  return { globals, styles: styleList };
}

// Main execution
(function main() {
  const dataDir = 'data';
  const outDir = 'output';
  if (!existsSync(outDir)) mkdirSync(outDir);

  const ctbFiles = readdirSync(dataDir)
    .filter(f => extname(f).toLowerCase() === '.ctb');

  ctbFiles.forEach(file => {
    try {
      const buffer = readFileSync(join(dataDir, file));
      const { globals, styles } = parseCtbBuffer(buffer);
      const out = { file, globals, styleCount: styles.length, styles };
      const outPath = join(outDir, `${basename(file, '.ctb')}.json`);
      writeFileSync(outPath, JSON.stringify(out, null, 2));
      console.log(`Parsed ${file} → ${outPath}`);
    } catch (err) {
      console.warn(`⚠️ Skipping ${file}: ${err.message}`);
    }
  });
})();
