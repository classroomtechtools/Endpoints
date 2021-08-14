import { Enforce } from "@classroomtechtools/enforce_arguments";
import { OAuth2 } from "./lib/Oauth2.js";
import { cloneDeep } from "lodash-es";

class Verbose {
  constructor() {
    this.verbosity = 0;
  }
  setVerbosity(value) {
    this.verbosity = value;
  }
}

/**
 * Class used for cases where oauth is send as "me", where `SciptApp.getOAuthToken` is appropriate auth. The token is actually retrieved on the call itself, rather than at endpoint creation (otherwise it might timeout)
 * @property {String} token
 */
class Oauth {
  get token() {
    return ScriptApp.getOAuthToken();
  }
}

/**
 * An object that represents a collection of requests that will be asynchronously retrieved. Use `add` to add request objects, and then `fetchAll` which interacts with APIs concurrently and return them all. The responses will be in the same order as the requests.
 *
 * You can also iterate over this object with `for … of` syntax, and it does so by chunking the requests, passing back time to the caller to process.
 * @example
// create the object
const batch = Endpoints.batch();

// add request objects
batch.add({request});  // Request

// use `fetchAll` to grab them all at once
const responses = batch.fetchAll();

// get the json
const response = responses[0];
Logger.log(response.json);

// or
// iterate over the object and get one at a time
for (const response of batch) {
  Logger.logger(response.json);
}
 * @class
 */
class Batch extends Verbose {
  /**
   * Usually created with call to `Endpoints.batch`
   * @return {Batch}
   * @param {Number} [rateLimit=50] - The maximum number, per second, that the endpoint can take before raising 429. error. (This often applies per IP address)
   * @param {Date} [lastExecutionDate=null] - Uses this as basis for understanding how much longer it has for a second to elapse. In most cases, safest to leave as `null`
   * @param {Boolean} [verbose=false] - set to true if you want to see messages indicating when it's sleeping in order to ensure the rate limit isn't exceeded
   * @example
const batch = Endpoints.batch();
batch.add({request});  // Request
const responses = batch.fetchAll();
const response = responses[0];
Logger.log(response.json);
// or
for (const response of batch) {
  Logger.logger(response.json);
}
   */
  constructor({ rateLimit = 50, lastExecutionDate = null } = {}) {
    Enforce.named(
      arguments,
      { rateLimit: "number", lastExecutionDate: "any" },
      "Batch#constructor"
    );
    super();
    this.reset(lastExecutionDate);
    this.rateLimit = rateLimit;
  }

  reset(lastExecutionDate) {
    this.queue = [];
    this._after = [];
    this._timing = { lastExecutionDate };
  }

  /**
   * Add request to batch queue
   * @param {Request} request - An Endpoints.Request object
   */
  add({ request } = {}) {
    Enforce.named(arguments, { request: Namespace.Request }, "Batch#add");
    this.queue.push(request);
  }

  /**
   * Use UrlFetchApp to reach out to the internet. Returns Response objects in same order as requests. You need to use `json` property to get the data result. Note that Response objects also have `request` property, which can be used to debug, or rebuild the original request, if necessary. Any mixin classes that are used on request creation will be available on the response object.

   Handles 429 errors smartly. Instead of trying again with all of the requests, its subsequent attempt will only fetch those that had 429. Note that the current algorithm assumes these batch requests are going to the same endpoint. TODO: better algorithm not assuming same endpoint
   * @return {Response[]}
   * @example
// Make list of response jsons
batch.fetchAll().map(response => response.json);
   * @example
// Make list of original request urls
batch.fetchAll().map(response => response.request.url);
   * @example
// request with mixins
const req = Endpoints.createRequest('get', {}, {
  param: 1
});
const batch = Endpoints.batch();
batch.add({request: req});
const responses = batch.fetchAll();
const response = responses[0];
Logger.log(response.param);  // 1
   */
  fetchAll() {
    const obj = { retry: 0, start: 0, stoppedAt: this.queue.length };
    let collated = [];

    do {
      if (obj.stoppedAt < this.queue.length) {
        obj.start = obj.stoppedAt;
        obj.stoppedAt = this.queue.length;
        this.verbosity > 2 &&
          Logger.log(
            "429 hit rate encountered in Batch#fetchAll, sleeping for " +
              obj.retry / 1000 +
              " seconds."
          );
        Utilities.sleep(obj.retry);
      }

      const responses = UrlFetchApp.fetchAll(
        this.queue.slice(obj.start).map((request) => {
          const { params } = request.getParams({ embedUrl: true });
          return params;
        })
      ).map((response, idx) => {
        const request = this.queue[idx];
        const response_ = new Response({ response, request });
        if (response_.statusCode === 429) {
          obj.retry = Math.max(obj.retry, response_.x_ratelimit_reset); //
          obj.stoppedAt = Math.min(obj.stoppedAt, idx);
          return null;
        }
        return response_;
      });

      //process
      const nulled = responses.indexOf(null);
      if (nulled === -1) {
        Array.prototype.push.apply(collated, responses);
        obj.rety = 0;
        obj.start = 0;
      } else {
        Array.prototype.push.apply(collated, responses.slice(0, nulled));
      }
    } while (obj.retry > 0);

    // add any .after
    Array.prototype.push.apply(collated, this._after);
    this.reset();

    return collated;
  }

