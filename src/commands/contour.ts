import { stateService } from './../services/state.service';
import type { Arguments, CommandBuilder } from 'yargs';
import { generateVectorContourLinesService } from "../services/generate-vector-contours.service";
import { loggerService } from '../services/common-utils/logger.service';

type Options = {
    outputDirectory: string;
    demFiles: string[];

    startover:      boolean | undefined;
    removesource:   boolean | undefined;
    debug:          boolean | undefined;
    threads:        number  | undefined;
    merge:          boolean | undefined;
};

export const command: string = 'contour <output-directory> [dem-files..]';  // this is parsed by yargs library, must follow special syntax
export const desc: string = 'Converts [dem-files..] to mbtiles contour files';

export const builder: CommandBuilder<Options, Options> = (yargs) =>
    yargs
        .options({
             startover:     { type: 'boolean', describe: 'ignores existing .mbtiles files and overwrites them' }
            ,removesource:  { type: 'boolean', describe: 'input DEM file will be deleted after it was converted to mbtiles' }
            ,merge:         { type: 'boolean', describe: 'Merges the generated mbtiles files into a single file (one for metric, one for imperial)' }
            ,debug:         { type: 'boolean', describe: 'DEBUG mode' }
            ,threads:       { type: 'number',  describe: 'Define how many files should be processed in parallel' }
        })
        .positional("output-directory", { type: "string", demandOption: true })
        .positional('dem-files', { type: "string", array: true, demandOption: true });

export const handler = async (argv: Arguments<Options>): Promise<void> => {
    const opts: Options = argv;
    opts.startover      = opts.startover === true;
    opts.removesource   = opts.removesource === true;
    opts.debug          = opts.debug === true;
    opts.threads        = isNaN(opts.threads) || opts.threads < 1 ? 1 : opts.threads;
    opts.merge          = opts.merge === true;

    if(opts.debug) {
        stateService.enableDebugMode();
    }

    stateService.setThreadsCount(opts.threads);
    stateService.setMergeTilesAfterProcessingFinished(opts.merge);

    await stateService.prepare(opts.outputDirectory,opts.startover);

    if(stateService.isDebug()) {
        loggerService.writeLine();
        loggerService.writeLine();
        loggerService.writeLine("~~~~~~~~yargs.argv~~~~~~~~~");
        loggerService.writeLine(`${JSON.stringify(argv,null,3)}`);
        loggerService.writeLine("/~~~~~~~yargs.argv~~~~~~~~~");
        loggerService.writeLine();
        loggerService.writeLine();
    }


    await generateVectorContourLinesService.generateContourLines(opts.demFiles);
    process.exit(0);
};