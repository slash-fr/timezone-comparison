class ThemeDialog extends AbstractDialog
{
    /** @type {Settings} */
    #settings;
    
    /**
     * @param {UserInterface} ui 
     * @param {Settings} settings 
     */
    constructor(ui, settings)
    {
        super(ui, "theme-dialog", "theme-icon", "Theme");

        this.#settings = settings;
        
        this.#setupEventHandlers(ui, settings);
    }
    
    open()
    {
        document.querySelector("input[name=theme][value=" + this.#settings.theme + "]").checked = true;
        // TODO: Update the input value:
        // - When initializing the dialog
        // - When the setting changes from another tab
        // Rather than on open()
        
        super.open();
    }
    
    #setupEventHandlers(ui, settings)
    {
        for (const element of document.querySelectorAll("input[name=theme]")) {
            element.addEventListener("change", (event) => {
                // Update theme settings
                settings.theme = event.target.value;
                ui.applyTheme(settings.theme);
            });
        }
    }
}
