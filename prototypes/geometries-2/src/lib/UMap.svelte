<script>
  import { scaleLinear } from 'd3-scale'
  import { zoom, zoomIdentity } from 'd3-zoom'
  import { select } from 'd3-selection'
  let { data, hash, fillClosed } = $props()

  let chartWidth = $state(0)
  let chartHeight = $state(0)

  let activeGeometry = $state(null)

  let chartSize = $derived(Math.min(chartWidth, chartHeight))

  let svgEl
  let gEl
  let transform = $state(null)

  const transformString = $derived(transform?.toString())
  const zoomFactor = $derived(transform == null ? 1 : 1 / (0 + transform.k / 1))

  function normalizeVertices(vertices, size) {
    if (!vertices || vertices.length === 0) return []
    const n = vertices.length
    const cx = vertices.reduce((s, v) => s + v[0], 0) / n
    const cy = vertices.reduce((s, v) => s + v[1], 0) / n
    const centered = vertices.map(([x, y]) => [x - cx, y - cy])
    const xs = centered.map(([x]) => x)
    const ys = centered.map(([, y]) => y)
    const extent =
      Math.max(
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys)
      ) || 1
    const k = size / extent
    return centered.map(([x, y]) => [x * k, y * k])
  }

  function polylineLength(points) {
    if (!points || points.length < 2) return 0
    let L = 0
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i]
      const [x2, y2] = points[i + 1]
      L += Math.hypot(x2 - x1, y2 - y1)
    }
    return L
  }

  function chordLength(points) {
    if (!points || points.length < 2) return 0
    const [x0, y0] = points[0]
    const [xN, yN] = points[points.length - 1]
    return Math.hypot(xN - x0, yN - y0)
  }

  function bboxDiagonal(points) {
    if (!points?.length) return 0
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (let i = 0; i < points.length; i++) {
      const [x, y] = points[i]
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
    const dx = maxX - minX,
      dy = maxY - minY
    return Math.hypot(dx, dy)
  }

  function maxPairwiseDistance(points) {
    let m = 0
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[j][0] - points[i][0]
        const dy = points[j][1] - points[i][1]
        const d = Math.hypot(dx, dy)
        if (d > m) m = d
      }
    }
    return m
  }

  function formatFixedSig(x, sig = 4) {
    if (x == null || isNaN(x)) return '-'
    if (x === 0) return '0'
    const absX = Math.abs(x)
    const digits = sig - Math.floor(Math.log10(absX)) - 1
    const fixed = x.toFixed(Math.max(digits, 0))
    const [intPart, fracPart] = fixed.split('.')
    const spacedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return (fracPart ? `${spacedInt}.${fracPart}` : spacedInt).replace(
      /\.?0+$/,
      ''
    )
  }

  const geometries = $derived.by(() => {
    if (!data?.length) return []
    const minX = Math.min(...data.map(({ embedding }) => embedding[0]))
    const maxX = Math.max(...data.map(({ embedding }) => embedding[0]))
    const minY = Math.min(...data.map(({ embedding }) => embedding[1]))
    const maxY = Math.max(...data.map(({ embedding }) => embedding[1]))
    const margin = 50

    const scaleX = scaleLinear()
      .domain([minX, maxX])
      .range([margin, chartSize - margin])
    const scaleY = scaleLinear()
      .domain([minY, maxY])
      .range([margin, chartSize - margin])

    return data.map((geometry) => {
      const verts = geometry.vertices ?? []
      const points = normalizeVertices(verts, 50)
      const xPos = scaleX(geometry.embedding[0])
      const yPos = scaleY(geometry.embedding[1])

      const isClosed =
        verts.length > 1 &&
        verts[0][0] === verts[verts.length - 1][0] &&
        verts[0][1] === verts[verts.length - 1][1]

      const L = polylineLength(verts)
      const chord = isClosed
        ? bboxDiagonal(verts) || 1e-6
        : chordLength(verts) || 1e-6
      const sinuosity = L / chord

      return {
        geometry,
        x: xPos,
        y: yPos,
        d: `M${points.map(([px, py]) => `${px},${py}`).join('L')}`,
        fill: isClosed,
        metadata: {
          files: geometry.files,
          vertices: verts.length,
          length: L,
          sinuosity
        }
      }
    })
  })

  $effect(() => {
    if (!svgEl || !gEl) return
    const svg = select(svgEl)
    svg.call(
      zoom()
        .on('zoom', (event) => {
          transform = event.transform
        })
        .scaleExtent([1, Infinity])
    )
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
</script>

<div class="zoom-container">
  <div class="info">
    <p>
      This is a sample of 500 unique geometries from the <em>{hash}</em> project.
      They’re arranged by visual similarity (UMAP over shape features). Zoom in to
      reveal distinct geometries.
    </p>
    <h1>{hash}</h1>
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
          transform={`translate(${x} ${y}) scale(${zoomFactor})`}
        >
          <path
            {d}
            class={{ fill: !fillClosed || fill }}
            onmouseenter={() => {
              activeGeometry = { x, y, d, metadata, fill, entity }
            }}
            onmouseleave={() => (activeGeometry = null)}
            role="presentation"
          />
        </g>
      {/each}
    </g>
  </svg>

  <div class="hover-info">
    <svg width="100%" height="100%">
      {#if activeGeometry}
        <g bind:this={gEl} transform={transformString}>
          <g
            class="active-geometry"
            transform={`translate(${activeGeometry.x} ${activeGeometry.y}) scale(${zoomFactor})`}
          >
            <path
              class={{ fill: !fillClosed || activeGeometry.fill }}
              d={activeGeometry.d}
            />
          </g>
        </g>
      {/if}
    </svg>

    {#if activeGeometry}
      <div class="meta-center-grid">
        <div class="meta-label">Occurrences</div>
        <div class="meta-value">
          {activeGeometry.metadata.files?.length ?? '-'}
        </div>

        <div class="meta-label">Vertices</div>
        <div class="meta-value">
          {Math.max(
            0,
            (activeGeometry.metadata.vertices ?? 0) -
              (activeGeometry.fill ? 1 : 0)
          )}
        </div>

        <div class="meta-label">Length</div>
        <div class="meta-value">
          {formatFixedSig(activeGeometry.metadata.length)}
        </div>

        <div class="meta-label">Sinuosity</div>
        <div class="meta-value">
          {formatFixedSig(activeGeometry.metadata.sinuosity, 3)}
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
