<script>
  import { onMount, onDestroy } from 'svelte'

  // import Basic from './lib/Basic.svelte'
  // import BasicSmallDots from './lib/BasicSmallDots.svelte'
  // import Calendar from './lib/Calendar.svelte'
  // import Binning from './lib/Binning.svelte'
  import UMap from './lib/UMap.svelte'

  // const visualisations = {
  //   Basic,
  //   BasicSmallDots,
  //   Calendar,
  //   Binning,
  //   UMap
  // } as const
  // type VisualisationName = keyof typeof visualisations
  // const visualisationNames = Object.keys(visualisations) as VisualisationName[]
  // let selected: VisualisationName = 'UMap'

  let data = $state(null)
  let hash = $state(null)

  let fetching = $state(false)

  const projects = [
    'TP_255_Serpentine',
    'TP_255_Serpentine_Gallery_Pavilion',
    'TP_261_Markt_Hall',
    'TP_377_Boijmans',
    'TP_010_VPRO',
    'TP_015_WoZoCo_s',
    'TP_028_Silodam',
    'TP_065_Expo_2000',
    'TP_065_EXPO_2000_Hannover',
    'TP_072_Flight_Forum',
    'TP_170_Eyebeam_New_York'
  ]

  const tests = [
    'All_Sample_500',
    'All_Sample_500_alt_sample_a',
    'All_Sample_500_alt_sample_b',
    '-',
    'ALL_TOP_500_Occurances',
    'ALL_TOP_500_Occurances_alt',
    '-',
    'ALL_TOP_50_Occurances',
    'ALL_TOP_5000_Occurances',
    '-',
    'ALL_TOP_500_Vertice_Count',
    'ALL_TOP_500_Area',
    '-',
    'DOORSNEDE_Sample_500',
    'tent-01_Sample_500',
    'axonometrie_Sample_500',
    'nl_21_Sample_500',
    '-',
    'ALL_Sample_500_adjusted_uniqueness',
    'ALL_TOP_500_Occurances_adjusted_uniqueness',
    'ALL_TOP_5000_Occurances_adjusted_uniqueness'
  ]

  async function handleHashChange() {
    // Your function logic here
    hash = window.location.hash.replace(/^#/, '')
    if (hash == '') return (data = null)
    fetching = true

    try {
      // data = fetch(`./static/file-structure-${hash}.json`).then((d) => d.json())
      console.log(/^tests\//.test(hash))
      const response = await fetch(
        /^tests\//.test(hash) ? `./${hash}.json` : `./geometries-${hash}.json`
      )
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

      <nav>
        <h3>Testing TP_065_EXPO_2000_Hannover</h3>
        {#each tests as project}
          <a href={`#tests/${project}`}>
            {project}
          </a>
        {/each}
      </nav>
    {/if}
  {:else if data.length === 0}
    <div class="no-geometries">
      <p>No Geometries Found</p>
    </div>
  {:else}
    <UMap {data} hash={hash.replace(/_/g, ' ')} />
  {/if}
</main>

<style>
  :global(html, body) {
    font-family: 'Ronzino', sans-serif;
    font-feature-settings: 'tnum', 'lnum';
  }

  main {
    height: 100dvh;
    display: flex;
    flex-direction: column;

    nav {
      margin: 12.5px 50px 0px;
      display: flex;
      flex-direction: column;
    }
  }

  .no-geometries {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    flex-direction: column;
    color: white;
    justify-content: center;
    background-color: black;
    text-align: center;
  }
</style>
