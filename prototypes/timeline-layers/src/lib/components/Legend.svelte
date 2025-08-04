<script>
  export let title = ''
  export let searchTerm = ''
  export let aciLegend = []
</script>

<div class="info">
  <p class="description">
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
  <p class="aci-info">
    The colors follow the AutoCAD Color Index (ACI), which differentiates layers
    based on their function. Faded layers represent those that are hidden.
  </p>
  <!--
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
  -->
  <h1 class="timeline-title">{title}</h1>
</div>

<style>
  .info {
    font-size: .8rem;
    color: var(--grey-2);
    padding: 10px;
    margin-top: 10px;
    position: sticky;
    bottom: 30px;

    margin-left: auto;
    margin-right: 0;
    width: fit-content;
    /* text-align: right; */
  }

  .info > * {
    background-color: rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(1px);
  }

  .timeline-title {
    color: black;
    font-size: 2.8rem;
    line-height: 0.95;
    font-weight: normal;
    margin: 5px 0 2px 0;
    text-align: right;
    word-break: break-word;
  }

  .description {
    /* text-align: right; */
    max-width: 380px;
    width: 100%;
    margin: 0 0 8px 0;
    padding: 0;
    margin-left: auto;
  }

  .search-info,
  .aci-info {
    /* text-align: right; */
    max-width: 320px;
    hyphens: auto;
    text-wrap: balance;
    width: 100%;
    margin: 0 0 8px 0;
    padding: 0;
    margin-left: auto;
  }

  .search-info {
    font-weight: 500;
    color: var(--grey-1);
    margin-bottom: 10px;
  }
</style>
