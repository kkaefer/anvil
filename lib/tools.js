var fs = require('fs');
var _ = require('underscore');
var jade = require('jade');
require('chrono');

// Template engine
require.extensions['.jade'] = function(module, filename) {
    var content = fs.readFileSync(filename);
    module.exports = jade.compile(content, {
        filename: filename,
        pretty: true
    });
};

_.mixin({
    paginate: function(obj, perPage, fn) {
        _(obj)
            .chain()
            .groupBy(function(item, i) {
                return Math.floor(i / perPage);
            })
            .toArray()
            .each(function(items, i, groups) {
                fn.call(groups, items, 1 + i, groups.length);
            });
    }
});
