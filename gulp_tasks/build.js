var paths = require('./config/paths');
var compilerOptions = require('./config/babel-options');

var gulp = require('gulp');

var runSequence = require('run-sequence');

// var compileToFrameworks = [ 'trad'/*, 'webcomp'*/ ];

var copy = require('gulp-copy');
var data = require('gulp-data');
var themes = require('./config/themes');
// var to5 = require('gulp-babel');
// var assign = Object.assign || require('object.assign');
// var concat = require('gulp-concat');
//
// var jsName = paths.packageName + '.js';
// var compileToModules = ['es2015', 'commonjs', 'amd', 'system', 'native-modules'];
//
// compileToModules.forEach(function(moduleType){
// 	gulp.task('build-babel-' + moduleType, function () {
// 		return gulp.src(paths.source)
// 			.pipe(to5(assign({}, compilerOptions[moduleType]())))
// 			.pipe(concat('index.js'))
// 			.pipe(gulp.dest(paths.output + moduleType));
// 	});
// });

// compileToFrameworks.forEach(function(framework){
// 	gulp.task(`build-components-${framework}`, function() {
// 		gulp.src(paths.source)
// 	})
// });

gulp.task('build-html', function() {
	gulp.src([`${paths.source}**/*.html`, `!${paths.source}**/*.layout.html`, `!${paths.source}components/**/*.html`])
		.pipe(data(themes.applyLayout))
		.pipe(gulp.dest(paths.output));
});

gulp.task('build-components', function() {
	gulp.src([`${paths.source}components/**/*.html`])
		.pipe(data(themes.components({minify: true})))
		.pipe(gulp.dest(paths.output + '/components/'));
});

gulp.task('build', function(callback) {
	return runSequence(
		'clean',
		['build-html', 'build-components'],
		// compileToModules.map(function(moduleType) { return 'build-babel-' + moduleType }),
		callback
	);
});
