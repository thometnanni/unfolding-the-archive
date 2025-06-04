<script>
  export let rowsExtended = []
  export let xScale
  export let searchTerm = ''
  export let strokeColor = '#000'
  export let strokeWidth = .5

  const horizontalOffset = 200

  $: connections = (() => {
    if (!searchTerm) return []
    const map = new Map()

    rowsExtended.forEach((row) => {
      row.layers.forEach((layer) => {
        if (
          layer.count === 0 ||
          !layer.text.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return
        }
        const key = `${layer.text}||${layer.count}`
        if (!map.has(key)) map.set(key, [])
        map.get(key).push({ x: layer.x, y: layer.y })
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

<svg class="connections-layer" width="100%" height="100%">
  {#each connections as d}
    <path
      d={d}
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