  /**
   * Respecting the rate limit (default value is low, pass higher value in constructor),
   * fetch everything in chunks, returning each response one-by-one, making processing easier.
   * Particularly useful if you know the rate limit (or just choose a sensible one)
   * @name iterator
   * @method
   * @yields {Response}
   * @example
const batch = Endpoints.batch(200);  // 200 hits per second
for (let i=0; i<10000; i++) {
  const request = ...;
  batch.add(request);   // add 10,000 requests
}
for (const response of batch) {
  // you'll get each response one-by-one, but it'll chunk
  // by 200, and will wait for second to expire before the next chunk
  Logger.log(response.json);
}
  */
  *[Symbol.iterator]() {
    const len = this.queue.length,
      oneSecond = 1000;
    let size = this.rateLimit || 50;
    for (let idx = 0; idx < len; idx += size) {
      const chunk = this.queue.slice(idx, idx + size);
      const lastTime =
          this._timing.lastExecutionDate || new Date(9999999999999),
        now = new Date();
      const delta = now.getTime() - lastTime.getTime();
      if (delta < oneSecond && delta > 0) {
        const sleep = (oneSecond - delta) * 1.01;
        this.verbosity > 2 &&
          Logger.log(
            `Sleeping for ${sleep * oneSecond} seconds match rate limit of ${
              this.rateLimit
            } per second`
          );
        Utilities.sleep(sleep);
      }

      const fetchAppResponses = UrlFetchApp.fetchAll(
        chunk.map((request) => {
          const { params } = request.getParams({ embedUrl: true });
          return params;
        })
      );

      // save for loop
      this._timing.lastExecutionDate = new Date();

      // now prepare the responses so the body can make due with them
      const responses = fetchAppResponses.map((response, idx) => {
        const request = chunk[idx];
        const response_ = new Response({ response, request });
        return response_;
      });

      // hand back the time to the calling body
      // but have to check for rate limits in any case
      // hand back the time to the calling body
      // but have to check for rate limits in any case
      let millisecondsSlept = 0;
      for (const response of responses) {
        const { hitRateLimit, milliseconds } = response.checkRateLimit;
        if (hitRateLimit) {
          const remainingMilliseconds = milliseconds - millisecondsSlept;
          if (remainingMilliseconds > 0) {
            // sleep only if we haven't already slept for that long yet
            this.verbosity > 2 &&
              Logger.log(
                `Hit rate limit in batch sleeping for ${
                  remainingMilliseconds / 1000
                } seconds`
              );
            Utilities.sleep(remainingMilliseconds);

            millisecondsSlept += remainingMilliseconds;
          }

          // convert the response into the original request, make new response object
          const request = response.request;
          yield request.fetch(); // urlfetchapp, which can handle 429 as well
        } else {
          yield response;
        }
      }
    }
  }
}

