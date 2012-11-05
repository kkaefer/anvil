#!/usr/bin/env node
var async = require('async');
var fs = require('fs');
var path = require('path');
var Route = require('./lib/route');
var Item = require('./lib/item');

module.exports = exports = Forge;
function Forge() {
    this._setup();
}

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

// === private ===
require('./lib/forge');
require('./lib/filters');
require('./lib/tools');

