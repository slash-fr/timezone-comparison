class Timezone
{
    /**
     * IANA timezone identifier (e.g. "Europe/Paris")
     * @type {string}
     */
    identifier;
    
    /**
     * Short offset (e.g. "GMT-7" or "UTC+5:30")
     * @type {string}
     */
    shortOffset;
    
    /**
     * Short offset (e.g. "GMT-7" or "UTC+5:30") with an ASCII hyphen-minus (-) instead of other Unicode minus chars
     * @type {string}
     */
    normalizedShortOffset;
    
    /**
     * Description to show in search results (e.g. "Central European Summer Time – France Time")
     * @type {string}
     */
    description;
    
    /**
     * Locale to use to format the description (e.g. "en-GB")
     * @type {string|undefined}
     */
    #locale;
    
    /**
     * Offsets and names are influenced by DST / Summer Time, among other things.
     * @type {Date|number}
     */
    #dateOrTimestamp;
    
    /**
     * @param {string} identifier IANA timezone identifier (e.g. "Europe/Paris")
     * @param {string|undefined} locale Locale to use to format the description (e.g. "en-GB")
     * @param {Date|number} dateOrTimestamp Offsets and names are influenced by DST / Summer Time, among other things.
     */
    constructor(identifier, locale, dateOrTimestamp)
    {
        this.identifier = identifier;
        this.#locale = locale;
        this.#dateOrTimestamp = dateOrTimestamp;
        
        this.shortOffset = this.#getShortOffset();
        this.normalizedShortOffset = StringHelper.normalizeMinusSigns(this.shortOffset);
        this.#initializeDescription();
        
        Object.freeze(this);
    }
    
    /**
     * Computes the UTC offset as a (decimal) number of hours.
     * @param {Date|number} dateOrTimestamp (Optional) Timestamp to use to compute the offset.
     * @returns {number} e.g. 5.5 for "UTC+05:30"
     */
    getOffsetAsNumber(dateOrTimestamp = this.#dateOrTimestamp)
    {
        /** e.g. "UTC+02:00" or "GMT+05:45" */
        // English locale (hopefully doesn't give us weird symbols when asking for numbers...)
        const longOffset = this.#getFormattedName("longOffset", "en", dateOrTimestamp);
        const regexResults = /([\+\-][0-9]{2}):([0-9]{2})$/.exec(longOffset);
        if (regexResults === null) {
            console.warn("Could not parse numeric offset from: " + '"' + longOffset + '"');
            return 0; // Oh well...
        }
        
        return Number.parseInt(regexResults.at(1)) + regexResults.at(2) / 60;
    }
    
    /**
     * Determines whether the timezone is currently in "summer time" (DST). May not be 100% reliable.
     * @returns {boolean} true if the timezone is in "summer time" (DST), false otherwise
     */
    get isSummerTime()
    {
        const year = (new Date(this.#dateOrTimestamp)).getUTCFullYear();
        
        // Assuming January 1st is always in "winter time" in the northern hemisphere
        const january1st = Date.UTC(year, 0, 1);
        const january1stOffset = this.getOffsetAsNumber(january1st);
        
        // Assuming July 1st is always "winter time" in the southern hemisphere
        const july1st = Date.UTC(year, 6, 1);
        const july1stOffset = this.getOffsetAsNumber(july1st);
        
        const defaultOffset = Math.min(january1stOffset, july1stOffset);
        const currentOffset = this.getOffsetAsNumber(this.#dateOrTimestamp);
        
        return currentOffset > defaultOffset;
    }
    
    /**
     * Returns an array of nodes to insert to the DOM, with the full description of the timezone.
     * (Short offset, identifier, and description, with appropriate separators).
     * @returns {(string|Node)[]}
     */
    getFullDescriptionNodes()
    {
        const identifierNode = document.createElement("strong");
        identifierNode.textContent = this.identifier;
        
        const brNode = document.createElement("br");
        brNode.className = "narrow-screens-only";
        
        const separatorNode = document.createElement("span");
        separatorNode.textContent = " – ";
        separatorNode.className = "wide-screens-only";
        
        return [
            this.shortOffset + " – ",
            identifierNode,
            brNode,
            separatorNode,
            this.description
        ];
    }
    
    /**
     * Formats the timezone name using the specified format (and locale, and timestamp)
     * @param {string} formatName "long", "longGeneric", "longOffset", "short", "shortGeneric" or "shortOffset"
     * @param {string} locale (Optional) e.g. "en-GB"
     * @param {Date|number} dateOrTimestamp (Optional) Offsets and names are influenced by DST / Summer Time,
     *     among other things.
     * @returns string The formatted timezone name (or offset)
     */
    #getFormattedName(formatName, locale = this.#locale, dateOrTimestamp = this.#dateOrTimestamp)
    {
        const nameParts = Intl.DateTimeFormat(locale, { timeZoneName: formatName, timeZone: this.identifier })
            .formatToParts(dateOrTimestamp);
        
        return nameParts.find(element => element.type === "timeZoneName").value;
    }
    
    /**
     * Gets the formatted long name, typically including the "Daylight" or "Summer" keyword if DST is in effect.
     * There are a few surprises, such as "Africa/Casablanca" giving out "GMT+01:00" (among others).
     * @returns {string} e.g. "Central European Summer Time" (or "heure d’été d’Europe centrale" in the "fr" locale)
     */
    #getLongName()
    {
        return this.#getFormattedName("long");
    }
    
    /**
     * Gets the formatted long *generic* name, typically NOT including the "Daylight" or "Summer" keyword
     * (even when DST is in effect).
     * @returns {string} e.g. "Central European Time" (or "heure d’Europe centrale" in the "fr" locale)
     */
    #getLongGenericName()
    {
        return this.#getFormattedName("longGeneric");
    }
    
    /**
     * Gets the formatted short name.
     * Sometimes an abbreviation, *possibly* including a letter for "summer" time (e.g. "CEST").
     * Sometimes just "GMT-7".
     * @returns {string} e.g. "CEST" (or "heure : France" in the "fr" locale)
     */
    #getShortName()
    {
        return this.#getFormattedName("short");
    }
    
    /**
     * Gets the formatted short *generic* name.
     * Sometimes an abbreviation, generally NOT including a letter for "summer" time (e.g. "CET", no "S").
     * Sometimes just "Japan Time".
     * @returns {string} e.g. "CET" (or "UTC+2" in the "fr" locale)
     */
    #getShortGenericName()
    {
        return this.#getFormattedName("shortGeneric");
    }
    
    /**
     * Gets the formatted long offset name.
     * @returns {string} e.g. "GMT+02:00" (or "UTC+02:00" in the "fr" locale)
     */
    #getLongOffset()
    {
        return this.#getFormattedName("longOffset");
    }
    
    /**
     * Gets the formatted short offset name.
     * @returns {string} e.g. "GMT+2" (or "UTC+2" in the "fr" locale)
     */
    #getShortOffset()
    {
        return this.#getFormattedName("shortOffset");
    }
    
    /**
     * Builds the description from the available info
     */
    #initializeDescription()
    {
        const longName = StringHelper.capitalizeFirstChar(this.#getLongName(), this.#locale);
        const longGenericName = StringHelper.capitalizeFirstChar(this.#getLongGenericName(), this.#locale);
        const shortName = StringHelper.capitalizeFirstChar(this.#getShortName(), this.#locale);
        const shortGenericName = StringHelper.capitalizeFirstChar(this.#getShortGenericName(), this.#locale);
        const longOffset = StringHelper.capitalizeFirstChar(this.#getLongOffset(), this.#locale);
        const shortOffset = StringHelper.capitalizeFirstChar(this.#getShortOffset(), this.#locale);
        
        // Temporarily add the identifier, shortOffset, and longOffset, to help detect redundant info
        const descriptionParts = [ this.identifier, shortOffset, longOffset ];
        
        if (!StringHelper.stringContainsAllWordsOf(descriptionParts.join(" "), longName)) {
            descriptionParts.push(longName);
        }
        
        if (!StringHelper.stringContainsAllWordsOf(descriptionParts.join(" "), longGenericName)) {
            descriptionParts.push(longGenericName);
        }
        
        if (!StringHelper.stringContainsAllWordsOf(descriptionParts.join(" "), shortName)) {
            descriptionParts.push(shortName);
        }
        
        if (!StringHelper.stringContainsAllWordsOf(descriptionParts.join(" "), shortGenericName)) {
            descriptionParts.push(shortGenericName);
        }
        
        // Remove the identifier, shortOffset, and longOffset (only used to detect redundancy)
        descriptionParts.shift();
        descriptionParts.shift();
        descriptionParts.shift();
        
        this.description = descriptionParts.join(" – ");
    }
}
