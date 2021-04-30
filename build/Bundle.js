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
      throwError_(`Either missing required arguments in ${this.name} not recieved: ${missing}, or you passed as a positional argument (expecting destructuring)`);
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
 * @param {Array} args
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
 * @param {Array} args
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

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Built-in value references. */
var Symbol$1 = root.Symbol;

/** Used for built-in method references. */
var objectProto$c = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$9 = objectProto$c.hasOwnProperty;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString$1 = objectProto$c.toString;

/** Built-in value references. */
var symToStringTag$1 = Symbol$1 ? Symbol$1.toStringTag : undefined;

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty$9.call(value, symToStringTag$1),
      tag = value[symToStringTag$1];

  try {
    value[symToStringTag$1] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString$1.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag$1] = tag;
    } else {
      delete value[symToStringTag$1];
    }
  }
  return result;
}

/** Used for built-in method references. */
var objectProto$b = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto$b.toString;

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

/** `Object#toString` result references. */
var nullTag = '[object Null]',
    undefinedTag = '[object Undefined]';

/** Built-in value references. */
var symToStringTag = Symbol$1 ? Symbol$1.toStringTag : undefined;

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

/** `Object#toString` result references. */
var asyncTag = '[object AsyncFunction]',
    funcTag$2 = '[object Function]',
    genTag$1 = '[object GeneratorFunction]',
    proxyTag = '[object Proxy]';

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = baseGetTag(value);
  return tag == funcTag$2 || tag == genTag$1 || tag == asyncTag || tag == proxyTag;
}

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

/** Used for built-in method references. */
var funcProto$1 = Function.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString$1 = funcProto$1.toString;

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to convert.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString$1.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used for built-in method references. */
var funcProto = Function.prototype,
    objectProto$a = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty$8 = objectProto$a.hasOwnProperty;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty$8).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

/* Built-in method references that are verified to be native. */
var WeakMap = getNative(root, 'WeakMap');

/** Built-in value references. */
var objectCreate = Object.create;

/**
 * The base implementation of `_.create` without support for assigning
 * properties to the created object.
 *
 * @private
 * @param {Object} proto The object to inherit from.
 * @returns {Object} Returns the new object.
 */
var baseCreate = (function() {
  function object() {}
  return function(proto) {
    if (!isObject(proto)) {
      return {};
    }
    if (objectCreate) {
      return objectCreate(proto);
    }
    object.prototype = proto;
    var result = new object;
    object.prototype = undefined;
    return result;
  };
}());

/**
 * Copies the values of `source` to `array`.
 *
 * @private
 * @param {Array} source The array to copy values from.
 * @param {Array} [array=[]] The array to copy values to.
 * @returns {Array} Returns `array`.
 */
function copyArray(source, array) {
  var index = -1,
      length = source.length;

  array || (array = Array(length));
  while (++index < length) {
    array[index] = source[index];
  }
  return array;
}

var defineProperty = (function() {
  try {
    var func = getNative(Object, 'defineProperty');
    func({}, '', {});
    return func;
  } catch (e) {}
}());

/**
 * A specialized version of `_.forEach` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns `array`.
 */
function arrayEach(array, iteratee) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (iteratee(array[index], index, array) === false) {
      break;
    }
  }
  return array;
}

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER$1 = 9007199254740991;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  var type = typeof value;
  length = length == null ? MAX_SAFE_INTEGER$1 : length;

  return !!length &&
    (type == 'number' ||
      (type != 'symbol' && reIsUint.test(value))) &&
        (value > -1 && value % 1 == 0 && value < length);
}

/**
 * The base implementation of `assignValue` and `assignMergeValue` without
 * value checks.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function baseAssignValue(object, key, value) {
  if (key == '__proto__' && defineProperty) {
    defineProperty(object, key, {
      'configurable': true,
      'enumerable': true,
      'value': value,
      'writable': true
    });
  } else {
    object[key] = value;
  }
}

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

/** Used for built-in method references. */
var objectProto$9 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$7 = objectProto$9.hasOwnProperty;

/**
 * Assigns `value` to `key` of `object` if the existing value is not equivalent
 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * for equality comparisons.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function assignValue(object, key, value) {
  var objValue = object[key];
  if (!(hasOwnProperty$7.call(object, key) && eq(objValue, value)) ||
      (value === undefined && !(key in object))) {
    baseAssignValue(object, key, value);
  }
}

/**
 * Copies properties of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy properties from.
 * @param {Array} props The property identifiers to copy.
 * @param {Object} [object={}] The object to copy properties to.
 * @param {Function} [customizer] The function to customize copied values.
 * @returns {Object} Returns `object`.
 */
function copyObject(source, props, object, customizer) {
  var isNew = !object;
  object || (object = {});

  var index = -1,
      length = props.length;

  while (++index < length) {
    var key = props[index];

    var newValue = customizer
      ? customizer(object[key], source[key], key, object, source)
      : undefined;

    if (newValue === undefined) {
      newValue = source[key];
    }
    if (isNew) {
      baseAssignValue(object, key, newValue);
    } else {
      assignValue(object, key, newValue);
    }
  }
  return object;
}

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

