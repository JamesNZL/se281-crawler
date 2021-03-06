# `SOFTENG 281` Crawler

## What is this?

A dirty, messy crawler I scrapped together after being led upon a cheeky scavenger hunt by a TA.

It crawls all same-host `href`'d pages using DFS starting from `CONFIG.START_ROUTE`, then parses the (static) markup on all pages using the configured `CONFIG.REGEXES` for 'interesting' strings.

It also saves all crawled markup in an output `JSON` file keyed to the page route, so subsequent parsing can be done without re-fetching all pages.

## Usage

> Don't :smiley:. I'm sure there's better stuff out there.

1. Fork this repo

2. `npm install`

3. Change `CONFIG` values

4. Run at least once with `CONFIG.CRAWL = true;`

5. `node crawler.js > matches.txt`

## Oh, you can also generate a GraphViz `DOT` file.

```bash
node graph.js

# note: the DOT file is /big/, and online tools will probably crash
# you must have graphviz installed for this command
dot graph.txt -Tsvg -o graph.svg
```

![Graph](graph/graph.svg)
