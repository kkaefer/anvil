// Import utility libraries
require('chrono');

// Setup underscore
var _ = require('underscore');
_.str = require('underscore.string');
_.mixin(_.str.exports());

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


// Template engine
var fs = require('fs');
var jade = require('jade');
require.extensions['.jade'] = function(module, filename) {
    var content = fs.readFileSync(filename);
    module.exports = jade.compile(content, {
        filename: filename,
        pretty: true
    });
};