/** Used for built-in method references. */
var objectProto$8 = Object.prototype;

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$8;

  return value === proto;
}

/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

/** `Object#toString` result references. */
var argsTag$2 = '[object Arguments]';

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return isObjectLike(value) && baseGetTag(value) == argsTag$2;
}

/** Used for built-in method references. */
var objectProto$7 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$6 = objectProto$7.hasOwnProperty;

/** Built-in value references. */
var propertyIsEnumerable$1 = objectProto$7.propertyIsEnumerable;

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
var isArguments = baseIsArguments(function() { return arguments; }()) ? baseIsArguments : function(value) {
  return isObjectLike(value) && hasOwnProperty$6.call(value, 'callee') &&
    !propertyIsEnumerable$1.call(value, 'callee');
};

/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

/** Detect free variable `exports`. */
var freeExports$2 = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule$2 = freeExports$2 && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports$2 = freeModule$2 && freeModule$2.exports === freeExports$2;

/** Built-in value references. */
var Buffer$1 = moduleExports$2 ? root.Buffer : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeIsBuffer = Buffer$1 ? Buffer$1.isBuffer : undefined;

/**
 * Checks if `value` is a buffer.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
 * @example
 *
 * _.isBuffer(new Buffer(2));
 * // => true
 *
 * _.isBuffer(new Uint8Array(2));
 * // => false
 */
var isBuffer = nativeIsBuffer || stubFalse;

/** `Object#toString` result references. */
var argsTag$1 = '[object Arguments]',
    arrayTag$1 = '[object Array]',
    boolTag$2 = '[object Boolean]',
    dateTag$2 = '[object Date]',
    errorTag$1 = '[object Error]',
    funcTag$1 = '[object Function]',
    mapTag$4 = '[object Map]',
    numberTag$2 = '[object Number]',
    objectTag$2 = '[object Object]',
    regexpTag$2 = '[object RegExp]',
    setTag$4 = '[object Set]',
    stringTag$2 = '[object String]',
    weakMapTag$2 = '[object WeakMap]';

var arrayBufferTag$2 = '[object ArrayBuffer]',
    dataViewTag$3 = '[object DataView]',
    float32Tag$2 = '[object Float32Array]',
    float64Tag$2 = '[object Float64Array]',
    int8Tag$2 = '[object Int8Array]',
    int16Tag$2 = '[object Int16Array]',
    int32Tag$2 = '[object Int32Array]',
    uint8Tag$2 = '[object Uint8Array]',
    uint8ClampedTag$2 = '[object Uint8ClampedArray]',
    uint16Tag$2 = '[object Uint16Array]',
    uint32Tag$2 = '[object Uint32Array]';

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag$2] = typedArrayTags[float64Tag$2] =
typedArrayTags[int8Tag$2] = typedArrayTags[int16Tag$2] =
typedArrayTags[int32Tag$2] = typedArrayTags[uint8Tag$2] =
typedArrayTags[uint8ClampedTag$2] = typedArrayTags[uint16Tag$2] =
typedArrayTags[uint32Tag$2] = true;
typedArrayTags[argsTag$1] = typedArrayTags[arrayTag$1] =
typedArrayTags[arrayBufferTag$2] = typedArrayTags[boolTag$2] =
typedArrayTags[dataViewTag$3] = typedArrayTags[dateTag$2] =
typedArrayTags[errorTag$1] = typedArrayTags[funcTag$1] =
typedArrayTags[mapTag$4] = typedArrayTags[numberTag$2] =
typedArrayTags[objectTag$2] = typedArrayTags[regexpTag$2] =
typedArrayTags[setTag$4] = typedArrayTags[stringTag$2] =
typedArrayTags[weakMapTag$2] = false;

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return isObjectLike(value) &&
    isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
}

/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

/** Detect free variable `exports`. */
var freeExports$1 = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule$1 = freeExports$1 && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports$1 = freeModule$1 && freeModule$1.exports === freeExports$1;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports$1 && freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    // Use `util.types` for Node.js 10+.
    var types = freeModule$1 && freeModule$1.require && freeModule$1.require('util').types;

    if (types) {
      return types;
    }

    // Legacy `process.binding('util')` for Node.js < 10.
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());

/* Node.js helper references. */
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

