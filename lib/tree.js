var path = require('path');
var async = require('async');
var fs = require('fs');

module.exports = exports = Tree;
function Tree(root) {
    this.root = path.resolve(root);
}

Tree.prototype._traverse = function(dir, process, callback) {
    var tree = this;
    fs.readdir(dir, function(err, entries) {
        if (err) return callback(err);
        if (!entries.length) return callback(null);
        async.forEachSeries(entries, function(entry, done) {
            var filename = path.join(dir, entry);
            fs.stat(filename, function(err, stat) {
                if (err) return done(err);
                if (stat.isDirectory()) {
                    tree._traverse(filename, process, done);
                } else {
                    process.call(tree, filename, stat, done);
                }
            });
        }, callback);
    });
};

Tree.prototype.traverse = function(process, callback) {
    this._traverse(this.root, process, callback);
};
