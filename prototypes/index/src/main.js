const selectPrototypes = document.querySelector('#prototypes')
const selectProjects = document.querySelector('#projects')
const iframe = document.querySelector('iframe')

const prototypes = [
  { value: 'file-structure', label: 'Calendar', schema: '#[project]' },
  { value: 'timeline-layers', label: 'Layers', schema: 'timeline/[project]' },
  { value: 'geometries', label: 'Geometries', schema: '' }
]

const projects = [
  {
    value: 'TP_255_Serpentine_Gallery_Pavilion',
    label: 'TP 255 Serpentine Gallery Pavilion'
  },
  { value: 'TP_261_Markt_Hall', label: 'TP 261 Markt Hall' },
  { value: 'TP_377_Boijmans', label: 'TP 377 Boijmans' }
]

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
  )
  iframe.setAttribute(
    'src',
    `./prototypes/${prototype.value}/${prototype.schema.replace(/\[project\]/, selectProjects.value)}`
  )
}

navigate()

selectProjects.addEventListener('change', navigate)
selectPrototypes.addEventListener('change', navigate)
