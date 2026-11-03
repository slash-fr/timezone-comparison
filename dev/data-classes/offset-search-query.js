class OffsetSearchQuery
{
    /**
     * e.g. "-07"
     * @type {string}
     */
    rawQuery;
    
    /**
     * The offset query with the leading zero removed, if any (e.g. "-7")
     * @type {string}
     */
    normalizedQuery;
    
    constructor(rawQuery, normalizedQuery)
    {
        this.rawQuery = rawQuery;
        this.normalizedQuery = normalizedQuery;
        Object.freeze(this);
    }
}
