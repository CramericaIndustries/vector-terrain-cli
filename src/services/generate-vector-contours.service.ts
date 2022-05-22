import { gdalTranslateService } from './gdal/gdal-translate.service';
import { tippecanoeService } from './gdal/tippecanoe.service';
import { gdalContourService } from './gdal/gdal-contour.service';
import { gdalWarpService } from './gdal/gdal-warp.service';
import { stateService } from './state.service';
import { loggerService } from "./common-utils/logger.service";
import { fileSystemService } from "./common-utils/file-system.service";
import { commandLineExecutionService } from "./common-utils/command-line-execution.service";
import { gdalInfoService } from "./gdal/gdal-info.service";
import { gdalBuildVrtService } from './gdal/gdal-build-vrt.service';
import { mbtileJoinService } from './gdal/mbtile-join.service';
import { timeFormatService } from './common-utils/time-format.service';
import { getSystemErrorMap } from 'util';


interface IGdalInfo {
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
}

interface IDemFileProcessResult {
    demFileName:    string;
    metricOutputFileName: string;
    imperialOutputFileName: string;
    error:          boolean;
    skipped:        boolean;
    empty:          boolean;

    // all times in milliseconds
    startTime: number;
    endTime:   number;
    duration:  number;
}


class GenerateVectorContourLinesService {
    constructor() {
    }

