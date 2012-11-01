var _ = require('underscore');
var async = require('async');
var fs = require('fs');
var path = require('path');

var Forge = require('..');
var Route = require('./route');
var Item = require('./item');
var Router = require('./router');
var Tree = require('./tree');

Forge.prototype._setup = function() {
    _.bindAll(this);

    this.input = 'content';
    this.output = 'output';

    this.templates = {};
    this.pendingItems = [];
    this.items = _([]);
    this.routes = [];
    this.router = new Router(this.routes);
    this.generators = [];
};

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
