<script>
  import P5 from 'p5-svelte'

  let sketch = (p) => {
    let geom, rawCounts, countMap = {}
    let shapes = []
    let idx = 0, last = 0
    const switchFrames = 60 // next shape every second
    const paddingFactor = 0.8
    const minSize = 50, maxSize = 400
    let globalMaxDim = 1

    p.preload = () => {
      geom = p.loadJSON('geometries.json')
      rawCounts = p.loadJSON('geometries-count.json')
    }

    p.setup = () => {
      p.createCanvas(p.windowWidth, p.windowHeight)
      if (!geom || !rawCounts) return

      const entries = Array.isArray(rawCounts)
        ? rawCounts
        : Object.entries(rawCounts).map(([_, v]) => v)
      countMap = Object.fromEntries(
        entries.filter((e) => Array.isArray(e) && e.length === 2)
      )

      shapes = Object.entries(geom)
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

      if (shapes.length)
        globalMaxDim = Math.max(...shapes.map(s => Math.max(s.bounds.w, s.bounds.h)))
    }

    p.draw = () => {
      p.background(255)
      if (!shapes.length) return
      if (p.frameCount - last > switchFrames) {
        idx = (idx + 1) % shapes.length
        last = p.frameCount
      }

      const { id, verts, bounds } = shapes[idx]
      const info = countMap[id] || {}
      const fileCount = info.count || 0
      const files = info.files || []

      // Split screen
      const halfW = p.width / 2
      const halfH = p.height

      // NORMALIZED VIEW (left)
      {
        const dim = Math.max(bounds.w, bounds.h)
        const baseScale = halfW * paddingFactor / dim
        const minScale = minSize / dim
        const maxScale = maxSize / dim
        const shapeScale = Math.min(Math.max(baseScale, minScale), maxScale)

        p.push()
        p.translate(halfW / 2, halfH / 2)
        p.stroke('blue'); p.strokeWeight(2); p.noFill()
        p.beginShape()
        verts.forEach((pt) => {
          const x = (pt.x - (bounds.minX + bounds.w / 2)) * shapeScale
          const y = (pt.y - (bounds.minY + bounds.h / 2)) * shapeScale
          p.vertex(x, y)
        })
        p.endShape(p.CLOSE)
        p.pop()

        p.fill(0)
        p.noStroke()
        p.textAlign(p.CENTER, p.TOP)
        p.textSize(16)
        p.text('Normalized', halfW / 2, 18)
        p.textSize(13)
        p.text(`Files: ${fileCount}`, halfW / 2, 40)
        p.textSize(10)
        if (files.length) {
          files.forEach((f, i) => p.text(f, halfW / 2, 60 + i * 14))
        }
      }

      // PROPORTIONAL VIEW (right)
      {
        const dim = Math.max(bounds.w, bounds.h)
        const shapeScale = halfW * paddingFactor / globalMaxDim

        // reference box
        p.push()
        p.translate(halfW + halfW / 2, halfH / 2)
        p.stroke(230)
        p.noFill()
        p.rect(
          -globalMaxDim / 2 * shapeScale,
          -globalMaxDim / 2 * shapeScale,
          globalMaxDim * shapeScale,
          globalMaxDim * shapeScale
        )
        p.pop()

        // shape
        p.push()
        p.translate(halfW + halfW / 2, halfH / 2)
        p.stroke('blue'); p.strokeWeight(2); p.noFill()
        p.beginShape()
        verts.forEach((pt) => {
          const x = (pt.x - (bounds.minX + bounds.w / 2)) * shapeScale
          const y = (pt.y - (bounds.minY + bounds.h / 2)) * shapeScale
          p.vertex(x, y)
        })
        p.endShape(p.CLOSE)
        p.pop()

        // info
        p.fill(0)
        p.noStroke()
        p.textAlign(p.CENTER, p.TOP)
        p.textSize(16)
        p.text('Proportional', halfW + halfW / 2, 18)
        p.textSize(13)
        p.text(`Files: ${fileCount}`, halfW + halfW / 2, 40)
        p.textSize(10)
        if (files.length) {
          files.forEach((f, i) => p.text(f, halfW + halfW / 2, 60 + i * 14))
        }
      }
    }

    p.windowResized = () => p.resizeCanvas(p.windowWidth, p.windowHeight)

    function rotInfo(verts) {
      const cx = verts.reduce((s, v) => s + v.x, 0) / verts.length
      const cy = verts.reduce((s, v) => s + v.y, 0) / verts.length
      let sxx = 0, sxy = 0, syy = 0
      verts.forEach(v => {
        const dx = v.x - cx, dy = v.y - cy
        sxx += dx * dx; sxy += dx * dy; syy += dy * dy
      })
      let angle = 0.5 * Math.atan2(2 * sxy, sxx - syy)
      const rightYs = []
      verts.forEach(v => {
        const dx = v.x - cx, dy = v.y - cy
        const rx = dx * Math.cos(-angle) - dy * Math.sin(-angle)
        const ry = dx * Math.sin(-angle) + dy * Math.cos(-angle)
        if (rx > 0) rightYs.push(ry)
      })
      const avgY = rightYs.length ? rightYs.reduce((a, b) => a + b, 0) / rightYs.length : 0
      if (avgY < 0) angle += Math.PI
      return { angle, center: { x: cx, y: cy } }
    }

    function rot(pt, angle, center) {
      const dx = pt.x - center.x, dy = pt.y - center.y
      return {
        x: dx * Math.cos(-angle) - dy * Math.sin(-angle) + center.x,
        y: dx * Math.sin(-angle) + dy * Math.cos(-angle) + center.y
      }
    }
  }
</script>

<style>
  :global(body) { margin: 0 }
  .viz-container { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; overflow: hidden }
</style>

<div class="viz-container">
  <P5 {sketch} />
</div>
