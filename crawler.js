/*
 * Imports
 */

const fetch = require('node-fetch');
const fs = require('fs');

/*
 * Classes
 */

class Stack {
	constructor() {
		this.array = [];
	}

	push(e) {
		this.array.push(e);
	}

	pop() {
		return this.array.shift();
	}

	peek() {
		return this.array[0];
	}

	isEmpty() {
		return this.array.length === 0;
	}

	has(e) {
		return this.array.includes(e);
	}
}

class Site {
	constructor() {
		this.object = {};
	}

	serialise() {
		return JSON.stringify(this.object);
	}

	put(route, text) {
		this.object[route] = text;
	}
}

/*
 * Configuration
 */

const CONFIG = {
	HOST: 'https://softeng281.digitaledu.ac.nz',
	START_ROUTE: '/javadocs/a4/index.html',
	REGEXES: [
		/* 'exploit',
		'explot',
		'assignment',
		'\\.txt',
		'\\.pdf',
		'(?<!la)test',
		'solution',
		'soln',
		// '\\.html',
		'static_files',
		'javadoc',
		'(?<!re)source',
		// 'src',
		'download',
		'\\.java',
		'a4',
		't2',
		'test2',
		'testtwo',
		'\\.zip',
		'answer',
		'url',
		'aron',
		'ajer', */
		'\\.zip'
	],
	OUTFILES: {
		SITE: 'site.json'
	}
};

/*
 * Utility Functions
 */

function qualifySlug(slug, currentUrl) {
	if (slug.startsWith(CONFIG.HOST)) {
		return slug;
	}

	if (slug.startsWith('/')) {
		return `${CONFIG.HOST}${slug}`;
	}

	if (!currentUrl.endsWith('/')) currentUrl += '/';

	// * i know this works
	if (slug.startsWith('.')) {
		return `${currentUrl}${slug}`;
	}

	// TODO: fix, this is gross
	if (!slug.startsWith('http')) {
		let currentPath = currentUrl.split(/\//g);

		// handle links from eg ../../file.html
		if (currentUrl.match(/\.html\/?$/)) {
			// remove trailing slash if there is one
			currentPath = currentUrl.replace(/\/$/, '').split(/\//g);
			currentPath.pop();
		}

		return `${currentPath.join('/')}/${slug}`;
	}

	// how did we get here?
	console.warn(`Failed to qualify route ${slug}`);
	return CONFIG.HOST;
}

function isCrawlableHref(href) {
	const sameHost = href.startsWith(CONFIG.HOST);
	const notAbsolute = href.startsWith('/');
	const relative = href.startsWith('.') || !href.startsWith('http');
	const anchor = href.match(/^\/?#/);

	return !anchor && (sameHost || notAbsolute || relative);
}

/*
 * Crawler
 */

const visitedRoutes = new Set();

async function crawlUrl(url, stack) {
	console.log(`Fetching ${url}`);

	visitedRoutes.add(url);

	const text = (await (await fetch(url)).text()).toLowerCase();

	const hrefs = text.match(/href=['"]([^"']*)['"]/g) ?? [];

	hrefs.map(str => str.match(/href=['"]([^"']*)['"]/)[1]) // extract the link itself
		.filter(isCrawlableHref)
		.filter(href => !visitedRoutes.has(qualifySlug(href, url)))
		.forEach(href => {
			if (!stack.has(qualifySlug(href, url))) {
				stack.push(qualifySlug(href, url));
			};
		});

	return text;
}

async function crawlSite() {
	const stack = new Stack();
	const site = new Site();

	stack.push(`${CONFIG.HOST}${CONFIG.START_ROUTE}`);

	while (!stack.isEmpty()) {
		if (visitedRoutes.has(stack.peek())) continue;

		const route = stack.pop();
		site.put(route, await crawlUrl(route, stack));
	}

	fs.writeFileSync(CONFIG.OUTFILES.SITE, site.serialise());

	console.log(`Done! Written to ${CONFIG.OUTFILES.SITE}`);
}

/*
 * Parser/Inspector
 */

function inspectFile() {
	const alreadyMatched = new Set();

	const site = JSON.parse(fs.readFileSync(CONFIG.OUTFILES.SITE, { encoding: 'utf-8' }));

	Object.entries(site).forEach(([url, text]) => {
		console.log(`Parsing page ${url}`);

		const matches = text.match(new RegExp(`(.{0,50}(?:${CONFIG.REGEXES.join('|')}).{0,50})`, 'g'))
			?.flatMap(str => {
				if (!alreadyMatched.has(str)) {
					alreadyMatched.add(str);
					return [str.replace(new RegExp(`(${CONFIG.REGEXES.join('|')})`, 'g'), '#####$1#####')];
				}
				else return [];
			});

		if (matches?.length ?? false) {
			console.info('================================');
			console.info(`Matched interesting strings on ${url}`);
			console.info('================================');
			console.info(matches.join('\n'));
		}

		console.log('\n\n');
	});
}

/*
 * Entry Point
 */

// set this to true to regenerate site json file
const crawl = true;

(async () => {
	if (crawl) {
		console.log(`Crawling ${CONFIG.HOST}...`);
		await crawlSite();
	}
	inspectFile();
})();

// * run this script with node scriptkiddie.js > matches.txt