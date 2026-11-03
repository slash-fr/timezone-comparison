class HighlightedHoursDialog extends AbstractDialog
{
    /** @type {UserInterface} */
    #ui;
    
    /** @type {Settings} */
    #settings;
    
    /** @type {HTMLInputElement} */
    #enableHighlightedHoursCheckbox;
    
    /** @type {HTMLParagraphElement} */
    #highlightedHoursDetailElement;
    
    /** @type {HTMLSelectElement} */
    #highlightedHoursStartElement;
    
    /** @type {HTMLSelectElement} */
    #highlightedHoursEndElement;
    
    /**
     * @param {UserInterface} ui 
     * @param {Settings} settings 
     */
    constructor(ui, settings)
    {
        super(ui, "highlighted-hours-dialog", "highlighted-hours-icon", "Highlighted hours");
        
        this.#ui = ui;
        this.#settings = settings;
        
        this.#enableHighlightedHoursCheckbox = document.getElementById("enable-highlighted-hours-checkbox");
        this.#highlightedHoursDetailElement = document.getElementById("highlighted-hours-detail");
        this.#highlightedHoursStartElement = document.getElementById("highlighted-hours-start");
        this.#highlightedHoursEndElement = document.getElementById("highlighted-hours-end");
        
        this.#setupEventListeners();
    }
    
    open()
    {
        for (let i = 0; i < 24; i++) {
            const startHourElement = document.createElement("option");
            const endHourElement = document.createElement("option");
            
            startHourElement.value = i;
            endHourElement.value = i;
            
            // By definition, the epoch was at 00:00 UTC. Let's add the desired number of hours to it.
            startHourElement.textContent = DateTimeHelper.getFormattedHour(
                this.#settings.locale,
                i * 3600_000,
                this.#settings.hour12,
                "UTC"
            );
            endHourElement.textContent = startHourElement.textContent;
            
            startHourElement.selected = (i === this.#settings.highlightedHoursStart);
            endHourElement.selected = (i === this.#settings.highlightedHoursEnd);
            
            this.#highlightedHoursStartElement.append(startHourElement);
            this.#highlightedHoursEndElement.append(endHourElement);
        }

        this.#enableHighlightedHoursCheckbox.checked = this.#settings.enableHighlightedHours;
        this.#highlightedHoursDetailElement.classList.toggle("disabled", !this.#settings.enableHighlightedHours);
        this.#highlightedHoursStartElement.disabled = !this.#settings.enableHighlightedHours;
        this.#highlightedHoursEndElement.disabled = !this.#settings.enableHighlightedHours;
        
        // TODO: Update the input values:
        // - When initializing the dialog
        // - When the setting changes from another tab
        // Rather than on open()
        
        super.open();
    }
    
    #setupEventListeners()
    {
        this.#enableHighlightedHoursCheckbox.addEventListener("change", (event) => {
            this.#settings.enableHighlightedHours = event.target.checked;
            this.#highlightedHoursDetailElement.classList.toggle("disabled", !this.#settings.enableHighlightedHours);
            this.#highlightedHoursStartElement.disabled = !this.#settings.enableHighlightedHours;
            this.#highlightedHoursEndElement.disabled = !this.#settings.enableHighlightedHours;
            
            this.#ui.refreshTimeline();
        });

        this.#highlightedHoursStartElement.addEventListener("change", (event) => {
            this.#settings.highlightedHoursStart = event.target.value;
            this.#ui.refreshTimeline();
        });

        this.#highlightedHoursEndElement.addEventListener("change", (event) => {
            this.#settings.highlightedHoursEnd = event.target.value;
            this.#ui.refreshTimeline();
        });
    }
}
