class Settings
{
    static #LOCAL_STORAGE_PREFIX = "timezone-comparison_";
    
    /**
     * List of timezones to display (e.g. ["Europe/Paris", "Asia/Kolkata"])
     * @type {string[]}
     */
    #timezones;
    
    /**
     * The locale to use for date/time formatting (e.g. "en-GB")
     * @type {string|undefined}
     */
    #locale;
    
    /**
     * Whether to use a 12-hour clock (as opposed to a 24-hour clock)
     * @type {boolean|undefined}
     */
    #hour12;
    
    /**
     * Enable the "highlighted hours" feature?
     * @type {boolean}
     */
    #enableHighlightedHours;
    
    /**
     * "Highlighted hours" starting hour. Integer from 0 to 23.
     * @type {number}
     */
    #highlightedHoursStart;
    
    /**
     * "Highlighted hours" ending hour. Integer from 0 to 23. May be greater or lower than highlightedHoursStart.
     * @type {number}
     */
    #highlightedHoursEnd;
    
    /**
     * "auto" | "light" | "dark"
     * @type {string}
     */
    #theme = "auto";
    
    constructor()
    {
        this.#loadTimezones();
        this.#loadLocale();
        this.#loadHour12();
        this.#loadEnableHighlightedHours();
        this.#loadHighlightedHoursStart();
        this.#loadHighlightedHoursEnd();
        this.#loadTheme();
        
        window.addEventListener("storage", (event) => { this.#handleStorageEvent(event) });
    }
    
    ////////////////////////////////////////////////////////////////////////////
    // Getters / Setters
    
    /**
     * List of timezones to display.
     * @returns {string[]} e.g. ["Europe/Paris", "Asia/Kolkata"]
     */
    get timezones()
    {
        return this.#timezones;
    }
    
    /**
     * Inserts a timezone in the "timezones" array, sorted by ascending offset, and saves the "timezones" settings.
     * @param {string} newTimezoneIdentifier e.g. "Europe/Stockholm"
     */
    addTimezone(newTimezoneIdentifier)
    {
        if (
            !Intl.supportedValuesOf("timeZone").includes(newTimezoneIdentifier) // Not supported
            || this.#timezones.includes(newTimezoneIdentifier) // Or already listed
        ) {
            return;
        }
        
        const newTimezone = new Timezone(newTimezoneIdentifier, this.#locale, timelineState.displayedTime);
        // /!\ Global var (timelineState)
        
        const newTimezoneOffsetAsNumber = newTimezone.getOffsetAsNumber();

        let newTimezonePosition = 0; // Position in the #timezones array
        for (const oldTimezoneIdentifier of this.#timezones) {
            const oldTimezone = new Timezone(oldTimezoneIdentifier, this.#locale, timelineState.displayedTime);
            // /!\ Global var (timelineState)
            
            if (newTimezoneOffsetAsNumber <= oldTimezone.getOffsetAsNumber()) {
                // We're past the target position => Stop searching
                break;
            }
            
            // Haven't found the target position yet, keep going
            newTimezonePosition++;
        }
        
        // Insert the timezone at the correct position:
        this.#timezones.splice(newTimezonePosition, 0, newTimezoneIdentifier);
        localStorage.setItem(
            Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.timezones,
            JSON.stringify(this.#timezones)
        );
        document.dispatchEvent(new SettingChangedEvent(SettingsEnum.timezones, this.#timezones));
    }
    
    /**
     * Removes the specified timezone from the "timezones" array, and saves the "timezones" settings.
     * @param {string} timezoneIdentifierToRemove e.g. "Europe/Paris"
     */
    removeTimezone(timezoneIdentifierToRemove)
    {
        const timezoneIndex = this.#timezones.indexOf(timezoneIdentifierToRemove);
        
        if (timezoneIndex < 0) {
            console.error(
                "Could not remove the specified timezone, because it was not found: "
                + timezoneIdentifierToRemove
            );
            
            return;
        }
        
        this.#timezones.splice(timezoneIndex, 1);
        localStorage.setItem(
            Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.timezones,
            JSON.stringify(this.#timezones)
        );
        document.dispatchEvent(new SettingChangedEvent(SettingsEnum.timezones, this.#timezones));
    }
    
    fixTimezoneOrder()
    {
        // Step 1: Compute the offsets
        const timezoneAndOffsets = [];
        for (const timezoneIdentifier of this.#timezones) {
            const timezone = new Timezone(timezoneIdentifier, this.#locale, timelineState.displayedTime);
            // /!\ Global var (timelineState)
            
            timezoneAndOffsets.push({
                timezoneIdentifier: timezoneIdentifier,
                offset: timezone.getOffsetAsNumber(),
            });
        }
        
        // Step 2: Sort
        timezoneAndOffsets.sort((a, b) => {
            if (a.offset < b.offset) {
                return -1;
            }
            
            return (a.offset > b.offset) ? 1 : 0;
        });
        
        // Step 3: Update the timezones
        this.#timezones = [];
        for (const item of timezoneAndOffsets) {
            this.#timezones.push(item.timezoneIdentifier);
        }
        
        localStorage.setItem(
            Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.timezones,
            JSON.stringify(this.#timezones)
        );
        document.dispatchEvent(new SettingChangedEvent(SettingsEnum.timezones, this.#timezones));
    }
    
    /**
     * The locale to use for date/time formatting.
     * @returns {string|undefined} e.g. "en-GB"
     */
    get locale()
    {
        return this.#locale;
    }
    
    /**
     * The locale to use for date/time formatting, or "default" if not set.
     * Unlike Settings.locale, Settings.localeString is never undefined.
     * @returns {string} e.g. "default", "en-GB", "en-US", ...
     */
    get localeString()
    {
        return this.#locale ?? "default";
    }
    
    /**
     * The actual locale. Either Settings.locale if explicitly defined, or the browser's locale otherwise.
     * @returns {string} e.g. "fr-FR"
     */
    get actualLocale()
    {
        if (this.#locale !== undefined) {
            return this.#locale;
        }
        
        // If the locale setting is set to "default", return the browser's locale
        return navigator.language;
    }
    
    /**
     * Sets and saves the locale to use for date/time formatting.
     * @param {string|undefined} newLocale A locale identifier (e.g. "en-GB"), "default" or undefined.
     */
    set locale(newLocale)
    {
        if (
            typeof newLocale === "string" && newLocale !== "default"
            && Intl.DateTimeFormat.supportedLocalesOf(newLocale)
        ) {
            this.#locale = newLocale;
            localStorage.setItem(
                Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.locale,
                this.#locale
            );
        } else {
            this.#locale = undefined;
            localStorage.removeItem(
                Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.locale,
                this.#locale
            );
        }
        
        document.dispatchEvent(new SettingChangedEvent(SettingsEnum.locale, this.#locale));
    }
    
    /**
     * Whether to use a 12-hour clock (as opposed to a 24-hour clock)
     * @returns {boolean|undefined}
     */
    get hour12()
    {
        return this.#hour12;
    }
    
    /**
     * Whether to use a 12-hour clock (as opposed to a 24-hour clock)
     * @returns {string} "true", "false", or "auto"
     */
    get hour12String()
    {
        if (this.#hour12 === true) {
            return "true";
        } else if (this.#hour12 === false) {
            return "false";
        }
        
        return "auto";
    }
    
    /**
     * Sets and saves the "time convention" setting (12-hour clock).
     * @param {string|boolean|undefined} "true", "false", "auto", true, false, or undefined
     */
    set hour12(newHour12)
    {
        if (typeof newHour12 === "boolean") {
            this.#hour12 = newHour12;
            localStorage.setItem(
                Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.hour12,
                JSON.stringify(this.#hour12)
            );
            document.dispatchEvent(new SettingChangedEvent(SettingsEnum.hour12, this.#hour12));
            return;
        }
        
        if (newHour12 === "true") {
            this.#hour12 = true;
            localStorage.setItem(
                Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.hour12,
                newHour12
            );
            document.dispatchEvent(new SettingChangedEvent(SettingsEnum.hour12, this.#hour12));
            return;
        }
        
        if (newHour12 === "false") {
            this.#hour12 = false;
            localStorage.setItem(
                Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.hour12,
                newHour12
            );
            document.dispatchEvent(new SettingChangedEvent(SettingsEnum.hour12, this.#hour12));
            return;
        }
        
        // "auto", undefined, or invalid value
        this.#hour12 = undefined;
        localStorage.removeItem(Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.hour12);
        document.dispatchEvent(new SettingChangedEvent(SettingsEnum.hour12, this.#hour12));
    }
    
    /**
     * Enable the "highlighted hours" feature?
     * @returns {boolean}
     */
    get enableHighlightedHours()
    {
        return this.#enableHighlightedHours;
    }
    
    /**
     * Sets and saves the "enable highlighted hours" setting.
     * @param {boolean} newEnableHighlightedHours
     */
    set enableHighlightedHours(newEnableHighlightedHours)
    {
        if (newEnableHighlightedHours === true) {
            this.#enableHighlightedHours = true;
            localStorage.setItem(
                Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.enableHighlightedHours,
                "true"
            );
            document.dispatchEvent(
                new SettingChangedEvent(SettingsEnum.enableHighlightedHours, this.#enableHighlightedHours)
            );
            return;
        }
        
        // false, or invalid value
        this.#enableHighlightedHours = false;
        localStorage.removeItem(Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.enableHighlightedHours);
        document.dispatchEvent(
            new SettingChangedEvent(SettingsEnum.enableHighlightedHours, this.#enableHighlightedHours)
        );
    }
    
    /**
     * "Highlighted hours" starting hour. Integer from 0 to 23.
     * @returns {number}
     */
    get highlightedHoursStart()
    {
        return this.#highlightedHoursStart;
    }
    
    /**
     * Sets and saves the "highlighted hours start" setting.
     * @param {number|string} newHighlightedHoursStart Integer number (as a number or as a string)
     */
    set highlightedHoursStart(newHighlightedHoursStart)
    {
        if (typeof newHighlightedHoursStart === "string") {
            newHighlightedHoursStart = Number.parseInt(newHighlightedHoursStart);
        }
        
        if (
            typeof newHighlightedHoursStart === "number"
            && newHighlightedHoursStart >= 0 && newHighlightedHoursStart < 24
        ) {
            this.#highlightedHoursStart = Math.floor(newHighlightedHoursStart);
            localStorage.setItem(
                Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.highlightedHoursStart,
                this.#highlightedHoursStart
            );
            document.dispatchEvent(
                new SettingChangedEvent(SettingsEnum.highlightedHoursStart, this.#highlightedHoursStart)
            );
            return;
        }
        
        // Invalid value
        console.error("Invalid Settings.highlightedHoursStart value: " + newHighlightedHoursStart);
        //throw new Error("Invalid Settings.highlightedHoursStart value: " + newHighlightedHoursStart);
    }
    
    /**
     * "Highlighted hours" ending hour. Integer from 0 to 23. May be greater or lower than highlightedHoursStart.
     * @returns {number}
     */
    get highlightedHoursEnd()
    {
        return this.#highlightedHoursEnd;
    }
    
    /**
     * Sets and saves the "highlighted hours end" setting.
     * @param {number|string} newHighlightedHoursEnd Integer number (as a number or as a string)
     */
    set highlightedHoursEnd(newHighlightedHoursEnd)
    {
        if (typeof newHighlightedHoursEnd === "string") {
            newHighlightedHoursEnd = Number.parseInt(newHighlightedHoursEnd);
        }
        
        if (
            typeof newHighlightedHoursEnd === "number"
            && newHighlightedHoursEnd >= 0 && newHighlightedHoursEnd < 24
        ) {
            this.#highlightedHoursEnd = Math.floor(newHighlightedHoursEnd);
            localStorage.setItem(
                Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.highlightedHoursEnd,
                this.#highlightedHoursEnd
            );
            document.dispatchEvent(
                new SettingChangedEvent(SettingsEnum.highlightedHoursEnd, this.#highlightedHoursEnd)
            );
            return;
        }
        
        // Invalid value
        console.error("Invalid Settings.highlightedHoursEnd value: " + newHighlightedHoursEnd);
        //throw new Error("Invalid Settings.highlightedHoursEnd value: " + newHighlightedHoursEnd);
    }
    
    /**
     * @returns {string} "auto" | "light" | "dark"
     */
    get theme()
    {
        return this.#theme;
    }
    
    /**
     * Sets and saves the "theme" setting.
     * @param {string} newTheme
     */
    set theme(newTheme)
    {
        if (["auto", "light", "dark"].includes(newTheme)) {
            this.#theme = newTheme;
            localStorage.setItem(Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.theme, newTheme);
            document.dispatchEvent(new SettingChangedEvent(SettingsEnum.theme, this.#theme));
            return;
        }
        
        console.error("Invalid theme: " + newTheme);
        //throw new Error("Invalid theme: " + newTheme);
    }
    
    ////////////////////////////////////////////////////////////////////////////
    // Initialization methods
    
    #loadTimezones()
    {
        this.#timezones = [];
        
        const allowedTimezones = Intl.supportedValuesOf("timeZone");
        
        let rawTimezones = [];
        try {
            const timezoneItem = localStorage.getItem(Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.timezones);
            rawTimezones = JSON.parse(timezoneItem ?? "[]");
        } catch (error) { // Typically: SyntaxError
            console.log(error);
        }

        if (!Array.isArray(rawTimezones)) {
            rawTimezones = [];
        }
        
        for (const timezoneIdentifier of rawTimezones) {
            if (typeof timezoneIdentifier === "string" && allowedTimezones.includes(timezoneIdentifier)) {
                this.#timezones.push(timezoneIdentifier);
            }
        }

        // Add the user's timezone, rather than starting with an empty timeline
        if (this.#timezones.length < 1) {
            const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (allowedTimezones.includes(localTimezone)) {
                this.#timezones.push(localTimezone);
            }
        }
    }
    
    #loadLocale()
    {
        this.#locale = localStorage.getItem(Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.locale);
        
        if (
            typeof this.#locale !== "string"
            || !Intl.DateTimeFormat.supportedLocalesOf(this.#locale)
        ) {
            this.#locale = undefined; // The browser's default locale
        }
    }
    
    #loadHour12()
    {
        const localStorageValue = localStorage.getItem(Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.hour12);
        
        if (localStorageValue === "true") {
            this.#hour12 = true; // Boolean (not string)
        } else if (localStorageValue === "false") {
            this.#hour12 = false; // Boolean (not string)
        } else {
            this.#hour12 = undefined; // Default, depends on the locale
        }
    }
    
    #loadEnableHighlightedHours()
    {
        const localStorageValue = localStorage.getItem(
            Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.enableHighlightedHours
        );
        this.#enableHighlightedHours = (localStorageValue === "true");
    }
    
    #loadHighlightedHoursStart()
    {
        const localStorageValue = localStorage.getItem(
            Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.highlightedHoursStart
        );
        this.#highlightedHoursStart = Number.parseInt(localStorageValue);
        
        if (isNaN(this.#highlightedHoursStart)) {
            this.#highlightedHoursStart = 8; // 08:00 (8 AM)
        }
    }
    
    #loadHighlightedHoursEnd()
    {
        const localStorageValue = localStorage.getItem(
            Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.highlightedHoursEnd
        );
        this.#highlightedHoursEnd = Number.parseInt(localStorageValue);
        
        if (isNaN(this.#highlightedHoursEnd)) {
            this.#highlightedHoursEnd = 23; // 23:00 (11 PM)
        }
    }
    
    #loadTheme()
    {
        this.#theme = localStorage.getItem(
            Settings.#LOCAL_STORAGE_PREFIX + SettingsEnum.theme
        );
        
        if (!["auto", "light", "dark"].includes(this.#theme)) {
            this.#theme = "auto";
        }
    }
    
    ////////////////////////////////////////////////////////////////////////////
    // Event handlers
    
    /**
     * @param {StorageEvent} event 
     */
    #handleStorageEvent(event)
    {        
        for (const settingName in SettingsEnum) {
            const settingStr = SettingsEnum[settingName];
            if (event.key === Settings.#LOCAL_STORAGE_PREFIX + settingStr) {
                this[settingName] = event.newValue;
                document.dispatchEvent(
                    // Dispatch the event with `this[settingName]` (correct type),
                    // *not* with `event.newValue` (always a string).
                    new SettingChangedEvent(settingStr, this[settingName])
                );
                return;
            }
        }
    }
}