/** Used for built-in method references. */
var objectProto$6 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$5 = objectProto$6.hasOwnProperty;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  var isArr = isArray(value),
      isArg = !isArr && isArguments(value),
      isBuff = !isArr && !isArg && isBuffer(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? baseTimes(value.length, String) : [],
      length = result.length;

  for (var key in value) {
    if ((inherited || hasOwnProperty$5.call(value, key)) &&
        !(skipIndexes && (
           // Safari 9 has enumerable `arguments.length` in strict mode.
           key == 'length' ||
           // Node.js 0.10 has enumerable non-index properties on buffers.
           (isBuff && (key == 'offset' || key == 'parent')) ||
           // PhantomJS 2 has enumerable non-index properties on typed arrays.
           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
           // Skip index properties.
           isIndex(key, length)
        ))) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeKeys = overArg(Object.keys, Object);

/** Used for built-in method references. */
var objectProto$5 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$4 = objectProto$5.hasOwnProperty;

/**
 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeys(object) {
  if (!isPrototype(object)) {
    return nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty$4.call(object, key) && key != 'constructor') {
      result.push(key);
    }
  }
  return result;
}

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
function keys(object) {
  return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
}

/**
 * This function is like
 * [`Object.keys`](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * except that it includes inherited enumerable properties.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function nativeKeysIn(object) {
  var result = [];
  if (object != null) {
    for (var key in Object(object)) {
      result.push(key);
    }
  }
  return result;
}

/** Used for built-in method references. */
var objectProto$4 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$3 = objectProto$4.hasOwnProperty;

/**
 * The base implementation of `_.keysIn` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeysIn(object) {
  if (!isObject(object)) {
    return nativeKeysIn(object);
  }
  var isProto = isPrototype(object),
      result = [];

  for (var key in object) {
    if (!(key == 'constructor' && (isProto || !hasOwnProperty$3.call(object, key)))) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Creates an array of the own and inherited enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keysIn(new Foo);
 * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
 */
function keysIn(object) {
  return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
}

/* Built-in method references that are verified to be native. */
var nativeCreate = getNative(Object, 'create');

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
  this.size = 0;
}

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED$1 = '__lodash_hash_undefined__';

/** Used for built-in method references. */
var objectProto$3 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$2 = objectProto$3.hasOwnProperty;

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED$1 ? undefined : result;
  }
  return hasOwnProperty$2.call(data, key) ? data[key] : undefined;
}

/** Used for built-in method references. */
var objectProto$2 = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty$1 = objectProto$2.hasOwnProperty;

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? (data[key] !== undefined) : hasOwnProperty$1.call(data, key);
}

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  return this;
}

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
  this.size = 0;
}

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

/** Used for built-in method references. */
var arrayProto = Array.prototype;

/** Built-in value references. */
var splice = arrayProto.splice;

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  --this.size;
  return true;
}

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

/* Built-in method references that are verified to be native. */
var Map = getNative(root, 'Map');

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map || ListCache),
    'string': new Hash
  };
}

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  var result = getMapData(this, key)['delete'](key);
  this.size -= result ? 1 : 0;
  return result;
}

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  var data = getMapData(this, key),
      size = data.size;

  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

/** Built-in value references. */
var getPrototype = overArg(Object.getPrototypeOf, Object);

/**
 * Removes all key-value entries from the stack.
 *
 * @private
 * @name clear
 * @memberOf Stack
 */
function stackClear() {
  this.__data__ = new ListCache;
  this.size = 0;
}

/**
 * Removes `key` and its value from the stack.
 *
 * @private
 * @name delete
 * @memberOf Stack
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function stackDelete(key) {
  var data = this.__data__,
      result = data['delete'](key);

  this.size = data.size;
  return result;
}

/**
 * Gets the stack value for `key`.
 *
 * @private
 * @name get
 * @memberOf Stack
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function stackGet(key) {
  return this.__data__.get(key);
}

/**
 * Checks if a stack value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Stack
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function stackHas(key) {
  return this.__data__.has(key);
}

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/**
 * Sets the stack `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Stack
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the stack cache instance.
 */
function stackSet(key, value) {
  var data = this.__data__;
  if (data instanceof ListCache) {
    var pairs = data.__data__;
    if (!Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
      pairs.push([key, value]);
      this.size = ++data.size;
      return this;
    }
    data = this.__data__ = new MapCache(pairs);
  }
  data.set(key, value);
  this.size = data.size;
  return this;
}

/**
 * Creates a stack cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Stack(entries) {
  var data = this.__data__ = new ListCache(entries);
  this.size = data.size;
}

// Add methods to `Stack`.
Stack.prototype.clear = stackClear;
Stack.prototype['delete'] = stackDelete;
Stack.prototype.get = stackGet;
Stack.prototype.has = stackHas;
Stack.prototype.set = stackSet;

/**
 * The base implementation of `_.assign` without support for multiple sources
 * or `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @returns {Object} Returns `object`.
 */
function baseAssign(object, source) {
  return object && copyObject(source, keys(source), object);
}

/**
 * The base implementation of `_.assignIn` without support for multiple sources
 * or `customizer` functions.
 *
 * @private
 * @param {Object} object The destination object.
 * @param {Object} source The source object.
 * @returns {Object} Returns `object`.
 */
function baseAssignIn(object, source) {
  return object && copyObject(source, keysIn(source), object);
}

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Built-in value references. */
var Buffer = moduleExports ? root.Buffer : undefined,
    allocUnsafe = Buffer ? Buffer.allocUnsafe : undefined;

/**
 * Creates a clone of  `buffer`.
 *
 * @private
 * @param {Buffer} buffer The buffer to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Buffer} Returns the cloned buffer.
 */
function cloneBuffer(buffer, isDeep) {
  if (isDeep) {
    return buffer.slice();
  }
  var length = buffer.length,
      result = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);

  buffer.copy(result);
  return result;
}

