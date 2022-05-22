class LoggerService {
    public writeLine(text: string = null): LoggerService {

        if(text) {
            process.stdout.write(`${text}\n`);
        } else {
            process.stdout.write("\n");
        }

        return this;
    }

    public errorLine(text: string = null,clazz: string = null): LoggerService {
        return this.writeLine(`ERROR ${clazz}: ${text}`);
    }
    
    
    public writeJson(obj: {}, pretty = true): LoggerService {

        if(obj) {
            if(pretty) {
                process.stdout.write(JSON.stringify(obj,null,3) + "\n");
            } else {
                process.stdout.write(JSON.stringify(obj) + "\n");
            }
        }

        return this;
    }

    public write(text: string): LoggerService {
        if(text) {
            process.stdout.write(text);
        }

        return this;
    }    
}

export const loggerService = new LoggerService();