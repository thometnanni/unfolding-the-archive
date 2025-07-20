<script>
  import { onMount } from 'svelte'
  import Controls from '$lib/components/Controls.svelte'
  import Timeline from '$lib/components/Timeline.svelte'
  import Legend from '$lib/components/Legend.svelte'

  import { aciToHex } from '$lib/index.js'
  import { page } from '$app/stores'

  let data = []
  let viewMode = 'compact'
  let searchTerm = ''
  let baseFontSize = 12
  let paperSize = 'A4'
  let ctbData = null

  $: slug = $page.params.slug
  // $: ctbPath = $page.url.searchParams.get('ctb')
  // const ctbPath = url.searchParams.get('ctb')
  let ctbPath = null

  $: if (ctbPath) {
    loadCtbData(ctbPath)
  }

  async function loadCtbData(ctbPath) {
    const jsonPath = `../data/${ctbPath}.json`
    try {
      const res = await fetch(jsonPath)
      if (res.ok) {
        const raw = await res.json()
        ctbData = raw.styles || raw
      }
    } catch (err) {
      console.error('Failed to load CTB:', err)
    }
  }

  $: usedAcis = Array.from(
    new Set(
      data.flatMap((item) =>
        item.layers
          ?.map((layer) => (layer.color === -1 ? 257 : layer.color))
          .filter((c) => c != null)
      )
    )
  ).sort((a, b) => a - b)

  $: ctbMap = ctbData ? new Map(ctbData.map((s) => [s.aci, s])) : new Map()

  // $: console.log(ctbMap)

  $: aciLegend = usedAcis.map((aci) => {
    const style = ctbMap.get(aci)
    return {
      aci,
      name: style?.localized_name || `ACI ${aci}`,
      hex: style?.color_hex || aciToHex(aci),
      lineweight_mm: style?.lineweight_mm || undefined
    }
  })

  // $: title = data.length > 0 ? data[0].path.split('/')[0].replace(/(^\w)/, (m) => m.toUpperCase()) : ''
  $: title = $page.params.slug
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/(^\w)/, (m) => m.toUpperCase())
  // $:console.log(title)

  onMount(async () => {
    const path = window.location.pathname
    ctbPath = new URLSearchParams(window.location.search).get('ctb')

    const filename = path.split('/').pop()
    const jsonPath = `../data/${filename}.json`
    try {
      const res = await fetch(jsonPath)
      if (res.ok) {
        const raw = await res.json()

        // remove duplicates based on 'path'
        const seen = new Set()
        data = raw.filter((item) => {
          if (seen.has(item.path)) return false
          seen.add(item.path)
          return item.layers && item.layers.length > 0
        })
      }
    } catch (err) {
      console.error(`Error fetching ${jsonPath}:`, err)
    }
  })

  function handleSave(event) {
    window.print()
  }

  function handleModeChange(event) {
    viewMode = event.detail
  }

  function handleSearch(event) {
    searchTerm = event.detail
  }

  function handlePaperChange(event) {
    paperSize = event.detail.paperSize
  }

  function handleFontSizeChange(event) {
    baseFontSize = event.detail
  }
</script>

{#if data.length > 0}
  <article class="poster {paperSize}">
    <div class="timeline-wrapper">
      <Timeline {data} {viewMode} {searchTerm} {baseFontSize} {ctbData} />
    </div>

    <Legend {title} {searchTerm} {aciLegend} />

    <Controls
      bind:baseFontSize
      bind:viewMode
      bind:searchTerm
      bind:paperSize
      {data}
      on:save={handleSave}
      on:mode={handleModeChange}
      on:search={handleSearch}
    />
  </article>
{:else}
  <p>Loading timeline…</p>
{/if}

<style>
  .poster {
    display: flex;
    flex-direction: column;
    margin: 0 auto;
  }

  .timeline-wrapper {
    overflow: auto;
    margin: 0;
  }

  .legend-grid {
    display: grid;
    grid-auto-flow: column;
    grid-template-rows: repeat(3, 5px);
    justify-content: start;
    font-size: 8px;
    gap: 10px;
    /* overflow: auto; */
    /* padding: 10px 0; */
  }

  .color-box {
    width: 0.6rem;
    height: 0.6rem;
    border: 0.5px solid black;
    margin-right: 5px;
    flex-shrink: 0;
  }

  .timeline-title {
    color: black;
    max-width: 950px;
    font-size: 3.5em;
    line-height: 0.8;
    font-weight: normal;
    margin: 15px 0 2px 0;
  }

  p {
    margin: 10px;
  }

  @media print {
    :global(html),
    :global(body) {
      margin: 0;
      padding: 0;
      overflow: visible;
    }

    .poster.A4 {
      width: 297mm;
    }

    .poster.A3 {
      width: 420mm;
    }

    .poster.A2 {
      width: 594mm;
    }

    .poster.A1 {
      width: 841mm;
    }

    .poster.A0 {
      width: 1189mm;
    }

    :global(.controls) {
      display: none !important;
    }

    .poster {
      width: auto !important;
      height: auto !important;
      overflow: visible !important;
      margin: 0;
      padding: 0;
      position: relative;
    }

    :global(.info) {
      position: relative !important;
    }

    .timeline-wrapper {
      overflow: visible !important;
      margin: 0;
      padding: 0;
    }

    :global(.axis-container) {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      overflow: visible !important;
      margin: 0;
      padding: 0;
    }

    :global(.rows-container) {
      overflow: visible !important;
      margin: 0;
      padding: 0;
    }

    :global(.rows-container svg),
    :global(.proj-label),
    :global(.layer-text) {
      page-break-inside: avoid;
    }

    .A4 {
      page: A4;
    }
    .A3 {
      page: A3;
    }
    .A2 {
      page: A2;
    }
    .A1 {
      page: A1;
    }
    .A0 {
      page: A0;
    }
  }

  @page A4 {
    size: A4 landscape;
    margin: 0;
  }
  @page A3 {
    size: A3 landscape;
    margin: 0;
  }
  @page A2 {
    size: A2 landscape;
    margin: 0;
  }
  @page A1 {
    size: A1 landscape;
    margin: 0;
  }
  @page A0 {
    size: A0 landscape;
    margin: 0;
  }
</style>
