import { stateService } from '../state.service';
import { loggerService } from "../common-utils/logger.service";
import { fileSystemService } from "../common-utils/file-system.service";
import { CommandLineExecutionResult, commandLineExecutionService } from "../common-utils/command-line-execution.service";
import { gdalInfoService, IGdalInfo } from './gdal-info.service';


class GdalContourService {
    constructor() {
    }

    public async checkInstalled(): Promise<boolean> {
        // gdal_contour
        const output: CommandLineExecutionResult = await commandLineExecutionService.exec("which gdal_contour");
        const result = output?.output?.match(/.+gdal_contour.*/gi) ? true : false;

        if(!result) {
            loggerService.errorLine("'gdal_contour' is not installed",GdalContourService.name);
        }

        return result;
    }


    public async generateContourLinesMetric10M(vrtFilePath: string): Promise<string> {
        return this.generateContourGeoJson(vrtFilePath,10,false);
    }

    public async generateContourLinesImperial40Ft(vrtFilePath: string): Promise<string> {
        return this.generateContourGeoJson(vrtFilePath,40,true);
    }

    /**
     * Generates contour lines and saves them in a geojson file.
     * To generate in feet you must use gdal_translate first to convert the vrt file to imperial units
     * 
     *  # Convert DEM to feet
        # gdal_translate is preferable over gdal_calc.py, because the latter can't write
        # to a VRT
        # https://geozoneblog.wordpress.com/2016/06/20/converting-vertical-units-dem/d
        gdal_translate \
            -q \
            -scale 0 0.3048 0 1 \
            $temp_dir/${filename}_wgs84.vrt $temp_dir/${filename}_wgs84_feet.vrt


     * @param vrtFilePath 
     * @param distanceBetweenLines 
     * @param imperialUnits 
     * @returns 
     */
    public async generateContourGeoJson(vrtFilePath: string, distanceBetweenLines: number, imperialUnits: boolean): Promise<string> {
        let result: string = null;
        
        const outputFile = vrtFilePath.replace(/\.vrt$/gi,"") + "_contour.geojson";
        if(outputFile && await fileSystemService.checkPathExists(vrtFilePath)) {

            // remove output file if exists
            await fileSystemService.removeFileOrDirectory(outputFile);

            const exeRes = await commandLineExecutionService.exec(
                `gdal_contour   \
                    \`# Put elevation values into 'ele_m' or 'ele_ft'\` \
                    -a ele_${imperialUnits ? 'ft' : 'm'} \
                    \`# Generate contour line every x meters/feet\` \
                    -i ${distanceBetweenLines} \
                    \`# Export to newline-delimited GeoJSON, so Tippecanoe can read in parallel\` \
                    -f GeoJSONSeq \
                    ${vrtFilePath} ${outputFile}
                
                `);
            if(exeRes.stderr) {
                throw (exeRes.stderr);
            } else {
                result = outputFile;
            }

            if(stateService.isDebug()) {
                loggerService.writeLine();
                loggerService.writeLine();
                loggerService.writeLine("~~~~~~~ GdalContourService.generateContourGeoJson ~~~~~~~");
                loggerService.writeJson(`Generating geojson contours for ${vrtFilePath} to ${outputFile}`);
                loggerService.writeJson(`Unit: ${imperialUnits ? 'imperial' : 'metric'}, distance between lines: ${distanceBetweenLines}${imperialUnits ? 'ft' : 'm'}`);
                // loggerService.wirteJson(`gdal_contour output: ${exeRes.output || null}`);
                loggerService.writeLine("/~~~~~~ GdalContourService.generateContourGeoJson ~~~~~~~");
                loggerService.writeLine();
                loggerService.writeLine();
            }
        }

        return result;
    }

}

export const gdalContourService = new GdalContourService();
