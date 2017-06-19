
const nodefs = require('fs');
const nodepath = require('path');

const babel = require('babel-core');
const cheerio = require('cheerio');
const extend = require('extend');
const gutil = require('gulp-util');
const less = require('less');
const minify = require('html-minifier').minify;
const pretty = require('pretty');
const uglifycss = require('uglifycss');
const uglifyjs = require("uglify-js");

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

function gulpError(err, where = 'themes') {
	if (!err._babel) {
	err.lineNumber = err.line;
	err.fileName = err.filename;
		err.message = err.message + ' in file ' + err.fileName + ' line no. ' + err.lineNumber;
	}
	return new gutil.PluginError(where, err);
}

/**
 * 
 * @param {String} code
 * @param {String} type
 * @param {Object} options
 * @returns {String}
 * @throws Error
 */
async function cssCompile(code, type, options) {
	let css = code;
	if (type.toLowerCase() === "text/less") {
		options = extend(options || {}, require('./less-options'));
		css = (await less.render(css, options)).css.trim();
	}
	return options.minify ? uglifycss.processString(css) : css;
	// return css;
}

/**
 * 
 * @param {String} code
 * @param {String} type
 * @param {Object} options
 * @returns {String}
 * @throws Error
 */
function jsCompile(code, type, options) {
	let js = code;
	if (!type || type.toLowerCase() != "text/javascript") {
		options = extend(options || {}, require('./babel-options')['native-modules']());
		console.log(code);
		js = babel.transform(code, options);
	}
	return options.minify ? uglifyjs.minify(js, {fromString: true}).code : js;
	// return js;
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

exports.components = function(options) {
	return async function(file, cb){
		let c = cheerio.load(file.contents.toString());
		let s = cheerio.load(c('template').html())

		let template = `<template id="${c('template').attr('id')}">\n`;

		let css = '';
		try {
			css = await cssCompile(s('style').html(), s('style').attr('type'), options);
		} catch (err) {
			cb(gulpError(err, 'cssCompile'));
		}
		template += `<style type="text/css">\n${css}\n</style>\n`;

		template += s('body').html().trim() + "\n";

		let js = '';
		try {
			js = jsCompile(c('script').html().trim(), c('script').attr('type'));
		} catch (err) {
			// console.log(err);
			cb(gulpError(err, 'jsCompile'));
		}

		template += "</template>\n";
		template += `<script type="text/javascript">${js}</script>`;


		if (options.minify) {
			template = minify(template, { collapseWhitespace: true });
		}
		console.log(template);

		file.contents = new Buffer(template);
		return file;
	}
}
