var marked = require('marked');
var path = require('path');

exports.Markdown = function(string) {
    return marked.parse(string);
};

exports.absoluteURL = function(url, base) {
    return (/^(\/|\w+:(\/\/)?)/).test(url) ? url : path.join(base, url);
};
