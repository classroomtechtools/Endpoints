/* Bundle as defined from all files in src/modules/*.js */
const Import = Object.create(null);

'use strict';

(function (exports, window) {
// provide global (danger zone)
exports.__window = window;

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * EnforceParameters
   A V8 GAS library which enables the ability for the developer to guarantee that functions receive arguments that match the expected types and values.
   https://github.com/classroomtechtools/EnforceArguments
 *
 * @author Adam Morris classroomtechtools.ctt@gmail.com https://classroomtechtools.com
 * @copyright May 2020
 * @license MIT
 * @version 2.5
 */

function throwError_(message) {
   try {
     throw new Error();
   } catch (e) {
     const stack = e.stack.split(' at ').slice(5).join(' at ');
     throw new TypeError(message + ': ' + stack);
   }

}

class Enforce_ {
  constructor (params, name) {
    /**
     * Save the name and param object
     * converting values to lowercase
     * @param {String} name
     * @param {Object<String>} params
     */
    this.name = name;
    const required = this.required = [];
    this.params = Object.entries(params).reduce(
      function (acc, [key, value]) {
        const type_ = typeof value;
        if (type_ === 'function') { // assume it's a class
          acc[key] = value;
        } else if (type_ === 'string') {
          if (value[0] === '!') {
            required.push(key);
            acc[key] = value.slice(1).toLowerCase();
          } else {
            acc[key] = value.toLowerCase();
          }
        } else {
          throw new Error(`Passed unknown value ${value}`);
        }
        return acc;
      }, {}
    );
  }

  static new (...params) {
    return new Enforce_(...params);
  }

  get req() {
    throwError_(`${this.name} is missing a required argument`);
  }

  extra(kwargs) {
    if (Object.entries(kwargs).length > 0)
      throwError_(`Unknown parameter(s) passed to ${this.name}: ${Object.keys(kwargs)}`);
  }

  enforceRequiredParams (passed) {
    const missing = this.required.filter(x => !passed.includes(x));
    if (missing.length > 0)
      throwError_(`Required arguments in ${this.name} not recieved: ${missing}`);
  }

  enforceNamed (args) {
    /**
     * Takes args in format of destructured arguments ([0] => {name, value}) and does typechecks, required checks, and arity checks
     */
    const named = {};
    for (const key in args) {
      for (const name in args[key]) {
        named[name] = args[key][name];
      }
    }
    this.typecheck(named, true, true);  // typecheck for named means we need to ensure no undefined and no extra

    return named;
  }

  enforcePositional (args) {
    /**
     * Take args in format of positional arguments ([0] => value), convert them to format for typecheck
     * This works because javascript objects, as long as all of the keys are non-numerical (which we can assume)
     *   retain the order by insertion
     */
    if (args === undefined) throwError_('Pass "arguments" to  enforcePositional');
    const keys = Object.keys(this.params);

    // convert positional to required format by typecheck
    const named = keys.reduce(
      (acc, key, index) => {
        if (index >= args.length) return acc;
        acc[key] = args[index];
        return acc;
      }, {}
    );

    this.typecheck(named, false, false);  // typecheck for positional means undefined needs to squeak through, check for extra is done here instead

    // Now check for arity as this will be missed in above
    if (args.length > keys.length) throwError_(`Too many arguments to ${this.name}. Recieved ${args.length} but expected ${Object.keys(this.params).length}`);

    return named;
  }

  /**
   * Validates args in key => value format
   */
  typecheck(argObj, checkUndefined=true, checkExtra=true) {
    this.enforceRequiredParams(Object.keys(argObj));

    for (const prop in this.params) {
      if (!argObj.hasOwnProperty(prop)) continue;
      const av = argObj[prop], klass = this.params[prop];  // actual value, klass (either passed directly or converted from instance)
      if (klass === null || av == null) continue;       // ensure all null values are not subject to checks
      if (av === undefined) {
        if (checkUndefined) throwError_(`"undefined" was passed to ${this.name} for ${prop}`);
        continue;
      }
      const at = typeof av,    et = this.params[prop];     // actual type, expected type
      if (et === 'any') continue;  // type of 'any' special meaning is to skip it
      if (typeof et === 'function') {
        if (!(av instanceof klass)) throwError_(`Expected instance of class ${this.params[prop].name} in ${this.name} but got ${av.constructor.name} instead`);
        continue;
      }
      if (et === 'array') {
        // arrays don't respond to typeof why javascript why
        if (!Array.isArray(argObj[prop])) throwError_(`Type mismatch in ${this.name}: "${prop}". Expected array but got ${at}`);
      } else if (at !== et) {
        throwError_(`Type mismatch in ${this.name}: "${prop}". Expected ${this.params[prop]} but got ${av} instead`);
      }
    }

    if (checkExtra) {
      // this is an option because positional arguments need a different kind of check for extra, no need to go here
      const paramSet = new Set(Object.keys(this.params));
      const extra = Object.keys(argObj).filter(x => !paramSet.has(x)).reduce(
        function (acc, key) {
          acc[key] = argObj[key];
          return acc;
        }, {}
      );
      this.extra(extra);
    }
  }

  static selfcheck (args) {
    const Me = Enforce_.new({parameters: '!object', name: '!string'}, 'Enforce.create');
    Me.enforcePositional(args);
  }
}


/**
 * @param {String} name
 * @param {Object} parameters
 * @return {EnforceObject}
 */
function create (parameters, name) {
  /**
   * Parameters is an object whose keys are parameters in the function you are augmenting.
   * Values determine the type, one of {number, string, boolean, object, any, array}
   *   (to indicate an instance of a class, value can be Class)
   * @example Enforce.create({id: '!number', name: '!string'}, '<name>');
   */
  if (name === null) throwError_('Enforce.create "name" cannot be null did you mean empty string instead?');
  if (parameters === null) throwError_('Enforce.create "parameters" cannot be null');
  Enforce_.selfcheck(arguments);
  return Enforce_.new(parameters, name);
}

/**
 * @param {Array} arguments
 * @param {Object} parameters
 * @parma {String} comment
 */
function named (args, parameters, comment) {
  if (parameters === undefined || typeof parameters !== 'object') throwError_("Enforce.named needs parameters as object");
  comment = comment || '<>';
  const him = Enforce_.new(parameters, comment);
  return him.enforceNamed(args);
}

/**
 * @param {Array} arguments
 * @param {Object} parameters
 * @parma {String} comment
 */
function positional (args, parameters, comment) {
  if (parameters === undefined || typeof parameters !== 'object') throwError_("Enforce.positional needs parameters as object");
  comment = comment || '<>';
  const him = Enforce_.new(parameters, comment);
  return him.enforcePositional(args);
}

const Enforce = {create, named, positional};

// install it globally if window global is available
try {window.Enforce = Enforce;} catch (e) {}

// Copyright 2014 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @file Contains the methods exposed by the library, and performs
 * any required setup.
 */

/**
 * The supported formats for the returned OAuth2 token.
 * @enum {string}
 */
var TOKEN_FORMAT = {
  /** JSON format, for example <code>{"access_token": "..."}</code> **/
  JSON: 'application/json',
  /** Form URL-encoded, for example <code>access_token=...</code> **/
  FORM_URL_ENCODED: 'application/x-www-form-urlencoded'
};

/**
 * Creates a new OAuth2 service with the name specified. It's usually best to
 * create and configure your service once at the start of your script, and then
 * reference them during the different phases of the authorization flow.
 * @param {string} serviceName The name of the service.
 * @return {Service_} The service object.
 */
function createService(serviceName) {
  return new Service_(serviceName);
}

/**
 * Returns the redirect URI that will be used for a given script. Often this URI
 * needs to be entered into a configuration screen of your OAuth provider.
 * @param {string} [optScriptId] The script ID of your script, which can be
 *     found in the Script Editor UI under "File > Project properties". Defaults
 *     to the script ID of the script being executed.
 * @return {string} The redirect URI.
 */
function getRedirectUri(optScriptId) {
  var scriptId = optScriptId || ScriptApp.getScriptId();
  return 'https://script.google.com/macros/d/' + encodeURIComponent(scriptId) +
      '/usercallback';
}

if (typeof module === 'object') {
  module.exports = {
    createService: createService,
    getRedirectUri: getRedirectUri,
    TOKEN_FORMAT: TOKEN_FORMAT
  };
}

// Copyright 2014 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @file Contains the Service_ class.
 */

// Disable JSHint warnings for the use of eval(), since it's required to prevent
// scope issues in Apps Script.
// jshint evil:true

/**
 * Creates a new OAuth2 service.
 * @param {string} serviceName The name of the service.
 * @constructor
 */
var Service_ = function(serviceName) {
  validate_({
    'Service name': serviceName
  });
  this.serviceName_ = serviceName;
  this.params_ = {};
  this.tokenFormat_ = TOKEN_FORMAT.JSON;
  this.tokenHeaders_ = null;
  this.expirationMinutes_ = 60;
};

/**
 * The number of seconds before a token actually expires to consider it expired
 * and refresh it.
 * @type {number}
 * @private
 */
Service_.EXPIRATION_BUFFER_SECONDS_ = 60;

/**
 * The number of milliseconds that a token should remain in the cache.
 * @type {number}
 * @private
 */
Service_.LOCK_EXPIRATION_MILLISECONDS_ = 30 * 1000;

/**
 * Sets the service's authorization base URL (required). For Google services
 * this URL should be
 * https://accounts.google.com/o/oauth2/auth.
 * @param {string} authorizationBaseUrl The authorization endpoint base URL.
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setAuthorizationBaseUrl = function(authorizationBaseUrl) {
  this.authorizationBaseUrl_ = authorizationBaseUrl;
  return this;
};

/**
 * Sets the service's token URL (required). For Google services this URL should
 * be https://accounts.google.com/o/oauth2/token.
 * @param {string} tokenUrl The token endpoint URL.
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setTokenUrl = function(tokenUrl) {
  this.tokenUrl_ = tokenUrl;
  return this;
};

/**
 * Sets the service's refresh URL. Some OAuth providers require a different URL
 * to be used when generating access tokens from a refresh token.
 * @param {string} refreshUrl The refresh endpoint URL.
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setRefreshUrl = function(refreshUrl) {
  this.refreshUrl_ = refreshUrl;
  return this;
};

/**
 * Sets the format of the returned token. Default: OAuth2.TOKEN_FORMAT.JSON.
 * @param {OAuth2.TOKEN_FORMAT} tokenFormat The format of the returned token.
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setTokenFormat = function(tokenFormat) {
  this.tokenFormat_ = tokenFormat;
  return this;
};

/**
 * Sets the additional HTTP headers that should be sent when retrieving or
 * refreshing the access token.
 * @param {Object.<string,string>} tokenHeaders A map of header names to values.
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setTokenHeaders = function(tokenHeaders) {
  this.tokenHeaders_ = tokenHeaders;
  return this;
};

/**
 * @callback tokenHandler
 * @param tokenPayload {Object} A hash of parameters to be sent to the token
 *     URL.
 * @param tokenPayload.code {string} The authorization code.
 * @param tokenPayload.client_id {string} The client ID.
 * @param tokenPayload.client_secret {string} The client secret.
 * @param tokenPayload.redirect_uri {string} The redirect URI.
 * @param tokenPayload.grant_type {string} The type of grant requested.
 * @returns {Object} A modified hash of parameters to be sent to the token URL.
 */

/**
 * Sets an additional function to invoke on the payload of the access token
 * request.
 * @param {tokenHandler} tokenHandler tokenHandler A function to invoke on the
 *     payload of the request for an access token.
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setTokenPayloadHandler = function(tokenHandler) {
  this.tokenPayloadHandler_ = tokenHandler;
  return this;
};

/**
 * Sets the name of the authorization callback function (required). This is the
 * function that will be called when the user completes the authorization flow
 * on the service provider's website. The callback accepts a request parameter,
 * which should be passed to this service's <code>handleCallback()</code> method
 * to complete the process.
 * @param {string} callbackFunctionName The name of the callback function.
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setCallbackFunction = function(callbackFunctionName) {
  this.callbackFunctionName_ = callbackFunctionName;
  return this;
};

/**
 * Sets the client ID to use for the OAuth flow (required). You can create
 * client IDs in the "Credentials" section of a Google Developers Console
 * project. Although you can use any project with this library, it may be
 * convinient to use the project that was created for your script. These
 * projects are not visible if you visit the console directly, but you can
 * access it by click on the menu item "Resources > Advanced Google services" in
 * the Script Editor, and then click on the link "Google Developers Console" in
 * the resulting dialog.
 * @param {string} clientId The client ID to use for the OAuth flow.
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setClientId = function(clientId) {
  this.clientId_ = clientId;
  return this;
};

/**
 * Sets the client secret to use for the OAuth flow (required). See the
 * documentation for <code>setClientId()</code> for more information on how to
 * create client IDs and secrets.
 * @param {string} clientSecret The client secret to use for the OAuth flow.
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setClientSecret = function(clientSecret) {
  this.clientSecret_ = clientSecret;
  return this;
};

/**
 * Sets the property store to use when persisting credentials (required). In
 * most cases this should be user properties, but document or script properties
 * may be appropriate if you want to share access across users.
 * @param {PropertiesService.Properties} propertyStore The property store to use
 *     when persisting credentials.
 * @return {Service_} This service, for chaining.
 * @see https://developers.google.com/apps-script/reference/properties/
 */
Service_.prototype.setPropertyStore = function(propertyStore) {
  this.propertyStore_ = propertyStore;
  return this;
};

/**
 * Sets the cache to use when persisting credentials (optional). Using a cache
 * will reduce the need to read from the property store and may increase
 * performance. In most cases this should be a private cache, but a public cache
 * may be appropriate if you want to share access across users.
 * @param {CacheService.Cache} cache The cache to use when persisting
 *     credentials.
 * @return {Service_} This service, for chaining.
 * @see https://developers.google.com/apps-script/reference/cache/
 */
Service_.prototype.setCache = function(cache) {
  this.cache_ = cache;
  return this;
};

/**
 * Sets the lock to use when checking and refreshing credentials (optional).
 * Using a lock will ensure that only one execution will be able to access the
 * stored credentials at a time. This can prevent race conditions that arise
 * when two executions attempt to refresh an expired token.
 * @param {LockService.Lock} lock The lock to use when accessing credentials.
 * @return {Service_} This service, for chaining.
 * @see https://developers.google.com/apps-script/reference/lock/
 */
Service_.prototype.setLock = function(lock) {
  this.lock_ = lock;
  return this;
};

/**
 * Sets the scope or scopes to request during the authorization flow (optional).
 * If the scope value is an array it will be joined using the separator before
 * being sent to the server, which is is a space character by default.
 * @param {string|Array.<string>} scope The scope or scopes to request.
 * @param {string} [optSeparator] The optional separator to use when joining
 *     multiple scopes. Default: space.
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setScope = function(scope, optSeparator) {
  var separator = optSeparator || ' ';
  this.params_.scope = Array.isArray(scope) ? scope.join(separator) : scope;
  return this;
};

/**
 * Sets an additional parameter to use when constructing the authorization URL
 * (optional). See the documentation for your service provider for information
 * on what parameter values they support.
 * @param {string} name The parameter name.
 * @param {string} value The parameter value.
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setParam = function(name, value) {
  this.params_[name] = value;
  return this;
};

/**
 * Sets the private key to use for Service Account authorization.
 * @param {string} privateKey The private key.
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setPrivateKey = function(privateKey) {
  this.privateKey_ = privateKey;
  return this;
};

/**
 * Sets the issuer (iss) value to use for Service Account authorization.
 * If not set the client ID will be used instead.
 * @param {string} issuer This issuer value
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setIssuer = function(issuer) {
  this.issuer_ = issuer;
  return this;
};

/**
 * Sets additional JWT claims to use for Service Account authorization.
 * @param {Object.<string,string>} additionalClaims The additional claims, as
 *     key-value pairs.
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setAdditionalClaims = function(additionalClaims) {
  this.additionalClaims_ = additionalClaims;
  return this;
};

/**
 * Sets the subject (sub) value to use for Service Account authorization.
 * @param {string} subject This subject value
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setSubject = function(subject) {
  this.subject_ = subject;
  return this;
};

/**
 * Sets number of minutes that a token obtained through Service Account
 * authorization should be valid. Default: 60 minutes.
 * @param {string} expirationMinutes The expiration duration in minutes.
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setExpirationMinutes = function(expirationMinutes) {
  this.expirationMinutes_ = expirationMinutes;
  return this;
};

/**
 * Sets the OAuth2 grant_type to use when obtaining an access token. This does
 * not need to be set when using either the authorization code flow (AKA
 * 3-legged OAuth) or the service account flow. The most common usage is to set
 * it to "client_credentials" and then also set the token headers to include
 * the Authorization header required by the OAuth2 provider.
 * @param {string} grantType The OAuth2 grant_type value.
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setGrantType = function(grantType) {
  this.grantType_ = grantType;
  return this;
};

/**
 * Sets the URI to redirect to when the OAuth flow has completed. By default the
 * library will provide this value automatically, but in some rare cases you may
 * need to override it.
 * @param {string} redirectUri The redirect URI.
 * @return {Service_} This service, for chaining.
 */
Service_.prototype.setRedirectUri = function(redirectUri) {
  this.redirectUri_ = redirectUri;
  return this;
};

/**
 * Returns the redirect URI that will be used for this service. Often this URI
 * needs to be entered into a configuration screen of your OAuth provider.
 * @return {string} The redirect URI.
 */
Service_.prototype.getRedirectUri = function() {
  return this.redirectUri_ || getRedirectUri();
};

/**
 * Gets the authorization URL. The first step in getting an OAuth2 token is to
 * have the user visit this URL and approve the authorization request. The
 * user will then be redirected back to your application using callback function
 * name specified, so that the flow may continue.
 * @param {Object} optAdditionalParameters Additional parameters that should be
 *     stored in the state token and made available in the callback function.
 * @return {string} The authorization URL.
 */
Service_.prototype.getAuthorizationUrl = function(optAdditionalParameters) {
  validate_({
    'Client ID': this.clientId_,
    'Callback function name': this.callbackFunctionName_,
    'Authorization base URL': this.authorizationBaseUrl_
  });

  var stateTokenBuilder = eval('Script' + 'App').newStateToken()
      .withMethod(this.callbackFunctionName_)
      .withArgument('serviceName', this.serviceName_)
      .withTimeout(3600);
  if (optAdditionalParameters) {
    Object.keys(optAdditionalParameters).forEach(function(key) {
      stateTokenBuilder.withArgument(key, optAdditionalParameters[key]);
    });
  }
  var params = {
    client_id: this.clientId_,
    response_type: 'code',
    redirect_uri: this.getRedirectUri(),
    state: stateTokenBuilder.createToken()
  };
  params = extend_(params, this.params_);
  return buildUrl_(this.authorizationBaseUrl_, params);
};

/**
 * Completes the OAuth2 flow using the request data passed in to the callback
 * function.
 * @param {Object} callbackRequest The request data recieved from the callback
 *     function.
 * @return {boolean} True if authorization was granted, false if it was denied.
 */
Service_.prototype.handleCallback = function(callbackRequest) {
  var code = callbackRequest.parameter.code;
  var error = callbackRequest.parameter.error;
  if (error) {
    if (error == 'access_denied') {
      return false;
    } else {
      throw new Error('Error authorizing token: ' + error);
    }
  }
  validate_({
    'Client ID': this.clientId_,
    'Client Secret': this.clientSecret_,
    'Token URL': this.tokenUrl_
  });
  var payload = {
    code: code,
    client_id: this.clientId_,
    client_secret: this.clientSecret_,
    redirect_uri: this.getRedirectUri(),
    grant_type: 'authorization_code'
  };
  var token = this.fetchToken_(payload);
  this.saveToken_(token);
  return true;
};

/**
 * Determines if the service has access (has been authorized and hasn't
 * expired). If offline access was granted and the previous token has expired
 * this method attempts to generate a new token.
 * @return {boolean} true if the user has access to the service, false
 *     otherwise.
 */
Service_.prototype.hasAccess = function() {
  var token = this.getToken();
  if (token && !this.isExpired_(token)) return true; // Token still has access.
  var canGetToken = (token && this.canRefresh_(token)) ||
      this.privateKey_ || this.grantType_;
  if (!canGetToken) return false;

  return this.lockable_(function() {
    // Get the token again, bypassing the local memory cache.
    token = this.getToken(true);
    // Check to see if the token is no longer missing or expired, as another
    // execution may have refreshed it while we were waiting for the lock.
    if (token && !this.isExpired_(token)) return true; // Token now has access.
    try {
      if (token && this.canRefresh_(token)) {
        this.refresh();
        return true;
      } else if (this.privateKey_) {
        this.exchangeJwt_();
        return true;
      } else if (this.grantType_) {
        this.exchangeGrant_();
        return true;
      } else {
        // This should never happen, since canGetToken should have been false
        // earlier.
        return false;
      }
    } catch (e) {
      this.lastError_ = e;
      return false;
    }
  });
};

/**
 * Gets an access token for this service. This token can be used in HTTP
 * requests to the service's endpoint. This method will throw an error if the
 * user's access was not granted or has expired.
 * @return {string} An access token.
 */
Service_.prototype.getAccessToken = function() {
  if (!this.hasAccess()) {
    throw new Error('Access not granted or expired.');
  }
  var token = this.getToken();
  return token.access_token;
};

/**
 * Gets an id token for this service. This token can be used in HTTP
 * requests to the service's endpoint. This method will throw an error if the
 * user's access was not granted or has expired.
 * @return {string} An id token.
 */
Service_.prototype.getIdToken = function() {
  if (!this.hasAccess()) {
    throw new Error('Access not granted or expired.');
  }
  var token = this.getToken();
  return token.id_token;
};

/**
 * Resets the service, removing access and requiring the service to be
 * re-authorized.
 */
Service_.prototype.reset = function() {
  this.getStorage().removeValue(null);
};

/**
 * Gets the last error that occurred this execution when trying to automatically
 * refresh or generate an access token.
 * @return {Exception} An error, if any.
 */
Service_.prototype.getLastError = function() {
  return this.lastError_;
};

/**
 * Fetches a new token from the OAuth server.
 * @param {Object} payload The token request payload.
 * @param {string} [optUrl] The URL of the token endpoint.
 * @return {Object} The parsed token.
 */
Service_.prototype.fetchToken_ = function(payload, optUrl) {
  // Use the configured token URL unless one is specified.
  var url = optUrl || this.tokenUrl_;
  var headers = {
    'Accept': this.tokenFormat_
  };
  if (this.tokenHeaders_) {
    headers = extend_(headers, this.tokenHeaders_);
  }
  if (this.tokenPayloadHandler_) {
    payload = this.tokenPayloadHandler_(payload);
  }
  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: headers,
    payload: payload,
    muteHttpExceptions: true
  });
  return this.getTokenFromResponse_(response);
};

