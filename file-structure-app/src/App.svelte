<script lang="ts">
  import Basic from './lib/Basic.svelte'
  import BasicSmallDots from './lib/BasicSmallDots.svelte'
  import Calendar from './lib/Calendar.svelte'
  import Binning from './lib/Binning.svelte'

  const visualisations = { Basic, BasicSmallDots, Calendar, Binning } as const
  type VisualisationName = keyof typeof visualisations
  const visualisationNames = Object.keys(visualisations) as VisualisationName[]
  let selected: VisualisationName = 'Binning'
</script>

<main>
  <nav>
    <label>
      Visualisation:
      <select bind:value={selected}>
        {#each visualisationNames as name}
          <option value={name}>{name}</option>
        {/each}
      </select>
    </label>
  </nav>
  {#if selected}
    <svelte:component this={visualisations[selected]} />
  {/if}
</main>

<style>
  main {
    height: 100vh;
    display: flex;
    flex-direction: column;

    nav {
      margin: 12.5px 50px 0px;
    }
  }
</style>
