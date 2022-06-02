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
		visitedRoutes.add(this.array[0]);
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
	START_ROUTE: '/home',
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
 * Helper Functions
 */

function qualifyRoute(route, currentRoute) {
	if (!currentRoute.endsWith('/')) currentRoute += '/';

	if (route.startsWith(CONFIG.HOST)) {
		return route;
	}

	if (route.startsWith('/')) {
		return `${CONFIG.HOST}${route}`;
	}

	if (route.startsWith('.')) {
		return `${currentRoute}${route}`;
	}

	if (!route.startsWith('http')) {
		return `${currentRoute}${route}`;
	}

	// how did we get here?
	console.warn(`Failed to qualify route ${route}`);
	return CONFIG.HOST;
}

function isCrawlableHref(href) {
	const sameHost = href.startsWith(CONFIG.HOST);
	const relative = href.startsWith('/') || href.startsWith('.');
	const notAbsolute = !href.startsWith('http');

	return sameHost || relative || notAbsolute;
}

/*
 * Crawler
 */

const visitedRoutes = new Set();

async function crawlUrl(stack, route) {
	console.log(`Fetching ${route}`);

	const text = (await (await fetch(route)).text()).toLowerCase();

	const hrefs = text.match(/href=['"]([^"']*)['"]/g) ?? [];

	hrefs.map(str => str.match(/href=['"]([^"']*)['"]/)[1]) // extract the link itself
		.filter(isCrawlableHref)
		.filter(href => !visitedRoutes.has(qualifyRoute(href, route)))
		.forEach(href => {
			if (!stack.has(qualifyRoute(href, route))) {
				stack.push(qualifyRoute(href, route));
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
		site.put(route, await crawlUrl(stack, route));
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

	Object.entries(site).forEach(([route, text]) => {
		console.log(`Parsing page ${route}`);

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
			console.info(`Matched interesting strings on ${route}`);
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
const crawl = false;

(async () => {
	if (crawl) {
		console.log(`Crawling ${CONFIG.HOST}...`);
		await crawlSite();
	}
	inspectFile();
})();

// * run this script with node scriptkiddie.js > matches.txt