import {Enforce} from '@classroomtechtools/enforce_arguments';
import {OAuth2} from './lib/Oauth2.js';

/**
 * Interacting with APIs, made a cinch
 * @author Adam Morris https://classroomtechtools.com classroomtechtools.ctt@gmail.com
 * @lastmodified 4 May 2020
 * @version 0.8 Adam Morris: Changed name to Endponts, restructured for jsdoc
 * @version 0.6 Adam Morris: First draft with oauth fix
 * @library MsIomH3IL48mShjNoiUoRiq8b30WIDiE_
 */

class Batch {
  /**
   * An object that represents a collection of requests that will be asynchronously retrieved
   * @class
   * @return {Batch}
   * @example
const batch = Batch();
batch.add(request);  // Request
const responses = bacth.fetchAll();
   */
  constructor () {
    this.queue = [];
  }

  /**
   * Add request to batch queue
   * @param {Request} request - An Endpoints.Request object
   */
  add ({request}={}) {
    Enforce.named(arguments, {request: Namespace.Request}, 'Batch#add');
    const {params} = request.url_params({embedUrl: true});
    this.queue.push(params);
  }

  /**
   * Use UrlFetchApp to reach out to the internet. Returns Response objects in same order as requests
   * Response objects also have #request
   * @example Make list of response jsons
   *          batch.fetchAll().map(response => response.json);
   * @return {Response[]}
   * @example Make list of original request urls
   *          batch.fetchAll().map(response => response.request.url);
   */
  fetchAll () {
    return UrlFetchApp.fetchAll(this.queue).map( (response, idx) => {
                                                // NOTE: requestObject is just a regular object
      const requestObject = this.queue[idx];
      return new Response({response, requestObject});
    });
  }
}


/**
 * DiscoveryCache - Used internally
 */
class DiscoveryCache {
    constructor () {
      this.cache = CacheService.getScriptCache();
    }

    getUrl ({name, version, resource, method}={}) {
      const {Namespace} = Import;
      const key = `${name}${version}${resource}${method}`;
      let data = this.cache.get(key);
      let ret = null;
      if (data) {
        return data;
      }
      data = this.getEndpoint(name, version).json;

      if (data.error) {
        throw new Error(`No "${name}" with version "${version}" found. Perhaps spelling is wrong?`);
      }

      if (resource.indexOf('.') === -1) {
        // straight forward
        if (!data.resources[resource]) {
          throw new Error(`No resource "${resource}" found in ${name}${version}; only has: ${Object.keys(data.resources)}`);
        }
        if (!data.resources[resource].methods[method]) {
          throw new Error(`No method "${method}" found in resource "${resource}" of "${name}${version}", only: ${Object.keys(data.resources[resource].methods)} available`);
        }
        ret = data.baseUrl + data.resources[resource].methods[method].path;
      } else {
        // resources can be dot-noted in order to resolve a path, e.g. sheets.spreadsheets.values, sheets.spreadsheets.developerMetadata
        let resources = data;
        resource.split('.').forEach(function (res) {
          resources = resources.resources[res];
        });
        ret = data.baseUrl + resources.methods[method].path;
      }

      this.cache.put(key, ret, 21600);  // max is 6 hours
      return ret;
    }

    getEndpoint(name, version) {
      return new Namespace.Endpoint().httpget({url: `https://www.googleapis.com/discovery/v1/apis/${name}/${version}/rest`}).fetch();
    }

}


/**
 * Class that fills in Endpoint.utils namespace
 * provides utility methods used throughout the library, can be exported
 */
class Utils {
  validateDiscovery ({name=null, version=null, resource=null, method=null}={}) {
    return name && version && resource && method;
  }

  /**
   * Like js template literal, replace '${here}' with {here: 'there'}  // "there"
   * Usage: interpolate("${greet}, ${noun}", {greet: 'hello', noun: 'world'})  // "Hello, World"
   * @param {String} baseString - A string with ${x} placeholders
   * @param {Object} params - key/value for substitution
   * @return {String}
   */
  interpolate (baseString, params) {
    const names = Object.keys(params);
    const vals = Object.values(params);
    try {
      return new Function(...names, `return \`${baseString}\`;`)(...vals);
    } catch (e) {
      throw new Error(`insufficient parameters. Has ${Object.keys(params)} but ${e.message}`);
    }
  }

