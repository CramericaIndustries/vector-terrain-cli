
export interface IDuration {
    // weeks: (604800000), // Uncomment for weeks
     weeks:     number
    ,days:      number
    ,hours:     number
    ,minutes:   number
    ,seconds:   number
    ,millis:    number
    ,total:     number
}

class TimeFormatService {
    public toDurationString(ms: number): string {
        let result: string = null;

        const duration = this.toDurationUnits(ms);
        if(duration) {
            result = "";

            if(duration.millis > 0) {
                result = `${duration.millis} ms`;
            }

            if(duration.seconds > 0) {
                result = `${duration.seconds} seconds, ${result}`;
            }

            if(duration.minutes > 0) {
                result = `${duration.minutes} minutes, ${result}`;
            }

            if(duration.hours > 0) {
                result = `${duration.hours} hours, ${result}`;
            }

            if(duration.days > 0) {
                result = `${duration.days} days, ${result}`;
            }

            if(duration.weeks > 0) {
                result = `${duration.weeks} weeks, ${result}`;
            }
        }

        return result;
    }

    /**
     * Converts milliseconds into greater time units as possible
     * @param {int} ms - Amount of time measured in milliseconds
     * @return {Object|null} Reallocated time units. NULL on failure.
     */
    public toDurationUnits(ms: number) : IDuration {
        if ( !Number.isInteger(ms) ) {
            return null;
        }

        /**
         * Takes as many whole units from the time pool (ms) as possible
         * @param {int} msUnit - Size of a single unit in milliseconds
         * @return {int} Number of units taken from the time pool
         */
        const allocate = msUnit => {
            const units = Math.trunc(ms / msUnit)
            ms -= units * msUnit
            return units
        };

        // Property order is important here.
        // These arguments are the respective units in ms.
        return {
             weeks:     allocate(604800000) // Uncomment for weeks
            ,days:      allocate(86400000)
            ,hours:     allocate(3600000)
            ,minutes:   allocate(60000)
            ,seconds:   allocate(1000)
            ,millis:    ms - allocate(1000)
            ,total:     ms // remainder
        };
    }
}

export const timeFormatService = new TimeFormatService();


