class TimezoneManagementOverlay extends AbstractDialog
{
    /** @type {UserInterface} */
    #ui;
    
    /** @type {Settings} */
    #settings;
    
    /** @type {HTMLButtonElement} */
    #fixTimezoneOrderButton;
    
    /**
     * @param {UserInterface} ui 
     * @param {Settings} settings
     */
    constructor(ui, settings)
    {
        super(
            ui,
            "timezone-management-overlay",
            "timezone-management-icon",
            "Manage time zones",
            "Close the “Time zone management” overlay"
        );
        
        this.#ui = ui;
        this.#settings = settings;
        
        this.#fixTimezoneOrderButton = document.getElementById("fix-timezone-order-button");
        this.#fixTimezoneOrderButton.addEventListener("click", this.#fixTimezoneOrderButtonClicked.bind(this));
        
        // TODO: Add keyboard navigation with arrow keys (in addition to tab)
        
        Object.freeze(this);
    }
    
    open()
    {
        super.open();
        
        this.#refreshTimezoneList();
    }
    
    #refreshTimezoneList()
    {
        const timezoneListElement = document.getElementById("timezone-management-list");
        timezoneListElement.replaceChildren(); // Clear the list
        
        let isOrderWrong = false; // The sort order isn't wrong (yet)
        let previousOffset = -Infinity;
        
        for (const timezoneIdentifier of this.#settings.timezones) {
            const timezone = new Timezone(timezoneIdentifier, this.#settings.locale, timelineState.displayedTime);
            // /!\ Global var (timelineState)
            
            const newOffset = timezone.getOffsetAsNumber();
            if (newOffset < previousOffset) {
                isOrderWrong = true;
            }
            previousOffset = newOffset;
            
            const listItemElement = document.createElement("li");
            listItemElement.append(...timezone.getFullDescriptionNodes());
            
            const deleteButtonElement = document.createElement("button");
            deleteButtonElement.className = "delete-button";
            deleteButtonElement.dataset.identifier = timezone.identifier;
            deleteButtonElement.append(this.#ui.getSvgIcon("delete-icon"));
            deleteButtonElement.ariaLabel = "Delete the “" + timezone.identifier + "” time zone";
            deleteButtonElement.addEventListener("click", (event) => { this.#deleteTimezone(timezoneIdentifier); });
            listItemElement.append(deleteButtonElement);
            
            timezoneListElement.append(listItemElement);
        }
        
        this.#fixTimezoneOrderButton.style.display = isOrderWrong ? null : "none";
    }
    
    #deleteTimezone(timezoneIdentifier) {
        this.#settings.removeTimezone(timezoneIdentifier);
        
        // TODO: Add a toast message to allow undoing the "delete" action
        
        this.#refreshTimezoneList();
        this.#ui.refreshTimeline();
    }
    
    /**
     * @param {MouseEvent} event 
     */
    #fixTimezoneOrderButtonClicked(event)
    {
        this.#settings.fixTimezoneOrder();
        this.#refreshTimezoneList();
        this.#ui.refreshTimeline(); // TODO: Use the SettingChanged event to refresh the timeline.
    }
}
