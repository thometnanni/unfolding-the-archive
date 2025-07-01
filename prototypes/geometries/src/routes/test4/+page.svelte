<script>
  import P5 from 'p5-svelte'

  const minVertices = 2
  const switchFrames = 5

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

  let showOverview = false

  function getRotationInfo(verts) {
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
    const rightYs = verts
      .map((v) => {
        const dx = v.x - cx,
          dy = v.y - cy
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
    const dx = pt.x - center.x,
      dy = pt.y - center.y
    return {
      x: dx * Math.cos(-angle) - dy * Math.sin(-angle) + center.x,
      y: dx * Math.sin(-angle) + dy * Math.cos(-angle) + center.y
    }
  }

  function createSketch(dataPath, countPath, showOverview) {
    let shapes = []
    let globalMaxDim = 1
    let idx = 0,
      lastFrame = 0

    return (p) => {
      p.preload = () => {
        p.loadJSON(dataPath, (data) => {
          shapes = Object.entries(data)
            .map(([id, obj]) => {
              if (
                !Array.isArray(obj.vertices) ||
                obj.vertices.length < minVertices
              )
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

              if (bounds.w === 0 && bounds.h === 0) {
                // console.log(bounds)
                return null
              }

              const dim = Math.max(bounds.w, bounds.h)
              return { id, verts, bounds, dim }
            })
            .filter(Boolean)

            .sort((a, b) => b.dim - a.dim)

          let allDims = shapes.map((s) => s.dim).sort((a, b) => a - b)
          let pctl = 0.98
          let pidx = Math.floor(pctl * (allDims.length - 1))
          globalMaxDim = allDims[pidx] || 1
        })
      }

      p.setup = () => {
        p.createCanvas(p.windowWidth / files.length, p.windowHeight - 30)
        if (showOverview) p.noLoop()
        else p.loop()
      }

      p.draw = () => {
        p.background(0, 0, 0)
        if (!shapes.length) return

        if (showOverview) {
          const numCols = 10
          const paddingFrac = 0.09
          const cellW = p.width / numCols

          let colHeights = Array(numCols).fill(0)
          let placements = []

          for (let i = 0; i < shapes.length; i++) {
            const shape = shapes[i]

            const shapeScale = (cellW * (1 - paddingFrac)) / shape.bounds.w
            const shapeH = shape.bounds.h * shapeScale + cellW * paddingFrac

            let col = colHeights.indexOf(Math.min(...colHeights))
            let x = col * cellW + cellW / 2
            let y = colHeights[col] + shapeH / 2
            placements.push({ x, y, shape, shapeH, shapeScale })
            colHeights[col] += shapeH
          }

          const neededH = Math.max(...colHeights)
          if (p.height !== neededH) p.resizeCanvas(p.width, neededH, true)

          for (let i = 0; i < placements.length; i++) {
            const { x, y, shape, shapeScale } = placements[i]
            const { verts, bounds } = shape
            p.push()
            p.translate(x, y)
            p.strokeWeight(2)
            p.noFill()
            p.stroke('white')
            
            // if (verts.length === 2) {
            //   p.stroke('red')
            // } else {
            //   p.stroke('white')
            // }

            p.beginShape()
            verts.forEach((pt) => {
              const drawX = (pt.x - (bounds.minX + bounds.w / 2)) * shapeScale
              const drawY = (pt.y - (bounds.minY + bounds.h / 2)) * shapeScale
              p.vertex(drawX, drawY)
            })
            p.endShape(p.CLOSE)

            p.pop()
          }
        } else {
          if (p.frameCount - lastFrame > switchFrames) {
            idx = (idx + 1) % shapes.length
            lastFrame = p.frameCount
          }
          const { verts, bounds } = shapes[idx]
          const dim = Math.max(bounds.w, bounds.h)
          const padding = 0.9
          const minSize = 300,
            maxSize = 1200
          const canvasSize = Math.min(p.width, p.height) * padding
          const shapeScale = p.constrain(
            canvasSize / dim,
            minSize / dim,
            maxSize / dim
          )

          p.push()
          p.translate(p.width / 2, p.height / 2)

          p.stroke('white')

          p.fill('white')
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
  }

  function toggleView() {
    showOverview = !showOverview
  }
</script>

<button class="toggle-btn" on:click={toggleView}>
  {showOverview ? 'Show Animation' : 'Show Overview'}
</button>

<div class="viz-multi">
  {#each files as { dataPath, countPath }, i}
    <div class="viz-column">
      <div class="viz-title">{dataPath.replace(/-top1000\.json$/, '')}</div>
      {#key showOverview}
        <P5 sketch={createSketch(dataPath, countPath, showOverview)} />
      {/key}
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
    font-family: Arial, Helvetica, sans-serif;
    background-color: rgb(0, 0, 0);
  }

  .toggle-btn {
    position: fixed;
    bottom: 10px;
    left: 10px;
    z-index: 99;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    z-index: 101;
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
    border-right: 1px solid #ccc;
  }
  .viz-title {
    position: sticky;
    top: 0;
    z-index: 100;
    text-align: center;
    font-family: sans-serif;
    font-size: 14px;
    font-weight: bold;
    padding: 8px;
    background: rgb(254, 255, 190);
    border-bottom: 1px solid #ccc;
  }
</style>