/**
 * @name Batch#iterator
 * @method
 * @memberOf Batch
 # @description   Respecting the rate limit (default value is low, pass higher value in constructor), fetch everything in chunks, returning each response one-by-one, making processing easier. Particularly useful if you know the rate limit (or just choose a sensible one)
 * @yields {Response}
 * @example
const batch = Endpoints.batch(200);  // 200 hits per second
for (let i=0; i<10000; i++) {
  const request = ...;
  batch.add(request);   // add 10,000 requests
}
for (const response of batch) {
  // you'll get each response one-by-one, but it'll chunk
  // by 200, and will wait for second to expire before the next chunk
  Logger.log(response.json);
}
 */

/**
 * DiscoveryCache - Used internally to save in cache the various url paths to endpoints with the Google Discovery Service. Fun fact: It actually uses this library's `httpget` to interact with `https://www.googleapis.com/discovery/v1/apis/`
 */
class DiscoveryCache {
  constructor() {
    this.cache = CacheService.getScriptCache();
  }

  getUrl({ name, version, resource, method } = {}) {
    const { Namespace } = Import;
    const key = `${name}${version}${resource}${method}`;
    let data = this.cache.get(key);
    let ret = null;
    if (data) {
      //console.log({key, fromCache: true});
      return data;
    }
    data = this.getEndpoint(name, version).json;

    if (data.error) {
      throw new Error(
        `No "${name}" with version "${version}" found. Perhaps spelling is wrong?`
      );
    }

    if (resource.indexOf(".") === -1) {
      // straight forward
      if (!data.resources[resource]) {
        throw new Error(
          `No resource "${resource}" found in ${name}${version}; only has: ${Object.keys(
            data.resources
          )}`
        );
      }
      if (!data.resources[resource].methods[method]) {
        throw new Error(
          `No method "${method}" found in resource "${resource}" of "${name}${version}", only: ${Object.keys(
            data.resources[resource].methods
          )} available`
        );
      }
      ret = data.baseUrl + data.resources[resource].methods[method].path;
    } else {
      // resources can be dot-noted in order to resolve a path, e.g. sheets.spreadsheets.values, sheets.spreadsheets.developerMetadata
      let resources = data;
      resource.split(".").forEach(function (res) {
        resources = resources.resources[res];
      });
      ret = data.baseUrl + resources.methods[method].path;
    }

    this.cache.put(key, ret, 21600); // max is 6 hours
    //console.log({key, fromCache: false});
    return ret;
  }

  getEndpoint(name, version) {
    return new Namespace.Endpoint()
      .httpget({
        url: `https://www.googleapis.com/discovery/v1/apis/${name}/${version}/rest`,
      })
      .fetch();
  }
}

/**
 * Class that fills in Endpoint.utils namespace
 * provides utility methods used throughout the library, can be exported
 */
class Utils {
  validateDiscovery({
    name = null,
    version = null,
    resource = null,
    method = null,
  } = {}) {
    return name && version && resource && method;
  }

  /**
   * Like js template literal, replace '${here}' with {here: 'there'}  // "there"
   * Usage: interpolate("${greet}, ${noun}", {greet: 'hello', noun: 'world'})  // "Hello, World"
   * @param {String} baseString - A string with ${x} placeholders
   * @param {Object} params - key/value for substitution
   * @return {String}
   */
  interpolate(baseString, params) {
    const names = Object.keys(params);
    const vals = Object.values(params);
    try {
      return new Function(...names, `return \`${baseString}\`;`)(...vals);
    } catch (e) {
      throw new Error(
        `insufficient parameters. Has ${Object.keys(params)} but ${e.message}`
      );
    }
  }

  /**
   * Convert strings that have {name.subname} pattern to ${name_subname} so can be interpolated
   * Used internally; required since Google APIs use former pattern instead of latter
   */
  translateToTemplate(string) {
    // Use special patterns available in second parameter go from a {} to ${}
    return string.replace(/{\+*([a-zA-Z_.]*?)}/g, function (one, two) {
      return "${" + two.replace(".", "_") + "}";
    });
  }

