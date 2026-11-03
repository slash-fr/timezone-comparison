class UserInterface
{
    /**
     * Main viewport where timezones are displayed
     * @type {HTMLElement}
     */
    #viewportElement = document.getElementById("viewport");
    
    /**
     * Reusable close button (to be cloned)
     * @type {HTMLButtonElement}
     */
    #closeButton = document.createElement("button");
    
    /** @type {HTMLMetaElement} */
    #colorSchemeMetaElement = document.querySelector("meta[name=color-scheme]");
    
    /** @type {NodeListOf<HTMLMetaElement>} */
    #darkMetaElements = document.querySelectorAll("meta.dark");
    
    /** @type {NodeListOf<HTMLMetaElement>} */
    #lightMetaElements = document.querySelectorAll("meta.light");
    
    /**
     * @param {Settings} settings 
     */
    constructor(settings)
    {
        this.#closeButton.append(this.getSvgIcon("close-icon"));
        this.#closeButton.className = "close-button";
        
        this.applyTheme(settings.theme);
        
        this.#setupWarningIcons();
        this.#setupDropDownIcons();
        this.#setupDialogsAndMenu(settings);
        
        Object.freeze(this);
    }
    
    /**
     * Creates a new "button" HTML Element, ready to be inserted in the DOM for dialogs, overlays, ...
     * @returns {HTMLElement} A close button with a close icon (and no event listeners)
     */
    getNewCloseButton()
    {
        return this.#closeButton.cloneNode(true);
    }
    
    /**
     * Gets a copy of the re-usable icon matching the specified ID, with the ID removed, or null if not found.
     * @param {string} code e.g. "delete-icon"
     * @returns {HTMLElement|null} The HTML element corresponding to the SVG element, if found, or null otherwise.
     */
    getSvgIcon(iconId)
    {
        const iconElement = document.querySelector("svg#" + iconId);
        if (iconElement === null) {
            return null;
        }
        
        const newIconElement = iconElement.cloneNode(true);
        newIconElement.removeAttribute("id");
        
        return newIconElement;
    }
    
    /**
     * Gives the focus to the main viewport (timeline with the timezones).
     */
    focusOnViewport()
    {
        this.#viewportElement.focus();
    }
    
    /**
     * Redraws the timeline, after the specified delay
     * @param {number} delayInMilliseconds 
     */
    refreshTimeline(delayInMilliseconds = 0)
    {
        // TODO: Stop using global functions.
        setTimeout(refreshTimeline, delayInMilliseconds);
    }
    
    /**
     * Updates the meta tags, depending on the specified theme, and on media queries.
     * @param {string} theme "auto", "light", or "dark"
     */
    applyTheme(theme)
    {
        if (theme === "auto") {
            this.#colorSchemeMetaElement.content = "light dark";
            this.#darkMetaElements.forEach((elem) => { elem.media = "(prefers-color-scheme: dark)"; });
            this.#lightMetaElements.forEach((elem) => { elem.media = "(prefers-color-scheme: light)"; });
            return;
        }
        
        if (theme === "light") {
            this.#colorSchemeMetaElement.content = "light";
            this.#darkMetaElements.forEach((elem) => { elem.media = "not all"; }); // Never applies
            this.#lightMetaElements.forEach((elem) => { elem.media = "all"; }); // Always applies
            return;
        }
        
        if (theme === "dark") {
            this.#colorSchemeMetaElement.content = "dark";
            this.#darkMetaElements.forEach((elem) => { elem.media = "all"; }); // Always applies
            this.#lightMetaElements.forEach((elem) => { elem.media = "not all"; }); // Never applies
            return;
        }
        
        console.error("Invalid theme: " + theme);
        //throw new Error("Invalid theme: " + newTheme);
    }
    
    #setupWarningIcons()
    {
        const warningIcon = document.getElementById("warning-icon").cloneNode(true);
        warningIcon.removeAttribute("id");
        document.querySelectorAll("span.warning-icon").forEach((element) => {
            element.ariaLabel = "Warning";
            element.appendChild(warningIcon.cloneNode(true));
        });
    }
    
    #setupDropDownIcons()
    {
        const dropDownIcon = document.getElementById("drop-down-icon");
        
        for (const selectElement of document.querySelectorAll("span.select-wrapper")) {
            selectElement.append(dropDownIcon.cloneNode(true));
        }
    }
    
    /**
     * @param {Settings} settings 
     */
    #setupDialogsAndMenu(settings)
    {
        // Dialogs / Overlays
        const searchOverlay = new SearchOverlay(this, settings);
        const timezoneManagementOverlay = new TimezoneManagementOverlay(this, settings);
        const highlightedHoursDialog = new HighlightedHoursDialog(this, settings);
        const languageDialog = new LanguageDialog(this, settings);
        const themeDialog = new ThemeDialog(this, settings);
        const aboutDialog = new AboutDialog(this);
        
        document.getElementById("add-button").addEventListener("click", () => { searchOverlay.open(); });
        
        // Menu
        const menu = new Menu(
            this,
            timezoneManagementOverlay,
            highlightedHoursDialog,
            languageDialog,
            themeDialog,
            aboutDialog
        );
    }
}
