<script lang="ts">
  import FileStructure from '../../../../output/file-structure.json'
  import { scaleLinear } from 'd3-scale'

  const files = FileStructure.filter(({ isFile }) => isFile).map((file) => {
    const date = new Date(file.birthtime!)
    const seconds =
      date.getHours() * 60 * 60 + date.getMinutes() * 60 + date.getSeconds()
    return {
      ...file,
      date,
      seconds,
      hours: seconds / (60 * 60),
      day: file.birthtime! - seconds * 1000
    }
  })

  let chartHeight = $state(0)
  let chartWidth = $state(0)

  let axisWidth = 50
  let paddingTop = 50
  let paddingBottom = 50
  let paddingRight = 50
  let paddingLeft = 50

  let innerChartHeight = $derived(chartHeight - paddingTop - paddingBottom)
  let innerChartWidth = $derived(
    chartWidth - paddingLeft - paddingRight - axisWidth
  )

  const days = files.map(({ day }) => day)
  const minDay = Math.min(...days)
  const maxDay = Math.max(...days)

  const scaleY = $derived(
    scaleLinear().domain([0, 24]).range([0, innerChartHeight])
  )
  const scaleX = $derived(
    scaleLinear().domain([minDay, maxDay]).range([0, innerChartWidth])
  )

  const fileTypes = ['drawing', 'image', 'document', 'other']

  const getColorFromFileType = (fileType: string) => {
    switch (fileType) {
      case 'drawing':
        return '#00f'
      case 'document':
        return '#ff0'
      case 'image':
        return '#f00'
      default:
        return '#aaa'
    }
  }

  const labeledTicks = [0, 6, 12, 18, 24]
  let yTicks = $derived(
    '-'
      .repeat(24)
      .split('-')
      .map((_, tick) => {
        const y = scaleY(tick)
        return {
          value: tick,
          showLabel: labeledTicks.includes(tick),
          y
        }
      })
  )

  function formatHour(hour: number) {
    return `${hour < 10 ? '0' : ''}${hour.toFixed()}:00`
  }
</script>

<svg
  height="100%"
  width="100%"
  bind:clientWidth={chartWidth}
  bind:clientHeight={chartHeight}
>
  <g transform="translate({paddingLeft + axisWidth}, {paddingTop})">
    {#each files as file}
      <circle
        cx={scaleX(file.day)}
        cy={scaleY(file.hours)}
        r="2.5"
        opacity="0.05"
        fill={getColorFromFileType(file.type!)}
      />
    {/each}
  </g>

  <g transform="translate({paddingLeft},{paddingTop})">
    {#each yTicks as tick}
      <g transform="translate(0,{tick.y})" class="text-xs opacity-70">
        <line
          x1={axisWidth}
          x2={axisWidth + innerChartWidth}
          y1="0"
          y2="0"
          stroke="black"
          opacity={tick.showLabel ? 0.3 : 0.1}
        />

        {#if tick.showLabel}
          <text
            x=""
            text-anchor="start"
            dominant-baseline="middle"
            class="fill-current"
          >
            {formatHour(tick.value)}
          </text>
        {/if}
      </g>
    {/each}
  </g>
</svg>
<div class="key">
  {#each fileTypes as fileType}
    <div class="item">
      <div
        class="rect"
        style="background:{getColorFromFileType(fileType)}"
      ></div>
      {fileType}
    </div>
  {/each}
</div>

<style>
  svg {
    display: block;
  }

  .key {
    margin: 0 50px 25px 50px;
    display: flex;
    gap: 18px;
    font-size: 14px;

    .item {
      display: flex;
      gap: 6px;
      align-items: center;
      .rect {
        width: 14px;
        height: 8px;
      }
    }
  }
</style>