  /**
   * Convert an obj to string of params used in query strings
   * supports multiple query strings as arrays, e.g.:
   * {fields: [], key: 'value'}  converts to ?key=value - No fields included as it is empty array
   * {arr: ['one', two'], key: 'value'} converts to ?array=one&array=two&key=value
   * @return {String}
   */
  makeQueryString({ ...kwargs } = {}) {
    const arr = Object.entries(kwargs).reduce(function (acc, [key, value]) {
      if (Array.isArray(value)) {
        for (const v of value) {
          acc.push(key + "=" + encodeURIComponent(v));
        }
      } else {
        acc.push(key + "=" + encodeURIComponent(value));
      }
      return acc;
    }, []);
    return arr.length === 0 ? "" : "?" + arr.join("&");
  }
}

const PRIVATE_OAUTH = Symbol("private_oauth");

/**
 * Request instance. Instances of this class are created with `createRequest`. See below properties for properties and methods available
 * @property {Object} headers - The headers passed in
 * @property {String} method - "get" etc
 * @property {Object} query - what was passed to you
 * @property {Object} pathParams - an object that holds as keys/values what was passed in the second parameter, if any
 */
class Request extends Verbose {
  /**
   * Usually created on your behalf
   * @param {Object} main - the first parameter
   * @param {String} url - the url (normally before query parameters)
   * @param {Any} oauth - oauth object, usually created via Oauth2 lib
   * @param {String} method - http method i.e. 'get' etc
   * @param {Object} headers - http headers
   * @param {Object} query - query parameters
   * @param {Any} mixin - adds properties in mixin object to the request obj via Object.assign
   */
  constructor(
    { url, oauth, method = "get", headers = {}, payload = {}, query = {} } = {},
    { mixin = null }
  ) {
    Enforce.named(arguments, {
      url: "!string",
      oauth: "!any",
      method: "string",
      headers: "object",
      payload: "object",
      query: "object",
      mixin: "any",
    });
    super();
    this._url = url;
    this.headers = headers;
    this.payload = payload;
    this.method = method;
    this.query = query;
    this.store = null;
    // standard parameters is quite useful for performance, use is specially
    this._fields = [];
    this[PRIVATE_OAUTH] = oauth;

    if (mixin) Object.assign(this, mixin);
  }

  /**
   * Caching store
   * @param {Any} store - Requires get and put methods
   */
  setStore(store) {
    this.store = store;
  }

  /**
   * Reach out to the internet with UrlFetchApp, returns Response object. Automatically detects rate limit, pauses, and tries again (just once)
   * @return {Response}
   * @example
const request = Endpoints.createRequest('get', {
  url: 'https://example.com'
});
const response = request.fetch();
Logger.log(response.json);
   */
  fetch() {
    /**
     * Use the store, if present
     * @returns ResponseObject
     */

    const fetcher = (u, o) => {
      const info = { hash: null };
      if (this.store != null) {
        // handle a caching store by getting the hash of the request sans the authorization header
        // the bearer token may easily change in this context, and wouldn't make caching possible
        // also not storing the bearer token anywhere, not even a hashed version of it
        const obj = cloneDeep({ url: u }, o);
        if (obj.headers && obj.headers.Authorization)
          delete obj.headers.Authorization;

        // the Utilities digest returns an array of bytes (integers) which we need to convert to character strings
        info.hash = Utilities.computeDigest(
          Utilities.DigestAlgorithm.MD5,
          JSON.stringify(obj)
        )
          .map((chr) =>
            (chr < 0 ? chr + 256 : chr).toString(16).padStart(2, "0")
          )
          .join("");

        // see if it's in the cache
        const data = this.store.get(info.hash);

        // if it's in the cache, return an object {data: 'xyz'} which we'll be able to unpack as being in the cache
        // when we make a response object, which can make a mock object
        if (data != null) {
          return { data };
        }
      }
      const response = UrlFetchApp.fetch(u, o);
      if (info.hash != null && response.getResponseCode() === 200) {
        // store the raw text result but only for successful responses
        const result = this.store.put(info.hash, response.getContentText());
      }
      // return the repsonse object
      return response;
    };

    const { url, params: requestObject } = this.url_params({ embedUrl: true });
    let response;
    try {
      this.verbosity >= 1 &&
        Logger.log(
          JSON.stringify(
            { ...requestObject, ...{ time: new Date() } },
            ["url", "method", "headers", "time"],
            2
          )
        );
      response = fetcher(url, requestObject);
    } catch (e) {
      response = null;
      throw new Error(e.message, { url, requestObject });
    }
    let resp = new Response({ response, request: this });

    // auto-detect ratelimits, try again
    if (resp.hitRateLimit) {
      this.verbosity > 2 && Logger.log("Hit rate limit, trying again");
      response = fetcher(url, requestObject);
      resp = new Response({ response, request: this });
    }

    return resp;
  }

