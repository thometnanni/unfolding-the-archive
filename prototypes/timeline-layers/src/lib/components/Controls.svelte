<!-- src/lib/components/Controls.svelte -->
<script>
  import { createEventDispatcher } from "svelte";
  export let viewMode;
  export let searchTerm = "";
  export let data = [];
  export let baseFontSize = 12;

  const dispatch = createEventDispatcher();

  $: layerCounts = data
    .flatMap((d) => d.layers.map((ly) => ly.name))
    .reduce((acc, name) => {
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

  $: layersList = Object.keys(layerCounts)
    .map((name) => ({ name, count: layerCounts[name] }))
    .sort((a, b) => b.count - a.count);

  $: suggestions = layersList.filter((layer) =>
    layer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function selectLayer(layer) {
    dispatch("select", layer);
    searchTerm = layer.name;
  }

  function clearSearch() {
    searchTerm = "";
    dispatch("select", null);
  }

  function savePoster() {
    dispatch("save", { format: "A0" });
  }

  function changeMode(mode) {
    dispatch("mode", mode);
  }
</script>

<div class="controls">
  <div>
    <button
      class:active={viewMode === "compact"}
      on:click={() => (viewMode = "compact")}
    >
      Compact
    </button>
    <button
      class:active={viewMode === "extended"}
      on:click={() => (viewMode = "extended")}
    >
      Extended
    </button>

    <button on:click={savePoster}>Save Poster as PDF</button>

    <label>
      Font Size
      <input
        type="number"
        min="6"
        max="48"
        bind:value={baseFontSize}
      />
    </label>
  </div>

  <div class="search-box">
    <input
      type="text"
      placeholder="Search layers…"
      bind:value={searchTerm}
      on:input={() => dispatch("search", searchTerm)}
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

<style>
  .controls {
    height: 150px;
    display: flex;
    gap: 8px;
    padding: 8px;
    background: #f0f0f0;
    position: sticky;
    top: 0;
  }

  .controls button {
    margin: 4px;
  }

  .controls button.active {
    font-weight: bold;
  }

  .controls label {
    margin-left: 16px;
    font-size: 0.9rem;
  }

  .controls input[type="number"] {
    width: 60px;
    margin-left: 4px;
  }

  select {
    margin: 4px;
    padding: 4px;
  }

  .search-box {
    position: relative;
    flex: 1;
  }

  .search-box input {
    width: 100%;
    max-width: 400px;
    padding: 4px 8px;
    box-sizing: border-box;
  }

  .suggestions {
    max-width: 400px;
    margin: 0;
    padding: 0;
    list-style: none;
    background: #fff;
    max-height: 0;
    overflow-y: auto;
    transition: max-height 0.1s ease;
    z-index: 1;
  }

  .search-box:hover .suggestions {
    max-height: 100px;
  }

  .suggestions li {
    padding: 4px 8px;
    cursor: pointer;
  }

  .suggestions li:nth-child(odd) {
    background: #fff;
  }

  .suggestions li:nth-child(even) {
    background: #f9f9f9;
  }

  .suggestions li:hover {
    background: #e0e0e0;
  }

  .suggestions span {
    font-size: 0.6rem;
  }
</style>
