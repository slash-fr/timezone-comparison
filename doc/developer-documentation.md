# Developer documentation

All code in this repository was written by a human being.
It doesn't use a framework.

⚠ **Warning:** This project is an unfinished mess.
In particular, [timeline-viewport.js](../dev/timeline-viewport.js) is full of spaghetti code.

It started as a UI experiment (infinite scrolling of aligned timezones),
and then, I came up with bigger plans to turn it into a web app:
- ✅ User-configurable time-zones
- ✅ Date/time formatting options
- ✅ "Highlighted hours" settings
- ✅ Light/dark themes
- ✅ Offline mode
- ❌ UI translations
- ❌ Calendar feature: to quickly go to a specific date, and maybe to plan events
- ❌ Code cleanup: refactoring to a proper object-oriented code base
- ❌ Further performance optimizations: for instance, offloading date/time formatting to a worker,
  to avoid blocking the main thread
- And more...

Unfortunately, I got bored before I was done.
So I've decided to release this project in its current state, just in case it can be useful to anybody.


## Service worker

A [service worker](../dev/service-worker.js) serves cached assets (such as `index.html`, `main.js` and `style.css`)
for offline use.

Please keep in mind that:
- The service worker is only allowed in
  [secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts)
  (HTTPS or `localhost`)
- It only works properly in `prod` mode (as it doesn't reference the myriad of `dev` JavaScript files)


## "Build" process

The `dev` folder contains non-minified HTML/JS/CSS.

Instead of using Webpack, or some other `npm`-based tool,
a PHP script is provided to "build" the minified HTML, CSS and JavaScript files:
[build-prod-files.php](../build-prod-files.php)

> *If all you have is a hammer, everything looks like a nail.*

PHP is my hammer, I guess. I find the PHP/Composer ecosystem slightly less disgusting than NodeJS/npm.

You do **not** need PHP on your server. It's only used as a build tool.


### Setup

1. Install the necessary packages:  
   ```sh
   composer install
   ```

2. *(Optional)* Copy `dev/_opengraph-tags.sample.html` to `dev/_opengraph-tags.html`
   (remove the `.sample` extension, and keep the leading underscore)
   and edit it to match your website.  
   In particular, you will need to enter the full absolute URL for `og:url` and `og:image`.


### Usage

1. Update `currentCacheName` in `dev/service-worker.js` when updating assets (HTML, CSS, JS, images, …),
   or they won't update on the client-side (the service worker will serve them from the cache).

2. Run the "build" script:
   ```sh
   php build-prod-files.php
   ```
   It will generate the minified `prod/style.css`, `prod/main.js` and `prod/index.html` files
   from their corresponding source files, and copy any other necessary assets to the `prod` folder.


### Alternative

I've deliberately kept the "build" process very simple, and avoided complex tools.
No need to transpile JavaScript into JavaScript...

If you don't want to use PHP (or Composer), you can simply:
- Copy the CSS file (and a few other assets),
- Concatenate the JS files (in the correct order),
- Remove `dev-only` JS files from `index.html`.

```sh
cp dev/style.css dev/manifest.json dev/favicon.ico \
   dev/favicon.svg dev/*.png dev/service-worker.js prod/
grep '<script' dev/index.html \
    | grep -oP 'src="[\w\-\/]+\.js"' \
    | grep -oP '[\w\-\/]+\.js' \
    | xargs printf -- 'dev/%s\n' \
    | xargs cat > prod/main.js
cat dev/index.html | sed /'class="dev-only"'/d > prod/index.html
```
Files won't be minified, but everything will be in the right place.

ℹ️ Make sure your JS files end with a newline (as they should), to avoid surprises with the `cat` command.

ℹ️ Don't forget to update `currentCacheName` in `dev/service-worker.js` as explained in the previous section.

ℹ️ The alternative commands above won't add OpenGraph tags to your `index.html`.  
If you want them, you could use `sed` (again) to add them from a file:

```sh
sed -i -e '/<head>/{r dev/_opengraph-tags.html' -e '}' prod/index.html
```


## Test candidates

The following time zones are interesting for testing purposes:
- `Asia/Calcutta`:
  - "India Standard Time" uses the `Asia/Kolkata` identifier in Firefox instead
  - Its offset is a non-integer number of hours (UTC+05:30)
- `Asia/Katmandu` (Nepal): Non-integer offset (UTC+05:45)
- `America/Halifax` (Atlantic Canada) + `America/Santiago` (Chile):  
  Both use UTC-4 during the winter and UTC-3 in the summer, except...
  one is in the Northern Hemisphere, while the other is in the Southern Hemisphere.
  So, each timezone's offset will be successively lower than, equal to,
  and greater than the other, depending on the time of the year.
- `Antarctica/Troll` (yes, really): Uses a **two-hour** DST offset (what for?)
- `Australia/Lord_Howe`: Australians managed to come up with a *DST offset* that is a *non-integer number of hours!*
  Indeed, this tiny *"Lord Howe Island"* with a population of only a few hundred people
  apparently deserves to have a unique **30-minute** DST offset...
  - **Note:** This time zone is currently excluded from the app.
