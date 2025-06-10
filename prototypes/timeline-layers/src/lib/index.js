export function aciToHex(aci) {

  aci = aci == -1 ? 257 : aci

  const table = {
    0: "#000000", // BYBLOCK or default black
    1: "#CC0000", //  Red
    2: "#CCCC00", //  Yellow
    3: "#00CC00", //  Green
    4: "#00CCCC", //  Cyan
    5: "#0000CC", //  Blue
    6: "#CC00CC", //  Magenta
    7: "#ccc",    // White
    8: "#000000", // Dark Gray
    9: "#C0C0C0", // Light Gray
    256: "#ccc",  // BYLAYER

    257 : "#000000", // Fallback for -1  as it often is the case with DXF files
  };

  if (table.hasOwnProperty(aci)) {
    return table[aci];
  }

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
  const to2 = (v) => v.toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}
