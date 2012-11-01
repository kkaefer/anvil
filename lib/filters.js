var Forge = require('..');
var marked = require('marked');
var less = require('less');
var path = require('path');

Forge.Markdown = function(item) {
    if (item.content) {
        item.content = marked.parse(item.content);
    }
};

Forge.Less = function(item, done) {
    item.extension = '.css';

    if (item.content) {
        var parser = new(less.Parser)({
            paths: [ path.dirname(item.source) ],
            filename: item.source
        });
        parser.parse(item.content, function (err, tree) {
            if (err) return done(err);

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
