
const nodefs = require('fs');
const nodepath = require('path');
const cheerio = require('cheerio');
const pretty = require('pretty');
const minify = require('html-minifier').minify;

/**
 * [discoverLayoutFile description]
 * @param  {String}          path
 * @return {Boolean|String}
 */
function discoverLayoutFile(path) {
	// for file.html, try first file.layout.html
	let layout = path.replace(/\.html/, '.layout.html');
	if (nodefs.existsSync(layout)) {
		return layout;
	}
	// if file.layout.html doesn't exist, try for index.layout.html in all the file's parents
	layout = layout.replace(/\/[^\/]+\.layout\.html/, '/index.layout.html');
	let parsed = nodepath.parse(layout);
	while (parsed.dir !== parsed.root) {
		if (nodefs.existsSync(nodepath.join(parsed.dir, parsed.base))) {
			return nodepath.join(parsed.dir, parsed.base);
		}
		parsed.dir = nodepath.dirname(parsed.dir);
	}
	// if no layout matches... well bummer
	return false;
}

exports.applyLayout = function(file) {
	let layout = discoverLayoutFile(file.path);
	if (layout !== false) {
		let c = cheerio.load(nodefs.readFileSync(layout));
		c('yeld[type=body]').after(file.contents.toString());
		c('yeld[type=body]').remove();
		c = c.html();
		c = minify(c, { collapseWhitespace: true });
		c = pretty(c);
		file.contents = new Buffer(c);
	}
	return file;
}

exports.components = function(file) {
	let c = cheerio.load(file.contents.toString());
	console.log('template => ', c('template').html());
	console.log('template id => ', c('template').attr('id'));

	let s = cheerio.load(c('template').html())
	console.log('template style', s('style').html())
	console.log('template style type', s('style').attr('type'));

	console.log('script => ', c('script').html());

	return file;
}
