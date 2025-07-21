<script>
  const projects = [
    {
      value: 'TP_255_Serpentine_Gallery_Pavilion',
      label: 'TP 255 Serpentine Gallery Pavilion'
    },
    { value: 'TP_261_Markt_Hall', label: 'TP 261 Markt Hall' },
    { value: 'TP_377_Boijmans', label: 'TP 377 Boijmans' },
    { value: 'TP_010_VPRO', label: 'TP 010 VPRO' },
    { value: 'TP_015_WoZoCo_s', label: "TP 015 WoZoCo's" },
    { value: 'TP_028_Silodam', label: 'TP 028 Silodam' },
    { value: 'TP_065_Expo_2000', label: 'TP 065 Expo 2000' },
    { value: 'TP_072_Flight_Forum', label: 'TP 072 Flight Forum' },
    { value: 'TP_170_Eyebeam_New_York', label: 'TP 170 Eyebeam New York' },
    { value: 'TP_181_Pig_City', label: 'TP 181 Pig City' },
    { value: 'TP_221_Cite_Clime', label: 'TP 221 Cite Clime' },
    { value: 'TP_221_Cité_Clime_cite_clime', label: 'TP 221 Cité Climé cite clime' }
  ]
</script>

<article>
  {#each projects as project}
    <a href={`timeline/${project.value}`}>{project.label}</a>
  {/each}
</article>

<style>
  article {
    padding: 10px;
  }
  a {
    display: block;
  }
</style>
