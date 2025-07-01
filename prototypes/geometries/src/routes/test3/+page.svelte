<script>
  import P5 from 'p5-svelte'

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

  function resampleVerts(verts, n = 128) {
    const total = verts.length
    return Array.from({ length: n }, (_, i) => {
      const idx = (i * total) / n
      const idx0 = Math.floor(idx)
      const idx1 = (idx0 + 1) % total
      const frac = idx - idx0
      const x = verts[idx0].x * (1 - frac) + verts[idx1].x * frac
      const y = verts[idx0].y * (1 - frac) + verts[idx1].y * frac
      return { x, y }
    })
  }

  function interpolateVerts(vertsA, vertsB, t) {
    return vertsA.map((a, i) => {
      const b = vertsB[i]
      return {
        x: a.x * (1 - t) + b.x * t,
        y: a.y * (1 - t) + b.y * t
      }
    })
  }

  const createSketch = (dataPath, countPath) => (p) => {
    let shapes = []
    const RESAMPLED_N = 128
    const minPts = 2 // reduced it to get em all

    let idxA = 0
    let idxB = 1
    let interpT = 0
    const morphSpeed = 0.01
    const padding = 0.8
    const minSize = 100
    const maxSize = 800
    let globalMaxDim = 1

    p.preload = () => {
      p.loadJSON(dataPath, (data) => {
        shapes = Object.entries(data)
          .map(([id, obj]) => {
            if (!Array.isArray(obj.vertices) || obj.vertices.length < minPts)
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
              resampledVerts: resampleVerts(verts, RESAMPLED_N),
              bounds
            }
          })
          .filter(Boolean)
        globalMaxDim = Math.max(
          ...shapes.map((s) => Math.max(s.bounds.w, s.bounds.h)),
          1
        )
      })
    }

    p.setup = () => {
      p.createCanvas(p.windowWidth / files.length, p.windowHeight - 30, p.WEBGL)
      p.frameRate(60)
    }

    p.draw = () => {
      p._renderer.GL.disable(p._renderer.GL.DEPTH_TEST)
      p.push()
      p.resetMatrix()
      p.noStroke()
      p.fill(255, 10)
      p.rectMode(p.CORNER)
      p.translate(-p.width / 2, -p.height / 2, 0)
      p.rect(0, 0, p.width, p.height)
      p.pop()
      p._renderer.GL.enable(p._renderer.GL.DEPTH_TEST)

    //   if (shapes.length < 2) return

      interpT += morphSpeed
      if (interpT >= 1) {
        interpT = 0
        idxA = idxB
        idxB =
          (idxB + 1 + Math.floor(Math.random() * (shapes.length - 1))) %
          shapes.length
        if (idxA === idxB) idxB = (idxB + 1) % shapes.length
      }

      const vertsA = shapes[idxA].resampledVerts
      const vertsB = shapes[idxB].resampledVerts
      const interpVerts = interpolateVerts(vertsA, vertsB, interpT)

      const xs = interpVerts.map((pt) => pt.x)
      const ys = interpVerts.map((pt) => pt.y)
      const minX = Math.min(...xs),
        maxX = Math.max(...xs)
      const minY = Math.min(...ys),
        maxY = Math.max(...ys)
      const dim = Math.max(maxX - minX, maxY - minY)
      const canvasSize = Math.min(p.width, p.height) * padding
      const shapeScale = p.constrain(
        canvasSize / dim,
        minSize / dim,
        maxSize / dim
      )
      const thickness = 10

      p.push()
      p.translate(0, 0, 0)
      p.rotateY(p.frameCount * 0.008)
      p.stroke(0)
      p.noFill()

      for (let dz of [-thickness / 2, thickness / 2]) {
        p.beginShape()
        interpVerts.forEach((pt) => {
          const x = (pt.x - (minX + (maxX - minX) / 2)) * shapeScale
          const y = (pt.y - (minY + (maxY - minY) / 2)) * shapeScale
          p.vertex(x, y, dz)
        })
        p.endShape(p.CLOSE)
      }

      p.stroke('blue')
      p.noFill()
      for (let i = 0; i < interpVerts.length; i++) {
        let j = (i + 1) % interpVerts.length
        const pt1 = interpVerts[i]
        const pt2 = interpVerts[j]
        const x1 = (pt1.x - (minX + (maxX - minX) / 2)) * shapeScale
        const y1 = (pt1.y - (minY + (maxY - minY) / 2)) * shapeScale
        const x2 = (pt2.x - (minX + (maxX - minX) / 2)) * shapeScale
        const y2 = (pt2.y - (minY + (maxY - minY) / 2)) * shapeScale
        p.beginShape()
        p.vertex(x1, y1, -thickness / 2)
        p.vertex(x2, y2, -thickness / 2)
        p.vertex(x2, y2, +thickness / 2)
        p.vertex(x1, y1, +thickness / 2)
        p.endShape(p.CLOSE)
      }

      p.pop()
    }

    p.windowResized = () => {
      p.resizeCanvas(p.windowWidth / files.length, p.windowHeight - 30)
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