  /**
   * Alternative to this.url
   * @return {String}
   */
  getUrl() {
    return this.url;
  }

  /**
   * Calculates url, adding query parameters. In case key fields is non empty, converts with `join(",")` as needed by fields standard query param
   */
  get url() {
    if ((this._fields || []).length > 0) {
      // convert fields data type from array to string with , delimiter, but don't replace
      return (
        this._url +
        Endpoint.utils.makeQueryString({
          ...this.query,
          ...{ fields: this._fields.join(",") },
        })
      );
    }
    return this._url + Endpoint.utils.makeQueryString(this.query);
  }

  /**
   * Copies key in obj to request object so that query parameters are passed on fetch
   * @param {Object} obj - the object that is copied to queries object
   * @example
const request = Endpoints.createRequest('get', {
  url: 'https://example.com'
});
request.addQuery({p: 'str'});
request.url;  // https://exmaple.com?p=str
   */
  addQuery(obj = {}) {
    Enforce.positional(arguments, { obj: "object" }, "Request#addQuery");
    for (const [key, value] of Object.entries(obj)) {
      this.query[key] = value;
    }
  }

  /**
   * Adds header
   * @param {Object} obj
   */
  addHeader(obj = {}) {
    /**
     * Copies key in obj to headers object so
     */
    Enforce.positional(arguments, { obj: "object" }, "Request#addHeader");
    for (const [key, value] of Object.entries(obj)) {
      this.headers[key] = value;
    }
  }

  /**
   * Sets `this.query` to empty object
   */
  clearQuery() {
    this.query = {};
  }

  set fields(value = null) {
    Enforce.positional(arguments, { value: "string" }, "Request#set_fields");
    this._fields.push(value);
  }

  /**
   * Pushes value to this.query.fields
   * @param {String} value
   */
  setFields(value) {
    this.fields = value;
  }

  /**
   * Sets _fields to empty array
   */
  clearFields() {
    this._fields = [];
  }

  url_params(...params) {
    return this.getParams(...params);
  }

  /**
   * @typedef urlParamsObj
   * @property {String} url - The url including query parameters
   * @property {Object} params - The parameters sent as second parameter to `UrlFetchApp`. Will optionally include a `url` property (when `getParams` is called with `{embedUrl:true}`)
   */

  /**
   * Returns the param object required for UrlFetchApp.fetch or fetchAll
   * @param {bool} embedUrl - if true add `url` property in object (needed for fetchAll)
   * @param {bool} muteExceptions - if true errors will be returned as jsons
   * @returns {urlParamsObj}
   * @example
  const req = Endpoints.createRequest('get', {
    url: 'http://example.com'
  }, {
    query: {p: 'str'}
  });
  const {url, params} = req.getParams();
  Logger.log(url);  // 'http://exmaple.com?p=str'
  Logger.log(params);  // {method: 'get', ...}
   */
  getParams({ embedUrl = false, muteExceptions = true } = {}) {
    Enforce.named(
      arguments,
      { embedUrl: "boolean", muteExceptions: "boolean" },
      "Request#url_params"
    );
    const params = {};

    // calculate url based on queries as needed
    const url = this.url;

    // we'll derive the oauth token upon request, if applicable, here
    // keep backward compatible with Oauth2 lib

    if (this[PRIVATE_OAUTH]) {
      const token = ((_) => {
        if (this[PRIVATE_OAUTH].hasAccess) {
          // if our oauth has a method "hasAccess" we know it's using the Oauth lib
          if (this[PRIVATE_OAUTH].hasAccess()) {
            // return the access token (usually the case will do so)
            return this[PRIVATE_OAUTH].getAccessToken();
          }
          // return null if Oauth lib reports no access (in some cases may have problems)
          return null;
        }

        // here oauth is an object (class instance) with token property
        // return that, or null if not present or empty
        return this[PRIVATE_OAUTH].token || null;
      })();
      if (token == null) throw new Error("No authorization");
      this.headers["Authorization"] = `Bearer ${token}`;
    }

    if (Object.keys(this.headers).length > 0) {
      params.headers = this.headers;
    }

    params.muteHttpExceptions = muteExceptions;
    params.method = this.method;
    if (embedUrl) params.url = url;
    if (Object.keys(this.payload).length > 0) {
      params.payload = JSON.stringify(this.payload);
      params.contentType = "application/json";
    }

    return { url, params };
  }
}

