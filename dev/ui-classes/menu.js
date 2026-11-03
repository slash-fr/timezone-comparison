class Menu
{
    /** @type {UserInterface} */
    #ui;
    
    /** @type {HTMLButtonElement} */
    #menuButton;
    
    /** @type {HTMLDivElement} */
    #menuElement;
    
    #isOpen = false;
    
    /**
     * @param {UserInterface} ui 
     * @param {TimezoneManagementOverlay} timezoneManagementOverlay 
     * @param {HighlightedHoursDialog} highlightedHoursDialog 
     * @param {LanguageDialog} languageDialog 
     * @param {ThemeDialog} themeDialog 
     * @param {AboutDialog} aboutDialog 
     */
    constructor(
        ui,
        timezoneManagementOverlay,
        highlightedHoursDialog,
        languageDialog,
        themeDialog,
        aboutDialog
    ) {
        this.#ui = ui;
        
        this.#menuButton = document.getElementById("menu-button");
        this.#menuElement = document.getElementById("menu");
        
        this.#setupEventListeners(
            timezoneManagementOverlay,
            highlightedHoursDialog,
            languageDialog,
            themeDialog,
            aboutDialog
        );
    }
    
    /**
     * Closes the menu unconditionally
     */
    #close()
    {
        this.#menuElement.classList.remove("visible");
        this.#menuButton.classList.remove("menu-is-open");
        this.#isOpen = false;
    }
    
    /**
     * Checks whether the menu can be closed, and closes it.
     * @param {FocusEvent} event 
     */
    #closeIfNotFocused(event)
    {
        if (event.relatedTarget === null || !this.#menuElement.contains(event.relatedTarget)) {
            // Close the menu when it loses focus completely (i.e. focus doesn't go to one of its children)
            this.#close();
        }
    }
    
    /**
     * Handles the up/down arrow keys when the menu is focused
     * @param {KeyboardEvent} event 
     */
    #handleMenuKeys(event)
    {
        if (event.code ==="ArrowUp") {
            if (event.target.parentElement === this.#menuElement && event.target.previousElementSibling !== null) {
                // This is a menu item, and there's another one above it
                event.target.previousElementSibling.focus();
                return;
            }
            
            // This is the menu itself, or the first menu item
            this.#menuElement.lastElementChild.focus(); // Wrap around
            return;
        }
            
        if (event.code === "ArrowDown") {
            if (event.target.parentElement === this.#menuElement && event.target.nextElementSibling !== null) {
                // This is a menu item, and there's another one below it
                event.target.nextElementSibling.focus();
                return;
            }
            
            // This is the menu itself, or the last menu item
            this.#menuElement.firstElementChild.focus(); // Wrap around
            return;
        }
        
        if (event.code === "Escape") {
            if (this.#isOpen) {
                this.#close();
                this.#ui.focusOnViewport();
                // TODO: Dispatch an event, rather than depending on the UserInterface class just for this
            }
            
            return;
        }
    }
    
    #setupEventListeners(timezoneManagementOverlay, highlightedHoursDialog, languageDialog, themeDialog, aboutDialog)
    {
        this.#menuButton.addEventListener("click", (event) => {
            this.#menuButton.classList.add("menu-is-open");
            this.#menuElement.classList.add("visible");
            this.#menuElement.focus({ focusVisible: false });
            this.#isOpen = true;
        });
        
        this.#menuElement.addEventListener("blur", this.#closeIfNotFocused.bind(this));
        this.#menuElement.addEventListener("keydown", this.#handleMenuKeys.bind(this));

        document.querySelectorAll("#menu button").forEach((menuItem) => {
            menuItem.addEventListener("blur", this.#closeIfNotFocused.bind(this));
        });
        
        document.getElementById("timezone-management-menu-item").addEventListener("click", () => {
            timezoneManagementOverlay.open();
            this.#close();
        });
        document.getElementById("highlighted-hours-menu-item").addEventListener("click", () => {
            highlightedHoursDialog.open();
            this.#close();
        });
        document.getElementById("language-menu-item").addEventListener("click", () => {
            languageDialog.open();
            this.#close();
        });
        document.getElementById("theme-menu-item").addEventListener("click", () => {
            themeDialog.open();
            this.#close();
        });
        document.getElementById("about-menu-item").addEventListener("click", () => {
            aboutDialog.open();
            this.#close();
        });
    }
}
