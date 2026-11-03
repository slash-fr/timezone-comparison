class TimezoneSearchItem
{
    /** @type {Timezone} */
    timezone;
    
    /**
     * Lowercase, normalized string without punctuation, and including the identifier and description.
     * Words are separated by a single space. The string always starts with a space.
     * (e.g. " europe paris central european summer time france time")
     * @type {string}
     */
    normalizedFullDescription;

    /**
     * @param {Timezone} timezone 
     */
    constructor(timezone)
    {
        this.timezone = timezone;
        this.#initializeFullDescription();
        Object.freeze();
    }
    
    /**
     * Concatenates the identifier and description info into a lowercase, normalized string without punctuation.
     * Words will be separated by a single space. The resulting string always starts with a space
     * (e.g. " europe paris central european summer time france time").
     */
    #initializeFullDescription()
    {
        this.normalizedFullDescription = TimezoneSearchItem.normalizeString(
            this.timezone.identifier + " " + this.timezone.description,
            this.timezone.locale
        );
    }
    
    /**
     * Normalizes the specified string to remove diacritics, and collapses punctuation and spaces into a single space.
     * The resulting string always starts with a space.
     * @param {string} stringToNormalize e.g. "Europe/Paris – Central European Summer Time – France Time"
     * @param {string} locale e.g. "en-GB"
     * @returns {string} e.g. " europe paris central european summer time france time"
     */
    static normalizeString(stringToNormalize, locale)
    {
        return " " + stringToNormalize.normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
                .toLocaleLowerCase(locale)
                .replaceAll(/([\p{P}\p{Z}]+)/gu, " ") // Collapse punctuation and spaces into 1 space
                // Note: Add \p{S} if you want to replace symbols as well (e.g. "£$+°=<>^")
                .trim();
    }
}
