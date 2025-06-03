<script>
  import { onMount } from "svelte";
  import Cluster from "$lib/components/Cluster.svelte";

  let data = [];

  onMount(async () => {
    const res = await fetch("test_2.json");
    if (res.ok) data = await res.json();
  });
</script>

{#if data.length}
  <Cluster {data} />
{/if}
