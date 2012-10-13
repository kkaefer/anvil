var fs = require('fs');
var jade = require('jade');


// Template engine
require.extensions['.jade'] = function(module, filename) {
    var content = fs.readFileSync(filename);
    module.exports = jade.compile(content, {
        filename: filename,
        pretty: true
    });
};
