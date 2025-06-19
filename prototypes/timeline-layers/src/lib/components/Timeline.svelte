<script>
  import { onMount } from 'svelte'
  import { extent } from 'd3-array'
  import { timeFormat } from 'd3-time-format'
  import { timeMonth } from 'd3-time'

  import { aciToHex } from '$lib/index.js'
  import Connections from '$lib/components/Connections.svelte'

  export let data = []
  export let viewMode
  export let searchTerm = ''
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

  let plotW = 0
  let plotH = 0
  let xScale
  let xTicks = []
  let breakIndicators = []
  let rowsCompact = []
  let rowsExtended = []

  let wrapper
  let container
  let axis

  const collapsed_gap = 200

  function updateMeasurements() {
    if (!wrapper || !container) return

    container.style.height = plotH + 'px'
  }

  function onWindowScroll() {
    const labels = container.querySelectorAll('.proj-label')
    const viewportLine = 100 // 100px from the top of the viewport

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
      // const rect = targetLabel.getBoundingClientRect()
      // const containerRect = container.getBoundingClientRect()
      // const labelX = rect.left - containerRect.left + container.scrollLeft
      // const scrollTo = labelX - 200
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

    const projectDates = filled.slice().sort((a, b) => a - b)

    const gaps = projectDates
      .slice(1)
      .map((date, i) => date.getTime() - projectDates[i].getTime())

    // bin the max gap
    const maxGap = Math.max(...gaps)
    const breakIdx = gaps.indexOf(maxGap) + 1

    let segments = []
    let breaks = []

    let seg = { start: projectDates[0], end: projectDates[0] }
    for (let i = 1; i < projectDates.length; i++) {
      if (i === breakIdx) {
        seg.end = projectDates[i - 1]
        segments.push(seg)
        breaks.push({ start: projectDates[i - 1], end: projectDates[i] })
        seg = { start: projectDates[i], end: projectDates[i] }
      } else {
        seg.end = projectDates[i]
      }
    }
    segments.push(seg)

    const names = sorted.map((d) => d.path.split('/').pop())
    const extraPx = Math.max(...names.map((n) => n.length)) * charPx
    const baseWidth =
      Math.max(window.innerWidth - margin.left - margin.right, fontSize * 10) +
      extraPx

    const totalTime = segments.reduce((sum, s) => sum + (s.end - s.start), 0)
    const availTimeW = baseWidth - breaks.length * collapsed_gap
    const timeToPx = (ms) => (ms > 0 ? (ms / totalTime) * availTimeW : 0)

    let cursor = margin.left
    segments.forEach((s) => {
      s.startPx = cursor
      const segMs = s.end - s.start
      const w = timeToPx(segMs)
      s.endPx = cursor + w
      const brk = breaks.find((b) => b.start.getTime() === s.end.getTime())
      cursor += w
      if (brk) {
        brk.startPx = cursor
        brk.endPx = cursor + collapsed_gap
        cursor += collapsed_gap
      }
    })

    const discontinuous = (date) => {
      if (!date) return margin.left
      const t = date.getTime()
      const seg = segments.find((s) => t >= s.start && t <= s.end)
      if (seg) {
        const pct =
          seg.end > seg.start ? (t - seg.start) / (seg.end - seg.start) : 0
        return seg.startPx + pct * (seg.endPx - seg.startPx)
      }
      const br = breaks.find((b) => t > b.start && t < b.end)
      if (br) return br.startPx + collapsed_gap / 2
      return t < segments[0].start ? margin.left : cursor
    }

    xScale = discontinuous
    plotW = cursor - margin.left

    let candidates = []
    // segments.forEach((s) => candidates.push(s.start))
    // if (segments.length) candidates.push(segments[segments.length - 1].end)

    segments.forEach((seg) => {
      candidates.push(seg.start)
      timeMonth
        .every(1)
        .range(seg.start, seg.end)
        .forEach((m) => candidates.push(m))
      candidates.push(seg.end)
    })

    const uniq = Array.from(new Set(candidates.map((d) => d.getTime())))
      .map((ms) => new Date(ms))
      .sort((a, b) => a - b)
    const minPx = fontSize * 7.4

    xTicks = []
    if (uniq.length) {
      xTicks.push(uniq[0])
      for (let i = 1; i < uniq.length; i++) {
        if (
          Math.abs(xScale(uniq[i]) - xScale(xTicks[xTicks.length - 1])) > minPx
        ) {
          xTicks.push(uniq[i])
        }
      }
    }

    breakIndicators = breaks.map((b) => ({
      x: b.startPx + collapsed_gap / 2,
      gap: b.end.getTime() - b.start.getTime()
    }))

    if (viewMode === 'compact') {
      plotH = margin.top + rowH * sorted.length + margin.bottom
    } else {
      let y = margin.top
      sorted.forEach(
        (d) => (y += (d.layers.length + 1) * layerSpacing + layerSpacing)
      )
      plotH = y + margin.bottom
    }

    rowsCompact = sorted.map((d, i) => {
      const raw = xScale(filled[i])
      const x = Math.round(raw)
      const y = margin.top + i * rowH
      return {
        name: d.path.split('/').pop(),
        ticks: d.layers.map((ly, j) => ({
          x: Math.round(raw + j * tickSpacing),
          y1: y + tickSpacing,
          y2: y + rowH - tickSpacing,
          text: ly.name,
          count: ly.entityCount || 0,
          colorIndex: ly.color,
          visible: ly.visible,
          highlight:
            searchTerm && ly.name.toLowerCase() === searchTerm.toLowerCase()
        })),
        labelX: x - labelPadding,
        labelY: y + rowH / 2
      }
    })

    rowsExtended = []
    let yAcc = margin.top
    sorted.forEach((d, i) => {
      const raw = xScale(filled[i])
      const x = Math.round(raw)
      const layerYs = d.layers.map((_, j) => yAcc + (j + 2) * layerSpacing)
      rowsExtended.push({
        name: d.path.split('/').pop(),
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
    })

    updateMeasurements()
  }

  const one_year = 31536000000
  const one_month = one_year / 12
  const one_day = 86400000

  function formatGap(ms) {
    const units = [
      { n: Math.floor(ms / one_year), label: 'year' },
      { n: Math.floor((ms % one_year) / one_month), label: 'month' },
      { n: Math.floor((ms % one_month) / one_day), label: 'day' }
    ]
    const first = units.find((u) => u.n)
    return first
      ? `${first.n} ${first.label}${first.n > 1 ? 's' : ''}`
      : '0 days'
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
          style="font-size: {fontSize}px"
        >
          {timeFormat('%b %Y')(t)}
        </text>
      {/each}

      {#each breakIndicators as b}
        <line
          class="grid v"
          x1={b.x}
          x2={b.x}
          y1={0}
          y2={plotH}
          style="stroke-width: {strokeWidth / 2}px"
        />
      {/each}

      {#each breakIndicators as b}
        <text
          class="axis-break"
          x={b.x}
          y={margin.top - fontSize}
          text-anchor="middle"
          style="font-size: {fontSize}px"
        >
          {formatGap(b.gap)}
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
        {/each}
      {/if}
    </svg>
  </div>
</div>

<style>
  .axis-container {
    position: fixed;
    top: 0;
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
  svg {
    display: block;
  }
  .grid.v {
    stroke: var(--grey-1);
    stroke-dasharray: 5 2;
    z-index: 0;
  }
  .axis-label,
  .axis-break {
    font-family: 'Ronzino', Helvetica, Arial, sans-serif;
    fill: var(--grey-2);
  }

  .axis-break {
    fill: #999;
  }
  .proj-label {
    font-family: 'Ronzino', Helvetica, Arial, sans-serif;
    fill: var(--grey-2);
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
</style>
