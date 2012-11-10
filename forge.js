#!/usr/bin/env node
var async = require('async');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');


var Item = require('./lib/item');
var Route = require('./lib/route');
var Router = require('./lib/router');
var Tree = require('./lib/tree');

require('./lib/tools');

module.exports = exports = Forge;
function Forge() {
    _.bindAll(this);

    this.templates = {};
    this.pendingItems = [];
    this.items = _([]);
    this.routes = [];
    this.router = new Router(this.routes);
    this.generators = [];

    this.ignoreDirs = ['node_modules', '.git', '.svn', '.hg', '/_templates'];
    this.ignoreFiles = ['/_build.js', '/package.json', '.DS_Store'];
}

Forge.prototype = {
    // Base path
    basePath: '',

    // Source/output dir
    sourceDir: '.',
    outputDir: '_output',

    get templateDir() {
        return path.join(this.sourceDir, '_templates');
    }
};


// --- static ---

Forge.filter = require('./lib/filter');
Forge.transform = require('./lib/transform');

// --- public ---

Forge.prototype.route = function(path) {
    for (var i = 1; i < arguments.length; i++) {
        this.router.push(new Route(path, arguments[i]));
    }
};

Forge.prototype.skip = function(path) {
    this.route(path, function(item) { item.skip = true; });
};

Forge.prototype.ignore = function(path) {
    this.route(path, function(item) { item.ignore = true; });
};

Forge.prototype.generate = function(callback) {
    this.generators.push(callback);
};

Forge.prototype.create = function(props) {
    var item = new Item(this, props);
    this.pendingItems.push(item);
};

Forge.prototype.template = function(name, fn) {
    this.templates[name] = fn;
};

Forge.prototype.loadTemplates = function(folder) {
    folder = path.resolve(folder);
    var files = fs.readdirSync(folder);
    for (var i = 0; i < files.length; i++) {
        var file = path.join(folder, files[i]);
        var ext = path.extname(file);
        if (ext in require.extensions && fs.statSync(file).isFile()) {
            var name = path.basename(file, ext);
            this.template(name, require(file));
        }
    }
};

Forge.prototype.compile = function(done) {
    var app = this;

    app.started = Date.now();

    if (fs.existsSync(app.templateDir)) {
        app.loadTemplates(app.templateDir);
    }

    async.series([
        app._traverse,
        app._dispatch,
        app._generate,
        app._dispatch,
        app._write,
        app._report
    ], done);
};

// --- private ---

Forge.prototype._traverse = function(done) {
    var app = this;

    var root = path.resolve(app.sourceDir);
    var output = path.resolve(app.outputDir);
    var tree = new Tree();
    tree.onfile = function(source, stat, done) {
        var route = source.substring(root.length);
        var name = path.basename(route);
        if (app.ignoreFiles.indexOf(route) < 0 && app.ignoreFiles.indexOf(name) < 0) {
            var item = new Item(app, { route: route, source: source, stat: stat });
            app.pendingItems.push(item);
        }
        done();
    };
    tree.ondir = function(source, stat, done) {
        var route = source.substring(root.length);
        var name = path.basename(route);
        if (source !== output && app.ignoreDirs.indexOf(route) < 0 && app.ignoreDirs.indexOf(name) < 0) {
            tree.walk(source, done);
        } else {
            done();
        }
    };
    tree.walk(root, function() {
        if (tree.errors.length) {
            console.warn(tree.errors);
        }
        done();
    });
};

Forge.prototype._dispatch = function(done) {
    var app = this;

    function iterate() {
        if (!app.pendingItems.length) return done();
        var item = app.pendingItems.shift();

        item.load(function(err) {
            if (err) item.reportError(err);
            app.router.dispatch(item, function(err) {
                if (err) item.reportError(err);
                else if (!item.ignore) {
                    app.items.push(item);
                }
                iterate();
            });
        });
    }

    iterate(null);
};

Forge.prototype._generate = function(done) {
    async.forEachSeries(this.generators, function(generator, next) {
        if (generator.length >= 1) {
            generator(next);
        } else {
            generator();
            next();
        }
    }, done);
};

Forge.prototype._write = function(done) {
    async.forEachSeries(this.items.value(), function(item, next) {
        item.write(next);
    }, done);
};


Forge.prototype._report = function(err) {
    console.warn('Completed in %dms', Date.now() - this.started);
};
