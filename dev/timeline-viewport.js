"use strict";

/** Width of an hour, in pixels (CSS "px") */
const HOUR_WIDTH_IN_PIXELS = 60;

// Formatting days/hours is surprisingly costly => Use caching/memoization (and other optimizations)
/**
 * e.g {0: "12:00 AM", 1: "01:00 AM", ...}
 * @type {Object}
 */
let hourNumberToStrMapping = undefined;
let hourFormattingLocale = undefined;
let hourFormattingHour12 = undefined;

/**
 * Returns the target number of hours that the viewport should contain (visible or not).
 * @returns {number}
 */
function getTargetScrollableNbHours()
{
    // 4 viewport widths (with a minimum of 4 full days)
    return Math.max(96, Math.ceil(visualViewport.width / HOUR_WIDTH_IN_PIXELS) * 4);
}

function refreshHourFormattingCache()
{
    if (
        hourNumberToStrMapping === undefined
        || settings.locale !== hourFormattingLocale
        || settings.hour12 !== hourFormattingHour12
    ) {
        hourNumberToStrMapping = {};
        const timezone = "UTC"; // UTC never switches to/from DST
        // => Days are *always* 24 hours (unlike some other time zones)
        const now = Date.now();
        const minutes = DateTimeHelper.getMinutesAsInt(now, timezone);
        
        for (let i = 0; i < 24; i++) {
            const dateToFormat = DateTimeHelper.addHoursToTimestamp(now, i, minutes);
            const hourNumber = DateTimeHelper.getHourAsInt(dateToFormat, timezone);
            hourNumberToStrMapping[hourNumber] = DateTimeHelper.getFormattedHour(
                settings.locale,
                dateToFormat,
                settings.hour12,
                timezone
            );
        }
 
        hourFormattingLocale = settings.locale;
        hourFormattingHour12 = settings.hour12;
    }
}

/**
 * Re-draw the entire timeline. Requirement: timelineState.displayedTime MUST be set before calling this function.
 */
function refreshTimeline()
{
    refreshHourFormattingCache();
    
    const oldScrollTop = viewport.scrollTop;
    
    viewport.innerHTML = "";
    
    timelineState.scrollableNbHours = getTargetScrollableNbHours();
    
    // Remove enough hours to the time to get 2 viewport widths on the left of the vertical line
    timelineState.minTimestamp = DateTimeHelper.addHoursToTimestamp(
        timelineState.displayedTime,
        -timelineState.scrollableNbHours / 2
    );
    
    settings.timezones.forEach(timezoneIdentifier => {
        const timezoneDiv = document.createElement("div");
        timezoneDiv.className = "timezone";
        timezoneDiv.dataset.timezone = timezoneIdentifier;
        
        // Some timezones have a non-integer number of hours as offset (e.g. Asia/Kolkata is UTC+05:30)
        const timezoneMinutes = DateTimeHelper.getMinutesAsInt(timelineState.minTimestamp, timezoneIdentifier);
        
        const timezoneTable = document.createElement("table");
        timezoneTable.className = "timeline";
        // Offset e.g. "02:30 AM" by the correct number of pixels to display e.g. "02:00 AM" instead
        timezoneTable.style.marginLeft = -timezoneMinutes * HOUR_WIDTH_IN_PIXELS / 60 + "px";
        timezoneTable.style.width = (timelineState.scrollableNbHours * HOUR_WIDTH_IN_PIXELS) + "px";
        timezoneTable.style.marginRight = timezoneMinutes * HOUR_WIDTH_IN_PIXELS / 60 + "px";
        
        // Remove minutes from the timestamp (we want to display "xx:00")
        const timestamp = DateTimeHelper.addHoursToTimestamp(timelineState.minTimestamp, 0, timezoneMinutes);
        
        // Add the time zone name
        const timezoneTr = document.createElement("tr");
        timezoneTable.append(timezoneTr);
        const firstTimezoneTd = createTimezoneTd(timezoneIdentifier, settings.locale, timestamp);
        timezoneTr.appendChild(firstTimezoneTd);
        const isSummerTime = firstTimezoneTd.classList.contains("summer");
        
        // Add the first day
        const daysTr = document.createElement("tr");
        timezoneTable.appendChild(daysTr);
        const firstDayTd = createDayTd(timezoneIdentifier, timestamp);
        daysTr.appendChild(firstDayTd);
        const isOddDay = firstDayTd.classList.contains("odd-day");
        
        // Add the first hour
        const hoursTr = document.createElement("tr");
        timezoneTable.appendChild(hoursTr);
        let hourNumber = DateTimeHelper.getHourAsInt(timestamp, timezoneIdentifier);
        hoursTr.appendChild(createHourTd(timezoneIdentifier, hourNumber, isOddDay));
        
        // Add the other hours/days
        for (let i = 1; i < timelineState.scrollableNbHours; i++) {
            // Starts at 1 (not 0) because appendOneHour() requires non-empty TR elements
            hourNumber = appendOneHour(i, timezoneIdentifier, timezoneMinutes, timezoneTr, daysTr, hoursTr, hourNumber);
        }
        
        timezoneDiv.appendChild(timezoneTable);
        
        const timeIndicatorDiv = document.createElement("div");
        timeIndicatorDiv.classList.add("time-indicator");
        timeIndicatorDiv.classList.add("fixed-horizontally");
        timeIndicatorDiv.textContent = DateTimeHelper.getFormattedHour(
            settings.locale,
            timelineState.displayedTime,
            settings.hour12,
            timezoneIdentifier
        );
        timezoneDiv.appendChild(timeIndicatorDiv);
        
        viewport.appendChild(timezoneDiv);
    });
    
    // Scroll to the correct timestamp
    scrollViewportToTimestamp();
    
    // Restore vertical scroll
    viewport.scrollTop = oldScrollTop;
    
    // Trigger the "scroll" event to make sure ".fixed-horizontally" elements are where they should be
    viewport.dispatchEvent(new CustomEvent("scroll")); 
}

