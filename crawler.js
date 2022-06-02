/*
 * Imports
 */

const fetch = require('node-fetch');
const fs = require('fs');

/*
 * Configuration
 */

// this should probably be made unique to each Crawler instance, but that'd be too polished for this script
const CONFIG = {
	/** Set this to `true` to regenerate site `JSON` file */
	CRAWL: false,
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
		'static_files'
	],
	MATCHED: {
		/** Padding to apply either side of matched strings */
		PADDING: '#######',
		/** Amount of 'context' to include either side of matched strings */
		CONTEXT_LENGTH: 50,
	},
	OUTFILES: {
		SITE: 'site.json',
	},
	LOGGING: {
		/** Whether to log 'Parsing ____' */
		PARSING_ROUTE: false,
	}
};

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

	// this isn't very OOP, but it's 0030hrs

	putUrl(url) {
		if (!this.object?.[url]) {
			this.object[url] = {
				referrers: [],
				text: '',
			};
		}
	}

	addUrlReferrer(url, referrer) {
		this.putUrl(url);

		this.object[url].referrers.push(referrer);
	}

	putUrlText(url, text) {
		this.putUrl(url);

		this.object[url].text = text;
	}
}

class Crawler {
	constructor() {
		this.visitedRoutes = new Set();
		this.stack = new Stack();
		this.site = new Site();
	}

	/**
	 * Normalise URLs
	 * @param {string} slug The slug/URL to normalise
	 * @param {string} currentUrl The URL to use as the base
	 * @returns {string} A normalised URL
	 */
	static qualifySlug(slug, currentUrl) {
		// strip anchor
		slug = slug.replace(/#.*$/, '');

		// enforce no trailing slash
		slug = slug.replace(/\/$/, '');

		// remove erroneous duplicate slashes
		slug = slug.replace(/(?<!\:)\/+/g, '/');

		return new URL(slug, currentUrl).href;
	}

	static crawlable(href) {
		const sameHost = href.startsWith(CONFIG.HOST);
		const notAbsolute = href.startsWith('/');
		const relative = href.startsWith('.') || !href.startsWith('http');
		const anchor = /^\/?#/.test(href);
		const javascript = href.startsWith('javascript');

		return !anchor && !javascript && (sameHost || notAbsolute || relative);
	}

	async crawlUrl(url) {
		console.log(`Fetching ${url}`);

		this.visitedRoutes.add(url);

		let text = '';
		try {
			text = await (await fetch(url)).text();
		}
		catch (err) {
			console.error(`Fetch error on ${url}`, { url, err });
		}

		const hrefs = [...new Set(
			(text.match(/href=['"]([^"']*)['"]/g) ?? [])
				.map(str => str.match(/href=['"]([^"']*)['"]/)[1]) // extract the link itself
				.filter(Crawler.crawlable)
				.map(href => Crawler.qualifySlug(href, url))
		)];

		hrefs.filter(url => !this.visitedRoutes.has(url))
			.forEach(url => {
				if (!this.stack.has(url)) this.stack.push(url);
			});

		return { hrefs, text: text.toLowerCase() };
	}

	async crawlSite() {
		this.stack.push(`${CONFIG.HOST}${CONFIG.START_ROUTE}`);

		while (!this.stack.isEmpty()) {
			const route = this.stack.pop();
			if (this.visitedRoutes.has(route)) continue;

			const { hrefs, text } = await this.crawlUrl(route, this.stack);

			hrefs.forEach(url => this.site.addUrlReferrer(url, route));
			this.site.putUrlText(route, text);
		}

		fs.writeFileSync(CONFIG.OUTFILES.SITE, this.site.serialise());

		console.log(`Done! Written to ${CONFIG.OUTFILES.SITE}`);
	}
}

/*
 * Parser/Inspector
 */

function inspectFile() {
	const alreadyMatched = new Set();

	const site = JSON.parse(fs.readFileSync(CONFIG.OUTFILES.SITE, { encoding: 'utf-8' }));

	Object.entries(site).forEach(([url, { text }]) => {
		if (CONFIG.LOGGING.PARSING_ROUTE) console.log(`Parsing page ${url}`);

		const matches = text.match(new RegExp(`(.{0,${CONFIG.MATCHED.CONTEXT_LENGTH}}(?:${CONFIG.REGEXES.join('|')}).{0,${CONFIG.MATCHED.CONTEXT_LENGTH}})`, 'g'))
			?.flatMap(str => {
				if (!alreadyMatched.has(str)) {
					alreadyMatched.add(str);
					return [str.replace(new RegExp(`(${CONFIG.REGEXES.join('|')})`, 'g'), `${CONFIG.MATCHED.PADDING}$1${CONFIG.MATCHED.PADDING}`)];
				}
				else return [];
			});

		if (matches?.length ?? false) {
			console.info('================================');
			console.info(`Matched interesting strings on ${url}`);
			console.info('================================');
			console.info(matches.join('\n'));
			if (!CONFIG.LOGGING.PARSING_ROUTE) console.log('\n\n');
		}

		if (CONFIG.LOGGING.PARSING_ROUTE) console.log('\n\n');
	});
}

/*
 * Entry Point
 */

(async () => {
	if (CONFIG.CRAWL) {
		const crawler = new Crawler();
		console.log(`Crawling ${CONFIG.HOST}...`);
		await crawler.crawlSite();
	}

	inspectFile();
})();

// * run this script with node crawler.js > matches.txt