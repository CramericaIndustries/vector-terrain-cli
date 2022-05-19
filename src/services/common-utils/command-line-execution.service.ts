import { loggerService } from "./logger.service";
import * as child from 'child_process';

export interface CommandLineExecutionResult {
    stderr: boolean;
    output: string;
}

class CommandLineExecutionService {
    constructor() {
    }

    public async exec(command: string): Promise<CommandLineExecutionResult> {
        return new Promise<CommandLineExecutionResult>((resolve,reject) => {
            if(!command?.trim()) {
                reject("No command provided");
            } else {
                var foo: child.ChildProcess = child.exec(command.trim(), (error, stdout, stderr) => {
                    if(error) {
                        reject(error);  // child.exec threw an error
                    } else {
                        resolve({
                             stderr:    !stdout && stderr ? true : false   // stderr @see https://stackoverflow.com/a/3385261/1207696
                            ,output:    stdout ? stdout : stderr
                        });
                    }
                });
            }
        });
    }
}

export const commandLineExecutionService = new CommandLineExecutionService();