/**
 * Creates a TD for the specified timezone (with colspan="1").
 * @param {string} timezoneIdentifier e.g. "Europe/Paris"
 * @param {string|undefined} locale e.g. "fr-FR"
 * @param {number} timestamp Day to display.
 */
function createTimezoneTd(timezoneIdentifier, locale, timestamp)
{
    const timezone = new Timezone(timezoneIdentifier, settings.locale, timestamp);
    const timezoneTd = document.createElement("td");
    timezoneTd.className = timezone.isSummerTime ? "timezone summer" : "timezone winter";
    timezoneTd.colSpan = 1;
    const timezoneSpan = document.createElement("span");
    timezoneSpan.append(...timezone.getFullDescriptionNodes());
    timezoneTd.appendChild(timezoneSpan);
    
    return timezoneTd;
}

/**
 * Creates a TD for the specified day (with colspan="1").
 * @param {string} timezoneIdentifier e.g. "Europe/Paris"
 * @param {number} timestamp Day to display.
 */
function createDayTd(timezoneIdentifier, timestamp)
{
    const dayTd = document.createElement("td");
    dayTd.className = DateTimeHelper.isOddDay(timestamp, timezoneIdentifier) ? "day odd-day" : "day even-day";
    dayTd.colSpan = 1;
    const daySpan = document.createElement("span");
    daySpan.textContent = DateTimeHelper.getFormattedDay(settings.locale, timestamp, timezoneIdentifier);
    dayTd.appendChild(daySpan);
    
    return dayTd;
}

/**
 * Creates a TD for the specified hour.
 * @param {string} timezoneIdentifier e.g. "Europe/Paris"
 * @param {number} hourNumber Hour as an integer number from 0 to 23
 * @param {boolean} isOddDay True if the specified hour belongs to an odd day, false otherwise.
 */
function createHourTd(timezoneIdentifier, hourNumber, isOddDay)
{
    const hourTd = document.createElement("td");
    hourTd.className = isOddDay ? "hour odd-day" : "hour even-day";
    hourTd.dataset.number = hourNumber;
    
    if (
        settings.enableHighlightedHours
        && hourNumber >= settings.highlightedHoursStart && hourNumber < settings.highlightedHoursEnd
        || settings.highlightedHoursStart == settings.highlightedHoursEnd // Just highlight around the clock
        || (
            settings.highlightedHoursEnd < settings.highlightedHoursStart // Yes, those are valid settings
            && (hourNumber >= settings.highlightedHoursStart || hourNumber < settings.highlightedHoursEnd)
        )
    ) {
        hourTd.classList.add("highlighted");
    }

    const hourSpan = document.createElement("span");
    hourSpan.textContent = hourNumberToStrMapping[hourNumber];
    hourTd.appendChild(hourSpan);
    
    return hourTd;
}

