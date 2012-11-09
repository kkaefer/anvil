var marked = require('marked');

exports.Markdown = function(string) {
    return marked.parse(string);
};
