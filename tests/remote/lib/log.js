function Log () {
    if (Object.hasOwnProperty(window.Logger, 'get')) return;

    class log {
        constructor () {
            this._log = [];
        }

        log (...params) {
            this._log.push(params.join(""))
        }

        get () {
            this._log.join("\n")
        }
    }
    window.Logger = log();
}
Log.get = function () {
    return Object.hasOwnProperty(window.Logger, 'get') ? window.Logger.get() : null;
}
export {Log};
