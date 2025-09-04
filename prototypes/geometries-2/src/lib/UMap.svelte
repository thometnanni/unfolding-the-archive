<script>
  import { scaleLinear } from 'd3-scale'
  import { zoom, zoomIdentity } from 'd3-zoom'
  import { select } from 'd3-selection'
  import { extractDimensions } from './geometryDimensions'
  let { data, hash, fillClosed } = $props()

  let chartWidth = $state(0)
  let chartHeight = $state(0)

  let activeGeometry = $state(null)

  let chartSize = $derived(Math.min(chartWidth, chartHeight))

  let svgEl
  let gEl
  let transform = $state(null)
  let zoomBehavior

  const transformString = $derived(transform?.toString())
  const zoomFactor = $derived(transform == null ? 1 : 1 / (0 + transform.k / 1))

  // area cal
  const areas = data.map((g) => g.dimensions.area).sort((a, b) => a - b)
  const lo = areas[Math.floor(areas.length * 0.05)]
  const hi = areas[Math.floor(areas.length * 0.95)]

  function clamp(val, lo, hi) {
    return Math.max(lo, Math.min(val, hi))
  }

  const areaScale = scaleLinear()
    .domain([Math.sqrt(lo), Math.sqrt(hi)])
    .range([0.5, 2])

  const geometries = $derived.by(() => {
    const minX = Math.min(...data.map(({ embedding }) => embedding[0]))
    const maxX = Math.max(...data.map(({ embedding }) => embedding[0]))

    const minY = Math.min(...data.map(({ embedding }) => embedding[1]))
    const maxY = Math.max(...data.map(({ embedding }) => embedding[1]))

    const rangeX = maxX - minX
    const rangeY = maxY - minY

    const range = Math.max(rangeX, rangeY)

    const margin = 50

    const scaleX = scaleLinear()
      .domain([minX, maxX])
      .range([margin, chartSize - margin])
    const scaleY = scaleLinear()
      .domain([minY, maxY])
      .range([margin, chartSize - margin])

    return data.map((geometry) => {
      const points = normalizeVertices(geometry.vertices, 50)
      const xPos = scaleX(geometry.embedding[0])
      const yPos = scaleY(geometry.embedding[1])
      return {
        geometry,
        x: xPos,
        y: yPos,
        r: 5,
        d: `M${points.map(([px, py]) => `${px},${py}`).join('L')}`,
        fill:
          geometry.vertices[0][0] ===
            geometry.vertices[geometry.vertices.length - 1][0] &&
          geometry.vertices[0][1] ===
            geometry.vertices[geometry.vertices.length - 1][1],

        metadata: {
          entity: geometry.entity,
          files: geometry.files,
          area: geometry.dimensions.area,
          perimeter: geometry.dimensions.perimeter,
          vertices: geometry.dimensions.numberOfVertices,
          convexityRatio: geometry.dimensions.convexityRatio,
          aspectRatio: geometry.dimensions.aspectRatio,
          compactness: 1 / geometry.dimensions.compactness
        }
      }
    })
  })

  function normalizeVertices(vertices, size) {
    if (!vertices || vertices.length === 0) return []

    // 1. Find centroid
    const n = vertices.length
    const centroid = [
      vertices.reduce((sum, v) => sum + v[0], 0) / n,
      vertices.reduce((sum, v) => sum + v[1], 0) / n
    ]

    // 2. Center vertices
    const centered = vertices.map(([x, y]) => [
      x - centroid[0],
      y - centroid[1]
    ])

    // 3. Find max extent
    const xs = centered.map(([x]) => x)
    const ys = centered.map(([, y]) => y)
    const extent =
      Math.max(
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys)
      ) || 1 // avoid division by zero

    // 4. Scale uniformly
    const scale = size / extent

    return centered.map(([x, y]) => [x * scale, y * scale])
  }

  // $inspect(activeGeometry)

  $effect(() => {
    if (!svgEl || !gEl) return
    const svg = select(svgEl)
    const g = select(gEl)
    svg.call(
      zoom()
        .on('zoom', (event) => {
          transform = event.transform
        })
        .scaleExtent([1, Infinity])
    )
    // zoomBehavior = svg.__zoom
  })

  $effect(() => {
    if (!svgEl || !chartWidth || !chartHeight) return
    if (!geometries.length) return
    const xs = geometries.map((g) => g.x)
    const ys = geometries.map((g) => g.y)
    const centerX = (Math.min(...xs) + Math.max(...xs)) / 2
    const centerY = (Math.min(...ys) + Math.max(...ys)) / 2
    const tx = chartWidth / 2 - centerX
    const ty = chartHeight / 2 - centerY
    const t = zoomIdentity.translate(tx, ty).scale(1)
    select(svgEl).call(zoom().transform, t)
    transform = t
  })

  function formatFixedSig(x, sig = 4) {
    if (isNaN(x)) return
    if (x === 0) return '0'

    const absX = Math.abs(x)
    const digits = sig - Math.floor(Math.log10(absX)) - 1
    const fixed = x.toFixed(Math.max(digits, 0))

    // Split into integer and fractional parts
    const [intPart, fracPart] = fixed.split('.')

    // Add spaces every 3 digits in integer part
    const spacedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

    let result = fracPart ? `${spacedInt}.${fracPart}` : spacedInt
    // Remove trailing zeroes and optional decimal point
    result = result.replace(/\.?0+$/, '')
    return result
  }

  function formatPercent(x, sig = 4) {
    if (isNaN(x)) return
    return `${formatFixedSig(x * 100, sig)} %`
  }

  function formatAspectRatio(ratio) {
    if (!ratio || isNaN(ratio) || !isFinite(ratio)) return '-'
    // Limit denominator to avoid huge numbers
    let best = [1, 1]
    let minError = Math.abs(ratio - 1)
    for (let denom = 1; denom <= 1000; denom++) {
      const numer = Math.round(ratio * denom)
      const error = Math.abs(ratio - numer / denom)
      if (error < minError) {
        minError = error
        best = [numer, denom]
        if (error < 0.01) break // good enough
      }
    }
    return `${best[0]}:${best[1]}`
  }
