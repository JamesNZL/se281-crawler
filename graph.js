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
		DOTFILE: 'graph.txt',
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
	const site = JSON.parse(
		fs.readFileSync(CONFIG.OUTFILES.SITE, { encoding: 'utf-8' })
			.replace(new RegExp(CONFIG.HOST, 'g'), '')
	);

	const graph = new Graph([...new Set(Object.keys(site))]);

	Object.entries(site).forEach(([url, { referrers }]) => {
		referrers.forEach(source => graph.addEdge(source, url));
	});

	fs.writeFileSync(CONFIG.OUTFILES.DOTFILE, graph.generateOutput());

	console.log(`Done! Written to ${CONFIG.OUTFILES.DOTFILE}`);
}

/*
 * Entry Point
 */

generateGraph();