/**
 * A specialized version of `_.filter` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 */
function arrayFilter(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length,
      resIndex = 0,
      result = [];

  while (++index < length) {
    var value = array[index];
    if (predicate(value, index, array)) {
      result[resIndex++] = value;
    }
  }
  return result;
}

/**
 * This method returns a new empty array.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {Array} Returns the new empty array.
 * @example
 *
 * var arrays = _.times(2, _.stubArray);
 *
 * console.log(arrays);
 * // => [[], []]
 *
 * console.log(arrays[0] === arrays[1]);
 * // => false
 */
function stubArray() {
  return [];
}

/** Used for built-in method references. */
var objectProto$1 = Object.prototype;

/** Built-in value references. */
var propertyIsEnumerable = objectProto$1.propertyIsEnumerable;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeGetSymbols$1 = Object.getOwnPropertySymbols;

/**
 * Creates an array of the own enumerable symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of symbols.
 */
var getSymbols = !nativeGetSymbols$1 ? stubArray : function(object) {
  if (object == null) {
    return [];
  }
  object = Object(object);
  return arrayFilter(nativeGetSymbols$1(object), function(symbol) {
    return propertyIsEnumerable.call(object, symbol);
  });
};

/**
 * Copies own symbols of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy symbols from.
 * @param {Object} [object={}] The object to copy symbols to.
 * @returns {Object} Returns `object`.
 */
function copySymbols(source, object) {
  return copyObject(source, getSymbols(source), object);
}

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeGetSymbols = Object.getOwnPropertySymbols;

/**
 * Creates an array of the own and inherited enumerable symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of symbols.
 */
var getSymbolsIn = !nativeGetSymbols ? stubArray : function(object) {
  var result = [];
  while (object) {
    arrayPush(result, getSymbols(object));
    object = getPrototype(object);
  }
  return result;
};

/**
 * Copies own and inherited symbols of `source` to `object`.
 *
 * @private
 * @param {Object} source The object to copy symbols from.
 * @param {Object} [object={}] The object to copy symbols to.
 * @returns {Object} Returns `object`.
 */
function copySymbolsIn(source, object) {
  return copyObject(source, getSymbolsIn(source), object);
}

/**
 * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
 * `keysFunc` and `symbolsFunc` to get the enumerable property names and
 * symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @param {Function} symbolsFunc The function to get the symbols of `object`.
 * @returns {Array} Returns the array of property names and symbols.
 */
function baseGetAllKeys(object, keysFunc, symbolsFunc) {
  var result = keysFunc(object);
  return isArray(object) ? result : arrayPush(result, symbolsFunc(object));
}

/**
 * Creates an array of own enumerable property names and symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names and symbols.
 */
function getAllKeys(object) {
  return baseGetAllKeys(object, keys, getSymbols);
}

/**
 * Creates an array of own and inherited enumerable property names and
 * symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names and symbols.
 */
function getAllKeysIn(object) {
  return baseGetAllKeys(object, keysIn, getSymbolsIn);
}

/* Built-in method references that are verified to be native. */
var DataView = getNative(root, 'DataView');

/* Built-in method references that are verified to be native. */
var Promise$1 = getNative(root, 'Promise');

/* Built-in method references that are verified to be native. */
var Set$1 = getNative(root, 'Set');

/** `Object#toString` result references. */
var mapTag$3 = '[object Map]',
    objectTag$1 = '[object Object]',
    promiseTag = '[object Promise]',
    setTag$3 = '[object Set]',
    weakMapTag$1 = '[object WeakMap]';

var dataViewTag$2 = '[object DataView]';

/** Used to detect maps, sets, and weakmaps. */
var dataViewCtorString = toSource(DataView),
    mapCtorString = toSource(Map),
    promiseCtorString = toSource(Promise$1),
    setCtorString = toSource(Set$1),
    weakMapCtorString = toSource(WeakMap);

/**
 * Gets the `toStringTag` of `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
var getTag = baseGetTag;

// Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
if ((DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag$2) ||
    (Map && getTag(new Map) != mapTag$3) ||
    (Promise$1 && getTag(Promise$1.resolve()) != promiseTag) ||
    (Set$1 && getTag(new Set$1) != setTag$3) ||
    (WeakMap && getTag(new WeakMap) != weakMapTag$1)) {
  getTag = function(value) {
    var result = baseGetTag(value),
        Ctor = result == objectTag$1 ? value.constructor : undefined,
        ctorString = Ctor ? toSource(Ctor) : '';

    if (ctorString) {
      switch (ctorString) {
        case dataViewCtorString: return dataViewTag$2;
        case mapCtorString: return mapTag$3;
        case promiseCtorString: return promiseTag;
        case setCtorString: return setTag$3;
        case weakMapCtorString: return weakMapTag$1;
      }
    }
    return result;
  };
}

var getTag$1 = getTag;

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Initializes an array clone.
 *
 * @private
 * @param {Array} array The array to clone.
 * @returns {Array} Returns the initialized clone.
 */
