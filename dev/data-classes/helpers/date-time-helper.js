class DateTimeHelper
{
    /** Locale that hopefully doesn't give us weird symbols when asking for numbers... */
    static #NUMERIC_LOCALE = "en"; // English
    
    /** Numbering system with "latin" digits only (0123456789) */
    static #NUMERIC_NUMBERING_SYSTEM = "latn"; // (They're actually Arabic numerals, not Roman numerals, fortunately).
    
    /** Length of a minute, in milliseconds */
    static #MINUTE_LENGTH = 60_000;

    /** Length of an hour, in milliseconds */
    static #HOUR_LENGTH = 60 * DateTimeHelper.#MINUTE_LENGTH;
    
    /** Length of a day, in milliseconds. /!\ Not accounting for DST changes (i.e. ALWAYS 24 hours) /!\*/
    static #DAY_LENGTH = 24 * DateTimeHelper.#HOUR_LENGTH;
    
    /**
     * Formats a date or timestamp, without including hours/minutes/seconds.
     * @param {string|undefined} locale e.g. "en-GB"
     * @param {Date|number} dateOrTimestamp e.g. 1780833600000
     * @param {string} timezoneIdentifier e.g. "Europe/Paris"
     * @returns {string} e.g. "Sunday, June 7, 2026"
     */
    static getFormattedDay(locale, dateOrTimestamp, timezoneIdentifier)
    {
        return Intl.DateTimeFormat(
            locale,
            { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: timezoneIdentifier }
        ).format(dateOrTimestamp);
    }
    
    /**
     * Determines whether a day is odd (in the mathematical sense of the word, that is)
     * @param {Date|number} dateOrTimestamp e.g. 1780833600000
     * @param {string} timezoneIdentifier e.g. "Europe/Paris"
     * @returns {boolean} true if the day is odd, false if it's even
     */
    static isOddDay(dateOrTimestamp, timezoneIdentifier)
    {
        const parts = Intl.DateTimeFormat(
            DateTimeHelper.#NUMERIC_LOCALE,
            {
                year: "numeric",
                month: "numeric",
                day: "numeric",
                numberingSystem: DateTimeHelper.#NUMERIC_NUMBERING_SYSTEM,
                timeZone: timezoneIdentifier,
            }
        ).formatToParts(dateOrTimestamp); 
        
        const year = parts.find((element) => element.type === "year").value;
        const month = parts.find((element) => element.type === "month").value;
        const day = parts.find((element) => element.type === "day").value;
        
        const utcStartOfDay = Date.UTC(year, month - 1, day); // Warning: monthIndex starts at 0
        const daysSinceEpoch = Math.round(utcStartOfDay / DateTimeHelper.#DAY_LENGTH);
        
        return (daysSinceEpoch % 2) == 1;
    }
    
    /**
     * Formats a date or timestamp as hours and minutes (no day/month/year).
     * @param {string|undefined} locale e.g. "en-GB"
     * @param {Date|number} dateOrTimestamp e.g. 1780833600000
     * @param {boolean|undefined} hour12 Whether to use a twelve hour clock (AM/PM)
     * @param {string} timezoneIdentifier e.g. "Europe/Paris"
     * @returns {string} e.g. "14:00"
     */
    static getFormattedHour(locale, dateOrTimestamp, hour12, timezoneIdentifier)
    {
        return Intl.DateTimeFormat(
            locale,
            {
                hour: "2-digit",
                minute: "2-digit",
                hour12: hour12,
                timeZone: timezoneIdentifier,
            }
        ).format(dateOrTimestamp);
    }
    
    /**
     * Gets the hour (without the minutes) as an integer number in the [0-23] range
     * @param {Date|number} dateOrTimestamp e.g. 1780833600000
     * @param {string} timezoneIdentifier e.g. "Europe/Paris"
     * @returns {number} e.g. 14
     */
    static getHourAsInt(dateOrTimestamp, timezoneIdentifier)
    {
        const parts = Intl.DateTimeFormat(
            DateTimeHelper.#NUMERIC_LOCALE,
            {
                hour: "numeric",
                hourCycle: "h23",
                numberingSystem: DateTimeHelper.#NUMERIC_NUMBERING_SYSTEM,
                timeZone: timezoneIdentifier,
            }
        ).formatToParts(dateOrTimestamp)
        
        return parseInt(parts.find((element) => element.type === "hour").value);
    }
    
    /**
     * Gets only the minutes
     * @param {Date|number} dateOrTimestamp 
     * @param {string} timezoneIdentifier e.g. "Europe/Paris"
     * @returns {number} The "minutes" part (e.g. 42).
     */
    static getMinutesAsInt(dateOrTimestamp, timezoneIdentifier)
    {
        const parts = Intl.DateTimeFormat(
            DateTimeHelper.#NUMERIC_LOCALE,
            {
                minute: "numeric",
                numberingSystem: DateTimeHelper.#NUMERIC_NUMBERING_SYSTEM,
                timeZone: timezoneIdentifier,
            }
        ).formatToParts(dateOrTimestamp)
        
        return parseInt(parts.find((element) => element.type === "minute").value);
    }
    
    /**
     * Add hours to the specified timestamp, and optionally removes the non-integer part of the offset.
     * @param {number} timestamp Timestamp to add to
     * @param {number} hoursToAdd Number of hours to add
     * @param {number} minutesToRemove Number of minutes to remove, in case the timezone uses a non-integer offset
     *                                 (like UTC+5:30). Only makes sense when `hoursToAdd` is an integer.
     * @returns {number} The computed timestamp
     */
    static addHoursToTimestamp(timestamp, hoursToAdd, minutesToRemove = 0)
    {
        return timestamp + DateTimeHelper.#HOUR_LENGTH * hoursToAdd - minutesToRemove * DateTimeHelper.#MINUTE_LENGTH;
    }
    
    /**
     * Rounds a timestamp down to the minute (removes seconds).
     * @param {number} timestamp 
     * @returns {number} The timestamp without the seconds
     */
    static removeSeconds(timestamp)
    {
        return Math.floor(timestamp / DateTimeHelper.#MINUTE_LENGTH) * DateTimeHelper.#MINUTE_LENGTH
    }
    
    /**
     * Computes difference in hours between two timestamps
     * @param {number} minTimestamp 
     * @param {number} currentTimestamp 
     * @returns {number} The difference in hours (not necessarily an integer)
     */
    static getOffsetInHours(minTimestamp, currentTimestamp)
    {
        return (currentTimestamp - minTimestamp) / DateTimeHelper.#HOUR_LENGTH;
    }
}
