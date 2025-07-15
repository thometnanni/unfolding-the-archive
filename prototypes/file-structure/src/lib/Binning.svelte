<script lang="ts">
  import FileStructure from '../../static/file-structure-TP_377_Boijmans.json' assert { type: 'json' }

  type FileStructureType = typeof FileStructure
  // type FileStructureEntry = FileStructureType[number]
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
      day: Math.floor(file.birthtime! / (1000 * 60 * 60 * 24))
    }
  })

  const yBinSize = 0.25
  const xBinSize = 1

  let chartHeight = $state(0)

  // let chartWidth = $state(0)

  let axisWidth = 50
  let paddingTop = 50
  let paddingBottom = 50
  let paddingRight = 50
  let paddingLeft = 50

  const days = files.map(({ day }) => day)
  const minDay = Math.min(...days)
  const maxDay = Math.max(...days)
  const diffDay = maxDay - minDay

  console.log(minDay, maxDay)

  let innerChartHeight = $derived(chartHeight - paddingTop - paddingBottom)
  // let innerChartWidth = $derived(
  //   chartWidth - paddingLeft - paddingRight - axisWidth
  // )

  let innerChartWidth = $derived(diffDay * 10)
  let chartWidth = $derived(
    innerChartWidth + paddingLeft + paddingRight + axisWidth
  )

  let binHeight = $derived(innerChartHeight / (24 / yBinSize) - 3)

  const scaleY = $derived(
    scaleLinear().domain([0, 24]).range([0, innerChartHeight])
  )
  const scaleX = $derived(
    scaleLinear().domain([minDay, maxDay]).range([0, innerChartWidth])
  )

  let xBins = $derived(
    '-'
      .repeat(diffDay)
      .split('-')
      .map((_, tick) => {
        const day = tick + minDay
        const date = new Date(day * 1000 * 60 * 60 * 24)
        const isFirstOfYear = date.getMonth() === 0 && date.getDate() === 1
        const isFirstOfMonth = date.getDate() === 1
        const isFirstOfWeek = date.getDay() === 1
        const month =
          isFirstOfMonth &&
          (() => {
            const match = date.toDateString().match(/(...)\s[0-9]{2}\s[0-9]{4}/)
            return match && match[1]
          })()
        const year = `${date.getFullYear()}`.slice(2)
        const label = isFirstOfMonth && `${month} ${isFirstOfYear ? year : ''}`
        const x = scaleX(tick + minDay)

        let yBins: { [key: number]: FileStructureType } = {}
        // const yBinCount = 24 / yBinSize
        files
          .filter((file) => day === file.day)
          .forEach((file) => {
            const yBin = Math.floor(file.hours / yBinSize)
            // if (yBins == null) yBins = {}
            if (yBins[yBin] == null) yBins[yBin] = []
            yBins[yBin].push(file)
          })

        return {
          yBins: Object.entries(yBins).map(([yBin, files]) => ({
            yBin,
            y: scaleY(+yBin * yBinSize),
            files
          })),
          scale: {
            value: tick,
            label,
            opacity: isFirstOfWeek ? 0.3 : 0.1,
            x
          }
        }
      })
  )

  $effect(() => console.log(xBins))

  const fileTypes = ['drawing', 'image', 'document', 'other']

  const getColorFromFileType = (fileType: string) => {
    switch (fileType) {
      case 'drawing':
        return '#228F66'
      case 'image':
        return '#C26FC2'
      case 'document':
        return '#F0BD65'
      default:
        return '#9595A3'
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

<div class="scroll-container">
  <svg
    height="100%"
    width={chartWidth}
    bind:clientWidth={chartWidth}
    bind:clientHeight={chartHeight}
  >
    <g transform="translate({paddingLeft + axisWidth}, {paddingTop})">
      <!-- {#each files as file}
      <circle
        cx={scaleX(file.day)}
        cy={scaleY(file.hours)}
        r="2.5"
        opacity="0.05"
        fill={getColorFromFileType(file.type!)}
      />
    {/each} -->

      {#each xBins as xBin}
        <g transform="translate({xBin.scale.x},0)" class="x-bin">
          {#each xBin.yBins as yBin}
            <g transform="translate(0,{yBin.y})" class="y-bin">
              {#each yBin.files as file, index}
                <g transform="translate({2 + index * 2},2)" class="file">
                  <line y2={binHeight} stroke={getColorFromFileType(file.type!)}
                  ></line>
                </g>
              {/each}
            </g>
          {/each}
        </g>
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

    <g transform="translate({paddingLeft + axisWidth},{paddingTop})">
      {#each xBins as xBin}
        <g transform="translate({xBin.scale.x},0)" class="text-xs opacity-70">
          <line
            x1="0"
            x2="0"
            y1="0"
            y2={innerChartHeight}
            stroke="black"
            opacity={xBin.scale.opacity}
          />

          {#if xBin.scale.label}
            <text
              x=""
              text-anchor="start"
              dominant-baseline="middle"
              class="fill-current"
            >
              {xBin.scale.label}
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
</div>

<style>
  .scroll-container {
    position: relative;
    overflow-x: auto;
    flex: 1;
    width: 100%;
    display: flex;
    flex-direction: column; /* or 100% */
    /* optional: white-space: nowrap; */
  }
  svg {
    display: block;
  }

  .key {
    left: 0;
    position: sticky;
    padding: 0 50px 25px 50px;

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
