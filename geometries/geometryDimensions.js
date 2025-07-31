function extractDimensions({ vertices }) {
  // const dimensions = geometry.map(({ vertices }) => {
  const numberOfVertices = vertices.length
  const area = polygonArea(vertices)

  const hull = convexHull(vertices)
  const hullArea = polygonArea(hull)
  const convexityRatio = area / hullArea

  const aspectRatio = boundingBoxAspectRatio(vertices)

  const perimeter = polygonPerimeter(vertices)
  const compactness = perimeter ** 2 / (4 * Math.PI * area)

  return { numberOfVertices, area, convexityRatio, aspectRatio, compactness }
  // })

  // return dimensions
  // return zScoreNormalize(dimensions)
}

function polygonArea(points) {
  let area = 0
  const n = points.length

  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % n]
    area += x1 * y2 - x2 * y1
  }

  return Math.abs(area) / 2
}

function cross(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
}

function convexHull(points) {
  points = points
    .slice()
    .sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]))

  const lower = []
  for (const p of points) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop()
    }
    lower.push(p)
  }

  const upper = []
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i]
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop()
    }
    upper.push(p)
  }

  upper.pop()
  lower.pop()

  return lower.concat(upper)
}

function boundingBoxAspectRatio(points) {
  let minX = Infinity,
    maxX = -Infinity
  let minY = Infinity,
    maxY = -Infinity

  for (const [x, y] of points) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }

  const width = Math.max(maxX - minX, 0.01)
  const height = Math.max(maxY - minY, 0.01)

  if (width / height === Infinity || width / height === -Infinity) {
    console.log(points, width, height)
  }
  return width / height // or height / width
}

function polygonPerimeter(points) {
  let length = 0
  const n = points.length

  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % n]
    length += Math.hypot(x2 - x1, y2 - y1)
  }

  return length
}

function zScoreNormalize(matrix) {
  const nFeatures = matrix[0].length
  const nSamples = matrix.length
  const means = Array(nFeatures).fill(0)
  const stds = Array(nFeatures).fill(0)

  // Compute means
  for (let j = 0; j < nFeatures; j++) {
    means[j] = matrix.reduce((sum, row) => sum + row[j], 0) / nSamples
  }

  // Compute stds
  for (let j = 0; j < nFeatures; j++) {
    stds[j] = Math.sqrt(
      matrix.reduce((sum, row) => sum + (row[j] - means[j]) ** 2, 0) / nSamples
    )
  }

  // Normalize
  return matrix.map(
    (row) => row.map((val, j) => (val - means[j]) / (stds[j] || 1)) // prevent div by 0
  )
}

export { extractDimensions, zScoreNormalize }