/**
 * Adds the specified hour (and day, if necessary) to the right of the timeline, for one timezone.
 * @param {number} offsetInHours Hour to add, as an integer number of hours relative to minTimestamp
 * @param {string} timezoneIdentifier e.g. "Europe/Paris"
 * @param {number} timezoneMinutes e.g. 30 if the offset is UTC+5:30
 * @param {HTMLElement} timezoneTr TR element for the specified timezone. MUST contain at least one TD (timezone).
 * @param {HTMLElement} daysTr TR element for the specified timezone. MUST contain at least one TD (day).
 * @param {HTMLElement} hoursTr TR element for the specified timezone. MUST contain at least one TD (hour).
 * @param {number} previousHourNumber The hour to the left of the new hour, as an integer number.
 * 
 * @returns {number} The new hour as an integer number.
 */
function appendOneHour(
    offsetInHours,
    timezoneIdentifier,
    timezoneMinutes,
    timezoneTr,
    daysTr,
    hoursTr,
    previousHourNumber
) {
    // Remove minutes from the timestamp (we want to display "xx:00")
    const timestamp = DateTimeHelper.addHoursToTimestamp(timelineState.minTimestamp, offsetInHours, timezoneMinutes);

    const hourNumber = DateTimeHelper.getHourAsInt(timestamp, timezoneIdentifier);
    
    if (hourNumber === (previousHourNumber + 1) % 24) {
        // The current hour is previous + 1 (general case)
        const oldTimezoneTd = timezoneTr.lastChild;
        oldTimezoneTd.colSpan++;
    } else { // Special case
        // => Either we leaped over an hour (DST is starting)
        // => Or an hour got repeated (Oh, déjà vu. I mean... DST is ending)
        const newTimezoneTd = createTimezoneTd(timezoneIdentifier, settings.locale, timestamp);
        timezoneTr.appendChild(newTimezoneTd);
    }
    
    const oldDayTd = daysTr.lastChild;
    
    let isOddDay = false;
    
    if (hourNumber < previousHourNumber) { // Midnight (23 > 0)
        const newDayTd = createDayTd(timezoneIdentifier, timestamp);
        if (oldDayTd.textContent === newDayTd.textContent) {
            // Why yes, thank you Antarctica/Troll for your 2-hour DST offset, really...
            oldDayTd.colSpan++;
        } else { // General case
            daysTr.appendChild(newDayTd);
        }
        isOddDay = newDayTd.classList.contains("odd-day");
    } else { // The hour is [1-23]
        oldDayTd.colSpan++;
        isOddDay = oldDayTd.classList.contains("odd-day");
    }
    
    hoursTr.appendChild(createHourTd(timezoneIdentifier, hourNumber, isOddDay));
    
    return hourNumber;
}

/**
 * Adds the specified hour (and day, if necessary) to the left of the timeline, for one timezone.
 * @param {number} offsetInHours Hour to add, as an integer number of hours relative to minTimestamp
 * @param {string} timezoneIdentifier e.g. "Europe/Paris"
 * @param {number} timezoneMinutes e.g. 30 if the offset is UTC+5:30
 * @param {HTMLElement} timezoneTr TR element for the specified timezone. MUST contain at least one TD (timezone).
 * @param {HTMLElement} daysTr TR element for the specified timezone. MUST contain at least one TD (day).
 * @param {HTMLElement} hoursTr TR element for the specified timezone. MUST contain at least one TD (hour).
 * @param {number} firstHourNumber The hour to the left of the new hour, as an integer number.
 * 
 * @returns {number} The new hour as an integer number.
 */
