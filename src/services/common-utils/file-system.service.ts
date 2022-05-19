import path from 'path';
import fse from 'fs-extra';
import fs from 'fs';
const fsPromises = fs.promises;

class FileSystemService {
    
    /**
     * Checks if the file/directory exists
     */
    public async checkPathExists(filePath: string): Promise<boolean> {
        let result: boolean = false;

        result = filePath && await fse.pathExists(filePath) ? true : false;

        return result;
    }

    /**
     * Extracts the file name from a filePath
     * @param filePath path to the file e.g. "/Users/goodman/Desktop/dev/node_kindacode/package.json"
     * @returns file name with file extension e.g. "package.json"
     */
    public extractFileName(filePath: string): string {
        return filePath ? path.basename(filePath) : null;
    }

    /**
     * Removes a file or directory. Does not crash when the file or directory does not exist.
     * @param filePath 
     * @returns true if the file/directory successfully was deleted or didn't exist
     */
    public async removeFileOrDirectory(filePath: string): Promise<boolean> {
        let result = false;

        if(filePath) {
            await fse.remove(filePath);
            result = true;
        }

        return result;
    }


    public async writeToTextFile(filePath: string, content: string, overwrite: boolean = false) {
        if(filePath) {
            if(overwrite) {
                await this.removeFileOrDirectory(filePath);
            }

            await fse.outputFile(filePath,content);
        }
    }

    public async chmodFile(filePath: string, permissions: number) {
        if(filePath && !isNaN(permissions)) {
            await fs.promises.chmod(filePath,0o777);
        }
    }
}

export const fileSystemService = new FileSystemService();
