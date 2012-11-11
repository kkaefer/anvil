var fs = require('fs');
var util = require('util');
var path = require('path');
var _ = require('underscore');
var yaml = require('js-yaml');
var mkdirp = require('mkdirp');
var child_process = require('child_process');

var filter = require('./filter');

module.exports = exports = Item;
function Item(app, props) {
    _.extend(this, props);
    _.defaults(this, { metadata: {} });
    this.app = app;

    // Make source immutable.
    Object.defineProperty(this, 'source', { value: this.source });

    if (!this.route) throw new Error('Item is missing a route.');
}

Item.textFiles = ['.txt', '.html', '.htm', '.md', '.markdown', '.css', '.js', '.less', '.yml', '.jade'];

Item.prototype = {
    get target() {
        return 'destination' in this ? this.destination : this.route;
    },

    set target(value) {
        this.destination = value;
    },

    get extension() {
        return path.extname(this.target);
    },

    set extension(extension) {
        this.target = path.join(this.dirname, this.basename) + extension;
    },

    get dirname() {
        return path.dirname(this.target);
    },

    get basename() {
        return path.basename(this.target, this.extension);
    },

    get index() {
        return this.basename === 'index';
    },

    set index(value) {
        if (this.index) {
            if (!value) {
                // This item is an index item, but shouldn't be.
                this.target = this.dirname + this.extension;
            }
        } else {
            if (value) {
                // This item is not yet an index item, but should be.
                this.target = path.join(this.dirname, this.basename, 'index' + this.extension);
            }
        }
    },

    get path() {
        if (this.index) {
            return this.dirname + '/';
        } else {
            return this.target;
        }
    },

    get textual() {
        return Item.textFiles.indexOf(path.extname(this.source)) >= 0;
    },

    load: function(done) {
        var item = this;

        if (!item.source || !item.textual) {
            return done();
        }

        fs.readFile(item.source, 'utf8', function(err, data) {
            var match = data.match(/^---\n(?:([\s\S]*?)\n?)?---(?:\n([\s\S]*))?$/);
            if (match) {
                if (match[1]) {
                    _.extend(item.metadata, yaml.load(match[1]));
                }

                // Allow overriding direct item properties.
                if ('route' in item.metadata) {
                    item.route = item.metadata.route;
                    if (item.route[0] !== '/') item.route = '/' + item.route;
                    delete item.metadata.route;
                }

                if ('template' in item.metadata) {
                    item.template = item.metadata.template;
                    delete item.metadata.template;
                }

                item.content = match[2];
            } else {
                // There is no YAML prefix.
                item.content = data;
            }
            done();
        });
    },

    write: function(done) {
        var item = this;
        var app = this.app;
        var target = path.join(app.outputDir, item.target);

        var output = null;
        if (item.template) {
            var template = item.template;

            // Find a global template if no function is specified.
            if (typeof template === 'string' && app.templates[template]) {
                template = app.templates[template];
            }
            if (typeof template !== 'function') {
                this.reportError(new Error('The template "' + template + '" is not valid'));
                return done();
            }

            try {
                output = template({
                    app: app,
                    item: item,
                    meta: item.metadata,

                    _: _,
                    filter: filter,
                    templates: app.templates
                });
            } catch (err) {
                this.reportError(err);
                return done();
            }
        } else if (item.content) {
            output = item.content;
        }

        // Make sure the item's output folder exists.
        mkdirp(path.dirname(target), function(err) {
            if (err) return item.reportError(err);
            if (output !== null) {
                // Write the output to disk.
                fs.writeFile(target, output, function(err) {
                    if (err) item.reportError(err);
                    else item.reportStatus('written');
                    done();
                });
            } else if (item.source) {
                // Copy the source item.

                fs.stat(target, function(err, stat) {
                    // Check whether the files are the same.
                    if (!err && +item.stat.mtime === +stat.mtime && item.stat.size === stat.size) {
                        return done();
                    } else {
                        // Copy file, preserving it's time attributes
                        child_process.execFile('cp', ['-p', item.source, target], function(err) {
                            if (err) item.reportError(err);
                            else item.reportStatus('copied');
                            done();
                        });
                    }
                });

            } else {
                item.reportError(new Error('Item has no content'));
                done();
            }
        });
    },

    reportStatus: function(status) {
        console.warn('[%s] %s', this.target, status);
    },

    reportError: function(err) {
        console.warn('[%s] %s', this.route, err.stack);
        this.ignore = true;
    }
};