function prependOneHour(
    offsetInHours,
    timezoneIdentifier,
    timezoneMinutes,
    timezoneTr,
    daysTr,
    hoursTr,
    firstHourNumber
) {
    // Remove minutes from the timestamp (we want to display "xx:00")
    const timestamp = DateTimeHelper.addHoursToTimestamp(timelineState.minTimestamp, offsetInHours, timezoneMinutes);

    const hourNumber = DateTimeHelper.getHourAsInt(timestamp, timezoneIdentifier);
    
    if ((hourNumber + 1) % 24 === firstHourNumber) {
        // The current hour is first - 1 (general case)
        const oldTimezoneTd = timezoneTr.firstChild;
        oldTimezoneTd.colSpan++;
    } else { // Special case
        // => Either we leaped over an hour (DST is starting)
        // => Or an hour got repeated (DST is ending)
        const newTimezoneTd = createTimezoneTd(timezoneIdentifier, settings.locale, timestamp);
        timezoneTr.prepend(newTimezoneTd);
    }
    
    const oldDayTd = daysTr.firstChild;
    
    let isOddDay = false;
    
    if (hourNumber > firstHourNumber) { // 23:00 (23 > 0)
        const newDayTd = createDayTd(timezoneIdentifier, timestamp);
        if (oldDayTd.textContent === newDayTd.textContent) {
            // Why yes, thank you Antarctica/Troll for your 2-hour DST offset, really...
            oldDayTd.colSpan++;
        } else { // General case
            daysTr.prepend(newDayTd);
        }
        isOddDay = newDayTd.classList.contains("odd-day");
    } else { // The hour is [0-22]
        oldDayTd.colSpan++;
        isOddDay = oldDayTd.classList.contains("odd-day");
    }
    
    hoursTr.prepend(createHourTd(timezoneIdentifier, hourNumber, isOddDay));
    
    return hourNumber;
}

/**
 * Remove one hour (and day, if necessary) from the right of the timeline.
 * @param {HTMLElement} timezoneTr
 * @param {HTMLElement} dayTd 
 * @param {HTMLElement} hoursTr 
 */
function removeOneHourFromTheRight(timezoneTr, daysTr, hoursTr)
{
    const timezoneTd = timezoneTr.lastChild;
    if (timezoneTd.colSpan < 2) {
        timezoneTd.remove();
    } else {
        timezoneTd.colSpan--;
    }
    
    const dayTd = daysTr.lastChild;
    if (dayTd.colSpan < 2) {
        dayTd.remove();
    } else {
        dayTd.colSpan--;
    }
    
    hoursTr.lastChild.remove();
}

/**
 * Remove one hour (and day, if necessary) from the left of the timeline.
 * @param {HTMLElement} timezoneTr
 * @param {HTMLElement} dayTd 
 * @param {HTMLElement} hoursTr 
 */
function removeOneHourFromTheLeft(timezoneTr, daysTr, hoursTr)
{
    const timezoneTd = timezoneTr.firstChild;
    if (timezoneTd.colSpan < 2) {
        timezoneTd.remove();
    } else {
        timezoneTd.colSpan--;
    }
    
    const dayTd = daysTr.firstChild;
    if (dayTd.colSpan < 2) {
        dayTd.remove();
    } else {
        dayTd.colSpan--;
    }
    
    hoursTr.firstChild.remove();
}

/**
 * Gets the horizontal position of the vertical line, relative to the *browser's* viewport (not *our* "#viewport" div)
 * @returns {Number}
 */
function getVerticalLinePosition()
{
    const verticalLineElement = document.getElementById("vertical-line");
    const verticalLineBoundingRect = verticalLineElement.getBoundingClientRect();
    return verticalLineBoundingRect.left + verticalLineBoundingRect.width / 2;
}

/**
 * Scrolls the viewport to the timestamp specified in timelineState, which MUST be contained within the viewport
 * (this function doesn't verify that it is in range).
 */
function scrollViewportToTimestamp()
{
    const verticalLinePosition = getVerticalLinePosition();
    const offsetInHours = DateTimeHelper.getOffsetInHours(timelineState.minTimestamp, timelineState.displayedTime);
    viewport.scrollLeft = Math.round(offsetInHours * HOUR_WIDTH_IN_PIXELS - verticalLinePosition - window.scrollX);
}


/**
 * Computes the offset that the vertical line currently points to (relative to minTimestamp).
 * @param {Number} verticalLinePosition Position of the vertical line (relative to the *browser's* viewport)
 * @returns {Number} Offset in hours (decimal number) relative to minTimestamp
 */
function getCurrentOffsetInHours(verticalLinePosition)
{
    return (viewport.scrollLeft + verticalLinePosition + window.scrollX) / HOUR_WIDTH_IN_PIXELS;
}

/**
 * Adds hours to the right, and removes hours from the left
 */
