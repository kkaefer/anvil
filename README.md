# Forge

Another static site generator.

```js
#!/usr/bin/env node
var Forge = require('forge');
var app = new Forge();

app.ignore('/private/*');

app.route('*.md', function(item) {
    item.template = 'post';
    item.extension = '.html';
});

app.route('/blog/*.md', function(item) {
    item.template = 'blogpost';
    item.index = true;
});

app.compile();
```
