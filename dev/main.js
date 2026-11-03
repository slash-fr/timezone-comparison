"use strict";

////////////////////////////////////////////////////////////////////////////////
// Global variables

/** Our #viewport div */
const viewport = document.getElementById("viewport");

const settings = new Settings();

const timelineState = {
    minTimestamp: 0,
    scrollableNbHours: 0,
    displayedTime: 0,
};

// Prevent properties from being added to / removed from global variables.
// Property values can still be changed.
Object.seal(timelineState);

const ui = new UserInterface(settings);

// Initial rendering of the timeline
// (Don't draw the timeline before loading the settings).
document.addEventListener("DOMContentLoaded", (event) => {
    timelineState.displayedTime = DateTimeHelper.removeSeconds(Date.now());
    refreshTimeline();
    document.getElementById("loading").style.display = "none";
    viewport.focus(); // Give focus to the viewport, to be able to use the native browser scrolling feature
});

// Service worker, for offline mode:
const registerServiceWorker = async () => {
    if ("serviceWorker" in navigator) {
        try {
            const registration = await navigator.serviceWorker.register("service-worker.js");
            
            navigator.serviceWorker.addEventListener("controllerchange", (event) => {
                document.getElementById("add-button").style.display = "none";
                document.getElementById("reload-button").style.display = "block";
            });
            
        } catch (error) {
            console.error(`Service worker registration failed with ${error}`);
        }
    }
};

registerServiceWorker();