function shiftViewportRight()
{
    const temporaryTargetNbHours = Math.ceil(timelineState.scrollableNbHours * 1.25); // Temporarily add 25% more hours
    settings.timezones.forEach(timezoneIdentifier => {
        // Some timezones have a non-integer number of hours as offset (e.g. Asia/Kolkata is UTC+05:30)
        const timezoneMinutes = DateTimeHelper.getMinutesAsInt(timelineState.minTimestamp, timezoneIdentifier);
        
        const timezoneTable = document.querySelector('div[data-timezone="' + timezoneIdentifier + '"] table.timeline');
        const timezoneTr = timezoneTable.firstChild;
        const daysTr = timezoneTable.children[1]; //timezoneTable.querySelector('tr.days');
        const hoursTr = timezoneTable.lastChild; //timezoneTable.querySelector('tr.hours');
        let hourNumber = Number.parseInt(hoursTr.lastChild.dataset.number);
        
        // Add hours to the right
        for (let i = timelineState.scrollableNbHours; i < temporaryTargetNbHours; i++) {
            hourNumber = appendOneHour(i, timezoneIdentifier, timezoneMinutes, timezoneTr, daysTr, hoursTr, hourNumber);
        }
        
        // Remove hours from the left
        for (let i = temporaryTargetNbHours; i > timelineState.scrollableNbHours; i--) {
            removeOneHourFromTheLeft(timezoneTr, daysTr, hoursTr);
        }
    });
    
    timelineState.minTimestamp = DateTimeHelper.addHoursToTimestamp(
        timelineState.minTimestamp,
        temporaryTargetNbHours - timelineState.scrollableNbHours // Add the required number of hours to minTimestamp
    );
    
    // Scroll to the correct timestamp
    scrollViewportToTimestamp();
}

/**
 * Adds hours to the left, and removes hours from the right
 * @param {number} timestampToDisplay Timestamp to scroll back to after adding/removing hours
 */
function shiftViewportLeft()
{
    const temporaryTargetNbHours = Math.ceil(timelineState.scrollableNbHours * 1.25); // Temporarily add 25% more hours
    settings.timezones.forEach(timezoneIdentifier => {
        // Some timezones have a non-integer number of hours as offset (e.g. Asia/Kolkata is UTC+05:30)
        const timezoneMinutes = DateTimeHelper.getMinutesAsInt(timelineState.minTimestamp, timezoneIdentifier);
        
        const timezoneTable = document.querySelector('div[data-timezone="' + timezoneIdentifier + '"] table.timeline');
        const timezoneTr = timezoneTable.firstChild;
        const daysTr = timezoneTable.children[1]; //timezoneTable.querySelector('tr.days');
        const hoursTr = timezoneTable.lastChild; //timezoneTable.querySelector('tr.hours');
        let hourNumber = Number.parseInt(hoursTr.firstChild.dataset.number);
        
        const newMinHour = timelineState.scrollableNbHours - temporaryTargetNbHours;
        
        // Add hours to the left
        for (let i = -1; i >= newMinHour; i--) {
            hourNumber = prependOneHour(
                i,
                timezoneIdentifier,
                timezoneMinutes,
                timezoneTr,
                daysTr,
                hoursTr,
                hourNumber
            );
        }
        
        // Remove hours from the right
        for (let i = temporaryTargetNbHours; i > timelineState.scrollableNbHours; i--) {
            removeOneHourFromTheRight(timezoneTr, daysTr, hoursTr);
        }
    });
    
    timelineState.minTimestamp = DateTimeHelper.addHoursToTimestamp(
        timelineState.minTimestamp,
        timelineState.scrollableNbHours - temporaryTargetNbHours // Remove the required number of hours from minTimestamp
    );
    
    // Scroll to the correct timestamp
    scrollViewportToTimestamp();
}

////////////////////////////////////////////////////////////////////////////////
// Event listeners

const topLine = document.getElementById("top-line");
const bottomLine = document.getElementById("bottom-line");
const topGradient = document.getElementById("top-gradient");
const bottomGradient = document.getElementById("bottom-gradient");

