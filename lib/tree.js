var path = require('path');
var async = require('async');
var fs = require('fs');

module.exports = exports = Tree;
function Tree() {
    this.errors = [];
    this.walk = this.walk.bind(this);
    this.dispatch = this.dispatch.bind(this);
}

Tree.prototype.onfile = function(name, stat, done) {
    done();
};

Tree.prototype.ondir = function(dir, stat, done) {
    this.walk(dir, done);
};

Tree.prototype.walk = function(dir, callback) {
    var tree = this;
    fs.readdir(dir, function(err, entries) {
        if (err) {
            tree.errors.push(err);
        }

        // Prefix all entries with the current dir name.
        entries = (entries || []).map(path.join.bind(path, dir));
        async.forEachSeries(entries, tree.dispatch, callback);
    });
};

Tree.prototype.dispatch = function(filename, done) {
    var tree = this;
    fs.stat(filename, function(err, stat) {
        if (err) {
            tree.errors.push(err);
            done();
        } else if (stat.isDirectory()) {
            tree.ondir(filename, stat, done);
        } else {
            tree.onfile(filename, stat, done);
        }
    });
};