    public async processDemFile(demFile: string): Promise<IDemFileProcessResult> {
        let result: IDemFileProcessResult = null;

        if(demFile) {
            result = {
                 demFileName:               demFile
                ,metricOutputFileName:      null
                ,imperialOutputFileName:    null
                ,startTime: Date.now()
                ,endTime:   NaN
                ,duration:  NaN
                ,skipped:   false
                ,error:     false
                ,empty:     false
            };

            if(await stateService.isFileAlreadyProcessed(demFile)) {
                if(stateService.isDebug()) {
                    loggerService.wirteLine()
                    loggerService.wirteLine()
                    loggerService.wirteLine("~~~~~~~ GenerateVectorContourLinesService.generateContourLines ~~~~~~~");
                    loggerService.wirteLine(`Skipping already processed file ${demFile}`);
                    loggerService.wirteLine("/~~~~~~ GenerateVectorContourLinesService.generateContourLines ~~~~~~~");
                    loggerService.wirteLine()
                    loggerService.wirteLine()
                }

                result.skipped = true;
            } else {

                let gdalInfo = await gdalInfoService.getGdalInfo(demFile);
                const epsgId = gdalInfoService.getEPSGID(gdalInfo);

                if(epsgId) {

                    if(stateService.isDebug()) {
                        loggerService.wirteLine()
                        loggerService.wirteLine()
                        loggerService.wirteLine("~~~~~~~ GenerateVectorContourLinesService.generateContourLines ~~~~~~~");
                        loggerService.wirteLine(`EPSG ${epsgId} => ${demFile}`);
                        loggerService.wirteLine("/~~~~~~ GenerateVectorContourLinesService.generateContourLines ~~~~~~~");
                        loggerService.wirteLine()
                        loggerService.wirteLine()
                    }

                    const sourceDemFileName = fileSystemService.extractFileName(demFile);

                    // 1) build vrt file
                    const vrtFileName = await gdalBuildVrtService.buildVrtFile(demFile, gdalInfo);  // also crops the tile

                    // 2) gdalwarp                  
                    // DEM files often have a 1px border => get rid of that by cropping/trimming the VRT file
                    // const trimmedVrtFileName = await gdalWarpService.trimVrtFile(vrtFileName,gdalInfo);
                    // gdalInfo = await gdalInfoService.getGdalInfo(trimmedVrtFileName);   // refresh gdal info
                                        
                    // # Reproject to EPSG 4326 and also convert data type from float32 to int16
                    // const warpFileName = await gdalWarpService.convertToESPG4326(trimmedVrtFileName,gdalInfo);
                    const warpFileName = await gdalWarpService.convertToESPG4326(vrtFileName,gdalInfo);

                    // 3.1) gdal_contour metric     # Generate 10m contours
                    const metricGeojsonFileName = await gdalContourService.generateContourLinesMetric10M(warpFileName);

                    // 3.2) gdal_contour imperial   # Generate 40ft contours, note => vrt file must be converted to imperial units first
                    const imperialVrtFile = await gdalTranslateService.convertVrtWgs84ToImperialUnits(warpFileName);
                    const imperialGeoJsonFileName = await gdalContourService.generateContourLinesImperial40Ft(imperialVrtFile);

                    // 4) tippecanoe                # generate mbtiles file

                    // 4.1) tippecanoe metric
                    const metricMbtilesFileName = await tippecanoeService.toMbtiles(metricGeojsonFileName,`${sourceDemFileName}_metric.mbtiles`,false);
                    if(metricMbtilesFileName) {
                        result.metricOutputFileName = `${stateService.getOutputPath()}/${metricMbtilesFileName}`;
                    }

                    // 4.2) tippecanoe imperial
                    const imperialMbtilesFileName = await tippecanoeService.toMbtiles(imperialGeoJsonFileName,`${sourceDemFileName}_imperial.mbtiles`,true);
                    if(imperialMbtilesFileName) {
                        result.imperialOutputFileName = `${stateService.getOutputPath()}/${imperialMbtilesFileName}`;
                    }
                    
                    if(result.empty) {
                        result.empty = true;
                        loggerService.wirteLine("~~~~~~~ GenerateVectorContourLinesService.generateContourLines ~~~~~~~");
                        loggerService.wirteLine(`No contours (flat area) in ${demFile}`);
                        loggerService.wirteLine("/~~~~~~ GenerateVectorContourLinesService.generateContourLines ~~~~~~~");
                    }


                    await Promise.all([
                         fileSystemService.removeFileOrDirectory(vrtFileName)
                        // ,fileSystemService.removeFileOrDirectory(trimmedVrtFileName)
                        ,fileSystemService.removeFileOrDirectory(warpFileName)
                        ,fileSystemService.removeFileOrDirectory(metricGeojsonFileName)
                        ,fileSystemService.removeFileOrDirectory(imperialGeoJsonFileName)
                        ,fileSystemService.removeFileOrDirectory(imperialVrtFile)
                    ]);

                    result.endTime = Date.now();
                    result.duration = result.endTime - result.startTime;

                    if(stateService.isDebug()) {
                        loggerService.wirteLine()
                        loggerService.wirteLine()
                        loggerService.wirteLine("~~~~~~~ GenerateVectorContourLinesService.generateContourLines ~~~~~~~");
                        loggerService.wirteLine(`Cleaning up temporary files of ${demFile}`);
                        loggerService.wirteLine("/~~~~~~ GenerateVectorContourLinesService.generateContourLines ~~~~~~~");
                        loggerService.wirteLine()
                        loggerService.wirteLine()
                    }
                } else {
                    result.error = true;
                }
            }   // end if(isFileAlreadyProcessed) else
        } // end-if(demFile)

        return result;
    }

