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

    this.base = ''; // base path
    this.input = 'content';
    this.output = 'output';

    this.templates = {};
    this.pendingItems = [];
    this.items = _([]);
    this.routes = [];
    this.router = new Router(this.routes);
    this.generators = [];
}

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
    var item = new Item(props);
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

Forge.prototype.compile = function() {
    this.started = Date.now();
    async.series([
        this._traverse,
        this._dispatch,
        this._generate,
        this._dispatch,
        this._write
    ], this._report);
};

// --- private ---

Forge.prototype._traverse = function(done) {
    var app = this;
    this.tree = new Tree(this.input);
    this.tree.traverse(function(source, stat, done) {
        var route = source.substring(this.root.length);
        var item = new Item({ route: route, source: source, stat: stat });
        app.pendingItems.push(item);
        done();
    }, done);
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
    var app = this;
    async.forEachSeries(app.items.value(), function(item, next) {
        item.write(app, next);
    }, done);
};


Forge.prototype._report = function(err) {
    console.warn('Completed in %dms', Date.now() - this.started);
};