viewport.addEventListener("scroll", (event) => {
    const canScrollUp = (viewport.scrollTop > 0);
    const canScrollDown = (viewport.scrollTop < viewport.scrollHeight - viewport.offsetHeight);
    topLine.style.visibility = canScrollUp ? "hidden" : "visible";
    bottomLine.style.visibility = canScrollDown ? "hidden" : "visible";
    topGradient.style.visibility = canScrollUp ? "visible" : "hidden";
    bottomGradient.style.visibility = canScrollDown ? "visible" : "hidden";
    
    const verticalLinePosition = getVerticalLinePosition();
    const offsetInHours = getCurrentOffsetInHours(verticalLinePosition);
    timelineState.displayedTime = DateTimeHelper.addHoursToTimestamp(timelineState.minTimestamp, offsetInHours);
    // Remove the seconds, keep the minutes:
    timelineState.displayedTime = DateTimeHelper.removeSeconds(timelineState.displayedTime);
    // Mandatory, or the viewport will drift when resizing the window (due to rounding errors)
    
    settings.timezones.forEach(timezoneIdentifier => {
        const displayedTimeFormatted = DateTimeHelper.getFormattedHour(
            settings.locale,
            timelineState.displayedTime,
            settings.hour12,
            timezoneIdentifier
        );
        
        const timezoneDiv = document.querySelector('[data-timezone="' + timezoneIdentifier + '"]');
        if (timezoneDiv === null) {
            throw "timezoneDiv is null";
        }
        
        const timeIndicatorDiv = timezoneDiv.querySelector('div.time-indicator');
        if (timeIndicatorDiv === null) {
            throw "timeIndicatorDiv is null";
        }
        timeIndicatorDiv.textContent = displayedTimeFormatted;
        
        // Tweak timezone label positions
        timezoneDiv.querySelectorAll('td.timezone > span').forEach((span) => {
            fixSpanHorizontally(span, verticalLinePosition);
        });
        
        // Tweak day label positions
        timezoneDiv.querySelectorAll('td.day span').forEach((span) => {
            fixSpanHorizontally(span, verticalLinePosition);
        });
    });
    
    document.querySelectorAll(".fixed-horizontally").forEach((element) => {
        // Adjust vertical position for elements that are fixed only horizontally
        element.style.marginTop = -viewport.scrollTop + "px";
    });
    
    // Shift the viewport if necessary
    
    if (offsetInHours > timelineState.scrollableNbHours * 3 / 4) {
        shiftViewportRight();
        return;
    }
    
    if (offsetInHours < timelineState.scrollableNbHours / 4) {
        shiftViewportLeft();
        return;
    }
});

/**
 * Adds the "fixed-horizontally" class to the span if necessary, or makes the span float otherwise
 * (right or left, depending on its position)
 * @param {HTMLSpanElement} span 
 * @param {number} verticalLinePosition 
 */
function fixSpanHorizontally(span, verticalLinePosition)
{
    const td = span.parentElement;
    if (td === null || td.tagName !== 'TD') {
        console.warn("Could not retrieve a TD element for a span label:");
        console.debug(span);
        return;
    }
    
    const tdBoundingRect = td.getBoundingClientRect();
    
    if (tdBoundingRect.right <= verticalLinePosition) { // That day/timezone label ends in the past
        span.classList.remove("fixed-horizontally");
        span.style.marginTop = 0;
        span.style.float = "right";
        return;
    }
    
    if (tdBoundingRect.left >= verticalLinePosition) { // That day/timezone label starts in the future
        span.classList.remove("fixed-horizontally");
        span.style.marginTop = 0;
        span.style.float = "left";
        return;
    }
    
    // Otherwise, it's the current day/timezone label
    const spanBoundingRect = span.getBoundingClientRect();
    
    if (tdBoundingRect.right - verticalLinePosition - 10 < spanBoundingRect.width / 2) {
        // No room for "fixed" position (including 10px of paddings)
        span.classList.remove("fixed-horizontally");
        span.style.marginTop = 0;
        span.style.float = "right";
        return;
    }
    
    if (verticalLinePosition - tdBoundingRect.left - 10 < spanBoundingRect.width / 2) {
        // No room for "fixed" position (including 10px of paddings)
        span.classList.remove("fixed-horizontally");
        span.style.marginTop = 0;
        span.style.float = "left";
        return;
    }
    
    span.style.float = "none";
    span.classList.add("fixed-horizontally");
}

