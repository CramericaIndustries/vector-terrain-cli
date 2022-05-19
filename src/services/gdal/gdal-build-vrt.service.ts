import { CommandLineExecutionResult } from './../common-utils/command-line-execution.service';
import { stateService } from '../state.service';
import { loggerService } from "../common-utils/logger.service";
import { fileSystemService } from "../common-utils/file-system.service";
import { commandLineExecutionService } from "../common-utils/command-line-execution.service";
import { IGdalInfo } from './gdal-info.service';


class GdalBuildVrtService {
    constructor() {
    }

    public async checkInstalled(): Promise<boolean> {
        // gdalbuildvrt
        const output: CommandLineExecutionResult = await commandLineExecutionService.exec("which gdalbuildvrt");
        const result = output?.output?.match(/.+gdalbuildvrt.*/gi) ? true : false;

        if(!result) {
            loggerService.errorLine("'gdalbuildvrt' is not installed",GdalBuildVrtService.name);
        }

        return result;
    }

    /**
     * Builds a vrt file from a DEM file path
     * @param demFilePath path to the DEM file (e.g. /dem-files/myfile.hgt)
     * @param outputPath path to the output directory
     * @returns path to the vrt file
     */
    public async buildVrtFile(demFilePath: string, gdalInfo: IGdalInfo): Promise<string> {
        let result: string = null;
        const outputPath = stateService.getOutputPath();
        const fileName = fileSystemService.extractFileName(demFilePath);
        if(fileName && outputPath && await fileSystemService.checkPathExists(demFilePath)) {
            let outputFilePath = `${outputPath.trim()}/tmp_${fileName}.vrt`;
            outputFilePath = outputFilePath.replace("//","/");

            // delete vrt file if exists
            await fileSystemService.removeFileOrDirectory(outputFilePath);

            const cmd = `gdalbuildvrt -q ${outputFilePath} ${demFilePath}`;
            const exeRes = await commandLineExecutionService.exec(cmd);
            if(exeRes.stderr) {
                throw (exeRes.stderr);
            } else {
                result = outputFilePath;
            }

            if(stateService.isDebug()) {
                loggerService.wirteLine()
                loggerService.wirteLine()
                loggerService.wirteLine("~~~~~~~ GdalBuildVrtService.buildVrtFile ~~~~~~~");
                loggerService.wirteLine(`VRT file: ${outputFilePath}`);
                loggerService.wirteLine(`command: ${cmd}`);
                loggerService.wirteLine(`gdalbuildvrt output: ${exeRes.output || null}`);
                loggerService.wirteLine("/~~~~~~ GdalBuildVrtService.buildVrtFile ~~~~~~~");
                loggerService.wirteLine()
                loggerService.wirteLine()
            }
        }

        return result;
    }

}

export const gdalBuildVrtService = new GdalBuildVrtService();