  /**
   * Convert strings that have {name.subname} pattern to ${name_subname} so can be interpolated
   * Used internally; required since Google APIs use former pattern instead of latter
   */
  translateToTemplate (string) {
    // Use special patterns available in second parameter go from a {} to ${}
    return string.replace(/{\+*([a-zA-Z_.]*?)}/g, function (one, two) {
      return '${' + two.replace('.', '_') + '}';
    });
  }

  /**
   * Convert an obj to string of params used in query strings
   * supports multiple query strings as arrays, e.g.:
   * {fields: [], key: 'value'}  converts to ?key=value - No fields included as it is empty array
   * {arr: ['one', two'], key: 'value'} converts to ?array=one&array=two&key=value
   * @return {String}
   */
  makeQueryString ({...kwargs}={}) {
    const arr = Object.entries(kwargs).reduce(
      function (acc, [key, value]) {
        if (Array.isArray(value)) {
          for (const v of value) {
            acc.push(key + '=' + encodeURIComponent(v));
          }
        } else {
          acc.push(key + '=' + encodeURIComponent(value));
        }
        return acc;
      }, []
    );
    return (arr.length === 0 ? '' : '?' + arr.join('&'))
  }
}

const PRIVATE_OAUTH = Symbol('private_oauth');

/**
 * Request instance
 */
class Request {

  constructor ({url, oauth, method='get', headers={}, payload={}, query={}}={}, {mixin=null}) {
    Enforce.named(arguments, {url: '!string', oauth: '!any', method: 'string', headers: 'object', payload: 'object', query: 'object', mixin: 'any'});
    this._url = url;
    this.headers = headers;
    this.payload = payload;
    this.method = method;
    this.query = query;
    // standard parameters is quite useful for performance, use is specially
    this._fields = [];
    this[PRIVATE_OAUTH] = oauth;

    if (mixin) Object.assign(this, mixin);
  }

  /*
   * Reach out to the internet with UrlFetchApp, returns Response object
   * @return {Response}
   */
  fetch () {
    const {url, params: requestObject} = this.url_params({embedUrl: true});
    let response;
    try {
      response = UrlFetchApp.fetch(url, requestObject);
    } catch (e) {
      response = null;
      throw new Error(e.message, {url, requestObject});
    }
    let resp = new Response({response, requestObject});

    // auto-detect ratelimits, try again
    if (resp.hitRateLimit) {
      response = UrlFetchApp.fetch(url, requestObject);
      resp = new Response({response, requestObject});
    }

    return resp;
  }

  /**
   * Returns this.url
   * @return {String}
   */
  getUrl () {
    return this.url;
  }

  /**
   * Calculates url, adding query parameters. In case key fields is non empty, converts with `join(",")` as needed by fields standard query param
   */
  get url () {
    if ( (this._fields || []).length > 0) {
      // convert fields data type from array to string with , delimiter, but don't replace
      return this._url + Endpoint.utils.makeQueryString({...this.query, ...{fields: this._fields.join(',')}});
    }
    return this._url + Endpoint.utils.makeQueryString(this.query);
  }

  /**
   * Copies key in obj to request object so that query parameters are passed on fetch
   * @param {Object} obj - the object that is copied to queries object
   */
  addQuery (obj={}) {
    Enforce.positional(arguments, {obj: 'object'}, 'Request#addQuery');
    for (const [key, value] of Object.entries(obj)) {
      this.query[key] = value;
    }
  }

  addHeader (obj={}) {
    /**
     * Copies key in obj to headers object so
     */
    Enforce.positional(arguments, {obj: 'object'}, 'Request#addHeader');
    for (const [key, value] of Object.entries(obj)) {
      this.headers[key] = value;
    }
  }

  clearQuery () {
    this.query = {};
  }

  set fields (value=null) {
    Enforce.positional(arguments, {value: 'string'}, 'Request#set_fields');
    this._fields.push(value);
  }

  /*
   * Pushes value to this.query.fields
   * @param {String} value
   */
  setFields (value) {
    this.fields = value;
  }

  /*
   * Sets query.fields to empty array
   */
  clearFields () {
    this._fields = [];
  }

