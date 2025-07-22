<script lang="ts">
  import { scaleLinear } from 'd3-scale'
  import { filesize } from 'filesize'

  let { data } = $props()
  type FileStructureType = typeof data

  const files = $derived(
    data
      .filter(({ isFile }) => isFile)
      .map((file: FileStructureType) => {
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
  )

  const xBinSize = 1
  let chartWidth = $state(0)

  let axisHeight = 16
  let paddingTop = 50
  let paddingBottom = 25
  let paddingRight = 50
  let paddingLeft = 50

  const days = $derived(files.map(({ day }) => day))
  const minDay = $derived(Math.min(...days))
  const maxDay = $derived(Math.max(...days))
  const diffDay = $derived(maxDay - minDay)

  let innerChartWidth = $derived(chartWidth - paddingLeft - paddingRight)

  let binWidth = $derived(innerChartWidth / (24 / xBinSize) - 3)

  const scaleX = $derived(
    scaleLinear().domain([0, 24]).range([0, innerChartWidth])
  )

  const maxInactiveDays = 3

  let yBins = $derived(
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
        // const x = scaleX(tick + minDay)

        let xBins: { [key: number]: FileStructureType } = {}
        // const yBinCount = 24 / yBinSize
        files
          .filter((file) => day === file.day)
          .forEach((file) => {
            const xBin = Math.floor(file.hours / xBinSize)
            // if (yBins == null) yBins = {}
            if (xBins[xBin] == null) xBins[xBin] = []
            xBins[xBin].push(file)
          })

        const xBinsTidy = Object.entries(xBins).map(([xBin, files]) => ({
          xBin,
          x: scaleX(+xBin * xBinSize),
          files: files.sort((a, b) => a.birthtime - b.birthtime)
        }))

        const maxFiles = Math.max(
          ...xBinsTidy.map(({ files }) => files.length),
          0
        )

        return {
          xBins: xBinsTidy,
          maxFiles,
          date,
          scale: {
            value: tick,
            label,
            opacity: isFirstOfWeek ? 0.05 : 0.05
            // x
          },
          tick,
          isFirst: day === minDay,
          isLast: day === maxDay
        }
      })
      .map((yBin, i, yBins) => {
        const remainingBins = yBins.slice(i + 1)
        const next = remainingBins.findIndex(({ xBins }) => xBins.length > 0)

        return {
          next,
          nextDate: remainingBins[next]?.date,
          ...yBin
        }
      })
      .filter(({ next, xBins }, i, yBins) => {
        if (xBins.length > 0) return true

        const before = yBins
          .slice(i - maxInactiveDays - 1, i)
          .map(({ next }) => next)
        const after = yBins
          .slice(i, i + maxInactiveDays)
          .map(({ next }) => next)

        if (
          i === yBins.length - 1 ||
          (before.includes(0) &&
            after.includes(0) &&
            !before.includes(maxInactiveDays + 1))
        )
          return true
      })
      .map((yBin) => {
        const height = Math.max(yBin.maxFiles * 2 + 2, 4)
        const fullHeight = height + (yBin.next > maxInactiveDays ? 40 : 0)
        return { ...yBin, height, fullHeight }
      })
      .map((yBin, i, yBins) => {
        const before = yBins.slice(0, i)

        const y = before.reduce((prev, curr) => prev + curr.fullHeight, 0)
        return { ...yBin, y }
      })
  )

  const firstInactivePeriod = $derived(
    yBins.findIndex(({ next }) => next > maxInactiveDays)
  )

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

  let innerChartHeight = $derived(
    yBins[yBins.length - 1].y + yBins[yBins.length - 1].height
  )

  let chartHeight = $derived(
    innerChartHeight + paddingTop + paddingBottom + axisHeight
  )

  const labeledTicks = [4, 8, 12, 16, 20]
  let xTicks = $derived(
    '-'
      .repeat(24)
      .split('-')
      .map((_, tick) => {
        const x = scaleX(tick)
        return {
          value: tick,
          showLabel: labeledTicks.includes(tick),
          x
        }
      })
  )

  function formatHour(hour: number) {
    return `${hour < 10 ? '0' : ''}${hour.toFixed()}:00`
  }

  function formatDays(d: number) {
    return `${d} days`
  }

  let selectedFile: any = $state(null)
  let selectedFileLocked: Boolean = $state(false)
  function inspectFile(file: any, lock: Boolean) {
    if (selectedFileLocked && !lock) return
    selectedFile = file
    if (lock) {
      selectedFileLocked = true
    }
  }
  function clearFile(removeLock?: Boolean) {
    if (selectedFileLocked && !removeLock) return
    selectedFileLocked = false
    selectedFile = null
  }
</script>

