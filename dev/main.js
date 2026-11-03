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
// See: https://progressier.com/handling-service-worker-updates
/**
 * @param {ServiceWorkerRegistration} registration 
 */
function invokeServiceWorkerUpdateFlow(registration) {
    document.getElementById("add-button").style.display = "none";
    const reloadButton = document.getElementById("reload-button");
    reloadButton.style.display = "block";
    reloadButton.addEventListener("click", () => {
        if (registration.waiting) {
            registration.waiting.postMessage("SKIP_WAITING");
        }
    })
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
        const registration = await navigator.serviceWorker.register("service-worker.js");

        // Ensure the case when the updatefound event was missed is also handled
        // by re-invoking the prompt when there's a waiting Service Worker
        if (registration.waiting) {
            invokeServiceWorkerUpdateFlow(registration);
        }

        // Detect when a Service Worker update is available and wait for it to become installed
        registration.addEventListener("updatefound", () => {
            if (registration.installing) {
                // Wait until the new Service worker is actually installed (ready to take over)
                registration.installing.addEventListener("statechange", () => {
                    if (registration.waiting) {
                        // If there's an existing controller (previous Service Worker), show the "reload" button
                        if (navigator.serviceWorker.controller) {
                            invokeServiceWorkerUpdateFlow(registration);
                         } else {
                            // Otherwise it's the first install, nothing to do
                            //console.log("Service Worker initialized for the first time.");
                        }
                    }
                })
            }
        })

        let refreshing = false;

        navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (!refreshing) {
                //console.log("Refreshing (controllerchange)");
                window.location.reload();
                refreshing = true;
            }
        })
    })
}
