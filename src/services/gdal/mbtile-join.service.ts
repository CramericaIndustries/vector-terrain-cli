import { stateService } from '../state.service';
import { loggerService } from "../common-utils/logger.service";
import { fileSystemService } from "../common-utils/file-system.service";
import { CommandLineExecutionResult, commandLineExecutionService } from "../common-utils/command-line-execution.service";
import { gdalInfoService, IGdalInfo } from './gdal-info.service';


class MbtileJoinService {
    constructor() {
    }

    public async checkInstalled(): Promise<boolean> {
        let result = false;
        let output: CommandLineExecutionResult = null;
        try {
            output = await commandLineExecutionService.exec("command -v tile-join");
            result = output?.output?.search("/tile-join") >= 0 ? true : false;
            if(!result) {
                loggerService.errorLine("tippecanoe's 'tile-join' is not installed",MbtileJoinService.name);
            }
        } catch(e) {
            loggerService.errorLine("tippecanoe's 'tile-join' is not installed",MbtileJoinService.name);
        }
        return result;
    }


    public async joinTiles(fromMbtilesFile: string, outputFileName: string, overwriteExistingFile: boolean = false, deleteInputTile: boolean = false): Promise<string> {
        let result: string = null;
        
        if(outputFileName) {
            const outputFile = `${stateService.getOutputPath()}/${outputFileName}`;

            // remove output file if already exists
            if(overwriteExistingFile) {
                await fileSystemService.removeFileOrDirectory(outputFile);
                await fileSystemService.removeFileOrDirectory(outputFile + "-journal");
            }
            

            // output file: -o <file-name>
            const cmd = `tile-join -o ${outputFile} ${fromMbtilesFile}`;

            if(stateService.isDebug()) {
                loggerService.writeLine(cmd);
            }

            const exeRes = await commandLineExecutionService.exec(cmd);
            // loggerService.wirteLine(`>>>>>>>>> ${exeRes.output}`);

            // NOTE: tile-join always exits with stderr, even when there was no problem
            if(exeRes.output.match(/^[0-9/]+/gi)) {
                result = outputFile;
            } else {
                loggerService.errorLine(`tile-join: ${exeRes.output}`,MbtileJoinService.name);
                throw (exeRes.stderr);
            }

            await fileSystemService.removeFileOrDirectory(outputFile + "-journal");

            if(stateService.isDebug()) {
                loggerService.writeLine()
                loggerService.writeLine()
                loggerService.writeLine("~~~~~~~ MbtileJoinService.toMbtiles ~~~~~~~");
                loggerService.writeLine(`Merged mbtiles: ${fromMbtilesFile} to ${outputFile}`);
                // loggerService.wirteLine(`Settings...  ${zoom} to ${outputFile}`);
                loggerService.writeLine(`tile-join output: ${exeRes.output || null}`);
                loggerService.writeLine("/~~~~~~ MbtileJoinService.toMbtiles ~~~~~~~");
                loggerService.writeLine()
                loggerService.writeLine()
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

export const mbtileJoinService = new MbtileJoinService();