<div class="scroll-container">
  <svg
    class="axis-labels"
    height="60"
    width="100%"
    bind:clientWidth={chartWidth}
  >
    <g transform="translate({paddingLeft},{paddingTop})" class="time-axis">
      {#each xTicks as tick}
        <g transform="translate({tick.x},0)">
          {#if tick.showLabel}
            <rect fill="white" width="44" height="18" x="-22" y="-13.5"></rect>
            <text x="" text-anchor="middle" class="fill-current tiny">
              {formatHour(tick.value)}
            </text>
          {/if}
        </g>
      {/each}
    </g>
  </svg>

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <svg
    height={chartHeight}
    width="100%"
    bind:clientWidth={chartWidth}
    onclick={() => clearFile(true)}
    role="img"
    class="visualisation"
  >
    <g transform="translate({paddingLeft},{paddingTop})">
      {#each xTicks as tick}
        <g transform="translate({tick.x},0)">
          {#if tick.value === 0}
            <rect fill="white" width="42" height="18" x="-2" y="-13"></rect>
            <text x="" text-anchor="start" class="fill-current tiny">
              <!-- {formatHour(tick.value)} -->
              time of day →
            </text>
          {/if}
          <line
            y1={axisHeight}
            y2={axisHeight + innerChartHeight}
            class={['grid-line', tick.value % 4 === 0 ? 'heavy' : '']}
          />
        </g>
      {/each}
    </g>
    <g transform="translate({paddingLeft}, {paddingTop + axisHeight})">
      {#each yBins as yBin, index}
        <g transform="translate(0,{yBin.y})" class="y-bin">
          <line x1={innerChartWidth} class="grid-line" />

          {#if yBin.next > maxInactiveDays}
            <g transform="translate(0,{yBin.height})">
              <line x1={innerChartWidth} class="grid-line" />
              <rect
                height="38"
                fill="white"
                width={innerChartWidth + 2}
                y="1"
                x="-1"
              ></rect>
              <text
                y="20"
                x={0}
                text-anchor="start"
                dominant-baseline="middle"
                class="tiny"
              >
                {formatDays(yBin.next)}
                {#if index === firstInactivePeriod}
                  of inactivity
                {/if}
              </text>
              <text
                y="20"
                x={innerChartWidth}
                text-anchor="end"
                dominant-baseline="middle"
                class="tiny"
              >
                {#if index === firstInactivePeriod}
                  next file created on
                {/if}
                {yBin.nextDate.toDateString().replace(/^.{3} /, '')}
              </text>
            </g>
          {/if}
          {#if yBin.isFirst}
            <g transform="translate(0,{yBin.height})">
              <text
                y="-32"
                x={innerChartWidth}
                text-anchor="end"
                dominant-baseline="middle"
                class="tiny"
              >
                {yBin.date.toDateString().replace(/^.{3} /, '')}
              </text>
            </g>
          {/if}
          {#if yBin.isLast}
            <g transform="translate(0,{yBin.height})">
              <text
                y="20"
                x={innerChartWidth}
                text-anchor="end"
                dominant-baseline="middle"
                class="tiny"
              >
                last file created on {yBin.date
                  .toDateString()
                  .replace(/^.{3} /, '')}
              </text>
            </g>
          {/if}
          {#each yBin.xBins as xBin}
            <g transform="translate({xBin.x},0)" class="y-bin">
              {#each xBin.files as file, index}
                <g transform="translate(1.5,{2 + index * 2})" class="file">
                  <line x2={binWidth} stroke={getColorFromFileType(file.type!)}
                  ></line>
                  <line
                    class="interactive-layer"
                    x2={binWidth}
                    stroke-width="2"
                    role="presentation"
                    stroke={getColorFromFileType(file.type!)}
                    onmouseenter={() => inspectFile(file, false)}
                    onclick={(e) => {
                      e.stopPropagation()
                      inspectFile(file, true)
                    }}
                    style={file.path === selectedFile?.path ? 'opacity:1;' : ''}
                    onmouseleave={() => clearFile()}
                  ></line>
                </g>
              {/each}
            </g>
          {/each}
        </g>
      {/each}

      <line
        x1={innerChartWidth}
        class="grid-line"
        transform="translate(0,{innerChartHeight})"
      />
    </g>
  </svg>
  <div class="key">
    <div class="top">
      <div class="types">
        {#each fileTypes as fileType}
          <div
            class="item tiny"
            style="background:{getColorFromFileType(
              fileType
            )};opacity:{selectedFile == null ||
            selectedFile.type === fileType ||
            (fileType === 'other' && !fileTypes.includes(selectedFile.type))
              ? 1
              : 0.1}"
          >
            {fileType}
          </div>
        {/each}
      </div>
      {#if selectedFile != null && selectedFileLocked}
        <button class="item tiny close" onclick={() => clearFile(true)}>
          ✕
        </button>
      {/if}
    </div>
    {#if selectedFile != null}
      <div class="file-details tiny">
        <div>
          <span class="light">{selectedFile.parent}/</span>{selectedFile.name}
        </div>

        <div>{selectedFile.date.toString().replace(/ GMT.*$/, '')}</div>
        <div>{filesize(selectedFile.fileSize)}</div>
      </div>
    {/if}
  </div>
</div>

<style>
  .scroll-container {
    position: relative;
    overflow-y: auto;
    flex: 1;
    height: 100%;
    flex-direction: row;
  }
  svg {
    display: block;

    .grid-line {
      stroke: #ececf3;
      mix-blend-mode: darken;

      &.heavy {
        stroke: #91b5dd;
      }
    }

    text {
      fill: #5078a5;
    }
    .time-axis {
      text {
        fill: white;
      }
      rect {
        fill: #6389b5;
      }
    }

    .interactive-layer {
      pointer-events: all;
      opacity: 0;
      &:hover {
        opacity: 1;
      }
    }
  }

  .axis-labels {
    position: fixed;
  }

  .visualisation {
    pointer-events: all;
  }

  .tiny {
    font-size: 13px;
  }

  .key {
    pointer-events: none;
    position: sticky;
    bottom: 0;
    left: 0;
    background: white;
    padding: 25px 50px 25px 50px;
    display: flex;
    gap: 6px;
    flex-direction: column;

    > * {
      pointer-events: all;
    }

    .top {
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }

    button {
      appearance: none;
      outline: none;
      border: none;
    }

    .types {
      display: flex;
      gap: 12px;
      font-size: 14px;
      flex-wrap: wrap;
    }
    .item {
      display: flex;
      gap: 6px;
      padding: 0px 5px;
      align-items: center;
      position: relative;

      color: white;
    }

    .close {
      background: #6389b5;
    }

    .file-details {
      color: #5078a5;
      .light {
        color: #91b5dd;
      }
    }
  }
</style>
