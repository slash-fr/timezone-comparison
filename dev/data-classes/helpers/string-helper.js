class StringHelper
{
    // static #ALTERNATE_MINUS_SIGNS = [
    //     '\u2010', // hyphen
    //     '\u2011', // non-breaking hyphen
    //     '\u2012', // figure dash
    //     '\u2013', // en dash
    //     '\u2014', // em dash
    //     '\u2015', // horizontal bar
    //     '\u2212', // minus sign
    //     '\uFE58', // SMALL EM DASH
    //     '\uFE63', // SMALL HYPHEN-MINUS
    //     '\uFF0D', // FULLWIDTH HYPHEN-MINUS
    // ];
    
    static #ALTERNATE_MINUS_SIGNS_REGEX = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g;
    
    /**
     * Checks whether a string contains all words of another (reference) string.
     * @param {string} stringToTest String to test
     * @param {string} referenceString String with the words to look for
     * @returns {boolean} true if `stringToTest` contains all words of `referenceString`, false otherwise.
     */
    static stringContainsAllWordsOf(stringToTest, referenceString)
    {
        const wordsToCheck = StringHelper.splitToWords(stringToTest);
        const referenceWords = StringHelper.splitToWords(referenceString);

        for (const word of referenceWords) {
            if (!wordsToCheck.includes(word)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Splits the specified string to words. Splits on whitespace and punctuation (and removes them from the output).
     * @param {string} stringToSplit e.g. "America/Los_Angeles is a US-based timezone. It's true."
     * @returns {string[]} e.g. ["America", "Los", "Angeles", "is", "a", "US", "based", "timezone", "It", "s", "true"]
     */
    static splitToWords(stringToSplit)
    {
        let words = [];
        
        stringToSplit.matchAll(/([\P{Punctuation}--\s]+)/gv).forEach((word) => {
            words.push(word[1]);
        });
        
        return words;
    }

    /**
     * Capitalizes the first character *of the string* (**not** of each word).
     * @param {string} wordOrSentence e.g. "heure d’été d’Europe centrale"
     * @returns {string} e.g. "Heure d’été d’Europe centrale"
     */
    static capitalizeFirstChar(wordOrSentence, locale = settings.locale)
    {
        return wordOrSentence.charAt(0).toLocaleUpperCase(locale) + wordOrSentence.substring(1);
    }
    
    /**
     * Replaces dashes and minus signs by an ASCII hyphen-minus (-)
     * @param {string} stringToNormalize e.g. "UTC−4"
     * @returns {string} The "normalized" string (e.g. "UTC-4")
     */
    static normalizeMinusSigns(stringToNormalize)
    {
        return stringToNormalize.replaceAll(StringHelper.#ALTERNATE_MINUS_SIGNS_REGEX, '-');
    }
}
