<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  // import Basic from './lib/Basic.svelte'
  // import BasicSmallDots from './lib/BasicSmallDots.svelte'
  // import Calendar from './lib/Calendar.svelte'
  // import Binning from './lib/Binning.svelte'
  import BinningCollapsed from './lib/BinningCollapsed.svelte'

  // const visualisations = {
  //   Basic,
  //   BasicSmallDots,
  //   Calendar,
  //   Binning,
  //   BinningCollapsed
  // } as const
  // type VisualisationName = keyof typeof visualisations
  // const visualisationNames = Object.keys(visualisations) as VisualisationName[]
  // let selected: VisualisationName = 'BinningCollapsed'

  let data: any = null

  const projects = [
    'TP_255_Serpentine_Gallery_Pavilion',
    'TP_261_Markt_Hall',
    'TP_377_Boijmans'
  ]

  async function handleHashChange() {
    // Your function logic here
    const hash = window.location.hash.replace(/^#/, '')
    console.log(window.location.hash, hash)
    if (hash == '') return (data = null)

    try {
      // data = fetch(`./static/file-structure-${hash}.json`).then((d) => d.json())
      const response = await fetch(`./file-structure-${hash}.json`)
      if (!response.ok) throw new Error('Not found')
      data = await response.json()
    } catch (error) {
      window.location.hash = ''
      data = null
    }
  }

  onMount(() => {
    handleHashChange() // Run initially
    window.addEventListener('hashchange', handleHashChange)
  })

  onDestroy(() => {
    window.removeEventListener('hashchange', handleHashChange)
  })
</script>

<main>
  {#if data == null}
    <nav>
      {#each projects as project}
        <a href={`#${project}`}>
          {project}
        </a>
      {/each}
    </nav>
  {:else}
    <BinningCollapsed {data} />
  {/if}
</main>

<style>
  main {
    height: 100vh;
    display: flex;
    flex-direction: column;

    nav {
      margin: 12.5px 50px 0px;
      display: flex;
      flex-direction: column;
    }
  }
</style>
