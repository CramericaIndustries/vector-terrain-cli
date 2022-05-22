import { timeFormatService } from './common-utils/time-format.service';
import { loggerService } from './common-utils/logger.service';
import fse, { outputFile } from 'fs-extra';
import fs from 'fs';
import { fileSystemService } from './common-utils/file-system.service';
const fsPromises = fs.promises;

interface FileState {
    completed: boolean
   ,outputFile: string
   ,duration: string
   ,startTime: string
   ,timestamp: string
   ,empty: boolean
};

class StateService {
    protected mergeTilesAfterProcessingFinished: boolean = false;
    protected debug: boolean = false;
    protected stateFilePath: string = null;
    protected path: string = null;  // output path from command line argument
    public static stateFileName = ".terrain-cli-contour-state.json";
    protected state: {
        files: {[key: string]: FileState}
    } = {
        files: {}
    };
    protected threadsCount: number = 1;

    public getThreadsCount(): number {
        return this.threadsCount;
    }

    public setThreadsCount(cnt: number) {
        this.threadsCount = cnt;
    }

    public getStateFilePath(): string {
        return this.stateFilePath;
    }

    public setMergeTilesAfterProcessingFinished(value: boolean) {
        this.mergeTilesAfterProcessingFinished = value;
    }

    /**
     * @returns output path which was passed into the CLI via command line argument
     */
    public getOutputPath(): string {
        return this.path;
    }

    public setPath(path: string) {
        this.path = path?.trim().replace(/\/+$/gi,"");
        this.stateFilePath = `${this.path}/${StateService.stateFileName}`;
    }

    /**
     * Creates the '.terrain-cli-contour-state.json' file in the output directory.
     * Does not modify the file if it already exists.
     * Will create the output directory (and it's parents) if it doesn't exist yet
     */
    public async createStateFileIfNotExist() {
        await fse.ensureFile(this.stateFilePath);
    }

    public async deleteStateFile() {
        if(await fse.pathExists(this.stateFilePath)) {
            fse.remove(this.stateFilePath);
        }
    }

    public async loadState() {
        const state = await fsPromises.readFile(this.stateFilePath, "utf8");
        if(state) {
            this.state = {
                 ...this.state
                ,...(JSON.parse(state) || {})
            };
        }
    }

    public async saveToStateFile() {
        await fse.writeJson(
             this.stateFilePath
            ,this.state
            ,{ spaces: 3 }
        );
    }

    public async prepare(outputPath: string, overwrite: boolean = false) {
        this.setPath(outputPath);

        if(overwrite) {
            await this.deleteStateFile();
        }

        await this.createStateFileIfNotExist();
        await this.loadState();
    }

    public enableDebugMode() {
        this.debug = true;
    }

    public isDebug(): boolean {
        return this.debug;
    }

    public isMergeTilesAfterProcessingFinished(): boolean {
        return this.mergeTilesAfterProcessingFinished;
    }

    public async sucessfullyProcessedFile(sourceFilePath: string, outputFilePath: string, startTime: number, empty: boolean = false) {
        if(sourceFilePath) {

            this.state.files[sourceFilePath] = {
                 completed: true
                ,outputFile: outputFilePath || null
                ,duration: timeFormatService.toDurationString(Date.now() - startTime)
                ,startTime: new Date(startTime).toString()
                ,timestamp: new Date().toString()
                ,empty: empty || false
            };

            await this.saveToStateFile();
        }
    }

    public async isFileAlreadyProcessed(sourceFilePath: string): Promise<boolean> {
        let result: boolean = false;


        if(sourceFilePath && this.state.files[sourceFilePath]) {
            const fileState = this.state.files[sourceFilePath];
            result = fileState?.completed && (fileState.empty || await fileSystemService.checkPathExists(fileState.outputFile));
        }
        return result;
    }
}

export const stateService = new StateService();