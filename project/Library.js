// global which is applied on endpoint_http* functions only
// setting to true will use "me" as value in initiation (which will use ScriptApp.getOAuthToken)
let OAUTH = false;
function E_() {
  const { Endpoints } = Import;
  if (!OAUTH) return new Endpoints.EndpointsBase();
  return new Endpoints.EndpointsBase({oauth: 'me'});
}


/**
 * @name Endpoint-
 * @return {NAMESPACE}
 */
function Endpoint () {
}
Endpoint.httpget = endpoint_httpget;
Endpoint.httpput = endpoint_httpput;
Endpoint.httppatch = endpoint_httppatch;
Endpoint.httpdelete = endpoint_httpdelete;
Endpoint.httppost = endpoint_httppost;
Endpoint.getBaseUrl = endpoint_getBaseUrl;
Endpoint.createRequest = endpoint_createRequest;

/**
 * @name Endpoint.getBaseUrl
 * @param {Endpoint} endpoint
 * @return {String}
 */
 function endpoint_getBaseUrl(endpoint) {
   /**
    * The baseUrl is the templated string with placeholders representing the path parameters as returned
    *   from the discovery service.
    * For example, the Sheets update method's baseUrl is https://../${spreadsheetId}/range/${range}.
    *   Creating a request (i.e. with Endpoints.httpget) will substitute (interpolate) those values based on the object passed
    * @see endpoint.getBaseUrl
    */
   const {Enforce, EndpointsLib} = Import;
   Enforce.positional(arguments, {endpoint: EndpointsLib.EndpointsBase}, 'Endpoint.getBaseUrl');
   return endpoint.getBaseUrl();
 }

/**
 * @name Endpoint.httpget
 * @param {Endpoint} endpoint
 * @param {Object} [pathParams]
 * @return {Request}
 */
