class MathHelper
{
    /**
     * Makes sure the specified number is within the allowed boundaries
     * @param {number} number 
     * @param {number} min 
     * @param {number} max 
     * @returns 
     */
    static clamp(number, min, max)
    {
        return Math.min(Math.max(min, number), max);
    }
}