/**
 * Returns a ResponseObject or RespondObject-compatible object
 * this will wrap the data into the getContentText which is used for .json calls
 */
const toResponse = (resp) => {
  const { data } = resp;
  if (data != null) {
    return {
      getAllHeaders: () => ({ "Content-Type": "text/html; charset=utf-8" }), // placeholder in case of parse error
      getHeaders: () => ({ "Content-Type": "text/html; charset=utf-8" }), // placeholder in case of parse error
      getContentText: () => data,
      getResponseCode: () => 200,
    };
  }
  return resp;
};

/**
 * Response objects, created on your behalf. Contains both the actual response object returned by `UrlFetchApp` and the params object that was built and sent to `UrlFetchApp`
 */
class Response extends Verbose {
  /**
   * Response object, created in Request#fetch
   * @param {Object} param
   * @param {Object} param.response
   * @param {Object} param.request
   * @param {Boolean} param.verbosity
   */
  constructor({ response = null, request = null } = {}) {
    Enforce.named(
      arguments,
      { response: "object", request: Namespace.Request },
      "Response#constructor"
    );
    super();
    this.response = toResponse(response);
    this.request = request;

    // By default, if response cannot be parsed to json we'll send back a json with error information instead of throwing error
    this.catchUnparseableJsonResponse = true;
  }

  /**
   * Return the plain text of the response (getContentText)
   * @return {String}
   */
  getText() {
    return this.text;
  }

  /**
   * Return the plain text of the response (getContentText)
   */
  get text() {
    return this.response.getContentText();
  }

  /**
   * Returns the parsed text of the response. By default, if an error is encountered in call to `JSON.parse`, the returned json has an `error` property which in turn has `status`, `message`, `charset`, and `mime` properties.
   * @throws {Error} if cannot be parsed as json but only if `this.catchUnparseableJsonResponse`
   */
  get json() {
    const text = this.text;
    let result;
    try {
      return JSON.parse(text);
    } catch (err) {
      if (this.catchUnparseableJsonResponse) {
        // return a json with error message instead, as usually does Google APIs
        const contentType = this.headers["Content-Type"];
        const [mime, charset] = contentType.split(";").map((str) => str.trim());
        return {
          error: {
            status: this.statusCode,
            message: err.message,
            charset: charset || null,
            mime: mime || null,
          },
          text,
        };
      }
      throw new Error(err);
    }

    return result;
  }

  /**
   * Same as getAllHeaders
   * @return {Object}
   */
  get headers() {
    return this.response.getAllHeaders();
  }

  getHeaders() {
    return this.headers;
  }

  /**
   * Same as getRepsonseCode, 200 is success
   * @return {Number}
   */
  get statusCode() {
    return this.response.getResponseCode();
  }

  /**
   * Returns this.statusCode
   * @return {Number}
   */
  getStatusCode() {
    return this.statusCode;
  }

  /**
   * Returns true if statusCode == 200
   * @return {Boolean}
   */
  get ok() {
    return this.statusCode === 200;
  }

  /**
   * Returns true if the `statusCode` of the repsonse object is 200
   * @return {Boolean}
   */
  isOk() {
    return this.ok;
  }

  get x_ratelimit_reset() {
    if (!this.headers.hasOwnProperty('x-ratelimit-reset')) {
      // no instructions provided on how long to wait, so let's tell it to wait 10 seconds?
      return 10000;
    }

    let header_reset_at = this.headers["x-ratelimit-reset"];
    header_reset_at = header_reset_at
      .replace(" UTC", "+0000")
      .replace(" ", "T");
    const reset_at = new Date(header_reset_at).getTime();
    const utf_now = new Date().getTime();
    return reset_at - utf_now + 1;
  }

