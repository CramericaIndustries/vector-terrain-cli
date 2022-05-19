import { stateService } from '../state.service';
import { loggerService } from "../common-utils/logger.service";
import { fileSystemService } from "../common-utils/file-system.service";
import { CommandLineExecutionResult, commandLineExecutionService } from "../common-utils/command-line-execution.service";
import { gdalInfoService, IGdalInfo } from './gdal-info.service';


class TippecanoeService {
    constructor() {
    }

    public async checkInstalled(): Promise<boolean> {
        const output: CommandLineExecutionResult = await commandLineExecutionService.exec("tippecanoe --version");
        const result = output?.output?.match(/^tippecanoe\s+v.*/gi) ? true : false;
        if(!result) {
            loggerService.errorLine("'tippecanoe' is not installed",TippecanoeService.name);
        }

        return result;
    }

    public async cleanUp(): Promise<boolean> {
        const res = await Promise.all([
             fileSystemService.removeFileOrDirectory(this.getFilterBashScriptPath(false))
            ,fileSystemService.removeFileOrDirectory(this.getFilterBashScriptPath(true))
        ]);

        return res[0] && res[1] ? true : false;
    }

    public async toMbtiles(geoJsonFile: string, outputFileName: string, imperial: boolean): Promise<string> {
        let result: string = null;
        
        if(outputFileName && await fileSystemService.checkPathExists(geoJsonFile)) {
            const outputFile = `${stateService.getOutputPath()}/${outputFileName}`;

            // remove output file if exists
            await fileSystemService.removeFileOrDirectory(outputFile);

            let preFilterScriptPath = `./${this.getFilterBashScriptPath(imperial)}`.replace(/^\.\/\.\/+|\.\/\/+/gi,"./");

            const cmd = `tippecanoe -Z11 \
                                    -z13 \
                                    -P \
                                    -b 0 \
                                    --force \
                                    -y ele_${imperial ? "ft" : "m"} \
                                    -l contour_${imperial ? "40ft" : "10m"} \
                                    -C '${preFilterScriptPath} "$@"' -o ${outputFile} ${geoJsonFile}
            `;

            if(stateService.isDebug()) {
                loggerService.wirteLine(cmd);
            }

            let exeRes: CommandLineExecutionResult = null;
            
            try {
                exeRes = await commandLineExecutionService.exec(cmd);
                    // loggerService.wirteLine(`+`);
                    // loggerService.wirteLine(`+`);
                    // loggerService.wirteLine(`µ${JSON.stringify(exeRes,null,3)}µ`);
                    // loggerService.wirteLine(`+`);
                    // loggerService.wirteLine(`+`);
            } catch(e) {
                exeRes = {
                     output: e.toString()
                    ,stderr: true
                };
            }

            let featureCount: number = NaN;
            if(exeRes?.output) {
                let tmp = exeRes.output .replace(/[\n\r]/gi,"")
                                        .replace(/.+[^\d](\d+?)\s+features,.+/i,"$1")
                                        .trim();
                if(tmp.match(/^\d+$/gi)) {
                    featureCount = parseInt(tmp);
                }
            }

            // NOTE: tippecanoe always exits with stderr, even when there was no problem
            if(featureCount > 0) {  // .replaceAll("\n"," ").replace(/^([0-9]+)\sfeatures.*/gi,"$1")
                result = outputFileName;
            } else if(featureCount === 0) {
                // geojson file was empty => area is flat (water/sea for example)
                await fileSystemService.removeFileOrDirectory(outputFile);
                result = null;
            } else {
                loggerService.wirteLine(`ERROR tippecanoe: ${exeRes.output}`);
                throw (exeRes.stderr);
            }

            if(stateService.isDebug()) {
                loggerService.wirteLine();
                loggerService.wirteLine();
                loggerService.wirteLine("~~~~~~~ TippecanoeService.toMbtiles ~~~~~~~");
                loggerService.wirteLine(`Converted ${featureCount} geojson features to mbtiles: ${geoJsonFile} to ${outputFileName}`);
                // loggerService.wirteLine(`Settings...  ${zoom} to ${outputFile}`);
                loggerService.wirteLine(`tippecanoe output: ${exeRes.output || null}`);
                loggerService.wirteLine("/~~~~~~ TippecanoeService.toMbtiles ~~~~~~~");
                loggerService.wirteLine();
                loggerService.wirteLine();
            }
        }

        return result;
    }

    protected getFilterBashScriptPath(imperial: boolean): string {
        const outputPath = stateService.getOutputPath();
        let scriptName = imperial ? ".imperial_prefilter.sh" : ".metric_prefilter.sh";
        return `${outputPath}/${scriptName?.trim()}`.replace("//","/");
    }

    protected prefilterBashScriptCodeFactory(imperial: boolean) {
        return `#! /usr/bin/env bash
        if [[ $1 -le 11 ]]; then
            jq "if .properties.ele_${imperial ? "ft" : "m"} % ${imperial ? "200" : "50"} == 0 then . else {} end";
        elif [[ $1 -eq 12 ]]; then
            jq "if .properties.ele_${imperial ? "ft" : "m"} % ${imperial ? "80" : "20"} == 0 then . else {} end";
        else
            cat;
        fi`;
    }

    protected async createPrefilterBashScript(imperial: boolean): Promise<string> {
        let result: string = null;

        const scriptPath = this.getFilterBashScriptPath(imperial);
        if(scriptPath) {
            await fileSystemService.removeFileOrDirectory(scriptPath);
            const code = this.prefilterBashScriptCodeFactory(imperial);

            await fileSystemService.writeToTextFile(scriptPath,code,true);
            result = scriptPath;
        }

        return result;        
    }


    public async createPrefilterScripts(): Promise<boolean> {

        const vals = await await Promise.all([
             this.createPrefilterBashScript(false)
            ,this.createPrefilterBashScript(true)
        ]);

        return (vals[0] && vals[1]) ? true : false;
    }

    public async deletePrefilterScripts(): Promise<boolean> {
        let result = false;



        return result;
    }

}

export const tippecanoeService = new TippecanoeService();
