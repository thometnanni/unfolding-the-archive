<script>
  import { onMount } from "svelte";
  import { scaleTime, scaleLinear } from "d3-scale";
  import { stack, stackOrderNone, area, curveStep } from "d3-shape";
  import { timeFormat, timeParse } from "d3-time-format";
  import { extent, max } from "d3-array";
  import { aciToHex } from "$lib/index.js";

  export let data = [];

  const margin = { top: 5, right: 30, bottom: 60, left: 30 };
  const labelInterval = 1;

  let width = 0;
  let height = 0;

  let stackedData = [];
  let layerKeys = [];
  let series = [];

  function updateSize() {
    width = window.innerWidth;
    height = window.innerHeight;
    updateChart();
  }

  onMount(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  });

  $: if (data.length) {
    preprocessData();
    updateChart();
  }

  function preprocessData() {
    const timeFormatter = timeFormat("%Y-%m");
    const parseDate = timeParse("%Y-%m");

    const layerMap = new Map();

    data.forEach((proj) => {
      const date = new Date(proj.creationDate);
      const key = timeFormatter(date);

      if (!layerMap.has(key)) {
        layerMap.set(key, {});
      }

      const layerCounts = layerMap.get(key);

      proj.layers.forEach((layer) => {
        const idx = layer.colorIndex || 0;
        layerCounts[idx] = (layerCounts[idx] || 0) + 1;
      });
    });

    const allKeys = Array.from(
      new Set(Array.from(layerMap.values()).flatMap((obj) => Object.keys(obj)))
    ).sort((a, b) => +a - +b);

    const timeSortedKeys = Array.from(layerMap.keys()).sort();
    stackedData = timeSortedKeys.map((key) => {
      const date = parseDate(key);
      const base = { date };
      allKeys.forEach((k) => (base[k] = layerMap.get(key)[k] || 0));
      return base;
    });

    layerKeys = allKeys;
  }

  function updateChart() {
    if (!stackedData.length || !width || !height) return;

    const stackGen = stack().keys(layerKeys).order(stackOrderNone);

    series = stackGen(stackedData);
  }

  $: xScale = scaleTime()
    .domain(extent(stackedData, (d) => d.date))
    .range([margin.left, width - margin.right]);

  $: yScale = scaleLinear()
    .domain([0, max(series, (layer) => max(layer, (d) => d[1]))])
    .nice()
    .range([height - margin.bottom, margin.top]);

  $: areaGen = area()
    .x((d) => xScale(d.data.date))
    .y0((d) => yScale(d[0]))
    .y1((d) => yScale(d[1]))
    .curve(curveStep);
</script>

<svg {width} {height}>
  {#each series as layer}
    <path d={areaGen(layer)} fill={aciToHex(+layer.key)} opacity="0.9" />
  {/each}

  <!-- X-axis baseline -->
  <line
    x1={margin.left}
    x2={width - margin.right}
    y1={height - margin.bottom}
    y2={height - margin.bottom}
    stroke="#000"
  />

  <!-- Date ticks and labels -->
  {#each stackedData as d, i}
    {#if i % labelInterval === 0}
      <line
        x1={xScale(d.date)}
        x2={xScale(d.date)}
        y1={height - margin.bottom}
        y2={height - margin.bottom + 8}
        stroke="#000"
      />
      <text
        x={xScale(d.date)}
        y={height - margin.bottom + 20}
        text-anchor="middle"
        font-size="12"
      >
        {timeFormat("%b %Y")(d.date)}
      </text>
    {/if}
  {/each}
</svg>

<style>
  svg {
    display: block;
    font-family: sans-serif;
  }

  text {
    fill: #333;
    dominant-baseline: middle;
  }

  path {
    stroke: none;
  }

  :global(body) {
    margin: 0;
    overflow: hidden;
  }
</style>