  get checkRateLimit() {
    const hitRateLimit = this.statusCode === 429;
    let milliseconds = 0;
    if (hitRateLimit) {
      milliseconds = this.x_ratelimit_reset;
    }
    return { hitRateLimit, milliseconds };
  }

  /**
   * Returns false if the response is anything except `429`. Returns true only after sleeping for how many milliseconds as indicated in the `x-ratelimit-reset` header. Can be used to retry. Used internally by `Request#fetch` to avoid rate limitations.
   */
  get hitRateLimit() {
    if (this.statusCode === 429) {
      const milliseconds = this.x_ratelimit_reset;
      if (milliseconds > 0) {
        this.verbosity > 2 &&
          Logger.log(
            "429 rate limit encountered in fetch, sleeping for " +
              milliseconds / 1000 +
              " seconds"
          );
        Utilities.sleep(milliseconds);
      }
      return true;
    }
    return false;
  }

  /**
   * Returns the {@link https://developers.google.com/apps-script/reference/url-fetch/http-response HTTPResponse} object as returned by `UrlFetchApp#fetch`
   * @return {HTTPResponse}
   */
  getRequest() {
    return this.request.getParams().params;
  }
}

/**
 * Abstraction of UrlFectchApp, class returned by `Endpoints.module`. Can be used for more extensibility
 * @class
 */
class Endpoint {
  /**
   * Normally you'll create an instance of this class indirectly by interfacing with the API. You can retrieve this class object with call to `Endpoints.module()`;
   * @param {Object}        [base]
   * @param {String}        [base.baseUrl] The basic url, usually with {name} that is replaced by interpolation
   * @param {String|Object} [base.oauth] set to "{oauth='me'}" to automatically work with user's account
   * @param {Object}        [base.discovery]
   * @param {Object}        [stickies] permanent values for options
   * @param {Object}        [stickies.stickyHeaders] permanent headers for any created requests
   * @param {Object}        [stickies.stickyQuery] permanent queries on any created requests
   * @param {Object}        [stickies.payload] payload for any created requests
   * @param {Any}           [store=null] caching store, (accepts get and put methods)
   */
  constructor(
    { baseUrl = null, oauth = null, discovery = {} } = {},
    { stickyHeaders = {}, stickyQuery = {}, stickyPayload = {} } = {},
    { store = null } = {}
  ) {
    Enforce.named(
      arguments,
      {
        baseUrl: "string",
        oauth: "any",
        discovery: "object",
        stickyHeaders: "object",
        stickyQuery: "object",
        stickyPayload: "object",
        store: "any",
      },
      "Endpoints.constructor"
    );
    this.verbosity = 0;
    this.disc = null;
    this.baseUrl = baseUrl;
    this.stickyHeaders = stickyHeaders;
    this.stickyQuery = stickyQuery;
    this.stickyPayload = stickyPayload;
    this.oauth = oauth;
    this.store = store;
    if (
      Object.keys(discovery).length > 0 &&
      Endpoint.utils.validateDiscovery(discovery)
    ) {
      this.disc = new DiscoveryCache();
      this.baseUrl = Endpoint.utils.translateToTemplate(
        this.disc.getUrl(discovery)
      );
    }

    // set oauth to a basic class
    if (this.oauth === "me") {
      this.oauth = new Oauth();
    }
  }

  setVerbosity(value) {
    this.verbosity = value;
  }

  /**
   * An endpoint's baseUrl property is a string with placeholders
   */
  getBaseUrl() {
    return this.baseUrl;
  }

