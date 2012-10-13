module.exports = exports = Router;
function Router(routes) {
    this.routes = routes;
}

Router.prototype.push = function(route) {
    this.routes.push(route);
};

Router.prototype.dispatch = function(item, callback) {
    var routes = this.routes;
    var i = 0;
    check();

    function next(err) {
        if (err) callback(err);
        else if (item.ignore || item.skip) callback(null);
        else check();
    }

    function check() {
        delete item.params;
        var route = routes[i++];
        if (!route) return callback(null);

        if (route.matches(item)) {
            if (route.handler.length >= 2) {
                // Expects a callback
                route.handler(item, next);
            } else {
                route.handler(item);
                next();
            }
        } else {
            check(null);
        }
    }
};
