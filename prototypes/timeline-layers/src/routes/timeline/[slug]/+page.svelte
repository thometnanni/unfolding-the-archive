<script>
  import { onMount } from "svelte";
  import Controls from "$lib/components/Controls.svelte";
  import Timeline from "$lib/components/Timeline.svelte";

  let data = [];
  let viewMode = "extended";
  let searchTerm = "";
  let baseFontSize = 12;

  $: title =
    data.length > 0
      ? data[0].path.split("/")[0].replace(/(^\w)/, (m) => m.toUpperCase())
      : "";

  onMount(async () => {
    const path = window.location.pathname;
    const filename = path.split("/").pop();
    const jsonPath = `/${filename}.json`;
    try {
      const res = await fetch(jsonPath);
      if (res.ok) {
        data = await res.json();
      }
    } catch (err) {
      console.error(`Error fetching ${jsonPath}:`, err);
    }
  });

  function handleSave(event) {
    window.print();
  }
</script>

{#if data.length > 0}
  <Controls
    bind:baseFontSize
    bind:viewMode
    bind:searchTerm
    {data}
    on:save={handleSave}
  />

  <article class="poster">
    <div class="timeline-wrapper">
      <Timeline {data} {viewMode} {searchTerm} {baseFontSize} />
    </div>

    <div class="info">
      <h1 class="timeline-title">{title}</h1>
      <div>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Quibusdam velit
        reprehenderit facilis vitae nisi temporibus nemo eius culpa, facere
        quasi! Dolores placeat quam quo ea mollitia, cum praesentium sunt eius.
      </div>
    </div>
  </article>
{:else}
  <p>Loading timeline…</p>
{/if}

<style>
  .poster {
    display: flex;
    flex-direction: column;
  }

  .timeline-wrapper {
    overflow: auto;
    margin: 0;
  }

  .info {
    /* background-color: #f0f0f0; */
    padding: 10px;
    margin-top: 10px;
    /* min-height: 400px; */
  }

  .info > * {
    max-width: 450px;
  }

  .timeline-title {
    font-size: 1.5em;
    font-weight: normal;
    margin: 0 0 10px 0;
  }

  p {
    margin: 10px;
  }

  @page {
    size: A4 landscape;
    margin: 0;
  }

  @media print {
    :global(html),
    :global(body) {
      margin: 0;
      padding: 0;
      overflow: visible;
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
  }
</style>