</script>

<div class="zoom-container">
  <div class="info">
    <p>
      This is a sample of the 500 most reoccuring geometries from the <em>{hash}</em> project.
      They are arranged by visual similarity factoring in their number of vertices,
      area, perimeter, aspect ratio, compactness and convexity. Zoom in to reveal distinct geometeries.
    </p>

    <h1>
      {hash}
    </h1>
  </div>

  <svg
    width="100%"
    height="100%"
    bind:this={svgEl}
    bind:clientWidth={chartWidth}
    bind:clientHeight={chartHeight}
  >
    <rect width={chartWidth} height={chartHeight}></rect>
    <g bind:this={gEl} transform={transformString}>
      {#each geometries as { geometry, fill, x, y, d, metadata, entity }}
        <g
          class="geometry"
          transform={`translate(${x} ${y}) scale(${zoomFactor * areaScale(Math.sqrt(clamp(metadata.area, lo, hi)))})
`}
        >
          <path
            {d}
            class={{ fill: !fillClosed || fill }}
            onmouseenter={({ currentTarget }) => {
              activeGeometry = { x, y, d, metadata, fill, entity }
            }}
            onmouseleave={({ currentTarget }) => (activeGeometry = null)}
            role="presentation"
          >
            <!-- <title>{file}</title> -->
          </path>
        </g>
      {/each}

      <!-- {#if activeGeometry}
        <g
          class="active-geometry"
          transform={`translate(${activeGeometry.x} ${activeGeometry.y}) scale(${zoomFactor * areaScale(Math.sqrt(clamp(activeGeometry.metadata.area, lo, hi)))})`}
        >
          <path d={activeGeometry.d}> </path>
        </g>
      {/if} -->
    </g>
  </svg>
  <div class="hover-info">
    <svg width="100%" height="100%">
      {#if activeGeometry}
        <g bind:this={gEl} transform={transformString}>
          <g
            class="active-geometry"
            transform={`translate(${activeGeometry.x} ${activeGeometry.y}) scale(${zoomFactor * areaScale(Math.sqrt(clamp(activeGeometry.metadata.area, lo, hi)))})`}
          >
            <path
              class={{ fill: !fillClosed || activeGeometry.fill }}
              d={activeGeometry.d}
            >
            </path>
          </g>
        </g>
      {/if}
    </svg>
    {#if activeGeometry}
      <!-- <svg width="100%" height="100%">
        <g
          class="active-geometry"
          transform={`translate(${activeGeometry.x} ${activeGeometry.y}) scale(${zoomFactor * areaScale(Math.sqrt(clamp(activeGeometry.metadata.area, lo, hi)))})`}
        >
          <path d={activeGeometry.d}> </path>
        </g>
      </svg> -->
      <div class="meta-center-grid">
        <div class="meta-label">Occurences</div>
        <div class="meta-value">
          {activeGeometry.metadata.files?.length ?? '-'}
        </div>

        <div class="meta-label">Vertices</div>
        <div class="meta-value">
          {activeGeometry.metadata.vertices - (activeGeometry.fill ? 1 : 0)}
        </div>

        <div class="meta-label">Area</div>
        <div class="meta-value">
          {formatFixedSig(activeGeometry.metadata.area)}
        </div>

        <div class="meta-label">Perimeter</div>
        <div class="meta-value">
          {formatFixedSig(activeGeometry.metadata.perimeter)}
        </div>

        <div class="meta-label">Aspect Ratio</div>
        <div class="meta-value">
          {formatAspectRatio(activeGeometry.metadata.aspectRatio)}
        </div>

        <div class="meta-label">Convexity</div>
        <div class="meta-value">
          {formatPercent(activeGeometry.metadata.convexityRatio)}
        </div>

        <div class="meta-label">Compactness</div>
        <div class="meta-value">
          {formatPercent(activeGeometry.metadata.compactness)}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .info {
    position: fixed;
    bottom: 10px;
    left: 10px;
    z-index: 100;
    font-size: 0.8rem;
    line-height: normal;
    max-width: 480px;
    mix-blend-mode: difference;
  }

  .info p {
    margin: 0 0;
    color: white;
    width: 100%;
    hyphens: auto;
    text-wrap: balance;
    margin-bottom: 8px;
  }

  h1 {
    color: white;
    font-size: 2.8rem;
    line-height: 0.95;
    font-weight: normal;
    margin: 0 0;
  }

  .hover-info {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;

    z-index: 500;
    color: yellow;

    text-align: center;
    font-size: 2.5rem;
    line-height: 2.3rem;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;

    svg {
      position: absolute;
      top: 0;
    }
  }
  .meta-center-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 800px;
    max-width: 96vw;
    gap: 0 10px;
    margin: 0 auto;
    mix-blend-mode: difference;

    text-shadow:
      -0.5px -0.5px 0 #000,
      0.5px -0.5px 0 #000,
      -0.5px 0.5px 0 #000,
      0.5px 0.5px 0 #000;
  }
  .meta-label {
    text-align: right;
    justify-self: end;
    font-weight: 300;
    /* opacity: 0.8; */
  }

  .meta-value {
    text-align: left;
    justify-self: start;
    font-weight: 500;
  }

  .zoom-container {
    position: relative;
    overflow-y: auto;
    flex: 1;
    height: 100%;
    flex-direction: row;
  }
  svg {
    display: block;
    cursor: crosshair;

    .geometry path {
      mix-blend-mode: difference;
      vector-effect: non-scaling-stroke;

      stroke: white;
      fill: none;

      &.fill {
        stroke: none;
        fill: white;
      }
    }

    .active-geometry path {
      pointer-events: none;
      vector-effect: non-scaling-stroke;

      stroke: yellow;
      fill: none;

      &.fill {
        /* fill: #001aff; */
        stroke: none;
        fill: yellow;
      }

      /* stroke: #00ff8c; */
      /* stroke-width: 5; */
    }
  }
</style>
