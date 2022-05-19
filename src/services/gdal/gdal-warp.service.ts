import { stateService } from '../state.service';
import { loggerService } from "../common-utils/logger.service";
import { fileSystemService } from "../common-utils/file-system.service";
import { CommandLineExecutionResult, commandLineExecutionService } from "../common-utils/command-line-execution.service";
import { gdalInfoService, IGdalInfo } from './gdal-info.service';


class GdalWarpService {
    constructor() {
    }

    public async checkInstalled(): Promise<boolean> {
        // gdalwarp
        const output: CommandLineExecutionResult = await commandLineExecutionService.exec("which gdalwarp");
        const result = output?.output?.match(/.+gdalwarp.*/gi) ? true : false;

        if(!result) {
            loggerService.errorLine("'gdalwarp' is not installed",GdalWarpService.name);
        }

        return result;
    }
    
    /**
     * Rounds a decimal value to whole number.
     * -17.0004167 => -17
     * @param value 
     * @returns whole number without decimal places
     * @returns NaN if the input number is not a number
     */
     protected round(value: number): number {
        if(Number.isNaN(value)) {
            value = NaN;
        } else {
            value = value - value%1;
        }

        return value;
    }

    /**
     * Cuts off buffer/overlapping area around DEM file
     * @param vrtFilePath 
     * @param gdalInfo 
     */
    public async trimVrtFile(vrtFilePath: string, gdalInfo: IGdalInfo): Promise<string> {
        let result: string = null;
        
        const outputFile = vrtFilePath.replace(/\.vrt$/gi,"") + "_cropped.vrt";
        if(outputFile && await fileSystemService.checkPathExists(vrtFilePath)) {
            const sourceEpsgId = gdalInfoService.getEPSGID(gdalInfo);

            // remove output file if exists
            await fileSystemService.removeFileOrDirectory(outputFile);

            const xmin = this.round(gdalInfo.cornerCoordinates.lowerLeft[0])    - gdalInfo.cornerCoordinates.lowerLeft[0]%1; // + 0.25;
            const ymin = this.round(gdalInfo.cornerCoordinates.lowerLeft[1])    - gdalInfo.cornerCoordinates.lowerLeft[1]%1; // + 0.25;
            const xmax = this.round(gdalInfo.cornerCoordinates.upperRight[0])   - gdalInfo.cornerCoordinates.upperRight[0]%1; // - 0.25;
            const ymax = this.round(gdalInfo.cornerCoordinates.upperRight[1])   - gdalInfo.cornerCoordinates.upperRight[1]%1; // - 0.25;
            const cmd = `gdalwarp   -te ${xmin} ${ymin} ${xmax} ${ymax} \
                                    ${vrtFilePath} ${outputFile}
            `;

            const exeRes = await commandLineExecutionService.exec(cmd);
            if(exeRes.stderr) {
                throw (exeRes.stderr);
            } else {
                result = outputFile;
            }

            if(stateService.isDebug()) {
                loggerService.wirteLine()
                loggerService.wirteLine()
                loggerService.wirteLine("~~~~~~~ GdalWarpService.trimVrtFile ~~~~~~~");
                loggerService.wirteLine(`VRT file: ${outputFile}`);
                loggerService.wirteLine(cmd);
                loggerService.wirteLine(`gdalbuildvrt output: ${exeRes.output || null}`);
                loggerService.wirteLine("/~~~~~~ GdalWarpService.trimVrtFile ~~~~~~~");
                loggerService.wirteLine()
                loggerService.wirteLine()
            }
        }

        return result;        
    }

    public async convertToESPG4326(vrtFilePath: string, gdalInfo: IGdalInfo): Promise<string> {
        let result: string = null;
        
        const outputFile = vrtFilePath.replace(/\.vrt$/gi,"") + "_wgs84.vrt";
        if(outputFile && await fileSystemService.checkPathExists(vrtFilePath)) {
            const sourceEpsgId = gdalInfoService.getEPSGID(gdalInfo);

            // remove output file if exists
            fileSystemService.removeFileOrDirectory(outputFile);

            const exeRes = await commandLineExecutionService.exec(
                `gdalwarp   -q                          \
                            -r cubicspline              \
                            -s_srs EPSG:${sourceEpsgId} \
                            -t_srs EPSG:3857            \
                            -ot Int16                   \
                            -dstnodata -32768           \
                            ${vrtFilePath} ${outputFile}
                `);
            if(exeRes.stderr) {
                throw (exeRes.stderr);
            } else {
                result = outputFile;
            }

            if(stateService.isDebug()) {
                loggerService.wirteLine()
                loggerService.wirteLine()
                loggerService.wirteLine("~~~~~~~ GdalWarpService.convertToESPG4326 ~~~~~~~");
                loggerService.wirteLine(`VRT file: ${outputFile}`);
                loggerService.wirteLine(`gdalbuildvrt output: ${exeRes.output || null}`);
                loggerService.wirteLine("/~~~~~~ GdalWarpService.convertToESPG4326 ~~~~~~~");
                loggerService.wirteLine()
                loggerService.wirteLine()
            }
        }

        return result;
    }

}

export const gdalWarpService = new GdalWarpService();
