var _ = require('underscore');
var jade = require('jade');
var jsdom = require('jsdom').jsdom;
var less = require('less');
var path = require('path');

var filter = require('./filter');

// --- item filters ---
exports.Markdown = function(item) {
    if (item.content) {
        item.content = filter.Markdown(item.content);
    }
};

function filterURLs(node, base) {
    if (node.nodeType == 1) {
        ['src', 'href'].forEach(function(attr) {
            if (node.hasAttribute(attr)) {
                node.setAttribute(attr, filter.absoluteURL(node.getAttribute(attr), base));
            }
        });
    }
    for (var i = 0; i < node.childNodes.length; i++) {
        filterURLs(node.childNodes[i], base);
    }
}

exports.BaseHREF = function(item) {
    if (item.content) {
        var doc = jsdom(item.content);
        filterURLs(doc, item.dirname);
        item.content = doc.innerHTML;
    }
};

exports.Less = function(item, done) {
    item.extension = '.css';

    if (item.content) {
        var parser = new(less.Parser)({
            paths: [ path.dirname(item.source) ],
            filename: item.source
        });
        parser.parse(item.content, function (err, tree) {
            if (err) {
                item.reportError(new Error(err.message + '    in ' + err.filename));
                return done();
            }

            try {
                item.content = tree.toCSS({ compress: true });
            } catch (msg) {
                item.reportError(new Error(msg.message + '    in ' + msg.filename));
            }
            done();
        });
    } else {
        done();
    }
};

exports.Jade = function(item) {
    if (item.content) {
        var app = item.app;
        var fn = jade.compile(item.content, {
            filename: item.source,
            pretty: true
        });
        item.content = fn({
            // TODO: get app in here somehow
            app: app,
            item: item,
            meta: item.metadata,

            _: _,
            filter: filter,
            templates: app.templates
        });
    }
};
