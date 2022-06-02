# `SOFTENG 281` Crawler

## What is this?

A dirty, messy crawler I scrapped together upon being led upon a cheeky scavenger hunt by a TA.

It crawls all same-host `href`'d pages starting from `CONFIG.START_ROUTE`, and parses the markup on all pages using the configured `CONFIG.REGEXES` for 'interesting' strings.

It also saves all crawled markup in an output `JSON` file keyed to the page route, so subsequent parsing can be done without re-fetching all pages.

:smiley:

## Usage

> Don't. There's almost certainly better stuff out there.

1. Fork this repo

2. `npm install`

3. Change `CONFIG` values

4. Run at least once with `const crawler = true;`

5. `node crawler.js > matches.txt`