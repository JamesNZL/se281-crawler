/*
 * Imports
 */

const fs = require('fs');

/*
 * Configuration
 */

const CONFIG = {
	HOST: 'https://softeng281.digitaledu.ac.nz',
	OUTFILES: {
		SITE: 'site.json',
		DOTFILE: 'graph/graph.txt',
	},
	FILTERS: {
		/** A case-sensitive `string[]` of strings with which to filter out nodes containing the string */
		STANDARD: ['feed.xml', 'javadocs', 'resources'],
		/** Any `source`s pointing to these strings as the `target` are completely removed */
		STRICTER: ['404'],
	},
};

/*
 * Graph
 */

class Graph {
	constructor(nodes) {
		this.outputArray = [`// ${nodes.join(', ')}`, 'digraph sitegraph {'];
	}

	generateOutput() {
		this.outputArray.push('}');
		return this.outputArray.join('\n');
	}

	addEdge(source, target) {
		this.outputArray.push(` "${source}" -> "${target}"`);
	}
}

function generateGraph() {
	const fullSite = JSON.parse(
		fs.readFileSync(CONFIG.OUTFILES.SITE, { encoding: 'utf-8' })
			.replace(new RegExp(CONFIG.HOST, 'g'), ''),
	);

	const sourcesToStrictlyRemove = [];

	const site = Object.fromEntries(
		Object.entries(fullSite)
			.flatMap(([target, { referrers: sources }]) => {
				if (CONFIG.FILTERS.STRICTER.some(filter => target.includes(filter))) {
					sourcesToStrictlyRemove.push(...sources);
					return [];
				}

				if (CONFIG.FILTERS.STANDARD.some(filter => target.includes(filter))) {
					return [];
				}

				return [[
					target,
					{
						referrers: sources.filter(source => ![...CONFIG.FILTERS.STANDARD, ...CONFIG.FILTERS.STRICTER].some(filter => source.includes(filter))),
					},
				]];
			})
			// catch what we couldn't the first time around
			.flatMap(([target, { referrers: sources }]) => {
				if (sourcesToStrictlyRemove.includes(target)) {
					return [];
				}

				return [[
					target,
					{
						referrers: sources.filter(source => !sourcesToStrictlyRemove.some(filter => source.includes(filter))),
					},
				]];
			}),
	);

	const graph = new Graph([...new Set(Object.keys(site))]);

	Object.entries(site).forEach(([target, { referrers: sources }]) => {
		sources.forEach(source => graph.addEdge(source, target));
	});

	fs.writeFileSync(CONFIG.OUTFILES.DOTFILE, graph.generateOutput());

	console.log(`Done! Written to ${CONFIG.OUTFILES.DOTFILE}`);
}

/*
 * Entry Point
 */

generateGraph();