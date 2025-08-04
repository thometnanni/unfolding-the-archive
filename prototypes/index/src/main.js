const selectPrototypes = document.querySelector('#prototypes')
const selectProjects = document.querySelector('#projects')
const iframe = document.querySelector('iframe')

const prototypes = [
  { value: 'file-structure', label: 'Calendar', schema: '#[project]' },
  { value: 'timeline-layers', label: 'Layers', schema: 'timeline/[project]' },
  { value: 'geometries-2', label: 'Geometries', schema: '#[project]' }
]
const projects = [
  { value: 'TP_010_VPRO', label: 'TP 010 VPRO' },
  { value: 'TP_015_WoZoCo_s', label: "TP 015 WoZoCo's" },
  { value: 'TP_028_Silodam', label: 'TP 028 Silodam' },
  { value: 'TP_065_Expo_2000', label: 'TP 065 Expo 2000' },
  { value: 'TP_065_EXPO_2000_Hannover', label: 'TP 065 Expo 2000 Hannover' },
  { value: 'TP_072_Flight_Forum', label: 'TP 072 Flight Forum' },
  { value: 'TP_170_Eyebeam_New_York', label: 'TP 170 Eyebeam New York' },
  { value: 'TP_181_Pig_City', label: 'TP 181 Pig City' },
  { value: 'TP_255_Serpentine_Gallery_Pavilion', label: 'TP 255 Serpentine Gallery Pavilion' },
  { value: 'TP_261_Markt_Hall', label: 'TP 261 Markt Hall' },
  { value: 'TP_377_Boijmans', label: 'TP 377 Boijmans' },
  { value: 'TP_221_Cite_Clime', label: 'TP 221 Cite Clime' },
  { value: 'TP_221_Cite__Clime__cite_clime', label: 'TP 221 Cité Climé cite clime' },
  { value: 'TP_255_Serpentine__Research_', label: 'TP 255 Serpentine Research' }
];

function populateSelect(el, items) {
  items.forEach(({ value, label }) => {
    const option = document.createElement('option')
    option.setAttribute('value', value)
    option.innerHTML = label
    el.appendChild(option)
  })
}

populateSelect(selectPrototypes, prototypes)
populateSelect(selectProjects, projects)

function navigate() {
  const prototype = prototypes.find(
    ({ value }) => value === selectPrototypes.value
  );
  const url = `./prototypes/${prototype.value}/${prototype.schema.replace(/\[project\]/, selectProjects.value)}`;
  iframe.setAttribute('src', url);

  const params = new URLSearchParams({
    prototype: selectPrototypes.value,
    project: selectProjects.value
  });
  history.replaceState(null, '', `?${params.toString()}`);
}


navigate()

selectProjects.addEventListener('change', navigate)
selectPrototypes.addEventListener('change', navigate)
