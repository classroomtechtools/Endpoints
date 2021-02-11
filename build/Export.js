/**
 * Returns the class which can be used to build with UrlFetchApp. Not normally required.
 */
function module () {
  const {module} = Import;
  return module;
}


/**
 * Create request objects
 * @param {String} name - kind of http request: get, post, put, etc
 * @param {Object} urlObj - an object whose properties determine the target i.e. {url: 'https://example.com'} or {url: 'https://${domain}.com', domain: 'example'}
 * @param {String} urlObj.url - the url, with optional template
 * @param {String} [urlObj.xyz] - when url is https://${xyz}.com and `xyz` is `'example.com'` the url will be `"https://example.com"`
 * @param {Object} options - options containing `query`, `payload`, `headers`
 * @param {Object} [options.query] - query parameters
 * @param {Object} [options.payload] - payload
 * @param {Object} [options.headers] - headers
 * @throws Insufficient parameters if urlObj not built correctly
 * @return {Request}
 */
function createRequest (name, urlObj, options) {
  const {Enforce, module} = Import;
  Enforce.positional(arguments, {name: '!string', urlObj: '!object', options: 'object'});
  const endpoints = new module();
  return endpoints.createRequest(name, urlObj, options);
}


/**
 * Uses the Discovery API to create an endpoint with oauth already handled
 * @param {String} name - Name of the service, i.e. `"sheets"`
 * @param {String} version - Version of the service, i.e. `"v1"`
 * @param {String} resource - the namespace i.e. `"spreadsheets.values"`
 * @param {String} method - the action at that namespace i.e. `"get"`
 * @return {Endpoint}
 * @example
const endpoint = Endpoints.createEndpointWithDiscoveryAPI('sheets', 'v4', 'spreadsheets', 'get');
endpoint.createRequest(...);
 */
function createGoogEndpoint (name, version, resource, method) {
  const {Enforce, Namespace} = Import;
  return Namespace.EndpointsBase.discovery({name, version, resource, method});
}


/**
 * Exposes the internal method used to substitute pathParameters objects to baseUrlString
 * @param {String} baseUrlString
 * @param {Object} pathParameters
 * @return {String}
 * @example
const result = Endpoints.interpolate("https://example.com/${id}/something/${name}", {
    id: "12345",
    name: "ClassroomTechTools"
});
Logger.log(result);  // https://example.com/12345/something/ClassroomTechTools
 */
function interpolate (baseUrlString, pathParameters) {
  /**
   * Exposes the internal method used to substitute pathParameters objects to baseUrlString
   * @example
   * $.interpolate("https://example.com/${id}/something/${name}", {id: "12345", name: "ClassroomTechTools"})
   *   // https://example.com/12345/something/ClasroomTechTools
   */
  const {Enforce, Namespace} = Import;
  Enforce.named(arguments, {baseUrlString: '!string', pathParameters: '!object'});
  return Namespace.EndpointsBase.utils.interpolate(
    baseUrlString,
    pathParameters
  );
}

/**
 * Exposes the internal method used to substitute raw url string returned by the discovery service to baseUrlString
 * @param {String} str
 * @param {Object} pathParameters
 * @return {String}
 * @example
const result = Endpoints.resolveUrlInterpolation("https://example.com/{id}/something/{+name}", {
    id: "12345",
    name: "ClassroomTechTools"
});
Logger.log(result);  // https://example.com/12345/something/ClassroomTechTools
 */
function resolveUrlInterpolation(str, pathParameters) {
  const {Enforce, Namespace} = Import;
  Enforce.named(arguments, {str: '!string', pathParameters: '!object'});
  return Namespace.EndpointsBase.utils.interpolate(
    Namespace.EndpointsBase.utils.translateToTemplate(str),
    pathParameters
  );
}

/**
 * Returns service with oauth, for example for service accounts created on Google console
 * @see EndpointsBase_.googOauthService
 * @param {String} service - any name
 * @param {String} email - issuer email
 * @param {String} privateKey - from credentials json
 * @param {String[]} scopes
 * @return {Oauth}
 */
function makeGoogOauthService (service, email, privateKey, scopes) {
  const {Enforce, Namespace} = Import;
  Enforce.positional(arguments, {service: '!string', email: '!string', privateKey: '!string', scopes: '!array'}, '$_makeGoogOauthService');
  return Namespace.EndpointsBase.googOauthService({service, email, privateKey, scopes});
}

/**

 * This creates an endpoint in which has custom oauth information, such as that needed for interacting with service that operates on a service account. The first four parameters need to be available in discovery
 * @see EndpointsBase_.discovery
 * @param {String} name
 * @param {String} version
 * @param {String} resource
 * @param {String} method
 * @param {Oauth} oauth
 * @return {Endpoint}
 */
function createGoogEndpointWithOauth (name, version, resource, method, oauth) {
  const {Enforce, Namespace} = Import;
  Enforce.positional(arguments, {name: '!string', version: '!string', resource: '!string', method: '!string', oauth: 'any'}, '$_createGoogEndpointWithOauth');
  return Namespace.EndpointsBase.discovery({name, version, resource, method}, {oauth});
}

/**
 * Simple interface for a get request, returns the response. If an error was found, it returns with error property. The parameters follow the same conventions as in UrlFetch.fetch(url, options).
 * @param {String} url
 * @param {Object} options -
 * @return {Object}
 * @example
const result = Endpoints.get('https://example.com/s', {query: {s: 'searchstr'}});
Logger.log(result);  {error: {message:'404'}}
 */
function get (url, options={}) {
  return createRequest('get', {url}, options).fetch().json;
}

/**
 * Simple interface for a post request, returns the response. If an error was found, it returns with error property. The parameters follow the same conventions as in UrlFetch.fetch(url, options).
 * @param {String} url
 * @param {Object} options -
 * @return {Object}
 * @example
const result = Endpoints.post('https://example.com/s', {payload: {password: 'password'}});
Logger.log(result);  {error: {message:'404'}}
 */
function post (url, options={}) {
  return createRequest('post', {url}, options).fetch().json;
}


/**
 * Returns object which you can use add requests, eventually calling fetchAll to use UrlFetchApp.fetchAll to execute concurrently
 * @return {Batch}
 */
function batch () {
  const {Namespace} = Import;
  return new Namespace.Batch();
}