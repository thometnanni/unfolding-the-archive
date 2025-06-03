<script>
  import { onMount } from "svelte";
  import Matrix from "$lib/components/Matrix.svelte";

  let data = [];

  onMount(async () => {
    const res = await fetch("test_1.json");
    if (res.ok) data = await res.json();
  });
</script>

{#if data.length}
  <Matrix {data} />
{/if}