/**
 * Gets the token from a UrlFetchApp response.
 * @param {UrlFetchApp.HTTPResponse} response The response object.
 * @return {Object} The parsed token.
 * @throws If the token cannot be parsed or the response contained an error.
 * @private
 */
Service_.prototype.getTokenFromResponse_ = function(response) {
  var token = this.parseToken_(response.getContentText());
  var resCode = response.getResponseCode();
  if ( resCode < 200 || resCode >= 300 || token.error) {
    var reason = [
      token.error,
      token.message,
      token.error_description,
      token.error_uri
    ].filter(Boolean).map(function(part) {
      return typeof(part) == 'string' ? part : JSON.stringify(part);
    }).join(', ');
    if (!reason) {
      reason = resCode + ': ' + JSON.stringify(token);
    }
    throw new Error('Error retrieving token: ' + reason);
  }
  return token;
};

/**
 * Parses the token using the service's token format.
 * @param {string} content The serialized token content.
 * @return {Object} The parsed token.
 * @private
 */
Service_.prototype.parseToken_ = function(content) {
  var token;
  if (this.tokenFormat_ == TOKEN_FORMAT.JSON) {
    try {
      token = JSON.parse(content);
    } catch (e) {
      throw new Error('Token response not valid JSON: ' + e);
    }
  } else if (this.tokenFormat_ == TOKEN_FORMAT.FORM_URL_ENCODED) {
    token = content.split('&').reduce(function(result, pair) {
      var parts = pair.split('=');
      result[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
      return result;
    }, {});
  } else {
    throw new Error('Unknown token format: ' + this.tokenFormat_);
  }
  token.granted_time = getTimeInSeconds_(new Date());
  return token;
};

/**
 * Refreshes a token that has expired. This is only possible if offline access
 * was requested when the token was authorized.
 */
Service_.prototype.refresh = function() {
  validate_({
    'Client ID': this.clientId_,
    'Client Secret': this.clientSecret_,
    'Token URL': this.tokenUrl_
  });

  this.lockable_(function() {
    var token = this.getToken();
    if (!token.refresh_token) {
      throw new Error('Offline access is required.');
    }
    var payload = {
        refresh_token: token.refresh_token,
        client_id: this.clientId_,
        client_secret: this.clientSecret_,
        grant_type: 'refresh_token'
    };
    var newToken = this.fetchToken_(payload, this.refreshUrl_);
    if (!newToken.refresh_token) {
      newToken.refresh_token = token.refresh_token;
    }
    this.saveToken_(newToken);
  });
};

/**
 * Gets the storage layer for this service, used to persist tokens.
 * Custom values associated with the service can be stored here as well.
 * The key <code>null</code> is used to to store the token and should not
 * be used.
 * @return {Storage} The service's storage.
 */
Service_.prototype.getStorage = function() {
  if (!this.storage_) {
    var prefix = 'oauth2.' + this.serviceName_;
    this.storage_ = new Storage_(prefix, this.propertyStore_, this.cache_);
  }
  return this.storage_;
};

/**
 * Saves a token to the service's property store and cache.
 * @param {Object} token The token to save.
 * @private
 */
Service_.prototype.saveToken_ = function(token) {
  this.getStorage().setValue(null, token);
};

/**
 * Gets the token from the service's property store or cache.
 * @param {boolean?} optSkipMemoryCheck If true, bypass the local memory cache
 *     when fetching the token.
 * @return {Object} The token, or null if no token was found.
 */
Service_.prototype.getToken = function(optSkipMemoryCheck) {
  // Gets the stored value under the null key, which is reserved for the token.
  return this.getStorage().getValue(null, optSkipMemoryCheck);
};

/**
 * Determines if a retrieved token is still valid.
 * @param {Object} token The token to validate.
 * @return {boolean} True if it has expired, false otherwise.
 * @private
 */
Service_.prototype.isExpired_ = function(token) {
  var expiresIn = token.expires_in_sec || token.expires_in || token.expires;
  if (!expiresIn) {
    return false;
  } else {
    var expiresTime = token.granted_time + Number(expiresIn);
    var now = getTimeInSeconds_(new Date());
    return expiresTime - now < Service_.EXPIRATION_BUFFER_SECONDS_;
  }
};

/**
 * Determines if a retrieved token can be refreshed.
 * @param {Object} token The token to inspect.
 * @return {boolean} True if it can be refreshed, false otherwise.
 * @private
 */
Service_.prototype.canRefresh_ = function(token) {
  if (!token.refresh_token) return false;
  var expiresIn = token.refresh_token_expires_in;
  if (!expiresIn) {
    return true;
  } else {
    var expiresTime = token.granted_time + Number(expiresIn);
    var now = getTimeInSeconds_(new Date());
    return expiresTime - now > Service_.EXPIRATION_BUFFER_SECONDS_;
  }
};

/**
 * Uses the service account flow to exchange a signed JSON Web Token (JWT) for
 * an access token.
 * @private
 */
Service_.prototype.exchangeJwt_ = function() {
  validate_({
    'Token URL': this.tokenUrl_
  });
  var jwt = this.createJwt_();
  var payload = {
    assertion: jwt,
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer'
  };
  var token = this.fetchToken_(payload);
  this.saveToken_(token);
};

/**
 * Creates a signed JSON Web Token (JWT) for use with Service Account
 * authorization.
 * @return {string} The signed JWT.
 * @private
 */
Service_.prototype.createJwt_ = function() {
  validate_({
    'Private key': this.privateKey_,
    'Token URL': this.tokenUrl_,
    'Issuer or Client ID': this.issuer_ || this.clientId_
  });
  var header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  var now = new Date();
  var expires = new Date(now.getTime());
  expires.setMinutes(expires.getMinutes() + this.expirationMinutes_);
  var claimSet = {
    iss: this.issuer_ || this.clientId_,
    aud: this.tokenUrl_,
    exp: Math.round(expires.getTime() / 1000),
    iat: Math.round(now.getTime() / 1000)
  };
  if (this.subject_) {
    claimSet.sub = this.subject_;
  }
  if (this.params_.scope) {
    claimSet.scope = this.params_.scope;
  }
  if (this.additionalClaims_) {
    var additionalClaims = this.additionalClaims_;
    Object.keys(additionalClaims).forEach(function(key) {
      claimSet[key] = additionalClaims[key];
    });
  }
  var toSign = Utilities.base64EncodeWebSafe(JSON.stringify(header)) + '.' +
      Utilities.base64EncodeWebSafe(JSON.stringify(claimSet));
  var signatureBytes =
      Utilities.computeRsaSha256Signature(toSign, this.privateKey_);
  var signature = Utilities.base64EncodeWebSafe(signatureBytes);
  return toSign + '.' + signature;
};

/**
 * Locks access to a block of code if a lock has been set on this service.
 * @param {function} func The code to execute.
 * @return {*} The result of the code block.
 * @private
 */
Service_.prototype.lockable_ = function(func) {
  var releaseLock = false;
  if (this.lock_ && !this.lock_.hasLock()) {
    this.lock_.waitLock(Service_.LOCK_EXPIRATION_MILLISECONDS_);
    releaseLock = true;
  }
  var result = func.apply(this);
  if (this.lock_ && releaseLock) {
    this.lock_.releaseLock();
  }
  return result;
};

/**
 * Obtain an access token using the custom grant type specified. Most often
 * this will be "client_credentials", and a client ID and secret are set an
 * "Authorization: Basic ..." header will be added using those values.
 */
Service_.prototype.exchangeGrant_ = function() {
  validate_({
    'Grant Type': this.grantType_,
    'Token URL': this.tokenUrl_
  });
  var payload = {
    grant_type: this.grantType_
  };
  payload = extend_(payload, this.params_);

  // For the client_credentials grant type, add a basic authorization header:
  // - If the client ID and client secret are set.
  // - No authorization header has been set yet.
  var lowerCaseHeaders = toLowerCaseKeys_(this.tokenHeaders_);
  if (this.grantType_ === 'client_credentials' &&
      this.clientId_ &&
      this.clientSecret_ &&
      (!lowerCaseHeaders || !lowerCaseHeaders.authorization)) {
    this.tokenHeaders_ = this.tokenHeaders_ || {};
    this.tokenHeaders_.authorization = 'Basic ' +
        Utilities.base64Encode(this.clientId_ + ':' + this.clientSecret_);
  }

  var token = this.fetchToken_(payload);
  this.saveToken_(token);
};

// Copyright 2017 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @file Contains classes used to persist data and access it.
 */

/**
 * Creates a new Storage_ instance, which is used to persist OAuth tokens and
 * related information.
 * @param {string} prefix The prefix to use for keys in the properties and
 *     cache.
 * @param {PropertiesService.Properties} optProperties The optional properties
 *     instance to use.
 * @param {CacheService.Cache} [optCache] The optional cache instance to use.
 * @constructor
 */
function Storage_(prefix, optProperties, optCache) {
  this.prefix_ = prefix;
  this.properties_ = optProperties;
  this.cache_ = optCache;
  this.memory_ = {};
}

/**
 * The TTL for cache entries, in seconds.
 * @type {number}
 * @private
 */
Storage_.CACHE_EXPIRATION_TIME_SECONDS = 21600; // 6 hours.

/**
 * The special value to use in the cache to indicate that there is no value.
 * @type {string}
 * @private
 */
Storage_.CACHE_NULL_VALUE = '__NULL__';

/**
 * Gets a stored value.
 * @param {string} key The key.
 * @param {boolean?} optSkipMemoryCheck Whether to bypass the local memory cache
 *     when fetching the value (the default is false).
 * @return {*} The stored value.
 */
Storage_.prototype.getValue = function(key, optSkipMemoryCheck) {
  var prefixedKey = this.getPrefixedKey_(key);
  var jsonValue;
  var value;

  if (!optSkipMemoryCheck) {
    // Check in-memory cache.
    if (value = this.memory_[key]) {
      if (value === Storage_.CACHE_NULL_VALUE) {
        return null;
      }
      return value;
    }
  }

  // Check cache.
  if (this.cache_ && (jsonValue = this.cache_.get(prefixedKey))) {
    value = JSON.parse(jsonValue);
    this.memory_[key] = value;
    if (value === Storage_.CACHE_NULL_VALUE) {
      return null;
    }
    return value;
  }

  // Check properties.
  if (this.properties_ &&
      (jsonValue = this.properties_.getProperty(prefixedKey))) {
    if (this.cache_) {
      this.cache_.put(prefixedKey,
          jsonValue, Storage_.CACHE_EXPIRATION_TIME_SECONDS);
    }
    value = JSON.parse(jsonValue);
    this.memory_[key] = value;
    return value;
  }

  // Not found. Store a special null value in the memory and cache to reduce
  // hits on the PropertiesService.
  this.memory_[key] = Storage_.CACHE_NULL_VALUE;
  if (this.cache_) {
    this.cache_.put(prefixedKey, JSON.stringify(Storage_.CACHE_NULL_VALUE),
        Storage_.CACHE_EXPIRATION_TIME_SECONDS);
  }
  return null;
};

/**
 * Stores a value.
 * @param {string} key The key.
 * @param {*} value The value.
 */
Storage_.prototype.setValue = function(key, value) {
  var prefixedKey = this.getPrefixedKey_(key);
  var jsonValue = JSON.stringify(value);
  if (this.properties_) {
    this.properties_.setProperty(prefixedKey, jsonValue);
  }
  if (this.cache_) {
    this.cache_.put(prefixedKey, jsonValue,
        Storage_.CACHE_EXPIRATION_TIME_SECONDS);
  }
  this.memory_[key] = value;
};

/**
 * Removes a stored value.
 * @param {string} key The key.
 */
Storage_.prototype.removeValue = function(key) {
  var prefixedKey = this.getPrefixedKey_(key);
  if (this.properties_) {
    this.properties_.deleteProperty(prefixedKey);
  }
  if (this.cache_) {
    this.cache_.remove(prefixedKey);
  }
  delete this.memory_[key];
};

/**
 * Gets a key with the prefix applied.
 * @param {string} key The key.
 * @return {string} The key with the prefix applied.
 * @private
 */
Storage_.prototype.getPrefixedKey_ = function(key) {
  if (key) {
    return this.prefix_ + '.' + key;
  } else {
    return this.prefix_;
  }
};

// Copyright 2014 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @file Contains utility methods used by the library.
 */

/* exported buildUrl_ */
/**
 * Builds a complete URL from a base URL and a map of URL parameters.
 * @param {string} url The base URL.
 * @param {Object.<string, string>} params The URL parameters and values.
 * @return {string} The complete URL.
 * @private
 */
function buildUrl_(url, params) {
  var paramString = Object.keys(params).map(function(key) {
    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
  }).join('&');
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + paramString;
}

/* exported validate_ */
/**
 * Validates that all of the values in the object are non-empty. If an empty
 * value is found, and error is thrown using the key as the name.
 * @param {Object.<string, string>} params The values to validate.
 * @private
 */
function validate_(params) {
  Object.keys(params).forEach(function(name) {
    var value = params[name];
    if (!value) {
      throw new Error(name + ' is required.');
    }
  });
}

/* exported getTimeInSeconds_ */
/**
 * Gets the time in seconds, rounded down to the nearest second.
 * @param {Date} date The Date object to convert.
 * @return {Number} The number of seconds since the epoch.
 * @private
 */
function getTimeInSeconds_(date) {
  return Math.floor(date.getTime() / 1000);
}

/* exported extend_ */
/**
 * Copy all of the properties in the source objects over to the
 * destination object, and return the destination object.
 * @param {Object} destination The combined object.
 * @param {Object} source The object who's properties are copied to the
 *     destination.
 * @return {Object} A combined object with the desination and source
 *     properties.
 * @see http://underscorejs.org/#extend
 */
function extend_(destination, source) {
  var keys = Object.keys(source);
  for (var i = 0; i < keys.length; ++i) {
    destination[keys[i]] = source[keys[i]];
  }
  return destination;
}

/* exported toLowerCaseKeys_ */
/**
 * Gets a copy of an object with all the keys converted to lower-case strings.
 *
 * @param {Object} obj The object to copy.
 * @return {Object} a shallow copy of the object with all lower-case keys.
 */
function toLowerCaseKeys_(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  // For each key in the source object, add a lower-case version to a new
  // object, and return it.
  return Object.keys(obj).reduce(function(result, k) {
    result[k.toLowerCase()] = obj[k];
    return result;
  }, {});
}

const OAuth2 = {createService};

/**
 * Class used for cases where oauth is send as "me", where `SciptApp.getOAuthToken` is appropriate auth. The token is actually retrieved on the call itself, rather than at endpoint creation (otherwise it might timeout)
 * @property {String} token
 */
class Oauth {
  get token () {
    return ScriptApp.getOAuthToken();
  }
}


/**
 * An object that represents a collection of requests that will be asynchronously retrieved. Use included methods `add` and `fetchAll` to interact with APIs more than one at a time.
 * @class
 */
class Batch {
  /**
   * Usually created with call to `Endpoints.batch`
   * @return {Batch}
   * @example
const batch = Endpoints.batch();
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
    this.queue.push(request);
  }

  /**
   * Use UrlFetchApp to reach out to the internet. Returns Response objects in same order as requests. You can use `json` property to get the data result, but is not done for you automatically. Note that Response objects also have `request` property, which can be used to debug, or rebuild the original request, if necessary.
   * @return {Response[]}
   * @example
// Make list of response jsons
batch.fetchAll().map(response => response.json);
   * @example
// Make list of original request urls
batch.fetchAll().map(response => response.request.url);
   */
  fetchAll () {
    return UrlFetchApp.fetchAll(
      this.queue.map(
        request => {
          const {params} = request.getParams({embedUrl: true});
          return params;
        }
      )
    ).map( (response, idx) => {
        const request = this.queue[idx];
        return new Response({response, request});
      });
  }
}


/**
 * DiscoveryCache - Used internally to save in cache the various url paths to endpoints with the Google Discovery Service. Fun fact: It actually uses this library's `httpget` to interact with `https://www.googleapis.com/discovery/v1/apis/`
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
        console.log({key, fromCache: true});
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
      console.log({key, fromCache: false});
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
 * Request instance. Instances of this class are created with `createRequest`
 */
class Request {

  /**
   * Usually created on your behalf
   * @param {Object} main - the first parameter
   * @param {String} url - the url (normally before query parameters)
   * @param {Any} oauth - oauth object, usually created via Oauth2 lib
   * @param {String} method - http method i.e. 'get' etc
   * @param {Object} headers - http headers
   * @param {Object} query - query parameters
   * @param {Any} mixin - advanced extensibility, added to `this` as second parameter to `Object.assign`
   */
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
  fetch () {
    const {url, params: requestObject} = this.url_params({embedUrl: true});
    let response;
    try {
      response = UrlFetchApp.fetch(url, requestObject);
    } catch (e) {
      response = null;
      throw new Error(e.message, {url, requestObject});
    }
    let resp = new Response({response, request: this});

    // auto-detect ratelimits, try again
    if (resp.hitRateLimit) {
      response = UrlFetchApp.fetch(url, requestObject);
      resp = new Response({response, requestObject});
    }

    return resp;
  }

  /**
   * Alternative to this.url
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
   * @example
const request = Endpoints.createRequest('get', {
  url: 'https://example.com'
});
request.addQuery({p: 'str'});
request.url;  // https://exmaple.com?p=str
   */
  addQuery (obj={}) {
    Enforce.positional(arguments, {obj: 'object'}, 'Request#addQuery');
    for (const [key, value] of Object.entries(obj)) {
      this.query[key] = value;
    }
  }

  /**
   * Adds header
   * @param {Object} obj
   */
  addHeader (obj={}) {
    /**
     * Copies key in obj to headers object so
     */
    Enforce.positional(arguments, {obj: 'object'}, 'Request#addHeader');
    for (const [key, value] of Object.entries(obj)) {
      this.headers[key] = value;
    }
  }

  /**
   * Sets `this.query` to empty object
   */
  clearQuery () {
    this.query = {};
  }

  set fields (value=null) {
    Enforce.positional(arguments, {value: 'string'}, 'Request#set_fields');
    this._fields.push(value);
  }

  /**
   * Pushes value to this.query.fields
   * @param {String} value
   */
  setFields (value) {
    this.fields = value;
  }

  /**
   * Sets _fields to empty array
   */
  clearFields () {
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
  getParams ({embedUrl=false, muteExceptions=true}={}) {
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

}


/**
 * Response objects, created on your behalf. Contains both the actual response object returned by `UrlFetchApp` and the params object that was built and sent to `UrlFetchApp`
 */
class Response {

  /**
   * Response object, created in Request#fetch
   * @param {Object} param
   * @param {Object} param.response
   * @param {Object} param.requestObject
   */
  constructor ({response=null, request=null}={}) {
    Enforce.named(arguments, {response: 'object', request: Namespace.Request}, 'Response#constructor');
    this.response = response;
    this.request = request;

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
      let header_reset_at = this.headers['x-ratelimit-reset'];
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
      this.oauth = new Oauth();
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
  createRequest (method, {url=null, ...pathParams}={}, {query={}, payload={}, headers={}}={}, mixin={}) {
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
    mixin.pathParams = pathParams;

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
  httpget ({...pathParams}={}, {...options}={}, mixin={}) {
    return this.createRequest('get', pathParams, options, mixin);
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

const Namespace = {Endpoint, Response, Batch, Request, Oauth};

exports.Enforce = Enforce;
exports.Namespace = Namespace;

})(Import, this);
try{exports.Import = Import;}catch(e){}
