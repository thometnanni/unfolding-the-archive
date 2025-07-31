<script>
  import { scaleLinear } from 'd3-scale'
  import { zoom } from 'd3-zoom'
  import { select } from 'd3-selection'
  import { UMAP } from 'umap-js'
  import { extractDimensions } from './geometryDimensions'
  let { data } = $props()

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

  const geometries = $derived.by(() => {
    const minX = Math.min(...data.map(({ embedding }) => embedding[0]))
    const maxX = Math.max(...data.map(({ embedding }) => embedding[0]))

    const minY = Math.min(...data.map(({ embedding }) => embedding[1]))
    const maxY = Math.max(...data.map(({ embedding }) => embedding[1]))

    const rangeX = maxX - minX
    const rangeY = maxY - minY

    const range = Math.max(rangeX, rangeY)

    const scaleX = scaleLinear().domain([minX, maxX]).range([0, chartSize])
    const scaleY = scaleLinear().domain([minY, maxY]).range([0, chartSize])

    return data.map((geometry) => {
      const points = normalizeVertices(geometry.vertices, 50)
      const xPos = scaleX(geometry.embedding[0])
      const yPos = scaleY(geometry.embedding[1])
      return {
        geometry,
        x: xPos,
        y: yPos,
        r: 5,
        d: `M${points.map(([px, py]) => `${px},${py}`).join('L')}Z`
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
      zoom().on('zoom', (event) => {
        transform = event.transform
      })
    )
  })
</script>

<div class="zoom-container">
  <svg
    width="100%"
    height="100%"
    bind:this={svgEl}
    bind:clientWidth={chartWidth}
    bind:clientHeight={chartHeight}
  >
    <rect width={chartWidth} height={chartHeight}></rect>
    <g bind:this={gEl} transform={transformString}>
      {#each geometries as { geometry, x, y, d }}
        <g
          class="geometry"
          transform={`translate(${x} ${y}) scale(${zoomFactor})`}
        >
          <path
            {d}
            fill="white"
            onmouseenter={({ currentTarget }) => {
              activeGeometry = { x, y, d }
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
          transform={`translate(${activeGeometry.x} ${activeGeometry.y}) scale(${zoomFactor})`}
        >
          <path d={activeGeometry.d}> </path>
        </g>
      {/if}
    </g>
  </svg>
</div>

<style>
  .zoom-container {
    position: relative;
    overflow-y: auto;
    flex: 1;
    height: 100%;
    flex-direction: row;
  }
  svg {
    display: block;

    .geometry path {
      mix-blend-mode: difference;
    }

    .active-geometry path {
      pointer-events: none;
      fill: #001aff;
      fill: #b7ff00;
      /* stroke: #00ff8c; */
      /* stroke-width: 5; */
    }
  }
</style>
