/**
 * @abstract
 */
class AbstractDialog
{
    /**
     * @type {UserInterface}
     */
    #ui;
    
    /**
     * @type {HTMLElement}
     */
    #overlayElement;
    
    /**
     * @type {HTMLButtonElement}
     */
    #closeButton;
    
    /** @type {boolean} */
    #isOpen = false;
    
    /**
     * @param {UserInterface} ui 
     * @param {string} overlayElementId The ID of the "div.dialog-overlay" HTML element for this dialog
     * @param {string|undefined} iconId Optional icon ID
     * @param {string|undefined} title Optional dialog title
     * @param {string|undefined} closeButtonTitle Optional title for the close button.
     *                                            Will be built from the title if omitted.
     */
    constructor(ui, overlayElementId, iconId = undefined, title = undefined, closeButtonTitle = undefined)
    {
        if (this.constructor === AbstractDialog) {
            throw new Error("Cannot instantiate abstract class AbstractDialog.");
        }
        
        this.#ui = ui;
        this.#overlayElement = document.getElementById(overlayElementId);
     
        this.#buildTitle(ui, this.#overlayElement, iconId, title);
        this.#addCloseButton(ui, this.#overlayElement, title, closeButtonTitle);
        this.#setupDismissAction(this.#overlayElement);
        
        Object.freeze(this);
    }
    
    open()
    {
        this.#isOpen = true;
        this.#overlayElement.classList.add("visible");
        
        // /!\ Focusing on the first element causes the <select> to open on iOS
        // const firstInputElement = this.#overlayElement.querySelector("select, input");
        // if (firstInputElement !== null) {
        //     firstInputElement.focus();
        //     return;
        // }
        
        this.#closeButton.focus();
    }
    
    close()
    {
        this.#isOpen = false;
        this.#overlayElement.classList.remove("visible");
        this.#ui.focusOnViewport();
    }
    
    /**
     * Sets the content of the dialog's title (if any).
     * @param {UserInterface} ui
     * @param {HTMLElement} overlayElement 
     * @param {string|undefined} iconId Optional icon ID
     * @param {string|undefined} title Optional dialog title
     */
    #buildTitle(ui, overlayElement, iconId = undefined, title = undefined)
    {
        const titleElement = overlayElement.querySelector("h2.dialog-title");
        
        if (titleElement !== null) {
            titleElement.replaceChildren();
            
            if (iconId !== undefined) {
                const iconElement = ui.getSvgIcon(iconId);
                if (iconElement !== null) {
                    titleElement.append(iconElement);
                }
            }
            
            if (title !== undefined) {
                titleElement.append(title);
            }
        }
    }
    
    /**
     * Adds a close button, and associated event handler.
     * @param {UserInterface} ui 
     * @param {HTMLElement} overlayElement 
     * @param {string|undefined} title Optional dialog title
     * @param {string|undefined} closeButtonTitle Optional title for the close button.
     *                                            Will be built from the title if omitted.
     */
    #addCloseButton(ui, overlayElement, title = undefined, closeButtonTitle = undefined)
    {
        this.#closeButton = ui.getNewCloseButton();
        if (closeButtonTitle !== undefined) {
            this.#closeButton.title = closeButtonTitle;
        } else if (title !== undefined) {
            this.#closeButton.title = "Close the “" + title + "” dialog";
        }
        
        this.#closeButton.addEventListener("click", () => { this.close(); });
        
        const buttonContainer = overlayElement.querySelector("div.dialog-content") ?? overlayElement;
        buttonContainer.prepend(this.#closeButton);
    }
    
    /**
     * Configures event handlers to close the overlay when the user clicks in the "void" part, or presses "Escape".
     * @param {HTMLElement} overlayElement 
     */
    #setupDismissAction(overlayElement)
    {
        overlayElement.addEventListener("click", (event) => {
            // Close the overlay when the user clicks outside of the elements it contains
            if (
                event.target === overlayElement // The overlay itself (NOT one of its children)
                || event.target.classList.contains("overlay-content") // The overlay-content div (NOT dialog-content)
            ) { 
                this.close();
            }
        });
        
        // `document` rather than `overlayElement`, because the overlay/dialog might not be focused
        document.addEventListener("keydown", (event) => {
            if (this.#isOpen && event.code === "Escape"
                && (event.target.tagName !== "INPUT" || event.target.type !== "search")
            ) {
                this.close();
            }
        });
    }
}
