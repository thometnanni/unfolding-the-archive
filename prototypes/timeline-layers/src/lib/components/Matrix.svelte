<script>
  import { scaleTime, scaleLinear } from "d3-scale";
  import { timeFormat, timeParse, timeMonth, extent, max } from "d3";
  import { aciToHex } from "$lib/index.js";

  export let data;

  const squareSize = 8;
  const xPadding = 10;
  const yPadding = 10;
  const margin = { top: 60, left: 240 };
  const labelInterval = 1;

  let files = [];
  let layers = [];
  let entries = [];

  let chartW = 0;
  let chartH = 0;

  let xScale, yScale;
  let ticks = [];

  $: if (data && data.length) {
    files = data.map((d) => d.file.split("/").pop());

    const parsed = data.map((d) => ({
      ...d,
      parsedDate: d.creationDate ? new Date(d.creationDate) : null,
    }));

    const validDates = parsed.map((d) => d.parsedDate).filter(Boolean);
    const fallback = validDates.length ? max(validDates) : new Date();

    let miss = 0;
    parsed.forEach((d) => {
      if (!d.parsedDate) {
        d.parsedDate = new Date(fallback.getTime() + ++miss * 1000);
      }
    });

    entries = parsed.flatMap((d) =>
      d.layers.map((layer) => ({
        date: d.parsedDate,
        layerName: layer.name,
        color: aciToHex(layer.colorIndex || 0),
      }))
    );

    const freq = new Map();
    entries.forEach((e) => {
      freq.set(e.layerName, (freq.get(e.layerName) || 0) + 1);
    });

    layers = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
      .map((d) => d[0]);

    chartW = (data.length + 1) * xPadding;
    chartH = layers.length * yPadding;

    xScale = scaleTime()
      .domain(extent(parsed, (d) => d.parsedDate))
      .range([0, chartW]);

    yScale = scaleLinear()
      .domain([0, layers.length - 1])
      .range([0, chartH]);

    ticks = xScale.ticks(timeMonth.every(1));
  }

  function fileX(d) {
    return xScale(d.date);
  }

  function layerY(name) {
    return yScale(layers.indexOf(name));
  }

  const formatTick = timeFormat("%b %Y");
</script>

<div class="wrapper">
  <svg
    class="full-svg"
    width={margin.left + chartW}
    height={margin.top + chartH}
  >
    <!-- Ticks -->
    {#each ticks as t, i}
      {#if i % labelInterval === 0}
        <line
          x1={margin.left + xScale(t)}
          x2={margin.left + xScale(t)}
          y1={0}
          y2={margin.top + chartH}
          stroke="#eee"
        />
        <line
          x1={margin.left + xScale(t)}
          x2={margin.left + xScale(t)}
          y1={margin.top - 20}
          y2={margin.top}
          stroke="#000"
        />
        <text
          x={margin.left + xScale(t)}
          y={margin.top - 5}
          text-anchor="middle"
        >
          {formatTick(t)}
        </text>
      {/if}
    {/each}

    <!-- Layer labels -->
    {#each layers as layer, i}
      <text
        x={margin.left - 5}
        y={margin.top + yScale(i) + yPadding / 2}
        text-anchor="end"
        dominant-baseline="middle"
      >
        {layer}
      </text>
      <line
        x1={margin.left}
        x2={margin.left + chartW}
        y1={margin.top + yScale(i) + yPadding / 2}
        y2={margin.top + yScale(i) + yPadding / 2}
        stroke="#eee"
      />
    {/each}

    <!-- Dots -->
    {#each entries as e}
      <rect
        x={margin.left + fileX(e)}
        y={margin.top + layerY(e.layerName)}
        width={squareSize}
        height={squareSize}
        fill={e.color}
      />
    {/each}
  </svg>
</div>

<style>
  .wrapper {
    width: 100%;
    height: 100%;
    overflow: auto;
  }

  .full-svg {
    display: block;
    font-family: "Courier New", monospace;
    font-size: 10px;
  }

  text {
    font-size: 10px;
    fill: #333;
  }

  rect {
    shape-rendering: crispEdges;
  }

  line {
    stroke: #ccc;
  }

  :global(body) {
    margin: 0;
  }
</style>
