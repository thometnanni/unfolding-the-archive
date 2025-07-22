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

  let data: any = $state(null)

  let fetching: Boolean = $state(false)

  const projects = [
    'TP_255_Serpentine_Gallery_Pavilion',
    'TP_261_Markt_Hall',
    'TP_377_Boijmans',
    'TP_010_VPRO',
    'TP_015_WoZoCo_s',
    'TP_028_Silodam',
    'TP_065_Expo_2000',
    'TP_072_Flight_Forum',
    'TP_170_Eyebeam_New_York'
  ]
  async function handleHashChange() {
    // Your function logic here
    const hash = window.location.hash.replace(/^#/, '')
    if (hash == '') return (data = null)
    fetching = true

    try {
      // data = fetch(`./static/file-structure-${hash}.json`).then((d) => d.json())
      const response = await fetch(`./file-structure-${hash}.json`)
      if (!response.ok) throw new Error('Not found')
      data = await response.json()
    } catch (error) {
      window.location.hash = ''
      data = null
    }
    fetching = false
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
    {#if !fetching}
      <nav>
        {#each projects as project}
          <a href={`#${project}`}>
            {project}
          </a>
        {/each}
      </nav>
    {/if}
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