function endpoint_httpget(endpoint=null, pathParams={}) {
  /**
   * Create a http get request, where pathParams are substituted from the baseUrl
   * @see endpoint.httpget
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {endpoint: EndpointsLib.EndpointsBase, pathParams: 'object'}, 'Endpoint.httpget');
  return endpoint.httpget(pathParams);
}

/**
 * @name Endpoint.httppost
 * @param {Endpoint} endpoint
 * @param {Object} pathParams
 * @param {Object} payload
 * @return {Request}
 */
function endpoint_httppost(endpoint=null, pathParams, payload) {
  /**
   * Create a http post request, where pathParams are substituted from the baseUrl
   * payload is an object that is stringified with mimetype set to application/json
   * @see endpoint.httppost
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {endpoint: EndpointsLib.EndpointsBase, pathParams: 'object', payload: 'object'}, 'Endpoint.httppost');
  return endpoint.httppost(pathParams, {payload});
}

/**
 * @name Endpoint.httpput
 * @param {Endpoint} endpoint
 * @param {Object} pathParams
 * @param {Object} query
 * @param {Object} payload
 * @return {Request}
 */
function endpoint_httpput(endpoint, pathParams, query={}, payload={}) {
  /**
   * Create a http put request, where pathParams are substituted from the baseUrl
   * @see endpoint.httpput
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {endpoint: EndpointsLib.EndpointsBase, pathParams: 'object', query: 'object', payload: 'object'}, 'Endpoint.httpput');
  return endpoint.httpput(pathParams, {payload, query});
}

/**
 * @name Endpoint.httppatch
 * @param {Endpoint} endpoint
 * @param {Object} pathParams
 * @param {Object} query
 * @param {Object} payload
 * @return {Request}
 */
function endpoint_httppatch(endpoint, pathParams={}, query={}, payload={}) {
  /**
   * Create a http put request, where pathParams are substituted from the baseUrl
   * @see endpoint.httppatch
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {endpoint: EndpointsLib.EndpointsBase, pathParams: 'object', query: 'object', payload: 'object'}, 'Endpoint.httppatch');
  return endpoint.httppatch(pathParams, {payload, query});
}

/**
 * @name Endpoint.httpdelete
 * @param {Endpoint} endpoint
 * @param {Object} pathParams
 * @param {Object} query
 * @param {Object} payload
 * @return {Request}
 */
function endpoint_httpdelete(endpoint, pathParams, query={}, payload={}) {
  /**
   * Create a http delete request, where pathParams are substituted from the baseUrl
   * @see endpoint.httpdelete
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {endpoint: EndpointsLib.EndpointsBase, pathParams: 'object', query: 'object'}, 'Endpoint.httpdelete')
  return endpoint.httpdelete(pathParams, {payload, query});
}

/**
 * @name Endpoint.createRequest
 * @param {Endpoint} endpoint
 * @param {String} method
 * @param {Object} urlObject
 * @param {Object} query
 * @param {Object} payload
 * @param {Object} headers
 * @param {?Any} mixin
 */
function endpoint_createRequest(endpoint, method, urlObject, query={}, payload={}, headers={}, mixin=null) {
 /**
   * Create any method, particular useful when used in conjunction with batch
   *    or for building libraries.
   * method should be an http method string, i.e. "get", "put", "post" etc
   * urlObject can either have url property, or any path parameter
   * query is any query parameters as an object
   * payload is any request body as an object, converted to json
   * headers is any headers to add to the request
   * mixin is an advanced usage which allows developers to augment the
   *    returned Request object with methods which allows users to interact with it
   * @return {Request}
   * @see endpoint.createRequest
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {endpoint: EndpointsLib.EndpointsBase, method: '!string', urlObject: '!object', query: 'object', payload: 'object', headers: 'object', mixin: 'any'}, 'Endpoint.createRequest');
  return endpoint.createRequest(method, urlObject, {query, payload, headers}, {mixin});
}

/**
 * @name Request-
 * @return {NAMESPACE}
 */
function Request () {
  return Endpoints.Request;
}
Request.fetch = request_fetch;
Request.url_params = request_url_params;
Request.getUrl = request_getUrl;
Request.getHeaders = request_getHeaders;
Request.setFields = request_set_fields;
Request.clearFields = request_clear_fields;
Request.resolve = request_resolve;
Request.addQuery = request_addQuery;
Request.clearQuery= request_clearQuery;

/**
 * @name Request.getUrl
 * @param {Request} request
 * @return {String}
 */
function request_getUrl(request) {
  /**
   * Calculates the url (including any query parameters) sent/will be sent to endpoint on fetch
   * @alias request.getUrl()
   * @alias request.url
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {request: EndpointsLib.Request}, 'Request.getUrl');
  return request.getUrl();
}

/**
 * @name Request.getHeaders
 * @param {Request} request
 * @return {Object}
 */
function request_getHeaders(request) {
  /**
   * Returns the headers available on this request sent/will be sent to the endpoint on fetch
   * @alias request.getHeaders()
   * @alias request.headers
   */
  const {Enforce} = Import;
  Enforce.positional(arguments, {request: 'object'}, 'Request.getHeaders');
  return request.headers;
}

/**
 * Reach out to the internet via http
 * @name Request.fetch
 * @param {Request} request
 * @return {Response}
 */
function request_fetch(request) {
  /**
   * Connect with the endpoint defined by this.url, with payload and headers defined previously
   *   returns a response object that has statusCode, and json property
   * @alias request.fetch()
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {request: EndpointsLib.Request}, 'Request.fetch')
  return request.fetch();
}

/**
 * @name Request.urlObject
 * @param {Request} request
 * @return {[String, Object]}
 */
function request_url_params (request) {
  /**
   * Returns two objects, the url which will go be used to fetch, and the param object
   *   These two objects are exactly what will be passed to UrlFetchApp
   * @see request.url_params
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {request: EndpointsLib.Request}, 'Request.urlObject');
  return request.url_params();
}

/**
 * @name Request.setFields
 * @param {Request} request
 * @param {String} value
 */
function request_set_fields (request, value) {
  /**
   * Adds fields to query parameters upon fetch, useful to limit response from Google APIs and can
   *   improve importance of the roundtrip networking
   * Does not replace
   * return {void}
   * @alias request.setFields(value)
   * @alias request.fields = value
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {request: EndpointsLib.Request, value: '!string'}, 'Request.setFields');
  request.setFields(value);
}

/**
 * @name Request.clearFields
 * @param {Request} request
 */
function request_clear_fields (request) {
  /**
   * Empties the fields query parameter of values
   * @alias request.clearFields()
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {request: EndpointsLib.Request}, 'Request.clearFields');
  request.clearFields();
}

/**
 * @name Request.resolve
 * @param {Request} request
 * @return {Object}
 */
function request_resolve(request) {
  /**
   * Convenience function that calls request.fetch().json
   * @alias request.resolve()
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {request: EndpointsLib.Request}, 'Request.resolve');
  return request.resolve();
}

/**
 * @name Request.addQuery
 * @param {Request} request
 * @param {Object} obj
 */
function request_addQuery(request, obj) {
  /**
   * Adds query parameters to the url, which is calculated on fetch
   * @alias request.addQuery(obj)
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {request: EndpointsLib.Request, obj: '!object'}, 'Request.addQuery');
  request.addQuery(obj);
}

/**
 * @name Request.clearQuery
 * @param {Request} request
 */
function request_clearQuery(request) {
  /**
   * Empties query parameters
   * @alias request.clearQuery()
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {request: EndpointsLib.Request}, 'Request.clearQuery');
  request.clearQuery();
}


/**
 * @name Response-
 * @return {NAMEPSACE}
 */
function Response () {
  const {EndpointsLib} = Import;
  return EndpointsLib.Response;
}
Response.getJson = response_getJson;
Response.isOk = response_isOk;
Response.getStatusCode = response_getStatusCode;
Response.getRequestObject = response_getRequestObject;
Response.getHeaders = response_getHeaders;


/**
 * @name Response.json
 * @param {Response} response
 * @return {Object}
 */
function response_getJson (response) {
  /**
   * Parses the response text with JSON.parse and returns result
   * If error occurs on parse, a faked error response is returned
   * @alias response.getJson()
   * @alias response.json
   */
  const {Enforce} = Import;
  Enforce.positional(arguments, {response: Response_}, 'Response.json');
  return response.getJson();
}


/**
 * @name Response.isOk
 * @param {Response} response
 * @return {Boolean}
 */
function response_isOk (response) {
  /**
   * Returns true if status = 200
   * @alias response.isOk()
   * @alias response.ok
   */
  const {Enforce} = Import;
  Enforce.positional(arguments, {response: Response_}, 'Response.isOkay');
  return response.isOk();
}


/**
 * @name Response.statusCode
 * @param {Response} response
 * @return {Number}
 */
function response_getStatusCode (response) {
  /**
   * Returns the status code of the http request
   * @alias response.getStatusCode()
   * @alias response.statusCode
   */
  const {Enforce} = Import;
  Enforce.positional(arguments, {response: Response_}, 'Response.statusCode');
  return response.getStatusCode();
}

/**
 * @name Response.getRequestObject
 * @param {Response} response
 * @return {Object}
 */
function response_getRequestObject (response) {
  /**
   * Returns the originating request that was sent during fetch with params as discussed https://developers.google.com/apps-script/reference/url-fetch/url-fetch-app
   * @alias response.getRequestObject()
   * @alias response.requestObject
   */
  const {Enforce} = Import;
  Enforce.positional(arguments, {response: Response_}, 'Response.getRequest');
  return response.requestObject;
}

/**
 * @name Response.getHeaders
 * @param {Response} response
 * @return {Object}
 */
function response_getHeaders (response) {
  /**
   * Returns headers of response
   * @alias response.getHeaders()
   * @alias response.headers
   */
  const {Enforce} = Import;
  Enforce.positional(arguments, {response: Response_}, 'Response.getHeaders');
  return response.headers;
}


/**
 * @name Options-
 * @return {NAMESPACE}
 */
function Options () {
}
Options.setOauth = options_setOauth;


/**
 * If oauth is true, automatically set up headers for Authorization: Bearer {id} ON by default
 * @name Options.setOauth
 * @param {Boolean} oauth
 */
function options_setOauth(oauth) {
  OAUTH = oauth;
}


/**
 * @name Batch-
 * @return {NAMESPACE}
 */
function Batch () {
}
Batch.add = batch_add;
Batch.fetchAll = batch_fetchall;

/**
 * @name Batch.add
 * @param {Batch} batch
 * @param {Request} request
 */
function batch_add (batch, request) {
  /**
   * Add a request to fetchAll
   * @see batch.add
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {batch: EndpointsLib.Batch, request: EndpointsLib.Request}, 'Batch.add');
  batch.add({request});
}

/**
 * @name Batch.fetchAll
 * @param {Batch} batch
 * @return {Endpoints.Request[]}
 */
function batch_fetchall(batch) {
  /**
   * @param {Batch} batch - An Endpoint.Batch object
   *
   * @alias batch.fetchAll
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {batch: EndpointsLib.Batch}, 'Batch.fetchAll');
  return batch.fetchAll();
}

/**
 * @name $
 * @return {EndpointsBaseClass}
 */
function $ () {
  /**
   * Returns the Base class
   */
  return Endpoints.EndpointsBase;
}
$.doc = $_doc;
$.initBatch = $_initBatch;
$.createGetRequest = $_createGetRequest;
$.createGoogEndpoint = $_createGoogEndpoint;
$.createGoogEndpointWithOauth = $_createGoogEndpointWithOauth;
$.makeGoogOauthService = $_makeGoogOauthService;
$.createPostRequest = $_createPostRequest;
$.interpoloate = $_interpolate;

/**
 * @name $.doc
 * @param {Function} func
 * @return {String}
 */
function $_doc (func) {
  /**
   * Returns the "docstring" which is the comment following the function declaration
   */
  if (!(typeof func ==='function')) throw new TypeError('$_doc requires a function as an object');
  return func.doc;
}

/**
 * @name $.makeGoogOauthService
 * @param {String} service - any name
 * @param {String} email - issuer email
 * @param {String} privateKey - from credentials json
 * @param {String[]} scopes
 * @return {Oauth}
 */
function $_makeGoogOauthService (service, email, privateKey, scopes) {
  /**
   * Returns service with oauth, for example for service accounts created on Google console
   * @see EndpointsBase_.googOauthService
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {service: '!string', email: '!string', privateKey: '!string', scopes: '!array'}, '$_makeGoogOauthService');
  return EndpointsLib.EndpointsBase.googOauthService({service, email, privateKey, scopes});
}

/**
 * @name $.createGoogEndpointWithOauth
 * @param {String} name
 * @param {String} version
 * @param {String} resource
 * @param {String} method
 * @param {Oauth} oauth
 * @return {Endpoint}
 */
function $_createGoogEndpointWithOauth (name, version, resource, method, oauth) {
  /**
   * This creates an endpoint in which has custom oauth information, such as that needed for
   *   interacting with service that operates on a service account.
   *   The first four parameters need to be available in discovery
   * @see EndpointsBase_.discovery
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {name: '!string', version: '!string', resource: '!string', method: '!string', oauth: 'any'}, '$_createGoogEndpointWithOauth');
  return EndpointsLib.EndpointsBase.discovery({name, version, resource, method}, {oauth});
}

/**
 * @name $.createGetRequest
 * @param {String} url
 * @param {Object} query
 * @return {Request}
 */
function $_createGetRequest (url, query={}) {
  /*
   * Returns a Request that represents standard http get request at location given by url
   * @see E_().httpget
   */
  return E_().httpget({url}, {query});
}

/**
 * @name $.createPostRequest
 * @param {String} url
 * @param {Object} payload
 * @return {Request}
 */
function $_createPostRequest (url, payload) {
  /*
   * Returns a Request that represents standard http get request at location given by url
   * @see E_().httppost
   */
  return E_().httppost({url}, {body: payload})
}

/**
 * @name $.initBatch
 * @return {Batch}
 */
function $_initBatch() {
  /**
   * Returns object which you can use add requests, calling fetchAll to use UrlFetchApp.fetchAll to execute
   * @alias new Batch_
   */
  const {EndpointsLib} = Import;
  return new EndpointsLib.Batch();
}

/**
 * @name $.createGoogEndpoint
 * @param {String} name
 * @param {String} version
 * @param {String} resource
 * @param {String} method
 * @return {Endpoint}
 */
function $_createGoogEndpoint (name, version, resource, method) {
  /**
   * Uses the discovery service to derive the baseUrl for this particular endpoint
   * Users can become more familiar with possible values by using
   * https://developers.google.com/discovery/v1/reference/apis/getRest
   *
   * Note: Any Google service that has a discovery endpoint can use this method to derive endpoint
   * Note: Oauth authentication is placed in headers via ScriptApp.getOAuthToken() upon request (not upon creation)
   *
   * @see EndpointsBase_.discovery
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.positional(arguments, {name: '!string', version: '!string', resource: '!string', method: '!string'}, '$_createGoogEndpoint');
  return EndpointsLib.EndpointsBase.discovery({name, version, resource, method});
}


/**
 * @name $.interpolate
 * @param {String} baseUrlString
 * @param {Object} pathParameters
 * @return {String}
 */
function $_interpolate (baseUrlString, pathParameters) {
  /**
   * Exposes the internal method used to substitute pathParameters objects to baseUrlString
   * @example
   * $.interpolate("https://example.com/${id}/something/${name}", {id: "12345", name: "ClassroomTechTools"})
   *   // https://example.com/12345/something/ClasroomTechTools
   */
  const {Enforce, EndpointsLib} = Import;
  Enforce.named(arguments, {baseUrlString: '!string', pathParameters: '!object'});
  return Endpoints.EndpointsBase.utils.interpolate(baseUrlString, pathParameters);
}

/**
 *
 */
function __mocklib() {
  return {Response, $, Batch, Endpoint, Request, Options};
}