window.addEventListener("resize", (event) => {
    // Warning: At this point, the position of the vertical line is WRONG.
    
    const targetNbHours = getTargetScrollableNbHours();
    if (timelineState.scrollableNbHours === targetNbHours) {
        // Resize without adding/removing hours => Just make sure the viewport doesn't drift
        scrollViewportToTimestamp();
        return;
    }
    
    // We need to adjust the number of hours => Redraw everything
    refreshTimeline();
});

////////////////////////////////////////////////////////////////////////////
// "Drag to scroll" feature
let isDragging = false;
let dragTime = 0;
let dragPositionX = 0;
let dragPositionY = 0;
let dragOffsetXRoundingError = 0;
let dragOffsetYRoundingError = 0;
let dragVelocityX = 0; // Pixels per millisecond
let dragVelocityY = 0; // Pixels per millisecond

viewport.addEventListener("pointerdown", (event) => {
    // Initially, I only wanted to enable this feature when event.pointerType === "mouse"
    // Unfortunately, mobile native scrolling *really* doesn't play well with the "infinite scroll" feature.
    // Sorry for "hijacking" the scroll feature...
    
    if (event.buttons !== 1) { // Not a left mouse button (nor a touch event)
        return;
    }
    
    viewport.style.cursor = "grabbing";
    viewport.setPointerCapture(event.pointerId); // Prevent "pointerout" from stopping the "drag to scroll" thing
    isDragging = true;
    dragTime = performance.now();
    dragPositionX = event.clientX;
    dragPositionY = event.clientY;
    dragOffsetXRoundingError = 0;
    dragOffsetYRoundingError = 0;
    dragVelocityX = 0;
    dragVelocityY = 0;
});

viewport.addEventListener("pointermove", (event) => {
    if (!isDragging) {
        return;
    }
    
    const dragOffsetX = event.clientX - dragPositionX + dragOffsetXRoundingError;
    const dragOffsetY = event.clientY - dragPositionY + dragOffsetYRoundingError;
    dragPositionX = event.clientX;
    dragPositionY = event.clientY;
    const targetPositionX = viewport.scrollLeft - dragOffsetX;
    const targetPositionY = viewport.scrollTop - dragOffsetY;
    // scrollTo() handles non-integer numbers better than scrollBy()
    viewport.scrollTo(targetPositionX, targetPositionY);
    // Storing the rounding error enables us to spread it over multiple frames
    dragOffsetXRoundingError = viewport.scrollLeft - targetPositionX;
    dragOffsetYRoundingError = viewport.scrollTop - targetPositionY;
    
    const currentTime = performance.now();
    const elapsedTime = Math.max(currentTime - dragTime, 1); // Don't divide by zero...
    dragTime = currentTime;
    dragVelocityX = dragOffsetX / elapsedTime;
    dragVelocityY = dragOffsetY / elapsedTime;
});

viewport.addEventListener("pointerup", (event) => {
    viewport.style.cursor = "grab";
    isDragging = false;
    
    // If there's no velocity, don't bother calling the "inertia" animation
    if (dragVelocityX === 0 && dragVelocityY === 0) {
        return;
    }
    
    // If "pointerup" occurs more than 100 ms after "pointermove", don't add unwanted inertia
    if (performance.now() - dragTime > 100) {
        return;
    }
    
    // Otherwise, add inertia
    startSliding();
});

////////////////////////////////////////////////////////////////////////////
// Inertia of the "drag to scroll" feature
const VELOCITY_CAP = 20; // "20,000 pixels per second ought to be enough for anybody."
let isSliding = false;
let slidingOffsetXRoundingError = 0; // 0.xxx
let slidingOffsetYRoundingError = 0; // 0.xxx
let slidingFrameTime = 0;

/**
 * Start the "inertia" animation
 */
function startSliding()
{
    isSliding = true;
    dragVelocityX = MathHelper.clamp(dragVelocityX, -VELOCITY_CAP, VELOCITY_CAP);
    dragVelocityY = MathHelper.clamp(dragVelocityY, -VELOCITY_CAP, VELOCITY_CAP);
    slidingOffsetXRoundingError = 0;
    slidingOffsetYRoundingError = 0;
    slidingFrameTime = document.timeline.currentTime;
    requestAnimationFrame(keepSliding);
}

