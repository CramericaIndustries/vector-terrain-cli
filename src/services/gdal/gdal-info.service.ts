import { stateService } from '../state.service';
import { loggerService } from "../common-utils/logger.service";
import { fileSystemService } from "../common-utils/file-system.service";
import { CommandLineExecutionResult, commandLineExecutionService } from "../common-utils/command-line-execution.service";

export interface IGdalInfo {
    cornerCoordinates: {
         upperLeft:  [number,number]
        ,lowerLeft:  [number,number]
        ,lowerRight: [number,number]
        ,upperRight: [number,number]
        ,center:     [number,number]
    }
    ,coordinateSystem: {
         wkt: string
        ,dataAxisToSRSAxisMapping: number[]
    }
    ,size: number[]
}


class GdalInfoService {
    constructor() {
    }

    public async checkInstalled(): Promise<boolean> {
        const output: CommandLineExecutionResult = await commandLineExecutionService.exec("gdalinfo --version");
        const result = output?.output?.match(/^GDAL\s+.*/gi) ? true : false;

        if(!result) {
            loggerService.errorLine("'gdalinfo' is not installed",GdalInfoService.name);
        }

        return result;
    }

    public async getGdalInfo(demFilePath: string): Promise<IGdalInfo> {
        let result: IGdalInfo = null;
        
        if(await fileSystemService.checkPathExists(demFilePath)) {

            const exeRes = await commandLineExecutionService.exec(`gdalinfo -json ${demFilePath}`);
            if(exeRes.stderr) {
                throw (exeRes.stderr);
            } else {
                result = JSON.parse(exeRes.output) || null;
            }

            // if(stateService.isDebug()) {
            //     loggerService.wirteLine()
            //     loggerService.wirteLine()
            //     loggerService.wirteLine("~~~~~~~ GenerateVectorContourLinesService.gdalInfo ~~~~~~~");
            //     loggerService.wirteJson(result);
            //     loggerService.wirteLine("/~~~~~~ GenerateVectorContourLinesService.gdalInfo ~~~~~~~");
            //     loggerService.wirteLine()
            //     loggerService.wirteLine()
            // }
        }

        return result;
    }

    public getEPSGID(gdalInfo: IGdalInfo): string {
        let result: string = null;

        if(gdalInfo?.coordinateSystem?.wkt) {
            const epsgId = gdalInfo?.coordinateSystem?.wkt.replace(/\n/g,"").replace(/.*ID\[\"EPSG\",([0-9]+)].*/gi,"$1");
            if(epsgId.match(/[0-9]+/)) {
                result = epsgId;
            }
        }

        return result;
    }
}

export const gdalInfoService = new GdalInfoService();
