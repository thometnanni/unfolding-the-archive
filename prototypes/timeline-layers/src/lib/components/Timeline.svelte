<script>
  import { onMount } from 'svelte'
  import { scaleTime } from 'd3-scale'
  import { extent } from 'd3-array'
  import { timeFormat } from 'd3-time-format'
  import { aciToHex } from '$lib/index.js'
  import Connections from '$lib/components/Connections.svelte'

  export let data = []
  export let viewMode
  export let searchTerm = ''
  export let baseFontSize = 12

  $: fontSize = baseFontSize
  $: margin = {
    top: fontSize * 2,
    right: fontSize * 20,
    bottom: fontSize * 6,
    left: fontSize * 2
  }

  $: rowH = fontSize * 1.7
  $: tickSpacing = fontSize * 0.25
  $: layerSpacing = fontSize * 1
  $: charPx = fontSize * 0.6
  $: labelPadding = fontSize * 0.5
  $: strokeWidth = fontSize * 0.1

  let plotW = 0
  let plotH = 0
  let xScale
  let xTicks = []
  let rowsCompact = []
  let rowsExtended = []

  let wrapper
  let container
  let axis
  // let spacer

  let scrollableHeight = 0
  let wrapperTop = 0

  function updateMeasurements() {
    if (!wrapper || !container) return
    wrapperTop = wrapper.getBoundingClientRect().top + window.scrollY
    scrollableHeight = container.scrollWidth - container.clientWidth
    // spacer.style.height = scrollableHeight + 'px'
    container.style.height = plotH + 'px'
  }

  function onWindowScroll() {
    const y = window.scrollY - wrapperTop
    const maxY = scrollableHeight
    const clamped = Math.min(Math.max(y, 0), maxY)
    const progress = maxY > 0 ? clamped / maxY : 0
    const maxScroll = container.scrollWidth - container.clientWidth
    const scrollX = progress * maxScroll
    container.scrollLeft = scrollX
    axis.scrollLeft = scrollX
  }

  onMount(() => {
    updateMeasurements()
    window.addEventListener('resize', updateMeasurements)
    window.addEventListener('scroll', onWindowScroll)
    return () => {
      window.removeEventListener('resize', updateMeasurements)
      window.removeEventListener('scroll', onWindowScroll)
    }
  })

  $: if (data.length && container) {
    const sorted = [...data].sort((a, b) => {
      const ta = a.birthtime ? new Date(a.birthtime).getTime() : Infinity
      const tb = b.birthtime ? new Date(b.birthtime).getTime() : Infinity
      return ta - tb
    })

    const dates = sorted.map((d) =>
      d.birthtime ? new Date(d.birthtime) : null
    )
    const validDates = dates.filter((d) => d instanceof Date && !isNaN(d))
    const lastDate = validDates.length
      ? new Date(Math.max(...validDates.map((d) => d.getTime())))
      : new Date()
    let miss = 0
    const filled = dates.map((d) =>
      d instanceof Date && !isNaN(d)
        ? d
        : new Date(lastDate.getTime() + ++miss * 1000)
    )

    const [minD, maxD] = extent(filled)
    const pad = (maxD - minD) * 0.1
    const domain = [
      new Date(minD.getTime() - pad),
      new Date(maxD.getTime() + pad)
    ]

    const names = sorted.map((d) => d.path.split('/').pop())
    const extraPx = Math.max(...names.map((n) => n.length)) * charPx
    const vw = Math.max(
      window.innerWidth - margin.left - margin.right,
      fontSize * 10
    )
    plotW = vw + extraPx

    xScale = scaleTime()
      .domain(domain)
      .range([margin.left, margin.left + plotW])

    const projectDates = filled
      .slice()
      .sort((a, b) => a.getTime() - b.getTime())
    const gaps = []
    for (let i = 1; i < projectDates.length; i++) {
      gaps.push(projectDates[i].getTime() - projectDates[i - 1].getTime())
    }
    const sortedGaps = [...gaps].sort((a, b) => a - b)
    const mid = Math.floor(sortedGaps.length / 2)
    const medianGap =
      sortedGaps.length === 0
        ? 0
        : sortedGaps.length % 2
          ? sortedGaps[mid]
          : (sortedGaps[mid - 1] + sortedGaps[mid]) / 2
    const threshold = medianGap * 4

    const candidateTicks = [projectDates[0]]
    for (let i = 1; i < projectDates.length; i++) {
      const delta = projectDates[i].getTime() - projectDates[i - 1].getTime()
      if (delta >= threshold) {
        candidateTicks.push(projectDates[i])
      }
    }
    if (projectDates.length > 1) {
      const last = projectDates[projectDates.length - 1]
      candidateTicks.push(last)
    }

    const minPixelGap = fontSize * 8
    const filteredTicks = []
    candidateTicks.forEach((d) => {
      if (
        filteredTicks.length === 0 ||
        Math.abs(xScale(d) - xScale(filteredTicks[filteredTicks.length - 1])) >
          minPixelGap
      ) {
        filteredTicks.push(d)
      }
    })

    xTicks = Array.from(new Set(filteredTicks.map((d) => d.getTime())))
      .map((ms) => new Date(ms))
      .sort((a, b) => a.getTime() - b.getTime())

    if (viewMode === 'compact') {
      plotH = margin.top + rowH * sorted.length + margin.bottom
    } else {
      let totalY = margin.top
      sorted.forEach((d) => {
        totalY += (d.layers.length + 1) * layerSpacing + layerSpacing
      })
      plotH = totalY + margin.bottom
    }

    rowsCompact = sorted.map((d, i) => {
      const rawX = xScale(filled[i])
      const x = Math.round(rawX)
      const y = margin.top + i * rowH
      return {
        name: d.path.split('/').pop(),
        ticks: d.layers.map((ly, j) => {
          const rawTickX = rawX + j * tickSpacing
          const tickX = Math.round(rawTickX)
          return {
            x: tickX,
            y1: y + tickSpacing,
            y2: y + rowH - tickSpacing,
            text: ly.name,
            count: ly.entityCount || 0,
            colorIndex: ly.color,
            visible: ly.visible,
            highlight:
              searchTerm && ly.name.toLowerCase() === searchTerm.toLowerCase()
          }
        }),
        labelX: x - labelPadding,
        labelY: y + rowH / 2
      }
    })

    rowsExtended = []
    let accY = margin.top
    sorted.forEach((d, i) => {
      const rawX = xScale(filled[i])
      const x = Math.round(rawX)
      const layerYs = d.layers.map((_, j) => accY + (j + 2) * layerSpacing)
      rowsExtended.push({
        name: d.path.split('/').pop(),
        labelX: x - labelPadding,
        labelY: layerYs[0] || accY + layerSpacing,
        layers: d.layers.map((ly, j) => ({
          text: ly.name,
          x: Math.round(rawX),
          y: layerYs[j],
          count: ly.entityCount || 0,
          colorIndex: ly.color,
          visible: ly.visible,
          highlight:
            searchTerm && ly.name.toLowerCase() === searchTerm.toLowerCase()
        }))
      })
      accY += (d.layers.length + 1) * layerSpacing + layerSpacing
    })

    updateMeasurements()
  }
