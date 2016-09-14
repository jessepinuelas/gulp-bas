'use strict';

var gulp        = require('gulp');
var plugins     = require('gulp-load-plugins')();
var browserSync = require('browser-sync').create();
var wiredep     = require('wiredep').stream;

// TODO create config
var  paths = {
    app:    './app',
    dist:   './dist',
    sass:   './app/sass/**/*.scss',
    css:    './app/css/**/*.css',
    tmp:    './.tmp',
    markup: './app/*.html',
    index:  './app/index.html',
    images:  './app/images/**/*',
    js:     './app/js/**/*.js'
};

gulp.task('serve', ['styles'], function() {
    browserSync.init({
        notify: false,
        port:9000,
        // Serve files from the project root
        server: {
            baseDir: ["./", './tmp', 'app']
        },
        routes: {
            '/bower_components': 'bower_components'
        }
    });

    gulp.watch([paths.markup, paths.js, paths.images]).on('change', browserSync.reload);
    gulp.watch(paths.sass, ['styles']);
    gulp.watch(paths.js, ['jshint']);
    gulp.watch('bower.json', ['wiredep']);
});

gulp.task('styles', function() {
    return gulp
        .src(paths.sass)
        .pipe(plugins.sass({
            includePaths: ['styles'],
            outputStyle: 'compressed'
        }))
        .pipe(plugins.autoprefixer({browser: ['last 2 version', '<5%']}))
        .pipe(gulp.dest(paths.tmp))
        .pipe(browserSync.stream());
});

gulp.task('images', function(){
    return gulp
        .src(paths.images)
        .pipe(plugins.imagemin({
            optimizationLevel: 7
        }))
        .pipe(gulp.dest(paths.dist+'/images'));
});

/**
 * Wipes dist and .tmp directories to avoid file duplicates
 */
gulp.task('clean', function(){
    var directoriesToClean = [].concat(paths.dist, paths.tmp);
    return gulp
        .src(directoriesToClean)
        .pipe(plugins.clean());
});

/**
 * Distribution prep runs dist sub tasks in sequence instead of in parallel
 */
gulp.task('dist-prep', plugins.sequence('clean', ['images', 'styles']));

/**
 * Package files and assets for deployment/distribution
 * Optimizes and revisions files based on type JS/CSS/HTML
 * Updates injected files in index to new revved assets
 */
gulp.task('dist',['dist-prep'], function(){
    var assets = plugins.useref.assets({searchPath: ['./', './app']});
    return gulp
        .src(paths.index)
        .pipe(assets)
        .pipe(plugins.if(
            '*.css',
            plugins.minifyCss({compatibility: 'ie9'}),
            plugins.rev()
        ))
        .pipe(plugins.if(
            '*.js',
            plugins.uglify({mangle: true}),
            plugins.rev()
        ))
        .pipe(assets.restore())
        .pipe(plugins.useref())
        .pipe(plugins.revReplace())
        .pipe(plugins.if(
            '*.html',
            plugins.htmlmin({
                collapseWhitespace: true,
                conservativeCollapse: true,
                removeRedundantAttributes: false,
                removeComments: true
            })
        ))
        .pipe(gulp.dest(paths.dist));
});

gulp.task('jshint', function(){
    gulp
        .src(paths.js)
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('default', {verbose:true}));
});

gulp.task('wiredep', function(){
    gulp
        .src(paths.index)
        .pipe(wiredep({
            ignorePath: /^(\.\.\/)+/
        }))
        .pipe(plugins.inject(gulp.src([paths.js, paths.tmp+'**/*.css'], {read: false}), {relative: true}))
        .pipe(gulp.dest(paths.app));
});

gulp.task('default', ['serve']);