function initCloneArray(array) {
  var length = array.length,
      result = new array.constructor(length);

  // Add properties assigned by `RegExp#exec`.
  if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
    result.index = array.index;
    result.input = array.input;
  }
  return result;
}

/** Built-in value references. */
var Uint8Array = root.Uint8Array;

/**
 * Creates a clone of `arrayBuffer`.
 *
 * @private
 * @param {ArrayBuffer} arrayBuffer The array buffer to clone.
 * @returns {ArrayBuffer} Returns the cloned array buffer.
 */
function cloneArrayBuffer(arrayBuffer) {
  var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
  new Uint8Array(result).set(new Uint8Array(arrayBuffer));
  return result;
}

/**
 * Creates a clone of `dataView`.
 *
 * @private
 * @param {Object} dataView The data view to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the cloned data view.
 */
function cloneDataView(dataView, isDeep) {
  var buffer = isDeep ? cloneArrayBuffer(dataView.buffer) : dataView.buffer;
  return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
}

/** Used to match `RegExp` flags from their coerced string values. */
var reFlags = /\w*$/;

/**
 * Creates a clone of `regexp`.
 *
 * @private
 * @param {Object} regexp The regexp to clone.
 * @returns {Object} Returns the cloned regexp.
 */
function cloneRegExp(regexp) {
  var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
  result.lastIndex = regexp.lastIndex;
  return result;
}

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol$1 ? Symbol$1.prototype : undefined,
    symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;

/**
 * Creates a clone of the `symbol` object.
 *
 * @private
 * @param {Object} symbol The symbol object to clone.
 * @returns {Object} Returns the cloned symbol object.
 */
function cloneSymbol(symbol) {
  return symbolValueOf ? Object(symbolValueOf.call(symbol)) : {};
}

/**
 * Creates a clone of `typedArray`.
 *
 * @private
 * @param {Object} typedArray The typed array to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the cloned typed array.
 */
function cloneTypedArray(typedArray, isDeep) {
  var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
  return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
}

/** `Object#toString` result references. */
var boolTag$1 = '[object Boolean]',
    dateTag$1 = '[object Date]',
    mapTag$2 = '[object Map]',
    numberTag$1 = '[object Number]',
    regexpTag$1 = '[object RegExp]',
    setTag$2 = '[object Set]',
    stringTag$1 = '[object String]',
    symbolTag$1 = '[object Symbol]';

var arrayBufferTag$1 = '[object ArrayBuffer]',
    dataViewTag$1 = '[object DataView]',
    float32Tag$1 = '[object Float32Array]',
    float64Tag$1 = '[object Float64Array]',
    int8Tag$1 = '[object Int8Array]',
    int16Tag$1 = '[object Int16Array]',
    int32Tag$1 = '[object Int32Array]',
    uint8Tag$1 = '[object Uint8Array]',
    uint8ClampedTag$1 = '[object Uint8ClampedArray]',
    uint16Tag$1 = '[object Uint16Array]',
    uint32Tag$1 = '[object Uint32Array]';

/**
 * Initializes an object clone based on its `toStringTag`.
 *
 * **Note:** This function only supports cloning values with tags of
 * `Boolean`, `Date`, `Error`, `Map`, `Number`, `RegExp`, `Set`, or `String`.
 *
 * @private
 * @param {Object} object The object to clone.
 * @param {string} tag The `toStringTag` of the object to clone.
 * @param {boolean} [isDeep] Specify a deep clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneByTag(object, tag, isDeep) {
  var Ctor = object.constructor;
  switch (tag) {
    case arrayBufferTag$1:
      return cloneArrayBuffer(object);

    case boolTag$1:
    case dateTag$1:
      return new Ctor(+object);

    case dataViewTag$1:
      return cloneDataView(object, isDeep);

    case float32Tag$1: case float64Tag$1:
    case int8Tag$1: case int16Tag$1: case int32Tag$1:
    case uint8Tag$1: case uint8ClampedTag$1: case uint16Tag$1: case uint32Tag$1:
      return cloneTypedArray(object, isDeep);

    case mapTag$2:
      return new Ctor;

    case numberTag$1:
    case stringTag$1:
      return new Ctor(object);

    case regexpTag$1:
      return cloneRegExp(object);

    case setTag$2:
      return new Ctor;

    case symbolTag$1:
      return cloneSymbol(object);
  }
}

/**
 * Initializes an object clone.
 *
 * @private
 * @param {Object} object The object to clone.
 * @returns {Object} Returns the initialized clone.
 */
function initCloneObject(object) {
  return (typeof object.constructor == 'function' && !isPrototype(object))
    ? baseCreate(getPrototype(object))
    : {};
}

/** `Object#toString` result references. */
var mapTag$1 = '[object Map]';

/**
 * The base implementation of `_.isMap` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a map, else `false`.
 */
function baseIsMap(value) {
  return isObjectLike(value) && getTag$1(value) == mapTag$1;
}

/* Node.js helper references. */
var nodeIsMap = nodeUtil && nodeUtil.isMap;

/**
 * Checks if `value` is classified as a `Map` object.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a map, else `false`.
 * @example
 *
 * _.isMap(new Map);
 * // => true
 *
 * _.isMap(new WeakMap);
 * // => false
 */