  /**
   * Creates any http request. Used by the `http*` methods.
   * @param {String} method
   * @param {Object} base
   * @param {String} [base.url]
   * @param {Object} [base.pathParams] - replace ${placeholders} by key/values found in baseUrl
   * @param {Object} [options]
   * @param {Object} [options.query]
   * @param {Object} [options.payload]
   * @param {Object} [options.headers]
   * @param {Object} [advanced]
   * @param {Any}    [advanced.mixin] mixin pattern on request object
   * @return {Request}
   */
  createRequest(
    method,
    { url = null, ...pathParams } = {},
    { query = {}, payload = {}, headers = {} } = {},
    mixin = {}
  ) {
    const options = {};

    // check for what it has been passed
    if (Object.keys(pathParams).length > 0) {
      if (!url && !this.baseUrl)
        throw new TypeError(
          "createRequest requires a url named parameter in the second parameter"
        );
      if (this.baseUrl && url)
        throw new TypeError(
          "createRequest has been passed url when baseUrl has already been defined."
        );
      options.url = Endpoint.utils.interpolate(this.baseUrl || url, pathParams);
    } else if (url !== null) {
      options.url = url;
    } else {
      options.url = this.baseUrl;
    }
    options.method = method;
    options.headers = { ...this.stickyHeaders, ...headers }; // second overwrites
    options.payload = { ...this.stickyPayload, ...payload };
    options.query = { ...this.stickyQuery, ...query };
    options.oauth = this.oauth;
    mixin.pathParams = pathParams;

    const request = new Request(options, { mixin });
    if (this.verbosity) request.setVerbosity(this.verbosity);
    if (this.store) request.setStore(this.store);
    return request;
  }

  /**
   * Creates http get request
   * @param {Object} pathParams - replace ${placeholders} by key/values
   * @param {Object} [options]
   * @param {Object} [options.query]
   * @param {Object} [options.payload]
   * @param {Object} [options.headers]
   * @return {Request}
   */
  httpget({ ...pathParams } = {}, { ...options } = {}, mixin = {}) {
    return this.createRequest("get", pathParams, options, mixin);
  }

  /**
   * Creates http post request
   * @param {Object} pathParams - replace ${placeholders} by key/values
   * @param {Object} [options]
   * @param {Object} [options.query]
   * @param {Object} [options.payload]
   * @param {Object} [options.headers]
   * @return {Request}
   */
  httppost({ ...pathParams } = {}, { ...options } = {}) {
    return this.createRequest("post", pathParams, options);
  }

  /**
   * Creates http put request
   * @param {Object} pathParams - replace ${placeholders} by key/values
   * @param {Object} [options]
   * @param {Object} [options.query]
   * @param {Object} [options.payload]
   * @param {Object} [options.headers]
   * @return {Request}
   */
  httpput({ ...pathParams } = {}, { ...options } = {}) {
    return this.createRequest("put", pathParams, options);
  }

  /**
   * Creates http patch request
   * @param {Object} pathParams - replace ${placeholders} by key/values
   * @param {Object} [options]
   * @param {Object} [options.query]
   * @param {Object} [options.payload]
   * @param {Object} [options.headers]
   * @return {Request}
   */
  httppatch({ ...pathParams } = {}, { ...options } = {}) {
    return this.createRequest("patch", path, options);
  }

  /**
   * Creates http delete request
   * @param {Object} pathParams - replace ${placeholders} by key/values
   * @param {Object} [options]
   * @param {Object} [options.query]
   * @param {Object} [options.payload]
   * @param {Object} [options.headers]
   * @return {Request}
   */
  httpdelete({ ...pathParams } = {}, { ...options } = {}) {
    return this.createRequest("delete", pathParams, options);
  }

  static get utils() {
    return new Utils();
  }

  static discovery(
    { name, version, resource, method } = {},
    { oauth = "me" } = {}
  ) {
    const discovery = {
      name: name,
      version: version,
      resource: resource,
      method: method,
    };
    return new Endpoint({ oauth, discovery });
  }

  static googOauthService({
    service = null,
    email = null,
    privateKey = null,
    scopes = null,
  }) {
    const oauthService = OAuth2.createService(service)
      .setTokenUrl("https://accounts.google.com/o/oauth2/token")
      .setIssuer(email)
      .setPrivateKey(privateKey)
      .setPropertyStore(PropertiesService.getUserProperties())
      .setScope(scopes);
    return oauthService;
  }

  static batchRequests({ ...kwargs } = {}) {
    const b = new Batch();
    const r = new Endpoint(kwargs);
    return { batch: b, request: r };
  }
}

const Namespace = { Endpoint, Response, Batch, Request, Oauth };
export { Namespace };
