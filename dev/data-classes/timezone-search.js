class TimezoneSearch
{
    /** @type {TimezoneSearchItem[]} */
    #availableTimezoneItems = [];
    
    /** @type {Settings} */
    #settings;
    
    /**
     * @param {Settings} settings 
     */
    constructor(settings) {
        this.#settings = settings;
    }
    
    /**
     * Refreshes the names and offsets of available time zones.
     * Should be called every time the search UI is displayed, because timeline scrolling will impact DST / Summer time.
     */
    refreshTimezones()
    {
        this.#availableTimezoneItems = [];
        
        Intl.supportedValuesOf("timeZone").forEach((timezoneIdentifier) => {
            if (timezoneIdentifier.startsWith("Etc")) {
                return; // "Etc" timezones are confusing (inverted offset) and not available in all browsers
            }
            
            if (timezoneIdentifier === "Australia/Lord_Howe") {
                // Weird timezone with a 30-minute DST offset (applies to ~500 inhabitants + 400 tourists...)
                // Breaks our (erroneous) assumption that DST offsets are an integer number of hours (usually just 1).
                return; // This is not the timezone you're looking for...
            }
            
            const timezone = new Timezone(timezoneIdentifier, this.#settings.locale, timelineState.displayedTime);
            // /!\ Global var (timelineState)
            
             this.#availableTimezoneItems.push(new TimezoneSearchItem(timezone));
        });
    }
    
    /**
     * Returns a list of search items matching the specified query.
     * @param {string} searchQuery The raw search query
     * @returns {TimezoneSearchItem[]}
     */
    search(searchQuery)
    {
        // We'll search for words in all available items, unless the query contains an offset
        let searchItemsForWordSearch = this.#availableTimezoneItems;
        
        // 1. Search by offset (if applicable)
        const offsetSearchQuery = this.#parseOffsetQuery(searchQuery);
        let offsetSearchResults = [];
        if (offsetSearchQuery !== null) {
            offsetSearchResults = this.#searchByOffset(offsetSearchQuery);
            searchItemsForWordSearch = offsetSearchResults; // Only search for words in the results of the offset query
        }
        
        // 2. Word-based search
        const wordSearchQuery = this.#parseWordSearchQuery(searchQuery, offsetSearchQuery);
        if (wordSearchQuery === " ") { // Empty search query (after cleanup)
            return offsetSearchResults;
        }
        
        // Search results for "offset AND words"
        return this.#searchForWords(searchItemsForWordSearch, wordSearchQuery);
    }
    
    /**
     * Parses the raw search query to find an offset.
     * @param {string} rawSearchQuery e.g. "+5:30 india"
     * @returns {OffsetSearchQuery|null} The part that matches an offset (e.g. "+5:30"), null if no offset was found
     */
    #parseOffsetQuery(rawSearchQuery)
    {
        rawSearchQuery = StringHelper.normalizeMinusSigns(rawSearchQuery);
        const offsetRegexResults = rawSearchQuery.match(/([+\-])(\d{1,2})(:\d?\d?)?/);
        if (offsetRegexResults === null) {
            return null;
        }
        
        // Valid examples:
        // "-07"
        // "+5"
        // "+5:"
        // "+5:3"
        // "+5:30"
        
        let offsetQueryString = offsetRegexResults[1]; // +/-
        offsetQueryString += Number.parseInt(offsetRegexResults[2]).toString(); // e.g. "07" => 7
        if (offsetRegexResults[3] !== undefined) {
            offsetQueryString += offsetRegexResults[3]; // e.g. ":30"
        }
        
        return new OffsetSearchQuery(offsetRegexResults[0], offsetQueryString); // With / without leading 0 (if any)
    }
    
    /**
     * Returns a list of search items matching the specified "offset" string.
     * @param {OffsetSearchQuery} offsetSearchQuery The part of the query that looks like an offset (e.g. "+5:30")
     * @returns {TimezoneSearchItem[]}
     */
    #searchByOffset(offsetSearchQuery)
    {
        const offsetSearchResults = [];
        
        for (const searchItem of this.#availableTimezoneItems) {
            if (searchItem.timezone.normalizedShortOffset.includes(offsetSearchQuery.normalizedQuery)) {
                offsetSearchResults.push(searchItem);
            }
        }
        
        return offsetSearchResults;
    }
    
    /**
     * Normalizes the raw search query, and removes the offset part (if any).
     * @param {string} rawSearchQuery The raw search query (e.g. "+3 Africa")
     * @param {OffsetSearchQuery|null} offsetSearchQuery The offset query, if any (e.g. "+3")
     * @returns {string} The normalized search query (e.g. " africa"). Always starts with a space.
     */
    #parseWordSearchQuery(rawSearchQuery, offsetSearchQuery)
    {
        let searchQuery = rawSearchQuery;
        
        if (offsetSearchQuery !== null) {
            // Remove the offset before searching for words
            searchQuery = searchQuery.replaceAll(offsetSearchQuery.rawQuery, "");
        }
        
        const queryEndsWithSpace = searchQuery.endsWith(" ");
        let normalizedSearchQuery = TimezoneSearchItem.normalizeString(searchQuery); // Always starts with a space
        if (queryEndsWithSpace && !normalizedSearchQuery.endsWith(" ")) {
            normalizedSearchQuery += " ";
        }
        
        return normalizedSearchQuery;
    }
    
    /**
     * @param {TimezoneSearchItem[]} searchItems Search items to use for this query
     * @param {string} wordSearchQuery The normalized search query (with any "offset" parts removed).
     *                                 Should start with a space (e.g. " paris")
     * @returns {TimezoneSearchItem[]}
     */
    #searchForWords(searchItems, wordSearchQuery)
    {
        let wordSearchResults = [];
        
        for (const searchItem of searchItems) {
            if (searchItem.normalizedFullDescription.includes(wordSearchQuery)) {
                wordSearchResults.push(searchItem);
            }
        }
        
        return wordSearchResults;
    }
}
