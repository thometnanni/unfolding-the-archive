export function isClosedPolyline(verts, eps = 1e-6) {
  if (!verts?.length) return false
  const [x0, y0] = verts[0]
  const [xN, yN] = verts[verts.length - 1]
  return Math.abs(x0 - xN) < eps && Math.abs(y0 - yN) < eps
}

export function resamplePolyline(points, N = 128, { closed = true } = {}) {
  if (!points || points.length < 2) return Array.from({ length: N }, () => points?.[0] ?? [0, 0])
  const pts = closed
    ? (isClosedPolyline(points) ? points.slice() : [...points, points[0]])
    : points.slice()
  const segLen = []
  let total = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0]
    const dy = pts[i + 1][1] - pts[i][1]
    const d = Math.hypot(dx, dy)
    segLen.push(d)
    total += d
  }
  if (total === 0) return Array.from({ length: N }, () => pts[0])
  const out = []
  let acc = 0, j = 0
  for (let s = 0; s < N; s++) {
    const t = (s / N) * total
    while (j < segLen.length && acc + segLen[j] < t) { acc += segLen[j]; j++ }
    if (j >= segLen.length) { out.push(pts[pts.length - 1]); continue }
    const [x1, y1] = pts[j]
    const [x2, y2] = pts[j + 1]
    const u = (t - acc) / (segLen[j] || 1)
    out.push([x1 + u * (x2 - x1), y1 + u * (y2 - y1)])
  }
  return out
}

function dftComplex(z) {
  const N = z.length
  const TWO_PI = 2 * Math.PI
  const Z = Array(N)
  for (let n = 0; n < N; n++) {
    let re = 0, im = 0
    for (let k = 0; k < N; k++) {
      const ang = (TWO_PI * n * k) / N
      const c = Math.cos(ang), s = -Math.sin(ang)
      const zr = z[k].re, zi = z[k].im
      re += zr * c - zi * s
      im += zr * s + zi * c
    }
    Z[n] = { re, im }
  }
  return Z
}

function center(points) {
  let mx = 0, my = 0
  for (const [x, y] of points) { mx += x; my += y }
  mx /= points.length; my /= points.length
  return points.map(([x, y]) => ({ re: x - mx, im: y - my }))
}

const mag = (c) => Math.hypot(c.re, c.im)

export function fourierDescriptors(vertices, {
  N = 128,
  K = 24,
  closed = true,
  rotationInvariant = true,
  scaleInvariant = true
} = {}) {
  const samples = resamplePolyline(vertices, N, { closed })
  const z = center(samples)
  const Z = dftComplex(z)
  const mags = Z.map(mag)
  const base = mags[1] || 1
  let vec = []
  if (rotationInvariant) {
    for (let n = 1; n <= K; n++) {
      const m = mags[n] || 0
      vec.push(scaleInvariant ? m / base : m)
    }
  } else {
    const a1 = Math.atan2(Z[1].im, Z[1].re) || 0
    const ca = Math.cos(-a1), sa = Math.sin(-a1)
    for (let n = 1; n <= K; n++) {
      const re = Z[n].re, im = Z[n].im
      const re2 = re * ca - im * sa
      const im2 = re * sa + im * ca
      const scale = scaleInvariant ? base : 1
      vec.push(re2 / scale, im2 / scale)
    }
  }
  return vec
}