const SLOWING_COEF = 0.2 / 100; // Remove 0.2% of the velocity every millisecond
const VELOCITY_THRESHOLD = 5 / 1000; // Stop when the velocity drops below 5 pixels per second (0.005 pixels / ms)

/**
 * Handle the inertia of the "drag to scroll" feature
 * @param {number} timestamp 
 */
function keepSliding(timestamp)
{
    if (!isSliding) {
        return;
    }
    
    if (isDragging) {
        isSliding = false;
        return; // Stop as soon as the user starts dragging again
    }
    
    const frameDuration = (timestamp - slidingFrameTime); // Time since the previous frame, in milliseconds
    
    // Compute the new velocity
    const newVelocityCoef = Math.max(1 - SLOWING_COEF * frameDuration, 0);
    // Don't let the coefficient become negative... (in case of very slow frames)
    
    dragVelocityX = newVelocityCoef * dragVelocityX;
    dragVelocityY = newVelocityCoef * dragVelocityY;
    
    // Stop the animation when the velocity is too close to zero
    if (Math.abs(dragVelocityX) < VELOCITY_THRESHOLD && Math.abs(dragVelocityY) < VELOCITY_THRESHOLD) {
        isSliding = false;
        return;
    }
    
    const slidingOffsetX = frameDuration * dragVelocityX + slidingOffsetXRoundingError;
    const slidingOffsetY = frameDuration * dragVelocityY + slidingOffsetYRoundingError;
    
    const targetPositionX = viewport.scrollLeft - slidingOffsetX;
    const targetPositionY = viewport.scrollTop - slidingOffsetY;
    // scrollTo() handles non-integer numbers better than scrollBy()
    viewport.scrollTo(targetPositionX, targetPositionY);
    // Storing the rounding error enables us to spread it over multiple frames
    slidingOffsetXRoundingError = viewport.scrollLeft - targetPositionX;
    slidingOffsetYRoundingError = viewport.scrollTop - targetPositionY;
    
    slidingFrameTime = timestamp;
    
    requestAnimationFrame(keepSliding);
}

document.addEventListener("wheel", (event) => {
    // When scrolling with the mouse wheel (more than a tiny amount), stop the sliding inertia.
    // (Inertia interferes with mouse scrolling)
    
    if (!isSliding) {
        return; // Not sliding, don't bother stopping
    }
    
    if (event.deltaMode === 0x00 && Math.abs(event.deltaX) < 5 && Math.abs(event.deltaY) < 5) {
        // Scrolling only by tiny amount (and deltaMode === DOM_DELTA_PIXEL)
        return; // Don't stop me now
    }
    
    // DOM_DELTA_PIXEL with >5 pixel delta, or DOM_DELTA_LINE or DOM_DELTA_PAGE
    
    isSliding = false;
});

////////////////////////////////////////////////////////////////////////////
// Keyboard scrolling

document.addEventListener("keydown", (event) => {
    if (document.activeElement === document.body) {
        viewport.focus(); // If no other element has the focus, give the focus to the viewport
    }
    
    if (document.activeElement !== viewport) {
        return; // Don't do anything if the viewport isn't focused
    }
    
    let direction = 1; // 1 = Right
    
    switch(event.code) {
        
        // Horizontal scrolling
        case "ArrowLeft":
            direction = -1; // -1 = Left
        case "ArrowRight":
            // Stop the inertia (native scrolling doesn't play well with the inertia feature)
            isSliding = false;
            
            // Ctrl + Right/Left
            if (event.ctrlKey) {
                event.preventDefault(); // Don't actually scroll
                // Move forward/backward by 1 minute (Ctrl + Right/Left) or 1 hour (Ctrl + Shift + Right/Left)
                viewport.scrollBy(direction * (event.shiftKey ? HOUR_WIDTH_IN_PIXELS : 1), 0);
                break;
            }
            
            // Just Right/Left (no "Ctrl")
            
            if (getComputedStyle(viewport).overflow === "hidden") {
                // If the overflow is hidden (typically, to make touch scrolling work properly),
                // then fallback to moving forward/backward by 1 hour
                viewport.scrollBy(direction * HOUR_WIDTH_IN_PIXELS, 0);
                break;
            }
            
            // Otherwise, just let the browser scroll natively
            break;

        // Vertical scrolling
        case "ArrowUp":
        case "ArrowDown":
            isSliding = false;
            break;
    }
});
