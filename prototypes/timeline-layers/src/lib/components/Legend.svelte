<script>
  export let title = ''
  export let searchTerm = ''
  export let aciLegend = []
</script>

<div class="info">
  <p>
    This timeline visualises the layers of AutoCAD files in the <em>{title}</em>
    project. It displays the layers across different files, with each file represented
    as a row.
  </p>
  {#if searchTerm}
    <p class="search-info">
      Highlighted the layers named <strong>{searchTerm}</strong> and connected them
      with a line when they appear identically across multiple files.
    </p>
  {/if}
  <p>
    The colors follow the AutoCAD Color Index (ACI), which differentiates layers
    based on their function—such as structure, annotations, or construction
    details.
  </p>
  <div class="legend">
    <div class="legend-grid">
      {#each aciLegend as { aci, name, lineweight_mm, hex }}
        <div>
          <span class="color-box" style="background-color: {hex};"></span>
          <span>{lineweight_mm || name}</span>
        </div>
      {/each}
    </div>
  </div>
  <h1 class="timeline-title">{title}</h1>
</div>

<style>
  .info {
    font-size: 0.8em;
    color: var(--grey-2);
    padding: 10px;
    margin-top: 10px;
    position: sticky;
    bottom: 50px;
    width: fit-content;
    /* backdrop-filter: blur(1px); */
    text-shadow:
      0 0 10px white,
      0 0 10px white,
      0 0 10px white,
      0 0 10px white,
      0 0 10px white,
      0 0 10px white,
      0 0 10px white,
      0 0 10px white,
      0 0 10px white,
      0 0 10px white,
      0 0 10px white,
      0 0 10px white,
      0 0 10px white,
      0 0 10px white,
      0 0 10px white,
      0 0 10px white;
  }
  .info > p {
    max-width: 450px;
  }
  .legend-grid {
    display: grid;
    grid-auto-flow: column;
    grid-template-rows: repeat(3, 5px);
    justify-content: start;
    font-size: 8px;
    gap: 10px;
  }
  .legend div > div {
    max-width: 100px;
    width: fit-content;
    display: flex;
    align-items: top;
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
  .info p {
    margin: 0;
    padding: 0;
    margin-bottom: 5px;
  }
  .info p.search-info {
    margin-bottom: 10px;
    max-width: 440px;
  }
</style>