var isMap = nodeIsMap ? baseUnary(nodeIsMap) : baseIsMap;

/** `Object#toString` result references. */
var setTag$1 = '[object Set]';

/**
 * The base implementation of `_.isSet` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a set, else `false`.
 */
function baseIsSet(value) {
  return isObjectLike(value) && getTag$1(value) == setTag$1;
}

/* Node.js helper references. */
var nodeIsSet = nodeUtil && nodeUtil.isSet;

/**
 * Checks if `value` is classified as a `Set` object.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a set, else `false`.
 * @example
 *
 * _.isSet(new Set);
 * // => true
 *
 * _.isSet(new WeakSet);
 * // => false
 */
var isSet = nodeIsSet ? baseUnary(nodeIsSet) : baseIsSet;

/** Used to compose bitmasks for cloning. */
var CLONE_DEEP_FLAG$1 = 1,
    CLONE_FLAT_FLAG = 2,
    CLONE_SYMBOLS_FLAG$1 = 4;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    objectTag = '[object Object]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    symbolTag = '[object Symbol]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/** Used to identify `toStringTag` values supported by `_.clone`. */
var cloneableTags = {};
cloneableTags[argsTag] = cloneableTags[arrayTag] =
cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] =
cloneableTags[boolTag] = cloneableTags[dateTag] =
cloneableTags[float32Tag] = cloneableTags[float64Tag] =
cloneableTags[int8Tag] = cloneableTags[int16Tag] =
cloneableTags[int32Tag] = cloneableTags[mapTag] =
cloneableTags[numberTag] = cloneableTags[objectTag] =
cloneableTags[regexpTag] = cloneableTags[setTag] =
cloneableTags[stringTag] = cloneableTags[symbolTag] =
cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
cloneableTags[errorTag] = cloneableTags[funcTag] =
cloneableTags[weakMapTag] = false;

/**
 * The base implementation of `_.clone` and `_.cloneDeep` which tracks
 * traversed objects.
 *
 * @private
 * @param {*} value The value to clone.
 * @param {boolean} bitmask The bitmask flags.
 *  1 - Deep clone
 *  2 - Flatten inherited properties
 *  4 - Clone symbols
 * @param {Function} [customizer] The function to customize cloning.
 * @param {string} [key] The key of `value`.
 * @param {Object} [object] The parent object of `value`.
 * @param {Object} [stack] Tracks traversed objects and their clone counterparts.
 * @returns {*} Returns the cloned value.
 */
function baseClone(value, bitmask, customizer, key, object, stack) {
  var result,
      isDeep = bitmask & CLONE_DEEP_FLAG$1,
      isFlat = bitmask & CLONE_FLAT_FLAG,
      isFull = bitmask & CLONE_SYMBOLS_FLAG$1;

  if (customizer) {
    result = object ? customizer(value, key, object, stack) : customizer(value);
  }
  if (result !== undefined) {
    return result;
  }
  if (!isObject(value)) {
    return value;
  }
  var isArr = isArray(value);
  if (isArr) {
    result = initCloneArray(value);
    if (!isDeep) {
      return copyArray(value, result);
    }
  } else {
    var tag = getTag$1(value),
        isFunc = tag == funcTag || tag == genTag;

    if (isBuffer(value)) {
      return cloneBuffer(value, isDeep);
    }
    if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
      result = (isFlat || isFunc) ? {} : initCloneObject(value);
      if (!isDeep) {
        return isFlat
          ? copySymbolsIn(value, baseAssignIn(result, value))
          : copySymbols(value, baseAssign(result, value));
      }
    } else {
      if (!cloneableTags[tag]) {
        return object ? value : {};
      }
      result = initCloneByTag(value, tag, isDeep);
    }
  }
  // Check for circular references and return its corresponding clone.
  stack || (stack = new Stack);
  var stacked = stack.get(value);
  if (stacked) {
    return stacked;
  }
  stack.set(value, result);

  if (isSet(value)) {
    value.forEach(function(subValue) {
      result.add(baseClone(subValue, bitmask, customizer, subValue, value, stack));
    });
  } else if (isMap(value)) {
    value.forEach(function(subValue, key) {
      result.set(key, baseClone(subValue, bitmask, customizer, key, value, stack));
    });
  }

  var keysFunc = isFull
    ? (isFlat ? getAllKeysIn : getAllKeys)
    : (isFlat ? keysIn : keys);

  var props = isArr ? undefined : keysFunc(value);
  arrayEach(props || value, function(subValue, key) {
    if (props) {
      key = subValue;
      subValue = value[key];
    }
    // Recursively populate clone (susceptible to call stack limits).
    assignValue(result, key, baseClone(subValue, bitmask, customizer, key, value, stack));
  });
  return result;
}

/** Used to compose bitmasks for cloning. */
var CLONE_DEEP_FLAG = 1,
    CLONE_SYMBOLS_FLAG = 4;

