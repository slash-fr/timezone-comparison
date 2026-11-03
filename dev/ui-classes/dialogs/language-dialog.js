class LanguageDialog extends AbstractDialog
{
    /** @type {UserInterface} */
    #ui;
    
    /** @type {Settings} */
    #settings;
    
    /** @type {HTMLSelectElement} */
    #localeSelectElement;
    
    /** @type {HTMLParagraphElement} */
    #translationWarningElement;
    
    /**
     * @param {UserInterface} ui 
     * @param {Settings} settings 
     */
    constructor(ui, settings)
    {
        super(ui, "language-dialog", "translate-icon", "Date/time formatting");
        
        this.#ui = ui;
        this.#settings = settings;
        this.#localeSelectElement = document.getElementById("locale-select");
        this.#translationWarningElement = document.getElementById("translation-warning");
        
        this.#setupEventListeners();
    }
    
    open()
    {
        // Load the settings when opening the dialog

        // 1. Language

        const selectedLocaleOption = this.#localeSelectElement.querySelector(
            "option[value=" + (this.#settings.localeString) + "]"
        );
        
        if (selectedLocaleOption !== null) {
            selectedLocaleOption.selected = true;
        }

        this.#showTranslationWarningIfNecessary();

        // 2. Time convention

        document.querySelector("input[name=hour12][value=" + this.#settings.hour12String + "]").checked = true;
        
        // TODO: Update the input values:
        // - When initializing the dialog
        // - When the setting changes from another tab
        // Rather than on open()
        
        super.open();
    }
    
    #showTranslationWarningIfNecessary()
    {
        // If the locale starts with "en" (followed by a word boundary), don't show the warning:
        this.#translationWarningElement.style.display = /^en\b/.test(this.#settings.actualLocale) ? "none" : "block";
    }
    
    #setupEventListeners()
    {
        // 1. Language
        this.#localeSelectElement.addEventListener("change", (event) => {
            this.#settings.locale = event.target.value;
            
            this.#showTranslationWarningIfNecessary();
            this.#ui.refreshTimeline();
        });

        // 2. Time convention
        document.querySelectorAll("input[name=hour12]").forEach((element) => {
            element.addEventListener("change", (event) => {
                this.#settings.hour12 = event.target.value;
                this.#ui.refreshTimeline();
            });
        });
    }
}