  /*
   * Returns the param object required for UrlFetchApp.fetch or fetchAll
   * @param {bool} embedUrl if true contains url in object (for fetchAll)
   * @param {bool} muteExceptions if true errors will be returned as jsons
   * @returns {[str, obj]}
   */
  url_params ({embedUrl=false, muteExceptions=true}={}) {
    Enforce.named(arguments, {embedUrl: 'boolean', muteExceptions: 'boolean'}, 'Request#url_params');
    const params = {};

    // calculate url based on queries as needed
    const url = this.url;

    // we'll derive the oauth token upon request, if applicable, here
    // keep backward compatible with Oauth2 lib

    if (this[PRIVATE_OAUTH]) {

      const token = (_ => {
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
      if (token==null) throw new Error("No authorization");
      this.headers['Authorization'] = `Bearer ${token}`;
    }

    if (Object.keys(this.headers).length > 0) {
      params.headers = this.headers;
    }

    params.muteHttpExceptions = muteExceptions;
    params.method = this.method;
    if (embedUrl) params.url = url;
    if (Object.keys(this.payload).length > 0) {
      params.payload = JSON.stringify(this.payload);
      params.contentType = 'application/json';
    }

    return {url, params};
  }

  getUrlParams () {
    return
  }

}


/**
 *
 */
class Response {

  /**
   * Response object, created in Request#fetch
   * @param {Object} param
   * @param {Object} param.response
   * @param {Object} param.requestObject
   */
  constructor ({response=null, requestObject=null}={}) {
    Enforce.named(arguments, {response: 'object', requestObject: 'object'}, 'Response#constructor');
    this.response = response;
    this.requestObject = requestObject;

    // By default, if response cannot be parsed to json we'll send back a json with error information instead of throwing error
    this.catchUnparseableJsonResponse = true;
  }

  /**
   * Return the plain text of the response (getContentText)
   * @return {String}
   */
  getText () {
     return this.text;
  }

  /**
   * Return the plain text of the response (getContentText)
   */
  get text () {
    return this.response.getContentText();
  }

  /**
   * Returns the parsed text of the response. By default, if an error is encountered in call to `JSON.parse`, the returned json has an `error` property which in turn has `status`, `message`, `charset`, and `mime` properties.
   * @throws {Error} if cannot be parsed as json but only if `this.catchUnparseableJsonResponse`
   */
  get json () {

    const text = this.text;
    let result;
    try {
      return JSON.parse(text);
    } catch (err) {
      if (this.catchUnparseableJsonResponse) {
        // return a json with error message instead, as usually does Google APIs
        const contentType = this.headers["Content-Type"];
        const [mime, charset] = contentType.split(';').map(str => str.trim());
        return {
          error: {
            status: this.statusCode,
            message: err.message,
            charset: charset || null,
            mime: mime || null,
          },
          text
        }
      }
      throw new Error(err);
    }

    return result;
  }

  /**
   * Same as getAllHeaders
   * @return {Object}
   */
  get headers () {
    return this.response.getAllHeaders();
  }

  getHeaders () {
    return this.headers;
  }

  /**
   * Same as getRepsonseCode, 200 is success
   * @return {Number}
   */
  get statusCode () {
    return this.response.getResponseCode();
  }

  /**
   * Returns this.statusCode
   * @return {Number}
   */
  getStatusCode () {
    return this.statusCode;
  }

  /**
   * Returns true if statusCode == 200
   * @return {Boolean}
   */
  get ok () {
    return this.statusCode === 200;
  }

  /**
   * Returns true if the `statusCode` of the repsonse object is 200
   * @return {Boolean}
   */
  isOk () {
    return this.ok;
  }

  /**
   * Returns false if the response is anything except `429`. Returns true only after sleeping for how many milliseconds as indicated in the `x-ratelimit-reset` header. Can be used to retry. Used internally by `Request#fetch` to avoid rate limitations.
   */
  get hitRateLimit () {
    if (this.statusCode === 429) {
      const headers = this.getAllHeaders();
      let header_reset_at = headers['x-ratelimit-reset'];
      header_reset_at = header_reset_at.replace(" UTC", "+0000").replace(" ", "T");
      const reset_at = new Date(header_reset_at).getTime();
      const utf_now = new Date().getTime();
      const milliseconds = reset_at - utf_now + 10;
      if (milliseconds > 0) {
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
  getRequest () {
    return this.requestObject;
  }
}


/**
 * Abstraction of UrlFectchApp
 * @class
 */
class Endpoint {

  /**
   * Normally you'll create an instance of this class indirectly by interfacing with the API. You can retrieve this class object with call to `Endpoints.module()`;
   * @param {Object}        [base]
   * @param {String}        [base.baseUrl] default=null
   * @param {String|Object} [base.oauth] default=null
   * @param {Object}        [base.discovery]
   * @param {Object}        [stickies] permanent values for options
   * @param {Object}        [stickies.stickyHeaders] permanent headers for any created requests
   * @param {Object}        [stickies.stickyQuery] permanent queries on any created requests
   * @param {Object}        [stickies.payload] payload for any created requests
   */
  constructor ({baseUrl=null, oauth=null, discovery={}}={}, {stickyHeaders={}, stickyQuery={}, stickyPayload={}}={}) {
    Enforce.named(arguments, {baseUrl: 'string', oauth: 'any', discovery: 'object', stickyHeaders: 'object', stickyQuery: 'object', stickyPayload: 'object'}, 'Endpoints.constructor');
    this.disc = null;
    this.baseUrl = baseUrl;
    this.stickyHeaders = stickyHeaders;
    this.stickyQuery = stickyQuery;
    this.stickyPayload = stickyPayload;
    this.oauth = oauth;
    if (Object.keys(discovery).length > 0 && Endpoint.utils.validateDiscovery(discovery)) {
      this.disc = new DiscoveryCache();
      this.baseUrl = Endpoint.utils.translateToTemplate( this.disc.getUrl(discovery) );
    }

    // set oauth to a basic class
    if (this.oauth === 'me') {
      class OAUTH {
        get token () {
          return ScriptApp.getOAuthToken();
        }
      }
      this.oauth = new OAUTH();
    }
  }

  /**
   * An endpoint's baseUrl property is a string with placeholders
   */
  getBaseUrl () {
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
   * @param {Any}    [advanced.mixin] mixin pattern on this object
   * @return {Request}
   */
  createRequest (method, {url=null, ...pathParams}={}, {query={}, payload={}, headers={}}={}, {mixin=null}={}) {
    const options = {};

    // check for what it has been passed
    if (Object.keys(pathParams).length > 0) {
      if (!url && !this.baseUrl) throw new TypeError("createRequest requires a url named parameter in the second parameter");
      if (this.baseUrl && url) throw new TypeError("createRequest has been passed url when baseUrl has already been defined.");
      options.url = Endpoint.utils.interpolate(this.baseUrl || url, pathParams);
    } else if (url !== null) {
      options.url = url;
    } else {
      options.url = this.baseUrl;
    }
    options.method = method;
    options.headers = {...this.stickyHeaders, ...headers};  // second overwrites
    options.payload = {...this.stickyPayload, ...payload};
    options.query = {...this.stickyQuery, ...query};
    options.oauth = this.oauth;

    return new Request(options, {mixin});
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
  httpget ({...pathParams}={}, {...options}={}) {
    return this.createRequest('get', pathParams, options);
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
  httppost ({...pathParams}={}, {...options}={}) {
    return this.createRequest('post', pathParams, options);
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
  httpput ({...pathParams}={}, {...options}={}) {
    return this.createRequest('put', pathParams, options);
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
  httppatch ({...pathParams}={}, {...options}={}) {
    return this.createRequest('patch', path, options);
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
  httpdelete({...pathParams}={}, {...options}={}) {
    return this.createRequest('delete', pathParams, options);
  }

  static get utils () {
    return new Utils();
  }

  static discovery ({name, version, resource, method}={}, {oauth="me"}={}) {
    const discovery = {
      name: name,
      version: version,
      resource: resource,
      method: method
    };
    return new Endpoint({oauth, discovery});
  }

  static googOauthService ({service = null, email = null, privateKey = null, scopes = null}) {
    const oauthService = OAuth2.createService(service)
                      .setTokenUrl('https://accounts.google.com/o/oauth2/token')
                      .setIssuer(email)
                      .setPrivateKey(privateKey)
                      .setPropertyStore(PropertiesService.getUserProperties())
                      .setScope(scopes);
    return oauthService;
  }

  static batchRequests ({...kwargs}={}) {
    const b = new Batch();
    const r = new Endpoint(kwargs);
    return [b, r];
  }

}
const Namespace = {Endpoint, Response, Batch, Request};
export {Namespace};
