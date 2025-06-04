<script>
  export let rows = []
  export let searchTerm = ''
  export let strokeColor = '#000'
  export let strokeWidth = 0.5
  export let width = 0
  export let height = 0

  const horizontalOffset = 200

  $: connections = (() => {
    if (!searchTerm) return []
    const lower = searchTerm.toLowerCase()
    const map = new Map()
    if (!rows || rows.length === 0) return []

    rows.forEach((row) => {
      const items = row.layers ?? row.ticks ?? []
      items.forEach((item) => {
        const text = item.text
        if (
          !text ||
          item.count === 0 ||
          !text.toLowerCase().includes(lower)
        ) {
          return
        }
        const x = item.x
        const y = 'y' in item ? item.y : (item.y1 + item.y2) / 2
        const typeCounts = item.typeCounts || {}
        const typeKey = JSON.stringify(
          Object.entries(typeCounts)
            .sort(([a], [b]) => a.localeCompare(b))
        )
        const key = `${text}||${item.count}||${typeKey}`
        if (!map.has(key)) map.set(key, [])
        map.get(key).push({ x, y })
      })
    })

    return Array.from(map.values())
      .filter((pts) => pts.length > 1)
      .map((pts) => {
        const sortedPts = pts.slice().sort((a, b) => a.x - b.x)
        let d = `M ${sortedPts[0].x} ${sortedPts[0].y}`
        for (let i = 1; i < sortedPts.length; i++) {
          const p0 = sortedPts[i - 1]
          const p1 = sortedPts[i]
          const cp1x = p0.x - horizontalOffset
          const cp1y = p0.y
          const cp2x = p1.x - horizontalOffset
          const cp2y = p1.y
          d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p1.x} ${p1.y}`
        }
        return d
      })
  })()
</script>

<svg class="connections-layer" {width} {height}>
  {#each connections as d}
    <path
      {d}
      fill="none"
      stroke={strokeColor}
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  {/each}
</svg>

<style>
  .connections-layer {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
    z-index: 1;
  }
</style>
