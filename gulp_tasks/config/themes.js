
const nodefs = require('fs');
const nodepath = require('path');

const cheerio = require('cheerio');
const less = require('less');
const minify = require('html-minifier').minify;
const pretty = require('pretty');
const uglifycss = require('uglifycss');

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

/**
 * 
 * @param {String} code
 * @param {String} type
 * @param {Object} options
 * @returns {String}
 */
async function cssCompile(code, type, options) {
	let css = code;
	if (type.toLowerCase() === "text/less") {
		options = require('./less-options');
		css = (await less.render(css, options)).css.trim();
	}
	return options.minify ? uglifycss.processString(css) : css;
}

/**
 * 
 * @param {String} code
 * @param {String} type
 * @param {Object} options
 * @returns {String}
 */
async function jsCompile(code, type, options) {
	return code;
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

exports.components = async function(file, options) {
	let c = cheerio.load(file.contents.toString());
	let s = cheerio.load(c('template').html())

	let template = `<template id="${c('template').attr('id')}">\n`;

	let css = await cssCompile(s('style').html(), s('style').attr('type'), options);
	template += `<style type="text/css">\n${css}\n</style>\n`;

	template += s('body').html().trim() + "\n";

	let js = await jsCompile(c('script').html(), c('script').attr('type'));

	template += "</template>\n";
	template += `<script type="text/javascript">${js}</script>`;


	if (options.minify) {
		template = minify(template, { collapseWhitespace: true });
	}
	console.log(template);

	file.contents = new Buffer(template);
	return file;
}
