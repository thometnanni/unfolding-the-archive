<script>
  import { scaleLinear } from 'd3-scale'
  import { zoom, zoomIdentity } from 'd3-zoom'
  import { select } from 'd3-selection'
  import { UMAP } from 'umap-js'
  import { extractDimensions } from './geometryDimensions'
  let { data, hash } = $props()

  const nEpochs = 500
  const minDist = 0.5
  const spread = 0.2

  let embedding = $state()
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

  // $effect(() => console.log(data))

  const geometryOccurances = $derived(
    extractDimensions(Object.values(data))
    // Object.values(data).map(({ files }) =>
    //   allFiles.map((file) => files.includes(file))
    // )
  )

  // $inspect(geometryOccurances)

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
        d: `M${points.map(([px, py]) => `${px},${py}`).join('L')}Z`,

        metadata: {
          files: geometry.files,
          area: geometry.dimensions.area,
          vertices: geometry.dimensions.numberOfVertices,
          convexityRatio: geometry.dimensions.convexityRatio,
          aspectRatio: geometry.dimensions.aspectRatio,
          compactness: geometry.dimensions.compactness
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

  function handleMouseover(files) {
    // console.log('Mouseover files:', )
    console.log($state.snapshot(files))
    // Implement your mouseover logic here
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
</script>

<div class="zoom-container">
  <div class="info">
    <p>
      This visualization presents the geometry data for the <em>{hash}</em> project.
      It displays a sample of 500 geometries across different files, grouped according
      to visual similarity.
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
      {#each geometries as { geometry, x, y, d, metadata }}
        <g
          class="geometry"
          transform={`translate(${x} ${y}) scale(${zoomFactor * areaScale(Math.sqrt(clamp(metadata.area, lo, hi)))})
`}
        >
          <path
            {d}
            fill="white"
            onmouseenter={({ currentTarget }) => {
              activeGeometry = { x, y, d, metadata }
            }}
            onmouseleave={({ currentTarget }) => (activeGeometry = null)}
            role="presentation"
          >
            <!-- <title>{file}</title> -->
          </path>
        </g>
      {/each}

      {#if activeGeometry}
        <g
          class="active-geometry"
          transform={`translate(${activeGeometry.x} ${activeGeometry.y}) scale(${zoomFactor * areaScale(Math.sqrt(clamp(activeGeometry.metadata.area, lo, hi)))})`}
        >
          <path d={activeGeometry.d}> </path>
        </g>
      {/if}
    </g>
  </svg>
  <div class="hover-info">
    {#if activeGeometry}
      <div class="meta-center-grid">
        <div class="meta-label">Occurences</div>
        <div class="meta-value">
          {activeGeometry.metadata.files?.length ?? '-'}
        </div>

        <div class="meta-label">Area</div>
        <div class="meta-value">
          {activeGeometry.metadata.area?.toFixed(4)}
        </div>

        <div class="meta-label">Vertices</div>
        <div class="meta-value">{activeGeometry.metadata.vertices}</div>

        <div class="meta-label">Aspect Ratio</div>
        <div class="meta-value">
          {activeGeometry.metadata.aspectRatio?.toFixed(4) ?? '-'}
        </div>

        <div class="meta-label">Convexity Ratio</div>
        <div class="meta-value">
          {activeGeometry.metadata.convexityRatio?.toFixed(4) ?? '-'}
        </div>

        <div class="meta-label">Compactness</div>
        <div class="meta-value">
          {activeGeometry.metadata.compactness?.toFixed(4) ?? '-'}
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
    max-width: 420px;
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
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    mix-blend-mode: difference;

    z-index: 500;
    color: yellow;

    text-align: center;
    font-size: 2.5rem;
    line-height: 2.3rem;

    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
  }
  .meta-center-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 800px;
    max-width: 96vw;
    gap: 10px 10px;
    margin: 0 auto;
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
    }

    .active-geometry path {
      pointer-events: none;
      fill: #001aff;
      fill: yellow;
      /* stroke: #00ff8c; */
      /* stroke-width: 5; */
    }
  }
</style>
