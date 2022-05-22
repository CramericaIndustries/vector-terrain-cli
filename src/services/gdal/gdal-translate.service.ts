import { stateService } from '../state.service';
import { loggerService } from "../common-utils/logger.service";
import { fileSystemService } from "../common-utils/file-system.service";
import { CommandLineExecutionResult, commandLineExecutionService } from "../common-utils/command-line-execution.service";
import { gdalInfoService, IGdalInfo } from './gdal-info.service';


class GdalTranslateService {
    constructor() {
    }

    public async checkInstalled(): Promise<boolean> {
        // gdal_translate
        const output: CommandLineExecutionResult = await commandLineExecutionService.exec("which gdal_translate");
        const result = output?.output?.match(/.+gdal_translate.*/gi) ? true : false;

        if(!result) {
            loggerService.errorLine("'gdal_translate' is not installed",GdalTranslateService.name);
        }

        return result;
    }
    
    //      # Convert DEM to feet
    //      # gdal_translate is preferable over gdal_calc.py, because the latter can't write
    //      # to a VRT
    //      # https://geozoneblog.wordpress.com/2016/06/20/converting-vertical-units-dem/d
    //      gdal_translate \
    //          -q \
    //          -scale 0 0.3048 0 1 \
    //          $temp_dir/${filename}_wgs84.vrt $temp_dir/${filename}_wgs84_feet.vrt


    /**
     * Convert a vrt file to imperial units
     * @param vrtFilePath path to the vrt file which must be converted
     * @returns path to converted vrt file
     */
    public async convertVrtWgs84ToImperialUnits(vrtFilePath: string): Promise<string> {
        let result: string = null;
        
        const outputFile = vrtFilePath.replace(/\.vrt$/gi,"") + "_imperial.vrt";
        if(outputFile && await fileSystemService.checkPathExists(vrtFilePath)) {

            // remove output file if exists
            fileSystemService.removeFileOrDirectory(outputFile);

            const exeRes = await commandLineExecutionService.exec(
                `gdal_translate -q                          \
                                -scale 0 0.3048 0 1         \
                                ${vrtFilePath} ${outputFile}
                `);
            if(exeRes.stderr) {
                throw (exeRes.stderr);
            } else {
                result = outputFile;
            }

            if(stateService.isDebug()) {
                loggerService.writeLine()
                loggerService.writeLine()
                loggerService.writeLine("~~~~~~~ GdalTranslateService.convertVrtWgs84ToImperialUnits ~~~~~~~");
                loggerService.writeLine(`Converted VRT file: '${vrtFilePath}' to imperial units `);
                loggerService.writeLine(`gdal_translate output: ${exeRes.output || null}`);
                loggerService.writeLine("/~~~~~~ GdalTranslateService.convertVrtWgs84ToImperialUnits ~~~~~~~");
                loggerService.writeLine()
                loggerService.writeLine()
            }

        }

        return result;
    }

}

export const gdalTranslateService = new GdalTranslateService();
