<script>
  import { onMount } from 'svelte'
  import Controls from '$lib/components/Controls.svelte'
  import Timeline from '$lib/components/Timeline.svelte'
  import { aciToHex } from '$lib/index.js'

  let data = []
  let viewMode = 'extended'
  let searchTerm = ''
  let baseFontSize = 12
  let paperSize = 'A4'

  $: usedAcis = Array.from(
    new Set(
      data.flatMap((item) =>
        item.layers
          ?.map((layer) => (layer.color === -1 ? 257 : layer.color))
          .filter((c) => c != null)
      )
    )
  ).sort((a, b) => a - b)

  $: aciLegend = usedAcis.map((aci) => ({ aci, name: `ACI ${aci}` }))

  $: title =
    data.length > 0
      ? data[0].path.split('/')[0].replace(/(^\w)/, (m) => m.toUpperCase())
      : ''

  onMount(async () => {
    const path = window.location.pathname
    const filename = path.split('/').pop()
    const jsonPath = `/${filename}.json`
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
      <Timeline {data} {viewMode} {searchTerm} {baseFontSize} />
    </div>

    <div class="info">
      <p>
        This timeline visualises the layers of AutoCAD files the <em>{title}</em
        > project. It displays the layers across different files, with each file
        represented as a row.
      </p>
      {#if searchTerm}
        <p class="search-info">
          Highlighted the layers named <strong>{searchTerm}</strong> and connected
          them with a line when they appear identically across multiple files.
        </p>
      {/if}
      <p>
        The colors follow the AutoCAD Color Index (ACI), which differentiates
        layers based on their function—such as structure, annotations, or
        construction details.
      </p>
      <div class="legend">
        <div class="legend-grid">
          {#each aciLegend as { aci, name }}
            <div>
              <span class="color-box" style="background-color: {aciToHex(aci)};"
              ></span>
              <span>{name}</span>
            </div>
          {/each}
        </div>
      </div>

      <h1 class="timeline-title">{title}</h1>
    </div>
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

  .info {
    background: rgba(255, 255, 255, 0.174);
    backdrop-filter: blur(1px);
    font-size: 0.7em;
    color: var(--grey-2);
    padding: 10px;
    margin-top: 10px;
    position: sticky;
    bottom: 50px;
    width: fit-content;
  }

  .info > * {
    max-width: 450px;
  }

  .legend-grid {
    display: grid;
    grid-auto-flow: column;
    grid-template-rows: repeat(3, 5px);
    justify-content: start;
    font-size: 0.6rem;
    gap: 10px;
    max-width: 100%;
    overflow: auto;
    padding: 10px 0;
  }

  .legend div > div {
    display: flex;
    align-items: top;
  }

  .color-box {
    width: 0.6rem;
    height: 0.6rem;
    border: .5px solid black;
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

  .info p {
    margin: 0;
    padding: 0;
    margin-bottom: 5px;
  }

  .info p.search-info {
    margin-bottom: 10px;
    max-width: 440px;
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

    .info {
      position: unset;
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
