<script>
  import P5 from 'p5-svelte'
  const minVertices = 6;

  const files = [
    {
      dataPath: 'TP 261 Markt Hall-top1000.json',
      countPath: 'TP 261 Markt Hall-top1000-count.json'
    },
    {
      dataPath: 'TP 255 Serpentine Gallery Pavilion-top1000.json',
      countPath: 'TP 255 Serpentine Gallery Pavilion-top1000-count.json'
    }
  ]

  let sketches = Array(files.length).fill(null)

  function getRotationInfo(verts) {
    const cx = verts.reduce((s, v) => s + v.x, 0) / verts.length
    const cy = verts.reduce((s, v) => s + v.y, 0) / verts.length
    let sxx = 0, sxy = 0, syy = 0
    verts.forEach((v) => {
      const dx = v.x - cx, dy = v.y - cy
      sxx += dx * dx
      sxy += dx * dy
      syy += dy * dy
    })
    let angle = 0.5 * Math.atan2(2 * sxy, sxx - syy)
    const rightYs = verts
      .map((v) => {
        const dx = v.x - cx, dy = v.y - cy
        const rx = dx * Math.cos(-angle) - dy * Math.sin(-angle)
        const ry = dx * Math.sin(-angle) + dy * Math.cos(-angle)
        return rx > 0 ? ry : null
      })
      .filter((ry) => ry !== null)
    if (
      rightYs.length &&
      rightYs.reduce((a, b) => a + b, 0) / rightYs.length < 0
    )
      angle += Math.PI
    return { angle, center: { x: cx, y: cy } }
  }

  function rotatePoint(pt, angle, center) {
    const dx = pt.x - center.x, dy = pt.y - center.y
    return {
      x: dx * Math.cos(-angle) - dy * Math.sin(-angle) + center.x,
      y: dx * Math.sin(-angle) + dy * Math.cos(-angle) + center.y
    }
  }

  const createSketch = (dataPath, countPath) => (p) => {
    let shapes = []

    p.preload = () => {
      p.loadJSON(dataPath, (data) => {
        shapes = Object.entries(data)
          .map(([id, obj]) => {
            if (!Array.isArray(obj.vertices) || obj.vertices.length < minVertices)
              return null
            const { angle, center } = getRotationInfo(obj.vertices)
            const verts = obj.vertices.map((pt) =>
              rotatePoint(pt, angle, center)
            )
            const xs = verts.map((pt) => pt.x)
            const ys = verts.map((pt) => pt.y)
            const bounds = {
              minX: Math.min(...xs),
              minY: Math.min(...ys),
              w: Math.max(...xs) - Math.min(...xs),
              h: Math.max(...ys) - Math.min(...ys)
            }
            return {
              id,
              verts,
              bounds
            }
          })
          .filter(Boolean)
          .sort((a, b) => b.verts.length - a.verts.length)
      })
    }

    p.setup = () => {
      p.createCanvas(p.windowWidth / files.length, p.windowHeight - 30)
      p.noLoop()
    }

    p.draw = () => {
      p.background(255)
      if (!shapes.length) return

      const cols = Math.ceil(Math.sqrt(shapes.length * (p.width / p.height)))
      const rows = Math.ceil(shapes.length / cols)
      const cellW = p.width / cols
      const cellH = p.height / rows
      const padding = 0.75

      for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i]
        const { verts, bounds } = shape
        const col = i % cols
        const row = Math.floor(i / cols)
        const centerX = col * cellW + cellW / 2
        const centerY = row * cellH + cellH / 2
        const dim = Math.max(bounds.w, bounds.h)
        const shapeScale = (Math.min(cellW, cellH) * padding) / dim

        p.push()
        p.translate(centerX, centerY)
        p.stroke(0)
        p.strokeWeight(0.5)
        p.noFill()
        p.noStroke()
        p.fill("blue")
        p.beginShape()
        verts.forEach((pt) => {
          const x = (pt.x - (bounds.minX + bounds.w / 2)) * shapeScale
          const y = (pt.y - (bounds.minY + bounds.h / 2)) * shapeScale
          p.vertex(x, y)
        })
        p.endShape(p.CLOSE)
        p.pop()
      }
    }

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth / files.length, p.windowHeight - 30)
      p.redraw()
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
</style>
