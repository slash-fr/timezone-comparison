class SearchOverlay extends AbstractDialog
{
    /** @type {HTMLElement} */
    #searchControlElement = document.getElementById("search-control");
    
    /** @type {HTMLInputElement} */
    #searchFieldElement = document.getElementById("search-field");
    
    /** @type {HTMLUListElement} */
    #searchResultListElement = document.querySelector("#search-results ul");
    
    /** @type {HTMLLIElement} */
    #tooManyTimezonesElement = document.getElementById("too-many-timezones");
    
    /** @type {TimezoneSearch} */
    #timezoneSearch;
    
    /** @type {UserInterface} */
    #ui;
    
    /** @type {Settings} */
    #settings;
    
    /**
     * @param {UserInterface} ui 
     * @param {Settings} settings
     */
    constructor(ui, settings)
    {
        super(ui, "search-overlay", undefined, undefined, "Close the “Search” overlay");
        
        this.#ui = ui;
        this.#settings = settings;
        
        this.#timezoneSearch = new TimezoneSearch(settings);
        
        this.#setupAutocompletion(settings.timezones, ui.getSvgIcon("add-icon"), ui.getSvgIcon("check-icon"));
        this.#setupAddTimezoneEvent();
        this.#setupArrowKeyNavigation();
        
        Object.freeze(this);
    }
    
    open()
    {
        super.open();
        this.#searchFieldElement.focus();
        this.#tooManyTimezonesElement.classList.toggle("visible", this.#settings.timezones.length >= 6);
        setTimeout(() => {
            this.#timezoneSearch.refreshTimezones();
        }, 200); // Let the search overlay show up before performing a heavy "refresh" operation
        // TODO: It would be cleaner to use a worker, rather than setTimeout()
    }
    
    close()
    {
        super.close();
        
        this.#searchFieldElement.value = "";
        this.#searchControlElement.classList.remove("results-visible");
        this.#clearSearchResults();
    }
    
    /**
     * @param {string[]} timezonesAlreadyInUse e.g. ["Europe/Paris", "Japan/Tokyo"]
     * @param {HTMLElement} addIcon An SVG icon to use for the "add" elements
     * @param {HTMLElement} checkIcon An SVG icon to use for the "already added" elements
     */
    #setupAutocompletion(timezonesAlreadyInUse, addIcon, checkIcon)
    {
        this.#searchFieldElement.addEventListener("input", (event) => {
            const searchQuery = event.target.value;
            
            // Show the results as long as the search query isn't empty
            this.#searchControlElement.classList.toggle("results-visible", searchQuery.trim().length > 0);
            
            this.#clearSearchResults();

            const searchResults = this.#timezoneSearch.search(searchQuery);
            
            for (const result of searchResults) {
                /** @var {TimezoneSearchItem} result */
                const isAlreadyInList = timezonesAlreadyInUse.includes(result.timezone.identifier);
            
                const resultLi = document.createElement("li");
                resultLi.className = "search-result";
                
                const resultButton = document.createElement("button");
                resultButton.disabled = isAlreadyInList;
                resultButton.dataset.identifier = result.timezone.identifier;
                
                const iconElement = isAlreadyInList ? checkIcon.cloneNode(true) : addIcon.cloneNode(true);
                resultButton.append(iconElement);
                
                // TODO: Highlight relevant parts of words?
                
                resultButton.append(...result.timezone.getFullDescriptionNodes());
                
                resultButton.ariaLabel = "Add the “" + result.timezone.identifier + '” time zone';
                
                resultLi.append(resultButton);
                this.#searchResultListElement.append(resultLi);
            }
        });
    }
    
    #clearSearchResults()
    {
        this.#searchResultListElement.querySelectorAll(".search-result").forEach((element) => {
            // Only remove elements with the "search-result" class.
            // => Don't remove the #no-results LI, nor the "too many timezones" warning
            element.remove();
        });
        
        this.#searchResultListElement.scrollTop = 0;
    }
    
    /**
     * Configures an event listener to actually add the timezone when the user clicks on a "result button"
     */
    #setupAddTimezoneEvent()
    {
        this.#searchResultListElement.addEventListener("click", (event) => {
            if (event.target.tagName === "BUTTON" && event.target.dataset.identifier !== undefined) {
                const newTimezoneIdentifier = event.target.dataset.identifier; // e.g. "Europe/Paris"
                
                this.#settings.addTimezone(newTimezoneIdentifier);
                
                this.close();
                
                // Let the overlay close fully before refreshing (and blocking the main thread...)
                this.#ui.refreshTimeline(200);
            }
        });
    }
    
    /**
     * Configures an event listener to handle the up/down arrow keys when the search control is focused
     */
    #setupArrowKeyNavigation()
    {
        this.#searchControlElement.addEventListener("keydown", (event) => {
            if (event.code === "ArrowUp") {
                this.#handleArrowUp(event);
                return;
            }
            
            if (event.code === "ArrowDown") {
                this.#handleArrowDown(event);
                return;
            }
        });
    }
    
    /**
     * Handles the "ArrowUp" event
     * @param {KeyboardEvent} event Must be an "ArrowUp" event from the "search-control" element
     */
    #handleArrowUp(event)
    {
        if (event.target.tagName !== "BUTTON") { // Not a result button
            return;
        }

        const currentResultLi = event.target.parentElement;
        let previousResultButton = currentResultLi.previousElementSibling.firstElementChild;
        // Warning: previousResultButton could be null
        
        while (previousResultButton?.tagName === "BUTTON" && previousResultButton.disabled) {
            previousResultButton = previousResultButton.parentElement.previousElementSibling.firstElementChild;
        }
        
        if (previousResultButton?.tagName === "BUTTON") {
            // Move to the previous result button
            previousResultButton.focus();
            event.preventDefault(); // Don't scroll
            
            return;
        }
        
        // No previous button => Give focus to the search input (Don't wrap around)
        this.#searchFieldElement.focus();
        event.preventDefault(); // Don't move the cursor to the start of the text
        this.#searchResultListElement.scrollTop = 0;
    }
    
    /**
     * Handles the "ArrowDown" event
     * @param {KeyboardEvent} event Must be an "ArrowDown" event from the "search-control" element
     */
    #handleArrowDown(event)
    {
        if (event.target.tagName === "INPUT") { // This is the search input
            const firstResultButton = this.#searchResultListElement.querySelector("button:not([disabled])");
            if (firstResultButton !== null) {
                // Move from the search input to the first result button
                firstResultButton.focus();
                event.preventDefault(); // Don't scroll
            }
            
            return;
        }
    
        if (event.target.tagName === "BUTTON") { // This is a result button
            const currentResultLi = event.target.parentElement;
            let nextResultButton = currentResultLi.nextElementSibling?.firstElementChild;
            // Warning: nextResultButton could be undefined
            
            while (nextResultButton?.tagName === "BUTTON" && nextResultButton.disabled) {
                nextResultButton = nextResultButton.parentElement.nextElementSibling?.firstElementChild;
            }
            
            if (nextResultButton?.tagName === "BUTTON") {
                // This is a result button, and there's another one below it
                nextResultButton.focus();
                event.preventDefault(); // Don't scroll
            }
            
            // If there is no other result button below, don't wrap around
        }
    }
}
