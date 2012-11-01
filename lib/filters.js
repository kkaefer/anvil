var Forge = require('..');
var marked = require('marked');

Forge.Markdown = function(item) {
    if (item.content) {
        item.content = marked.parse(item.content);
    }
};
