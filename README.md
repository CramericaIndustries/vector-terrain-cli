# vector-terrain-cli
Generates contour mbtile files from DEM files. For both, metric and imperial.

The mbtile file then can be used with [maplibre-gl-js](https://maplibre.org/) and [mapbox-gl](https://github.com/mapbox/mapbox-gl-js) to render the elevation contour lines in a vector map.

Based on the work of nst-guide https://github.com/nst-guide/terrain

## Prerequisites
1) [node-js v12.22.5 or newer](https://gdal.org/download.html)
1) [gdal](https://gdal.org/download.html)
2) [tippecanoe](https://github.com/mapbox/tippecanoe)

## Usage
```bash
# clone repository
git clone git@github.com:CramericaIndustries/vector-terrain-cli.git
cd vector-terrain-cli

# build
npm run build

# process all hgt files in the '/data/unzipped/karibik-dem3/' directory
# the resulting 'merged.mbtile' file will end up in the output directory
./build/cli.js contour --threads 16 --debug ./output ../data/unzipped/karibik-dem3/*.hgt
```

## Notes
1) use the `--threads x` command line argument to determine how many dem files will be processed in parallel
2) if the execution was interrupted, after restart the cli won't process already processed files