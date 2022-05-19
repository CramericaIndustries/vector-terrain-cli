class LoggerService {
    public wirteLine(text: string = null): LoggerService {

        if(text) {
            process.stdout.write(`${text}\n`);
        } else {
            process.stdout.write("\n");
        }

        return this;
    }

    public errorLine(text: string = null,clazz: string = null): LoggerService {
        return this.wirteLine(`ERROR ${clazz}: ${text}`);
    }
    
    
    public wirteJson(obj: {}, pretty = true): LoggerService {

        if(obj) {
            if(pretty) {
                process.stdout.write(JSON.stringify(obj,null,3) + "\n");
            } else {
                process.stdout.write(JSON.stringify(obj) + "\n");
            }
        }

        return this;
    }

    public wirte(text: string): LoggerService {
        if(text) {
            process.stdout.write(text);
        }

        return this;
    }    
}

export const loggerService = new LoggerService();