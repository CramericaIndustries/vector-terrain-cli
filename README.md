# vector-terrain-cli
Generates contour mbtile files from DEM files. For both, metric and imperial.

The mbtile file then can be used with [maplibre-gl-js](https://maplibre.org/) and [mapbox-gl](https://github.com/mapbox/mapbox-gl-js) to render the elevation contour lines in a vector map.

Based on the work of nst-guide https://github.com/nst-guide/terrain
Converts each DEM file to a mbtile file and then merges all mbtile files into a single file. This allows parallel processing of the DEM files, which speeds up everything and doesn't need much memory, compared to first stitching together the DEM files to a huge vrt and then processing this file in one go.
Downside is that at the border of the DEM files the contour lines are overlapping.

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

## Troubleshooting
### tile-join: "unable to open database file"
If tile-join fails after a while with the following error message: "unable to open database file"...   
It probably is because you are trying to merge more files than the system can open at the same time.   
Check `ulimit -n` to see how many files your system allows you to open in parallel.
   
You can increase the limit by first editing `vim /etc/security/limits.conf` 
```
#<domain>      <type>  <item>         <value>
*             hard      nofile           100000
```
This will allow to increase the limit to 100.000 files. After that you can set the limit by again using ulimit: `ulimit -n 100000`.

@see https://github.com/mapbox/tilelive/issues/90#issuecomment-58552445