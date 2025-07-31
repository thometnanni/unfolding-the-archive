<script>
  import { onMount } from 'svelte'
  import { timeFormat } from 'd3-time-format'
  import { aciToHex } from '$lib/index.js'
  import Connections from '$lib/components/Connections.svelte'

  export let data = []
  export let searchTerm = ''
  export let searchFile = ''
  export let baseFontSize = 12
  export let ctbData = null

  $: fontSize = baseFontSize
  $: margin = {
    top: fontSize * 2,
    right: fontSize * 30,
    bottom: fontSize * 6,
    left: fontSize * 20
  }

  $: rowH = fontSize * 1.7
  $: tickSpacing = fontSize * 0.25
  $: layerSpacing = fontSize * 1
  $: charPx = fontSize * 0.6
  $: labelPadding = fontSize * 0.5
  $: strokeWidth = fontSize * 0.1
  $: styleMap = ctbData ? new Map(ctbData.map((s) => [s.aci, s])) : new Map()

  $: filteredData = searchFile
    ? data.filter((d) =>
        d.path?.toLowerCase().includes(searchFile.toLowerCase())
      )
    : data

  let expanded = new Set()

  let plotW = 0
  let plotH = 0
  let xScale
  let xTicks = []
  let xBins = []
  let xPositions = []

  let wrapper
  let container
  let axis

  function toggleRow(rowName) {
    if (expanded.has(rowName)) expanded.delete(rowName)
    else expanded.add(rowName)
    expanded = new Set(expanded)
  }

  function updateMeasurements() {
    if (!wrapper || !container) return
    container.style.height = plotH + 'px'
  }

  function onWindowScroll() {
    const labels = container.querySelectorAll('.proj-label')
    const viewportLine = 100
    let targetLabel = null
    let minDist = Infinity
    labels.forEach((label) => {
      const rect = label.getBoundingClientRect()
      const labelMiddle = rect.top + rect.height / 2
      const dist = Math.abs(labelMiddle - viewportLine)
      if (dist < minDist) {
        minDist = dist
        targetLabel = label
      }
    })
    if (targetLabel) {
      const rect = targetLabel.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const labelEndX = rect.right - containerRect.left + container.scrollLeft
      const scrollTo = labelEndX - 400
      container.scrollTo({ left: scrollTo, behavior: 'instant' })
      axis.scrollTo({ left: scrollTo, behavior: 'instant' })
    }
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

  $: rows = (() => {
    if (!filteredData.length) return []
    const MONTH_WIDTH = 100
    const BINNED_WIDTH = 200

    const sorted = [...filteredData].sort((a, b) => {
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

    const minDate = new Date(Math.min(...filled.map((d) => d.getTime())))
    const maxDate = new Date(Math.max(...filled.map((d) => d.getTime())))

    let months = []
    let d = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
    while (d <= maxDate) {
      months.push(new Date(d))
      d.setMonth(d.getMonth() + 1)
    }
    xTicks = months

    let monthsWithDataSet = new Set(
      filled.map((dt) => dt.getFullYear() + '-' + dt.getMonth())
    )

    let bins = []
    let i = 0
    while (i < months.length) {
      let key = months[i].getFullYear() + '-' + months[i].getMonth()
      if (monthsWithDataSet.has(key)) {
        bins.push({
          type: 'month',
          start: months[i],
          end: months[i],
          width: MONTH_WIDTH
        })
        i++
      } else {
        let gapStart = i
        while (
          i < months.length &&
          !monthsWithDataSet.has(
            months[i].getFullYear() + '-' + months[i].getMonth()
          )
        ) {
          i++
        }
        let gapLen = i - gapStart
        if (gapLen >= 2) {
          bins.push({
            type: 'bin',
            start: months[gapStart],
            end: months[i - 1],
            width: BINNED_WIDTH
          })
        } else {
          for (let j = gapStart; j < i; j++) {
            bins.push({
              type: 'month',
              start: months[j],
              end: months[j],
              width: MONTH_WIDTH
            })
          }
        }
      }
    }
    xBins = bins

    xPositions = []
    let acc = margin.left
    for (let b of xBins) {
      xPositions.push(acc)
      acc += b.width
    }
    plotW = acc - margin.left

    xScale = (date) => {
      for (let j = 0; j < xBins.length; j++) {
        let b = xBins[j]
        if (
          b.type === 'month' &&
          b.start.getFullYear() === date.getFullYear() &&
          b.start.getMonth() === date.getMonth()
        ) {
          return xPositions[j]
        }
      }
      for (let j = 0; j < xBins.length; j++) {
        let b = xBins[j]
        if (b.type === 'bin' && date >= b.start && date <= b.end) {
          return xPositions[j] + b.width / 2
        }
      }
      return margin.left
    }

    let rows = []
    let yAcc = margin.top
    sorted.forEach((d, i) => {
      const rowName = d.path.split('/').pop()
      const raw = xScale(filled[i])
      const x = Math.round(raw)
      if (!expanded.has(rowName)) {
        rows.push({
          type: 'compact',
          name: rowName,
          ticks: d.layers.map((ly, j) => ({
            x: Math.round(raw + j * tickSpacing),
            y1: yAcc + tickSpacing,
            y2: yAcc + rowH - tickSpacing,
            text: ly.name,
            count: ly.entityCount || 0,
            colorIndex: ly.color,
            visible: ly.visible,
            highlight:
              searchTerm && ly.name.toLowerCase() === searchTerm.toLowerCase()
          })),
          labelX: x - labelPadding,
          labelY: yAcc + rowH / 2
        })
        yAcc += rowH
      } else {
        const layerYs = d.layers.map((_, j) => yAcc + (j + 2) * layerSpacing)
        rows.push({
          type: 'extended',
          name: rowName,
          labelX: x - labelPadding,
          labelY: layerYs[0] || yAcc + layerSpacing,
          layers: d.layers.map((ly, j) => ({
            text: ly.name,
            x: Math.round(raw),
            y: layerYs[j],
            count: ly.entityCount || 0,
            colorIndex: ly.color,
            visible: ly.visible,
            highlight:
              searchTerm && ly.name.toLowerCase() === searchTerm.toLowerCase()
          }))
        })
        yAcc += (d.layers.length + 1) * layerSpacing + layerSpacing
      }
    })

    plotH = yAcc + margin.bottom
    return rows
  })()

  function formatBin(start, end) {
    return timeFormat('%b %Y')(start) + ' – ' + timeFormat('%b %Y')(end)
  }
</script>

<div bind:this={wrapper} class="timeline-wrapper">
  <div bind:this={axis} class="axis-container">
    <svg width={margin.left + plotW + margin.right} height={plotH}>
      {#each xBins as b, i}
        <line
          class="grid v"
          x1={xPositions[i]}
          x2={xPositions[i]}
          y1={0}
          y2={plotH}
          style="stroke-width: {strokeWidth / 2}px"
        />
        {#if b.type === 'month'}
          <rect
            x={xPositions[i]}
            y={margin.top - fontSize * 2.4}
            width={b.width}
            height={fontSize * 2.4}
            fill="#fff"
          />
          <text
            class="axis-label"
            x={xPositions[i] + b.width / 2}
            y={margin.top - fontSize}
            text-anchor="middle"
            style="font-size: {fontSize}px"
          >
            {timeFormat('%b %Y')(b.start)}
          </text>
        {:else}
          <rect
            x={xPositions[i]}
            y={margin.top - fontSize * 2.4}
            width={b.width}
            height={fontSize * 2.4}
            fill="#f5f5f5"
          />
          <text
            class="axis-label axis-bin"
            x={xPositions[i] + b.width / 2}
            y={margin.top - fontSize}
            text-anchor="middle"
            style="font-size: {fontSize * 0.9}px"
          >
            {formatBin(b.start, b.end)}
          </text>
        {/if}
      {/each}
      {#if xBins.length}
        <line
          class="grid v"
          x1={xPositions[xBins.length] || margin.left + plotW}
          x2={xPositions[xBins.length] || margin.left + plotW}
          y1={0}
          y2={plotH}
          style="stroke-width: {strokeWidth / 2}px"
        />
      {/if}
    </svg>
  </div>
  <div
    bind:this={container}
    class="rows-container {searchTerm ? 'searching' : ''}"
    style="height: {plotH}px"
  >
    <Connections
      {rows}
      {searchTerm}
      strokeWidth={strokeWidth / 2}
      width={margin.left + plotW + margin.right}
      height={plotH}
    />
    <svg width={margin.left + plotW + margin.right} height={plotH}>
      {#each rows as row}
        {#if row.type === 'compact'}
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
              stroke={styleMap.get(tick.colorIndex)?.color_hex ||
                aciToHex(tick.colorIndex || 0)}
              class:empty={tick.count == 0}
            />
          {/each}
          <text
            class="proj-label"
            x={row.labelX}
            y={row.labelY}
            text-anchor="end"
            style="font-size: {fontSize /
              1.2}px; cursor: pointer; pointer-events: all;"
            on:click={() => toggleRow(row.name)}
            title="Expand"
          >
            <tspan
              style="font-size: {fontSize * 0.6}px; alignment-baseline: middle; fill:gainsboro"
              >▶</tspan
            >
            {row.name}
          </text>
        {:else}
          <text
            class="proj-label"
            x={row.labelX}
            y={row.labelY}
            text-anchor="end"
            style="font-size: {fontSize /
              1.2}px; font-weight: bold; cursor: pointer; pointer-events: all;"
            on:click={() => toggleRow(row.name)}
            title="Collapse"
          >
            <tspan
              style="font-size: {fontSize * 0.9}px; vertical-align: middle; fill:gainsboro"
              >▼</tspan
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
              fill={styleMap.get(layer.colorIndex)?.color_hex ||
                aciToHex(layer.colorIndex || 0)}
              style="font-size: {fontSize}px"
              class:empty={layer.count == 0}
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
        {/if}
      {/each}
    </svg>
  </div>
</div>

<style>
  .timeline-wrapper {
    min-height: 100vh;
  }
  .axis-container {
    position: fixed;
    top: 0;
    height: 100vh;
    width: 100%;
    z-index: 1;
    pointer-events: none;
    overflow: hidden;
  }
  text {
    dominant-baseline: middle;
  }
  .rows-container {
    position: relative;
    /* z-index: -1; */
    overflow: hidden;
  }
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
  .axis-bin {
    fill: #bbb;
    font-style: italic;
    font-size: 90%;
  }
  .proj-label {
    font-family: 'Ronzino', Helvetica, Arial, sans-serif;
    fill: var(--grey-2);
    cursor: pointer;
    pointer-events: all;
    transition: font-weight 0.1s;
  }
  .proj-label[title='Collapse'] {
    font-weight: bold;
  }
  .empty {
    opacity: 0.1;
  }
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

  :global(.connections-layer) {
    pointer-events: none;
  }

  :global(.rows-container svg:not(.connections-layer)) {
    pointer-events: all !important;
  }
</style>
