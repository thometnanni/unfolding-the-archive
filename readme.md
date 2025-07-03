# Unfolding the Archive

This repository is part of the NWO-funded project *Unfolding the Archive: New Dimensions of Access to Born-digital Architecture Collections*, led by Ania Molenda at the Nieuwe Instituut. The project explores new ways to access and interpret born-digital architecture archives, combining methods from museum studies, archival studies, architecture, and digital humanities. The goal is to develop prototypes and tools that enable dynamic, multimodal, and participatory exploration of digital archival materials, focusing on underused metadata and new forms of discovery.

---

This project provides scripts to extract, count, and filter geometries and layer names from a collection of AutoCAD DWG/DXF files. It also includes utilities for handling plot styles and visualizing the results.

## Folder Structure

```
unfolding-the-archive/
├── data/                      # Source DWG/DXF files (not included in repo)
├── extract-layer-names/       # Scripts for extracting layer names and plot styles
├── file-structure/            # Scripts to generate file-structure.json 
├── file-structure-app/        # Svelte app for visualization
├── geometries/                # Scripts for extracting and filtering geometry data
├── output/                    # Generated JSON files (results)
├── libredwg/                  # LibreDWG integration
├── dxf-json/                  # DXF to JSON utilities
├── dxf2json/                  # Alternative DXF to JSON utilities
├── prototypes/                # Experimental or prototype scripts
├── package.json
├── readme.md
```

## Requirements

- Node.js (v18+ recommended)
- DWG/DXF files in the `data/` folder (see scripts for expected structure)

## Usage

### 1. Generate File Structure 

From the project root:

```sh
cd file-structure
node index.js --folder "Folder Name"
```

This will scan the `data/` folder and generate `output/file-structure-Your_Project_Name.json`, which is required by the other scripts.

### 2. Extract Layer Names

```sh
cd extract-layer-names
node index.js --folder "Folder Name"
```

This will process all DWG/DXF files listed in `output/file-structure-Your_Project_Name.json` and write the results to `output/layer-names-Your_Project_Name.json`.

### 3. Extract Geometries

```sh
cd geometries
node index.js --folder "Folder Name"
```

This will process the files and output:
- `output/geometries-Your_Project_Name.json` — all geometries
- `output/geometries-count-Your_Project_Name.json` — geometry usage counts

### 4. Filter Geometries

You can filter geometries by count or get the top X most common geometries:

```sh
cd geometries
node filtergeometries.js --folder "Folder Name" 9         # All geometries with count == 9
node filtergeometries.js --folder "Folder Name" top100    # Top 100 most common geometries
```

Filtered files will be saved in `output/`.

### 5. Plot Styles

To parse CTB plot style files:

```sh
cd extract-layer-names/plot-styles
node index.js
```

This will parse all `.ctb` files in `data/` and output JSON files in `output/`.

## Visualization

> The `prototypes/` folder contains additional SvelteKit prototypes. For more details, see the README files within those folders.

## Acknowledgements

This project uses [LibreDWG](https://www.gnu.org/software/libredwg/) and [dxf-parser](https://github.com/gdsestimating/dxf-parser), among other open-source tools.