    public async generateContourLines(demFiles: string[]): Promise<boolean> {
        if(await this.testPrerequisitesInstalled() === true && demFiles?.length) {
            await tippecanoeService.createPrefilterScripts();
            let saveState: Promise<void> = null;

            let count:      number = 0;
            let skipCount:  number = 0;
            let emptyCount: number = 0;
            let outputFileCount: number = 0;
            let startTime: number = Date.now(); // overall start time

            await new Promise<void>((resolve,reject) => {
                let activeThreads = 0;

                const jobs = demFiles.slice();
                const processNextDemFile = () => {
                    const demFile = jobs.pop(); // get next job
                    if(demFile) {
                        this.processDemFile(demFile).then(demProcessingResult => {
                            if(!demProcessingResult.skipped) {
                                saveState = stateService.sucessfullyProcessedFile(
                                                                demProcessingResult.demFileName
                                                                ,demProcessingResult.metricOutputFileName
                                                                ,Date.now()
                                                                ,demProcessingResult.empty
                                                        );
                            }
                            count++;

                            if(demProcessingResult.skipped) {
                                skipCount++;
                            }

                            if(demProcessingResult.empty) {
                                emptyCount++;
                            }
                            
                            if(demProcessingResult.metricOutputFileName) {
                                outputFileCount++;
                            }

                            loggerService.wirteLine(`${new Date().toISOString()}: Finished processing '${fileSystemService.extractFileName(demFile)}'. Progress ${count} of ${demFiles?.length} files. Skipped ${skipCount} files. ${emptyCount} files were empty.`);

                            processNextDemFile();
                        }).catch(e => {
                            loggerService.errorLine(e,GenerateVectorContourLinesService.name);
                            processNextDemFile();
                        });
                    } else {
                        activeThreads--;
                        // no more files to process
                        if(activeThreads === 0) {
                            // last thread has finished
                            resolve();
                        }
                    }
                };
    
                activeThreads = demFiles.length > stateService.getThreadsCount() ? stateService.getThreadsCount() : demFiles.length;

                if(stateService.isDebug()) {
                    loggerService.wirteLine()
                    loggerService.wirteLine()
                    loggerService.wirteLine("~~~~~~~ GenerateVectorContourLinesService.generateContourLines ~~~~~~~");
                    loggerService.wirteLine(`Processing ${jobs.length} DEM files, ${activeThreads} in parallel`);
                    loggerService.wirteLine("/~~~~~~ GenerateVectorContourLinesService.generateContourLines ~~~~~~~");
                    loggerService.wirteLine()
                    loggerService.wirteLine()
                }
    
                for(let i=0; i<activeThreads; i++) {
                    processNextDemFile();
                }
            });


            await saveState;    // wait until state file was saved to disk

            if(outputFileCount && stateService.isMergeTilesAfterProcessingFinished()) {
                await mbtileJoinService.joinTiles(stateService.getOutputPath() + "/*_metric.mbtiles","merged_metric.mbtiles",true);
                await mbtileJoinService.joinTiles(stateService.getOutputPath() + "/*_imperial.mbtiles","merged_imperial.mbtiles",true);
            }
            await tippecanoeService.cleanUp();
            const totalDuration = Date.now() - startTime;

            if(stateService.isDebug()) {
                loggerService.wirteLine()
                loggerService.wirteLine()
                loggerService.wirteLine("~~~~~~~ GenerateVectorContourLinesService.generateContourLines ~~~~~~~");
                loggerService.wirteLine(`Processed ${count - skipCount - emptyCount} of ${count} DEM files in ${timeFormatService.toDurationString(totalDuration)}`);
                loggerService.wirteLine(`${emptyCount} files were empty. Skipped ${skipCount} files because they were already processed in a previous run.`);
                loggerService.wirteLine("/~~~~~~ GenerateVectorContourLinesService.generateContourLines ~~~~~~~");
                loggerService.wirteLine()
                loggerService.wirteLine()
            }

        }
        return false;
    }



    public async testPrerequisitesInstalled(): Promise<boolean> {
        let result = false;

        try {
            const vals = await Promise.all([
                tippecanoeService.checkInstalled()
               ,mbtileJoinService.checkInstalled()
               ,gdalInfoService.checkInstalled()
               ,gdalContourService.checkInstalled()
               ,gdalBuildVrtService.checkInstalled()
               ,gdalWarpService.checkInstalled()
               ,gdalTranslateService.checkInstalled()
           ]);
   
           result = true;
           vals.forEach(installed => {
               result = result && installed;
           });
        } catch(e) {
            loggerService.wirteLine(`${e}`);
        }

        if(stateService.isDebug()) {
            // do something
            loggerService.wirteLine();
            loggerService.wirteLine("~~~~~~~~ PrerequisitesService ~~~~~~~~");
            loggerService.wirteLine(`testPrerequisitesInstalled => ${result ? "OKAY" : "FAILED"}`);
            loggerService.wirteLine("/~~~~~~~ PrerequisitesService ~~~~~~~~");
            loggerService.wirteLine();
        }

        return result;
    }    

}

export const generateVectorContourLinesService = new GenerateVectorContourLinesService();