</script>

<div bind:this={wrapper} class="timeline-wrapper">
  <div bind:this={axis} class="axis-container">
    <svg width={margin.left + plotW + margin.right} height={plotH}>
      {#each xTicks as t}
        <line
          class="grid v"
          x1={xScale(t)}
          x2={xScale(t)}
          y1={0}
          y2={plotH}
          style="stroke-width: {strokeWidth / 2}px"
        />
      {/each}
      {#each xTicks as t}
        <text
          class="axis-label"
          x={xScale(t)}
          y={margin.top - fontSize}
          text-anchor="middle"
          style="font-size: {fontSize * 1.2}px"
        >
          {timeFormat('%m/%d/%Y')(t)}
        </text>
      {/each}
    </svg>
  </div>

  <div
    bind:this={container}
    class="rows-container {searchTerm ? 'searching' : ''}"
    style="height: {plotH}px"
  >
    <Connections
      rows={viewMode === 'compact' ? rowsCompact : rowsExtended}
      {searchTerm}
      strokeWidth={strokeWidth / 2}
      width={margin.left + plotW + margin.right}
      height={plotH}
      {viewMode}
    />

    <svg width={margin.left + plotW + margin.right} height={plotH}>
      {#if viewMode === 'compact'}
        {#each rowsCompact as row}
          {#each row.ticks as tick}
            <line
              class="tick"
              class:highlight={tick.highlight}
              class:hidden={!tick.visible}
              x1={tick.x}
              x2={tick.x}
              y1={tick.y1}
              y2={tick.y2}
              style="stroke-width: {tick.highlight
                ? strokeWidth * 3
                : strokeWidth}px"
              stroke={aciToHex(tick.colorIndex || 0)}
            />
          {/each}
          <text
            class="proj-label"
            x={row.labelX}
            y={row.labelY}
            text-anchor="end"
            style="font-size: {fontSize / 1.2}px"
          >
            {row.name}
          </text>
        {/each}
      {:else}
        {#each rowsExtended as row}
          <text
            class="proj-label"
            x={row.labelX}
            y={row.labelY}
            text-anchor="end"
            style="font-size: {fontSize / 1.2}px"
          >
            {row.name}
          </text>
          {#each row.layers as layer}
            <text
              class="layer-text"
              class:highlight={layer.highlight}
              class:hidden={!layer.visible}
              x={layer.x}
              y={layer.y}
              fill={aciToHex(layer.colorIndex || 0)}
              style="font-size: {fontSize}px"
            >
              {layer.text}
              <tspan
                style="font-size: {fontSize *
                  0.5}px; fill: #666; dominant-baseline: no-change;"
              >
                {' '}({layer.count})
              </tspan>
            </text>
          {/each}
        {/each}
      {/if}
    </svg>
  </div>

  <!-- <div bind:this={spacer} class="spacer"></div> -->
</div>

<style>
  .axis-container {
    position: fixed;
    top: 0px;
    height: 100vh;
    width: 100%;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }

  text {
    dominant-baseline: middle;
  }

  .rows-container {
    position: relative;
    z-index: -1;
    overflow: hidden;
  }

  /* 
  .spacer {
    width: 1px;
    position: fixed;
  } */

  svg {
    display: block;
  }

  .grid.v {
    stroke: var(--grey-1);
    stroke-dasharray: 5 2;
    z-index: 0;
  }

  .axis-label {
    font-family: 'Ronzino', Helvetica, Arial, sans-serif;
    fill: var(--grey-2);
  }

  .proj-label {
    font-family: 'Ronzino', Helvetica, Arial, sans-serif;
    fill: var(--grey-2);
    dominant-baseline: middle;
  }

  /* .tick.hidden {
    opacity: 0.3;
  } */

  .layer-text.hidden {
    text-decoration-color: var(--grey-2);
  }

  .rows-container.searching svg :not(.highlight) {
    opacity: 0.3;
  }

  .rows-container svg {
    opacity: 1;
  }

  .rows-container.searching .highlight,
  .rows-container.searching .proj-label {
    opacity: 1 !important;
  }
</style>
