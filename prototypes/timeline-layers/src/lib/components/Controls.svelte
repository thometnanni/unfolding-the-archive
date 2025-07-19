<script>
  import { createEventDispatcher } from 'svelte'
  export let viewMode
  export let searchTerm = ''
  export let data = []
  export let baseFontSize = 12
  export let paperSize = 'A4'

  const dispatch = createEventDispatcher()

  $: layerCounts = data
    .flatMap((d) => d.layers.map((ly) => ly.name))
    .reduce((acc, name) => {
      acc[name] = (acc[name] || 0) + 1
      return acc
    }, {})

  $: layersList = Object.keys(layerCounts)
    .map((name) => ({ name, count: layerCounts[name] }))
    .sort((a, b) => b.count - a.count)

  $: suggestions = layersList.filter((layer) =>
    layer.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function selectLayer(layer) {
    dispatch('select', layer)
    searchTerm = layer.name
  }

  function savePoster() {
    dispatch('save', { paperSize })
  }
</script>

<div class="controls">
  <div class="controls-left">
    <button
      class:active={viewMode === 'compact'}
      on:click={() => (viewMode = 'compact')}
    >
      Compact
    </button>
    <button
      class:active={viewMode === 'extended'}
      on:click={() => (viewMode = 'extended')}
    >
      Extended
    </button>

    <div class="search-box">
      <input
        type="text"
        placeholder="Search layers…"
        bind:value={searchTerm}
        on:input={() => dispatch('search', searchTerm)}
      />
      <ul class="suggestions">
        {#each suggestions as layer}
          <li on:click={() => selectLayer(layer)}>
            {layer.name} <span>({layer.count})</span>
          </li>
        {/each}
      </ul>
    </div>
  </div>

  <div class="controls-right">
    Font Size
    <input
      type="number"
      min="6"
      max="24"
      bind:value={baseFontSize}
      on:input={() => {
        if (baseFontSize < 6) baseFontSize = 6
        if (baseFontSize > 24) baseFontSize = 24
      }}
    />
    <button on:click={savePoster}>Save as PDF</button>
  </div>
</div>

<style>
  .controls {
    height: 46px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--highlight);
    position: sticky;
    bottom: 0;
    z-index: 1;
    justify-content: space-between;
  }

  .controls-left {
    display: flex;
    align-items: center;
  }

  .controls-right {
    display: flex;
    align-items: center;
  }

  .search-box {
    position: relative;
    flex: 1;
    margin: 0 20px;
    min-width: 300px;
    max-width: 400px;
  }

  .search-box input {
    width: 100%;
    min-width: 200px;
    max-width: 400px;
    padding: 4px 8px;
    box-sizing: border-box;
  }

  .controls * {
    font-size: 1rem;
  }

  .controls button {
    margin: 4px;
  }

  .controls button.active {
    font-weight: bold;
  }

  .controls label {
    /* margin-left: 16px; */
    /* font-size: 0.9rem; */
  }

  .controls input[type='number'] {
    /* width: 60px; */
    color: black;
    margin-left: 4px;
  }

  .search-box {
    position: relative;
    /* flex: 1; */
  }

  .search-box input {
    width: 100%;
    min-width: 350px;
    max-width: 400px;
    padding: 4px 8px;
    box-sizing: border-box;
  }

  .suggestions {
    position: absolute;
    bottom: 100%;
    left: 0;
    right: 0;
    z-index: 9999;
    max-width: 400px;
    margin: 0;
    padding: 0;
    list-style: none;
    background: #fff;
    max-height: 0;
    overflow-y: hidden;
    transition: max-height 0.2s ease;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  }

  .search-box:hover .suggestions {
    max-height: 90vh;
    overflow: scroll;
  }

  .suggestions li {
    padding: 4px 8px;
    cursor: pointer;
  }

  .suggestions li:nth-child(odd) {
    background: var(--grey-1);
  }

  .suggestions li:nth-child(even) {
    background: var(--grey-3);
  }

  .suggestions li:hover {
    background: var(--grey-2);
  }

  .suggestions span {
    /* font-size: 0.6rem; */
  }
</style>
