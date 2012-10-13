module.exports = exports = Route;
function Route(path, handler) {
    if (typeof path === 'string') {
        this.path = path;
        this.keys = [];
        this.regexp = Route.pathRegexp(this.path, this.keys, false, true);
    } else if (path instanceof RegExp) {
        this.regexp = path;
    } else {
        throw new Error('Path must be a string or a regular expression');
    }

    if (handler) {
        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }
        this.handler = handler;
    }
}

// Copied from express.js
Route.prototype.matches = function(item) {
    var keys = this.keys;
    var params = item.params = [];
    var match = this.regexp.exec(item.route);

    if (!match) return false;

    for (var i = 1, len = match.length; i < len; ++i) {
        var key = keys[i - 1];
        var val = match[i];
        if (typeof val === 'string') {
            val = decodeURIComponent(val);
        }

        if (key) {
            params[key.name] = val;
        } else {
            params.push(val);
        }
    }

    return true;
};


/**
 * Normalize the given path string,
 * returning a regular expression.
 *
 * An empty array should be passed,
 * which will contain the placeholder
 * key names. For example "/user/:id" will
 * then contain ["id"].
 *
 * @param  {String|RegExp|Array} path
 * @param  {Array} keys
 * @param  {Boolean} sensitive
 * @param  {Boolean} strict
 * @return {RegExp}
 * @api private
 */
// Taken from express.js
Route.pathRegexp = function(path, keys, sensitive, strict) {
  if (path instanceof RegExp) return path;
  if (Array.isArray(path)) path = '(' + path.join('|') + ')';
  path = path
    .concat(strict ? '' : '/?')
    .replace(/\/\(/g, '(?:/')
    .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?(\*)?/g, function(_, slash, format, key, capture, optional, star){
      keys.push({ name: key, optional: !! optional });
      slash = slash || '';
      return '' +
        (optional ? '' : slash) +
        '(?:' +
        (optional ? slash : '') +
        (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')' +
        (optional || '') +
        (star ? '(/*)?' : '');
    })
    .replace(/([\/.])/g, '\\$1')
    .replace(/\*/g, '(.*)');
  return new RegExp('^' + path + '$', sensitive ? '' : 'i');
};
