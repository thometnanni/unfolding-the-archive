<script>
  import P5 from 'p5-svelte'

  const files = [
    {
      dataPath: 'TP 261 Markt Hall-top1000.json',
      countPath: 'TP 261 Markt Hall-top1000-count.json',
    },
    {
      dataPath: 'TP 255 Serpentine Gallery Pavilion-top1000.json',
      countPath: 'TP 255 Serpentine Gallery Pavilion-top1000-count.json',
    }
  ]

  let sketches = files.map(() => null)

  const createSketch = (dataPath, countPath) => (p) => {
    let geom = []
    let rawCounts = {}
    let countMap = {}
    let shapes = []
    let idx = 0
    let last = 0
    const switchFrames = 10
    const paddingFactor = 0.8
    const minSize = 100
    const maxSize = 900
    let globalMaxDim = 1

    p.preload = () => {
      p.loadJSON(dataPath, (data) => {
        geom = Object.entries(data).slice(0, 1000)
      })
      p.loadJSON(countPath, (data) => {
        rawCounts = data
      })
    }

    p.setup = () => {
      p.createCanvas(p.windowWidth / files.length, p.windowHeight - 30)
      if (!geom.length || !rawCounts) return

      const entries = Array.isArray(rawCounts)
        ? rawCounts
        : Object.entries(rawCounts).map(([_, v]) => v)
      countMap = Object.fromEntries(
        entries.filter((e) => Array.isArray(e) && e.length === 2)
      )

      shapes = geom
        .filter(([, o]) => Array.isArray(o.vertices) && o.vertices.length > 1)
        .map(([id, o]) => {
          const verts = o.vertices
          const { angle, center } = rotInfo(verts)
          const v = verts.map((pt) => rot(pt, angle, center))
          const xs = v.map((pt) => pt.x),
            ys = v.map((pt) => pt.y)
          const minX = Math.min(...xs),
            maxX = Math.max(...xs)
          const minY = Math.min(...ys),
            maxY = Math.max(...ys)
          const w = maxX - minX,
            h = maxY - minY
          return { id, verts: v, bounds: { minX, minY, w, h } }
        })

      globalMaxDim = Math.max(
        ...shapes.map((s) => Math.max(s.bounds.w, s.bounds.h))
      )
    }

    p.draw = () => {
      p.background(255)
      if (!shapes.length) return
      if (p.frameCount - last > switchFrames) {
        idx = (idx + 1) % shapes.length
        last = p.frameCount
      }

      const { verts, bounds } = shapes[idx]
      const dim = Math.max(bounds.w, bounds.h)
      const canvasSize = Math.min(p.width, p.height) * paddingFactor
      const shapePixelSize = dim * (canvasSize / dim)
      const clampedSize = p.constrain(shapePixelSize, minSize, maxSize)
      const shapeScale = clampedSize / dim
      const strokeW = p.constrain(1 * (globalMaxDim / dim), 0.2, 1)

      p.push()
      p.translate(p.width / 2, p.height / 2)
      p.stroke(0)
      p.strokeWeight(strokeW)
      p.noFill()
      p.beginShape()
      verts.forEach((pt) => {
        const x = (pt.x - (bounds.minX + bounds.w / 2)) * shapeScale
        const y = (pt.y - (bounds.minY + bounds.h / 2)) * shapeScale
        p.vertex(x, y)
      })
      p.endShape(p.CLOSE)
      p.pop()
    }

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth / files.length, p.windowHeight - 30)
    }

    function rotInfo(verts) {
      const cx = verts.reduce((s, v) => s + v.x, 0) / verts.length
      const cy = verts.reduce((s, v) => s + v.y, 0) / verts.length
      let sxx = 0,
        sxy = 0,
        syy = 0
      verts.forEach((v) => {
        const dx = v.x - cx,
          dy = v.y - cy
        sxx += dx * dx
        sxy += dx * dy
        syy += dy * dy
      })
      let angle = 0.5 * Math.atan2(2 * sxy, sxx - syy)
      const rightYs = []
      verts.forEach((v) => {
        const dx = v.x - cx,
          dy = v.y - cy
        const rx = dx * Math.cos(-angle) - dy * Math.sin(-angle)
        const ry = dx * Math.sin(-angle) + dy * Math.cos(-angle)
        if (rx > 0) rightYs.push(ry)
      })
      const avgY = rightYs.length
        ? rightYs.reduce((a, b) => a + b, 0) / rightYs.length
        : 0
      if (avgY < 0) angle += Math.PI
      return { angle, center: { x: cx, y: cy } }
    }

    function rot(pt, angle, center) {
      const dx = pt.x - center.x,
        dy = pt.y - center.y
      return {
        x: dx * Math.cos(-angle) - dy * Math.sin(-angle) + center.x,
        y: dx * Math.sin(-angle) + dy * Math.cos(-angle) + center.y
      }
    }
  }
</script>

<div class="viz-multi">
  {#each files as { dataPath, countPath }, i}
    <div class="viz-column">
      <div class="viz-title">{dataPath.replace(/-top1000\.json$/, '')}</div>
      <P5 bind:this={sketches[i]} sketch={createSketch(dataPath, countPath)} />
    </div>
  {/each}
</div>

<style>
  :global(body) {
    margin: 0;
    display: flex;
    flex-direction: row;
    width: 100vw;
    height: 100vh;
  }
  .viz-multi {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100vh;
  }
  .viz-column {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    border: 1px solid #ccc;
  }
  .viz-title {
    text-align: center;
    font-family: sans-serif;
    font-size: 14px;
    font-weight: bold;
    padding: 8px;
    background: rgb(254, 255, 190);
    border-bottom: 1px solid #ccc;
  }
  .viz-column canvas {
    flex: 1;
  }
</style>