/**
 * This method is like `_.clone` except that it recursively clones `value`.
 *
 * @static
 * @memberOf _
 * @since 1.0.0
 * @category Lang
 * @param {*} value The value to recursively clone.
 * @returns {*} Returns the deep cloned value.
 * @see _.clone
 * @example
 *
 * var objects = [{ 'a': 1 }, { 'b': 2 }];
 *
 * var deep = _.cloneDeep(objects);
 * console.log(deep[0] === objects[0]);
 * // => false
 */
function cloneDeep(value) {
  return baseClone(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG);
}

class Verbose {
  constructor () {
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
  get token () {
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
   constructor ({rateLimit=50, lastExecutionDate=null}={}) {
    Enforce.named(arguments, {rateLimit: 'number', lastExecutionDate: 'any'}, 'Batch#constructor');
    super();
    this.reset(lastExecutionDate);
    this.rateLimit = rateLimit;
  }

  reset (lastExecutionDate) {
    this.queue = [];
    this._after = [];
    this._timing = {lastExecutionDate};
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
  fetchAll () {
    const obj = {retry: 0, start: 0, stoppedAt: this.queue.length};
    let collated = [];

    do {
      if (obj.stoppedAt < this.queue.length) {
        obj.start = obj.stoppedAt;
        obj.stoppedAt = this.queue.length;
        this.verbosity > 2 && Logger.log('429 hit rate encountered in Batch#fetchAll, sleeping for ' + (obj.retry / 1000) + ' seconds.');
        Utilities.sleep(obj.retry);
      }

      const responses = UrlFetchApp.fetchAll(
        this.queue.slice(obj.start).map(
          request => {
            const {params} = request.getParams({embedUrl: true});
            return params;
          }
        )
      ).map( (response, idx) => {
          const request = this.queue[idx];
          const response_ = new Response({response, request});
          if (response_.statusCode === 429) {
            obj.retry = Math.max(obj.retry, response_.x_ratelimit_reset);  //
            obj.stoppedAt = Math.min(obj.stoppedAt, idx);
            return null;
          }
          return response_;
        }
      );

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
  *[Symbol.iterator] () {
    const len = this.queue.length, oneSecond = 1000;
    let size = this.rateLimit || 50;
    for (let idx=0; idx < len; idx += size) {
      const chunk = this.queue.slice(idx, idx + size);
      const lastTime = this._timing.lastExecutionDate || new Date(9999999999999),
            now = new Date();
      const delta = now.getTime() - lastTime.getTime();
      if ( delta < oneSecond && delta > 0 ) {
        const sleep = (oneSecond - delta) * 1.01;
        this.verbosity > 2 && Logger.log(`Sleeping for ${sleep * oneSecond} seconds match rate limit of ${this.rateLimit} per second`);
        Utilities.sleep(sleep);
      }

      const fetchAppResponses = UrlFetchApp.fetchAll(
        chunk.map(
          request => {
            const {params} = request.getParams({embedUrl: true});
            return params;
          }
        )
      );

      // save for loop
      this._timing.lastExecutionDate = new Date();

      // now prepare the responses so the body can make due with them
      const responses = fetchAppResponses.map( (response, idx) => {
        const request = chunk[idx];
        const response_ = new Response({response, request});
        return response_;
      });

      // hand back the time to the calling body
      // but have to check for rate limits in any case
      // hand back the time to the calling body
      // but have to check for rate limits in any case
      let millisecondsSlept = 0;
      for (const response of responses) {
        const {hitRateLimit, milliseconds} = response.checkRateLimit;
        if (hitRateLimit) {
          const remainingMilliseconds = milliseconds - millisecondsSlept;
          if (remainingMilliseconds > 0) {
            // sleep only if we haven't already slept for that long yet
            this.verbosity > 2 && Logger.log(`Hit rate limit in batch sleeping for ${remainingMilliseconds / 1000} seconds`);
            Utilities.sleep(remainingMilliseconds);

            millisecondsSlept += remainingMilliseconds;
          }

          // convert the response into the original request, make new response object
          const request = response.request;
          yield request.fetch();  // urlfetchapp, which can handle 429 as well
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
    constructor () {
      this.cache = CacheService.getScriptCache();
    }

    getUrl ({name, version, resource, method}={}) {
      Import;
      const key = `${name}${version}${resource}${method}`;
      let data = this.cache.get(key);
      let ret = null;
      if (data) {
        //console.log({key, fromCache: true});
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
      //console.log({key, fromCache: false});
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
  constructor ({url, oauth, method='get', headers={}, payload={}, query={}}={}, {mixin=null}) {
    Enforce.named(arguments, {url: '!string', oauth: '!any', method: 'string', headers: 'object', payload: 'object', query: 'object', mixin: 'any'});
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
  setStore (store) {
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
  fetch () {

    /**
     * Use the store, if present
     * @returns ResponseObject
     */

    const fetcher = (u, o) => {
      const info = {hash: null};
      if (this.store != null) {
        // handle a caching store by getting the hash of the request sans the authorization header
        // the bearer token may easily change in this context, and wouldn't make caching possible
        // also not storing the bearer token anywhere, not even a hashed version of it
        const obj = cloneDeep({url: u});
        if (obj.headers && obj.headers.Authorization)
          delete obj.headers.Authorization;

        // the Utilities digest returns an array of bytes (integers) which we need to convert to character strings
        info.hash = Utilities
                      .computeDigest( Utilities.DigestAlgorithm.MD5, JSON.stringify(obj) )
                      .map( chr => ( chr < 0 ? chr + 256 : chr ).toString(16).padStart(2, '0') )
                      .join('');

        // see if it's in the cache
        const data = this.store.get(info.hash);

        // if it's in the cache, return an object {data: 'xyz'} which we'll be able to unpack as being in the cache
        // when we make a response object, which can make a mock object
        if (data!=null) {
          return {data};
        }
      }
      const response = UrlFetchApp.fetch(u, o);
      if (info.hash != null && response.getResponseCode() === 200) {
        // store the raw text result but only for successful responses
        this.store.put(info.hash, response.getContentText());
      }
      // return the repsonse object
      return response;
    };


    const {url, params: requestObject} = this.url_params({embedUrl: true});
    let response;
    try {
      this.verbosity >= 1 && Logger.log(JSON.stringify({...requestObject, ...{time: new Date()}}, ['url', 'method', 'headers', 'time'], 2));
      response = fetcher(url, requestObject);
    } catch (e) {
      response = null;
      throw new Error(e.message, {url, requestObject});
    }
    let resp = new Response({response, request: this});

    // auto-detect ratelimits, try again
    if (resp.hitRateLimit) {
      this.verbosity > 2 && Logger.log("Hit rate limit, trying again");
      response = fetcher(url, requestObject);
      resp = new Response({response, request: this});
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
 * Returns a ResponseObject or RespondObject-compatible object
 * this will wrap the data into the getContentText which is used for .json calls
 */
const toResponse = (resp) => {
  const {data} = resp;
  if (data!=null) {
    return {
      getAllHeaders: () => ({'Content-Type': 'text/html; charset=utf-8'}),  // placeholder in case of parse error
      getHeaders: () => ({'Content-Type': 'text/html; charset=utf-8'}),  // placeholder in case of parse error
      getContentText: () => data,
      getResponseCode: () => 200
    }
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
  constructor ({response=null, request=null}={}) {
    Enforce.named(arguments, {response: 'object', request: Namespace.Request}, 'Response#constructor');
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

  get x_ratelimit_reset () {
    let header_reset_at = this.headers['x-ratelimit-reset'];
    header_reset_at = header_reset_at.replace(" UTC", "+0000").replace(" ", "T");
    const reset_at = new Date(header_reset_at).getTime();
    const utf_now = new Date().getTime();
    return reset_at - utf_now + 1;
  }

  get checkRateLimit () {
    const hitRateLimit = this.statusCode === 429;
    let milliseconds = 0;
    if (hitRateLimit) {
      milliseconds = this.x_ratelimit_reset;
    }
    return {hitRateLimit, milliseconds};
  }

  /**
   * Returns false if the response is anything except `429`. Returns true only after sleeping for how many milliseconds as indicated in the `x-ratelimit-reset` header. Can be used to retry. Used internally by `Request#fetch` to avoid rate limitations.
   */
  get hitRateLimit () {
    if (this.statusCode === 429) {
      const milliseconds = this.x_ratelimit_reset;
      if (milliseconds > 0) {
        this.verbosity > 2 && Logger.log('429 rate limit encountered in fetch, sleeping for ' + (milliseconds / 1000) + ' seconds');
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
   * @param {Any}           [store=null] caching store, (accepts get and put methods)
   */
  constructor ({baseUrl=null, oauth=null, discovery={}}={}, {stickyHeaders={}, stickyQuery={}, stickyPayload={}}={}, {store=null}={}) {
    Enforce.named(arguments, {baseUrl: 'string', oauth: 'any', discovery: 'object', stickyHeaders: 'object', stickyQuery: 'object', stickyPayload: 'object', store: 'any'}, 'Endpoints.constructor');
    this.verbosity = 0;
    this.disc = null;
    this.baseUrl = baseUrl;
    this.stickyHeaders = stickyHeaders;
    this.stickyQuery = stickyQuery;
    this.stickyPayload = stickyPayload;
    this.oauth = oauth;
    this.store = store;
    if (Object.keys(discovery).length > 0 && Endpoint.utils.validateDiscovery(discovery)) {
      this.disc = new DiscoveryCache();
      this.baseUrl = Endpoint.utils.translateToTemplate( this.disc.getUrl(discovery) );
    }

    // set oauth to a basic class
    if (this.oauth === 'me') {
      this.oauth = new Oauth();
    }
  }

  setVerbosity(value) {
    this.verbosity = value;
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
   * @param {Any}    [advanced.mixin] mixin pattern on request object
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

    const request = new Request(options, {mixin});
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
    return {batch: b, request: r};
  }
}

const Namespace = {Endpoint, Response, Batch, Request, Oauth};

exports.Enforce = Enforce;
exports.Namespace = Namespace;

})(Import, this);
try{exports.Import = Import;}catch(e){}
