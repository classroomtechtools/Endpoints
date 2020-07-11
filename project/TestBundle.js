/* Bundle as defined from all files in tests/serverside/*.js */
function Test(remote=true) {

(function () {
  'use strict';

  // private stuff
  const _settings_ = Symbol('settings');
  const _state_ = Symbol('state');

  let parseSettings = function (opt) {
    opt = opt || {};
    opt.param = opt.param || null;
    opt.enter = opt.enter || function () {};
    opt.exit = opt.exit || function () {};
    opt.error = opt.error || function () {};
    opt.proxy = opt.proxy || false;
    return opt;
  };

  class ContextManager {

    constructor (settings={}) {
      // default settings
      this[_settings_] = parseSettings(settings);
    }

    get settings () {
      return this[_settings_];
    }

    set enter (func) {
      this[_settings_].enter = func;
    }

    set exit (func) {
      this[_settings_].exit = func;
    }

    set error (func) {
      this[_settings_].error = func;
    }

    set param (obj) {
      this[_settings_].param = obj;
    }

    set state (obj) {
      if (obj === null)
        this[_state_] = this.defaultObject;
      else
        this[_state_] = obj;
    }

    get state () {
      return this[_state_];
    }

    defaultObject () {
      return {};
    }

    with (func) {
      var param, result, state;

      this[_state_] = state = this.defaultObject();

      // get the parameter
      param = this[_settings_].param;

      // execute the enter function
      this[_settings_].enter.call(state);

      try {

        // bind it so we can access via `this`        // execute the body
        result = func.call(state, param);

      } catch (err) {
        // execute the error handler
        // error handler can return null to indicate it should be swallowed
        let swallow = this[_settings_].error.call(state, err) === null;

        // if error happened, call error function
        // if it returns null swallow it, otherwise reraise
        if (!swallow)
          throw (err);

      } finally {

        // execute the exit
        this[_settings_].exit.call(state);
      }

      return result;
    }
  }

  var _log = [];
  const log = function (str) {
    _log.push(str);
  };

  var UtgsUnit = {};  // private methods

  /**
  * For convenience, a variable that equals "undefined"
  */
  var UtgsUnit_UNDEFINED_VALUE;

  /**
  * Predicate used for testing JavaScript == (i.e. equality excluding type)
  */
  UtgsUnit.DOUBLE_EQUALITY_PREDICATE = (var1, var2) =>  var1 == var2;

  /**
  * Predicate used for testing JavaScript === (i.e. equality including type)
  */
  UtgsUnit.TRIPLE_EQUALITY_PREDICATE = (var1, var2) => var1 === var2;

  /*
  * Predicate used for testing Javascript date equality
  */
  UtgsUnit.DATE_EQUALITY_PREDICATE = (var1, var2) => var1.getTime() === var2.getTime();


  /**
  * Predicate used for testing whether two obects' toStrings are equal
  */
  UtgsUnit.TO_STRING_EQUALITY_PREDICATE = (var1, var2) => var1.toString() === var2.toString();

  /**
  * Hash of predicates for testing equality by primitive type
  */
  UtgsUnit.PRIMITIVE_EQUALITY_PREDICATES = {
    'String':   UtgsUnit.DOUBLE_EQUALITY_PREDICATE,
    'Number':   UtgsUnit.DOUBLE_EQUALITY_PREDICATE,
    'Boolean':  UtgsUnit.DOUBLE_EQUALITY_PREDICATE,
    'Date':     UtgsUnit.DATE_EQUALITY_PREDICATE,
    'RegExp':   UtgsUnit.TO_STRING_EQUALITY_PREDICATE,
    'Function': UtgsUnit.TO_STRING_EQUALITY_PREDICATE
  };

  /**
  * @param Any object
  * @return String - the type of the given object
  * @private
  */
  UtgsUnit.trueTypeOf = function(something) {
    var result = typeof something;
    try {
      switch (result) {
        case 'string':
          break;
        case 'boolean':
          break;
        case 'number':
          break;
        case 'object':
        case 'function':
          switch (something.constructor) {
            case new String().constructor:
              result = 'String';
              break;
            case new Boolean().constructor:
              result = 'Boolean';
              break;
            case new Number().constructor:
              result = 'Number';
              break;
            case new Array().constructor:
              result = 'Array';
              break;
            case new RegExp().constructor:
              result = 'RegExp';
              break;
            case new Date().constructor:
              result = 'Date';
              break;
            case Function:
              result = 'Function';
              break;
            default:
              const m = something.constructor.toString().match(/function\s*([^( ]+)\(/);
              if (m)
                result = m[1];
              else
                break;
          }
          break;
      }
    }
    finally {
      result = result.substr(0, 1).toUpperCase() + result.substr(1);
      return result;
    }
  };

  UtgsUnit.displayStringForValue = function(aVar) {
    let result = `<${aVar}>`;
    if (!(aVar === null || aVar === UtgsUnit_UNDEFINED_VALUE)) {
      result += ` (${UtgsUnit.trueTypeOf(aVar)})`;
    }
    return result;
  };

  UtgsUnit.validateArguments = function(opt, fields) {
    fields = fields.split(' ');
    for (let f=0; f < fields.length; f++) {
      if (!opt.hasOwnProperty(fields[f])) {
        throw UtgsUnit.AssertionArgumentError(`Assertions needs property ${fields[f]} in opt argument`);
      }
    }
    opt.comment = opt.comment || '';
  };

  UtgsUnit.checkEquals = (var1, var2) => var1 === var2;

  UtgsUnit.checkNotUndefined = (aVar) => aVar !== UtgsUnit_UNDEFINED_VALUE;

  UtgsUnit.checkNotNull = (aVar) => aVar !== null;

  /**
  * All assertions ultimately go through this method.
  */
  UtgsUnit.assert = function(comment, booleanValue, failureMessage) {
    if (!booleanValue)
      throw new UtgsUnit.Failure(comment, failureMessage);
  };


  /**
  * @class
  * A UtgsUnit.Failure represents an assertion failure (or a call to fail()) during the execution of a Test Function
  * @param comment an optional comment about the failure
  * @param message the reason for the failure
  */
  UtgsUnit.Failure = function(comment, message) {
    /**
    * Declaration that this is a UtgsUnit.Failure
    * @ignore
    */
    this.isUtgsUnitFailure = true;
    /**
    * An optional comment about the failure
    */
    this.comment = comment;
    /**
    * The reason for the failure
    */
    this.UtgsUnitMessage = message;
    /**
    * The stack trace at the point at which the failure was encountered
    */
    // this.stackTrace = UtgsUnit.Util.getStackTrace();

    let failComment = '';
    if (comment != null) failComment = `Comment: ${comment}`;
    message = message || '';
    throw Error(`${failComment}\n\t\t -- Failure: ${message}\n    `);
  };


  /**
  * @class
  * A UtgsUnitAssertionArgumentError represents an invalid call to an assertion function - either an invalid argument type
  * or an incorrect number of arguments
  * @param description a description of the argument error
  */
  UtgsUnit.AssertionArgumentError = function(description) {
    /**
    * A description of the argument error
    */
    this.description = description;
    throw Error(`Argument error: ${description}`);
  };


  /**
  * @class
  * @constructor
  * Contains utility functions for the UtgsUnit framework
  */
  UtgsUnit.Util = {};
  try {
    UtgsUnit.Util.ContextManager = ContextManager;
  } catch(err) {
    throw Error("Please install ContextManager")
  }

  /**
  * Standardizes an HTML string by temporarily creating a DIV, setting its innerHTML to the string, and the asking for
  * the innerHTML back
  * @param html
  */
  UtgsUnit.Util.standardizeHTML = function(html) {
    let translator = document.createElement("DIV");
    translator.innerHTML = html;
    return UtgsUnit.Util.trim(translator.innerHTML);
  };

  /**
  * Returns whether the given string is blank after being trimmed of whitespace
  * @param string
  */
  UtgsUnit.Util.isBlank = function(string) {
    return UtgsUnit.Util.trim(string) == '';
  };

  /**
  * Returns the name of the given function, or 'anonymous' if it has no name
  * @param aFunction
  */
  UtgsUnit.Util.getFunctionName = function(aFunction) {
    const regexpResult = aFunction.toString().match(/function(\s*)(\w*)/);
    if (regexpResult && regexpResult.length >= 2 && regexpResult[2]) {
      return regexpResult[2];
    }
    return 'anonymous';
  };

  /**
  * Returns the current stack trace
  */
  UtgsUnit.Util.getStackTrace = function() {
    let result = '';

    if (arguments.caller !== undefined) {
      for (let a = arguments.caller; a != null; a = a.caller) {
        result += `> ${UtgsUnit.Util.getFunctionName(a.callee)}\n`;
        if (a.caller == a) {
          result += `*`;
          break;
        }
      }
    }
    else { // Mozilla, not ECMA
      // fake an exception so we can get Mozilla's error stack
      try
      {
        foo.bar;
      }
      catch(exception)
      {
        const stack = UtgsUnit.Util.parseErrorStack(exception);
        for (let i = 1; i < stack.length; i++)
        {
          result += `> ${stack[i]}\n`;
        }
      }
    }

    return result;
  };

  /**
  * Returns an array of stack trace elements from the given exception
  * @param exception
  */
  UtgsUnit.Util.parseErrorStack = function(exception) {
    let stack = [];

    if (!exception || !exception.stack) {
      return stack;
    }

    const stacklist = exception.stack.split('\n');

    for (let i = 0; i < stacklist.length - 1; i++) {
      const framedata = stacklist[i];

      let name = framedata.match(/^(\w*)/)[1];
      if (!name) {
        name = 'anonymous';
      }

      stack[stack.length] = name;
    }
    // remove top level anonymous functions to match IE

    while (stack.length && stack[stack.length - 1] == 'anonymous') {
      stack.length = stack.length - 1;
    }
    return stack;
  };

  /**
  * Strips whitespace from either end of the given string
  * @param string
  */
  UtgsUnit.Util.trim = function(string) {
    if (string == null)
      return null;

    let startingIndex = 0;
    let endingIndex = string.length - 1;

    const singleWhitespaceRegex = /\s/;
    while (string.substring(startingIndex, startingIndex + 1).match(singleWhitespaceRegex))
      startingIndex++;

    while (string.substring(endingIndex, endingIndex + 1).match(singleWhitespaceRegex))
      endingIndex--;

    if (endingIndex < startingIndex)
      return '';

    return string.substring(startingIndex, endingIndex + 1);
  };

  UtgsUnit.Util.getKeys = function(obj) {
    let keys = [];
    for (const key in obj) {
      keys.push(key);
    }
    return keys;
  };

  // private function here that makes context managers
  //:

  UtgsUnit.Util.inherit = function(superclass, subclass) {
      var x = function() {};
      x.prototype = superclass.prototype;
      subclass.prototype = new x();
  };

  const assert = {

    FailError: UtgsUnit.Failure,

    contextManager: UtgsUnit.Util.ContextManager,

    /**
    * Checks that two values are equal (using ===)
    * @param {String} comment optional, displayed in the case of failure
    * @param {Value} expected the expected value
    * @param {Value} actual the actual value
    * @throws UtgsUnit.Failure if the values are not equal
    * @throws UtgsUnitInvalidAssertionArgument if an incorrect number of arguments is passed
    */
    equals: function (opt) {
      UtgsUnit.validateArguments(opt, 'expected actual');
      UtgsUnit.assert(opt.comment, UtgsUnit.checkEquals(opt.expected, opt.actual), `Expected ${opt.expected} but was ${opt.actual}`);
    },


    /**
    * Checks that the given boolean value is true.
    * @param {String} comment optional, displayed in the case of failure
    * @param {Boolean} value that is expected to be true
    * @throws UtgsUnit.Failure if the given value is not true
    * @throws UtgsUnitInvalidAssertionArgument if the given value is not a boolean or if an incorrect number of arguments is passed
    */
    assert: function (opt) {
        UtgsUnit.validateArguments(opt, 'actual');
        if (typeof(opt.actual) !== 'boolean')
            throw new UtgsUnit.AssertionArgumentError('Bad argument to assert(boolean)');

        UtgsUnit.assert(opt.comment, opt.actual === true, 'Call to assert(boolean) with false');
    },


    /**
    * Synonym for true_
    * @see #assert
    */
    true_: function (opt) {
        this.assert(opt);
    },

    /**
    * Checks that a boolean value is false.
    * @param {String} comment optional, displayed in the case of failure
    * @param {Boolean} value that is expected to be false
    * @throws UtgsUnit.Failure if value is not false
    * @throws UtgsUnitInvalidAssertionArgument if the given value is not a boolean or if an incorrect number of arguments is passed
    */
    false_: function (opt) {
        UtgsUnit.validateArguments(opt, 'actual');

        if (typeof(opt.actual) !== 'boolean')
            throw new UtgsUnit.AssertionArgumentError('Bad argument to false_(boolean)');

        UtgsUnit.assert(opt.comment, opt.actual === false, 'Call to false_(boolean) with true');
    },

    /**
    * Checks that two values are not equal (using !==)
    * @param {String} comment optional, displayed in the case of failure
    * @param {Value} value1 a value
    * @param {Value} value2 another value
    * @throws UtgsUnit.Failure if the values are equal
    * @throws UtgsUnitInvalidAssertionArgument if an incorrect number of arguments is passed
    */
    notEqual: function (opt) {
        UtgsUnit.validateArguments(opt, 'expected actual');
        UtgsUnit.assert(opt.comment, opt.expected !== opt.actual, `Expected not to be ${opt.expected}`);
    },

    /**
    * Checks that a value is null
    * @param {opt}
    * @throws UtgsUnit.Failure if the value is not null
    * @throws UtgsUnitInvalidAssertionArgument if an incorrect number of arguments is passed
    */
    null_: function (opt) {
        UtgsUnit.validateArguments(opt, 'actual');
        UtgsUnit.assert(opt.comment, opt.actual === null, `Expected ${UtgsUnit.displayStringForValue(null)} but was ${opt.actual}`);
    },

    /**
    * Checks that a value is not null
    * @param {opt} value the value
    * @throws UtgsUnit.Failure if the value is null
    * @throws UtgsUnitInvalidAssertionArgument if an incorrect number of arguments is passed
    */
    notNull: function(opt) {
      UtgsUnit.validateArguments(opt, 'actual');
      UtgsUnit.assert(opt.comment, UtgsUnit.checkNotNull(opt.actual), `Expected not to be ${UtgsUnit.displayStringForValue(null)}`);
    },

    /**
    * Checks that a value is undefined
    * @param {opt}
    * @throws UtgsUnit.Failure if the value is not undefined
    * @throws UtgsUnitInvalidAssertionArgument if an incorrect number of arguments is passed
    */
    undefined_: function (opt) {
        UtgsUnit.validateArguments(opt, 'actual');
        UtgsUnit.assert(opt.comment, opt.actual === UtgsUnit_UNDEFINED_VALUE, `Expected ${UtgsUnit.displayStringForValue(UtgsUnit_UNDEFINED_VALUE)} but was ${UtgsUnit.displayStringForValue(opt.actual)}`);
    },

    /**
    * Checks that a value is not undefined
    * @param {opt} comment optional, displayed in the case of failure
    * @throws UtgsUnit.Failure if the value is undefined
    * @throws UtgsUnitInvalidAssertionArgument if an incorrect number of arguments is passed
    */
    notUndefined: function (opt) {
      UtgsUnit.validateArguments(opt, 'actual');
      UtgsUnit.assert(opt.comment, UtgsUnit.checkNotUndefined(opt.actual), `Expected not to be ${UtgsUnit.displayStringForValue(UtgsUnit_UNDEFINED_VALUE)}`);
    },

    /**
    * Checks that a value is NaN (Not a Number)
    * @param {opt} comment optional, displayed in the case of failure
    * @throws UtgsUnit.Failure if the value is a number
    * @throws UtgsUnitInvalidAssertionArgument if an incorrect number of arguments is passed
    */
    NaN_: function (opt) {
      UtgsUnit.validateArguments(opt, 'actual');
      UtgsUnit.assert(opt.comment, isNaN(opt.actual), 'Expected NaN');
    },

    /**
    * Checks that a value is not NaN (i.e. is a number)
    * @param {String} comment optional, displayed in the case of failure
    * @param {Number} value the value
    * @throws UtgsUnit.Failure if the value is not a number
    * @throws UtgsUnitInvalidAssertionArgument if an incorrect number of arguments is passed
    */
    notNaN: function (opt) {
        UtgsUnit.validateArguments(opt, 'actual');
        UtgsUnit.assert(opt.comment, !isNaN(opt.actual), 'Expected not NaN');
    },

    /**
    * Checks that an object is equal to another using === for primitives and their object counterparts but also desceding
    * into collections and calling objectEquals for each element
    * @param {Object} opt
    * @throws UtgsUnit.Failure if the actual value does not equal the expected value
    * @throws UtgsUnitInvalidAssertionArgument if an incorrect number of arguments is passed
    */
    objectEquals: function (opt) {
        UtgsUnit.validateArguments(opt, 'expected actual');
        if (opt.expected === opt.actual)
            return;

        let isEqual = false;

        const typeOfVar1 = UtgsUnit.trueTypeOf(opt.expected);
        const typeOfVar2 = UtgsUnit.trueTypeOf(opt.actual);
        if (typeOfVar1 == typeOfVar2) {
            const primitiveEqualityPredicate = UtgsUnit.PRIMITIVE_EQUALITY_PREDICATES[typeOfVar1];
            if (primitiveEqualityPredicate) {
                isEqual = primitiveEqualityPredicate(opt.expected, opt.actual);
            } else {
                const expectedKeys = UtgsUnit.Util.getKeys(opt.expected).sort().join(", ");
                const actualKeys = UtgsUnit.Util.getKeys(opt.actual).sort().join(", ");
                if (expectedKeys != actualKeys) {
                    UtgsUnit.assert(opt.comment, false, `Expected keys ${expectedKeys} but found ${actualKeys}`);
                }
                for (const i in opt.expected) {
                  this.objectEquals({comment: `{opt.comment} nested ${typeOfVar1} key ${i}\n`,
                                           expected:opt.expected[i],
                                           actual:opt.actual[i]});
                }
                isEqual = true;
            }
        }
        UtgsUnit.assert(opt.comment, isEqual, `Expected ${UtgsUnit.displayStringForValue(opt.expected)} but was ${UtgsUnit.displayStringForValue(opt.actual)}`);
    },

    /**
    * Checks that an array is equal to another by checking that both are arrays and then comparing their elements using objectEquals
    * @param {Object}
    *        {Object.expected} value the expected array
    *        {Object.actual} value the actual array
    * @throws UtgsUnit.Failure if the actual value does not equal the expected value
    * @throws UtgsUnitInvalidAssertionArgument if an incorrect number of arguments is passed
    */
    arrayEquals: function (opt) {
        UtgsUnit.validateArguments(opt, 'expected actual');
        if (UtgsUnit.trueTypeOf(opt.expected) != 'Array' || UtgsUnit.trueTypeOf(opt.actual) != 'Array') {
            throw new UtgsUnit.AssertionArgumentError('Non-array passed to arrayEquals');
        }
        this.objectEquals(opt);
    },

    /**
    * Checks that a value evaluates to true in the sense that value == true
    * @param {String} comment optional, displayed in the case of failure
    * @param {Value} value the value
    * @throws UtgsUnit.Failure if the actual value does not evaluate to true
    * @throws UtgsUnitInvalidAssertionArgument if an incorrect number of arguments is passed
    */
    evaluatesToTrue: function (opt) {
        UtgsUnit.validateArguments(opt, 'actual');
        if (!opt.actual)
            this.fail(opt.comment);
    },

    /**
    * Checks that a value evaluates to false in the sense that value == false
    * @param {String} comment optional, displayed in the case of failure
    * @param {Value} value the value
    * @throws UtgsUnit.Failure if the actual value does not evaluate to true
    * @throws UtgsUnitInvalidAssertionArgument if an incorrect number of arguments is passed
    */
    evaluatesToFalse: function (opt) {
        UtgsUnit.validateArguments(opt, 'actual');
        if (opt.actual)
            this.fail(opt.comment);
    },

    /**
    * Checks that a hash is has the same contents as another by iterating over the expected hash and checking that each
    * key's value is present in the actual hash and calling equals on the two values, and then checking that there is
    * no key in the actual hash that isn't present in the expected hash.
    * @param {String} comment optional, displayed in the case of failure
    * @param {Object} value the expected hash
    * @param {Object} value the actual hash
    * @throws UtgsUnit.Failure if the actual hash does not evaluate to true
    * @throws UtgsUnitInvalidAssertionArgument if an incorrect number of arguments is passed
    */
    hashEquals: function (opt) {
      UtgsUnit.validateArguments(opt, 'actual expected');
      for (const key in opt.expected) {
        this.notUndefined({comment: `Expected hash had key ${key} that was not found in actual`,
                                 actual:opt.actual[key]});
        this.equals({comment:`Value for key ${key} mismatch -- expected = ${opt.expected[key]}, actual = ${opt.actual[key]}`,
                           expected:opt.expected[key],
                           actual:opt.actual[key]}
                         );
      }
      for (var key in opt.actual) {
        this.notUndefined({comment:`Actual hash had key ${key} that was not expected`, actual:opt.expected[key]});
      }
    },

    /**
    * Checks that two value are within a tolerance of one another
    * @param {String} comment optional, displayed in the case of failure
    * @param {Number} value1 a value
    * @param {Number} value1 another value
    * @param {Number} tolerance the tolerance
    * @throws UtgsUnit.Failure if the two values are not within tolerance of each other
    * @throws UtgsUnitInvalidAssertionArgument if an incorrect number of arguments is passed
    */
    roughlyEquals: function (opt) {
      UtgsUnit.validateArguments(opt, 'actual expected tolerance');
      this.true_({comment: `Expected ${opt.expected} but got ${opt.actual} which was more than ${opt.tolerance}  away`,
                       actual:Math.abs(opt.expected - opt.actual) < opt.tolerance});
    },

    /**
    * Checks that a collection contains a value by checking that collection.indexOf(value) is not -1
    * @param {Object}
    * @param {Object.collection}
    * @param {Object.value}
    * @throws UtgsUnit.Failure if the collection does not contain the value
    * @throws UtgsUnitInvalidAssertionArgument if an incorrect number of arguments are passed
    */
    contains: function (opt) {
      UtgsUnit.validateArguments(opt, 'value collection');
      this.true_({comment: `Expected ${opt.collection} to contain ${opt.value}`,
                       actual: opt.collection.indexOf(opt.value) != -1});
    },

    /**
    * Checks that two arrays have the same contents, ignoring the order of the contents
    * @param {Object}
    * @param {Object.expected} array1 first array
    * @param {Object.actual} second array
    * @throws UtgsUnit.Failure if the two arrays contain different contents
    * @throws UtgsUnitInvalidAssertionArgument if an incorrect number of arguments are passed
    */
    arrayEqualsIgnoringOrder: function(opt) {
        UtgsUnit.validateArguments(opt, 'expected actual');

        const notEqualsMessage = `Expected arrays ${opt.expected} and ${opt.actual} to be equal (ignoring order)`;
        const notArraysMessage = `Expected arguments ${opt.expected} and ${opt.actual} to be arrays`;

        UtgsUnit.assert(opt.comment, UtgsUnit.checkNotNull(opt.expected), notEqualsMessage);
        UtgsUnit.assert(opt.comment, UtgsUnit.checkNotNull(opt.actual), notEqualsMessage);

        UtgsUnit.assert(opt.comment, UtgsUnit.checkNotUndefined(opt.expected.length), notArraysMessage);
        UtgsUnit.assert(opt.comment, UtgsUnit.checkNotUndefined(opt.expected.join), notArraysMessage);
        UtgsUnit.assert(opt.comment, UtgsUnit.checkNotUndefined(opt.actual.length), notArraysMessage);
        UtgsUnit.assert(opt.comment, UtgsUnit.checkNotUndefined(opt.actual.join), notArraysMessage);

        UtgsUnit.assert(opt.comment, UtgsUnit.checkEquals(opt.expected.length, opt.actual.length), notEqualsMessage);

        for (let i = 0; i < opt.expected.length; i++) {
            let found = false;
            for (let j = 0; j < opt.actual.length; j++) {
                try {
                  this.objectEquals({comment: notEqualsMessage,
                                           expected:opt.expected[i],
                                           actual: opt.actual[j]});
                    found = true;
                } catch (ignored) {
                }
            }
            UtgsUnit.assert(opt.comment, found, notEqualsMessage);
        }
    },

    throws: function (opt, func) {
      UtgsUnit.validateArguments(opt, 'expectedError');
      if (typeof(func) !== 'function') throw UtgsUnit.Failure("Must have function");
      let caughtError = false;

      try {
        func.call();
      } catch (err) {
        caughtError = true;
        UtgsUnit.assert(opt.comment, err instanceof opt.expectedError, `Expected thrown error to be of type ${(opt.expectedError.name || opt.expectedError.toString())}`);
      }

      if (!caughtError)
        throw UtgsUnit.Failure("No error was thrown, expecting error of type '" + opt.expectedError.name);
    },

    doesNotThrow: function (opt, func) {
      UtgsUnit.validateArguments(opt, 'unexpectedError');
      if (typeof(func) !== 'function') throw UtgsUnit.Failure("Must have function");

      try {
        func.call();
      } catch (err) {
        UtgsUnit.assert(opt.comment, err instanceof opt.unexpectedError, "Did not expect to throw error of type " + opt.unexpectedError.name);
      }
    },

    /* TODO: Fix the use of assert.result */
    throwsError: function (comment, func) {
      const saved = assert.result;

      if (arguments.length == 1) {
        func = comment;
        comment = '';
      }
      let ret = this.throws.call(this, {expectedError:Error}, func);
      if (assert.result == false && saved == true) {
        assert.result = true;
      }
      return ret;
    },

    doesNotThrowError: function (comment, func) {
      if (arguments.length == 1) {
        func = comment;
        comment = '';
      }
      return this.doesNotThrow.call(this, {unexpectedError: Error}, func);
    },

    throwsTypeError: function (comment, func) {
      if (arguments.length == 1) {
        func = comment;
        comment = '';
      }
      return this.throws.call(this, {expectedError: TypeError}, func);
    },

    throwsRangeError: function (comment, func) {
      if (arguments.length == 1) {
        func = comment;
        comment = '';
      }
      return this.throws.call(this, {expectedError: RangeError,
                                           comment:comment}, func);
    },

    throwsReferenceError: function (comment, func) {
      if (arguments.length == 1) {
        func = comment;
        comment = '';
      }
      return this.throws.call(this, {comment: comment,
                                           expectedError: ReferenceError}, func);
    },

    describe: function (description, body) {
      let ctx = new UtgsUnit.Util.ContextManager();
      ctx.enter = () => { _log = ['\n\n' + description]; };
      ctx.exit = () => {
        _log.push('\n');
        Logger.log(_log.join('\n'));
        _log = [];
      };
      ctx.with(body);
    },

    withContext: function (body, options) {
      let ctx = new UtgsUnit.Util.ContextManager(options);
      ctw.with(body);
    },

    it: function (shouldMessage, body) {
      let ctx = new UtgsUnit.Util.ContextManager();
      ctx.enter  = function () {
        this.result = "\t✔ " + shouldMessage;
      };
      ctx.error = function (err, obj) {
        this.result = `\t✘ ${shouldMessage} ${err.stack}`;
        return null;
      };
      ctx.exit = function (obj) {
        log(this.result);
      };
      ctx.params = {};
      //go
      ctx.with(body);
    },

    skip: function (shouldMessage, body) {
      log("\t☛ " + shouldMessage + '... SKIPPED');
    },

    /**
    * Causes a failure
    * @param failureMessage the message for the failure
    */
    fail: function (failureMessage) {
        throw new UtgsUnit.Failure("Call to fail()", failureMessage);
    }
  };

  const describe = assert.describe;
  const it = assert.it;

  function Log () {
      if (Object.hasOwnProperty(window.Logger, 'get')) return;

      class log {
          constructor () {
              this._log = [];
          }

          log (...params) {
              this._log.push(params.join(""));
          }

          get () {
              this._log.join("\n");
          }
      }
      window.Logger = log();
  }
  Log.get = function () {
      return Object.hasOwnProperty(window.Logger, 'get') ? window.Logger.get() : null;
  };

  if (remote) Log();

  (function shortform() {
    // mimic how to use it in library context
    const Endpoints = __mocklib();

    describe("interacting incorrectly with endpoint that produces 404", _ => {
      const endpoint = Endpoints.$.createGoogEndpoint('sheets', 'v4', 'spreadsheets', 'get');
      const request = endpoint.httppost({spreadsheetId: '12345'});
      const response = request.fetch();
      let json;
      assert.doesNotThrowError("parsing json on known 404 does not throw error", _ => {
        json = response.json;
      });
      it("json instead contains error object with message and information", _ => {
        let actual = Object.keys(json);
        let expected = ['error', 'text'];
        assert.arrayEquals({actual, expected});
        actual = Object.keys(json.error);
        expected = ['status', 'message', 'charset', 'mime'];
        assert.arrayEquals({actual, expected});
      });
    });

    describe("using batch mode to mirror spreadsheet writes", _ => {
      const SheetsUpdateEndpoint = Endpoints.$.createGoogEndpoint('sheets', 'v4', 'spreadsheets.values', 'update');
      const ids = ['1Z3AVtlz3ZwwkV5Hl8MfhQEl4vo5VYysjb0BfhAtVt_g', '1fZgGhMsLPFeI_7Jhl2vE7SFJDh6AEBVVWs4wSjn-yMg'];
      const batch = Endpoints.$.initBatch();

      ids.forEach(id => {
        const request = SheetsUpdateEndpoint.createRequest('put',
          { /* path parameters */
            range: 'Sheet1!A1',
            spreadsheetId: id
          },{ /* query parameters */
            valueInputOption: 'RAW'
          },{ /* payload */
            range: 'Sheet1!A1',
            majorDimension: 'ROWS',
            values: [[1]]
          }
        );
        batch.add({request});
      });

      const responses = batch.fetchAll();
      it("responses has length of 2", _ => {
        const actual = responses.length;
        const expected = 2;
        assert.equals({actual, expected});
      });
    });

    describe("using service account to create", _ => {
      // tester must fill in valid values for email/privateKey to test, instructions are to make service account and download json credentials
      const email = 'starting-account-m8b0jts7iwss@geek-squad-bot-1584535963981.iam.gserviceaccount.com'; // ''
      const privateKey = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDSGqnJ6wlaB7Ki\nkB1fm4gsXPDI7ARM4PqAZChwfbUvRnMxzC3j0BSB5KEHS4yOM5gcaStwrPLifRKQ\nEBglckEYemkz57W9XZoYerVPXqmuU1ez/ZYhNGmeTXmmNVzYMGNr35/OPmCEBAgX\nsb9IX9XYNmp1SCzlW8MZelfH60brZtcDdb0OSp/aqkWGqmTcnzBcvUp9KKhRoZx5\ndUX6MmKq+epReYXpRtutdmRAXIknByfs9dffKZbT+d9yL+oP5mPNvgALqPHEugar\neH3X+OguwCetZBYH9H4BSZ7BSMSBA0X8+sj5tDwwNBdx8Cg7tC57wbzycI4lFA5Z\nBlg3CkVDAgMBAAECggEADnhlpJF6exKNUWLpkvx28XnpNNKvLSL66GgoMi8w5l5M\nxWuRkYodj3X78oZX2jIK0jzFZXo+iYN3CX2s8WSgFRvWg7ZRWbHI+3ygC3pdPLNi\nwUkVfkNKLuvuaphsROYi7Xq2WpGzO1m9EPIIrDxlfFcAbVluNicOwIIg6j+gX8qn\nyukpge7fjBPjHWNN2WsQalIHeeSh9E8eLPVHwZIZos0V9jGTQDTiXVhZIlp/bplk\nQIAYXEN03YHCDlwxljUsAm16VDo2pBaTlecgxXnmHnjs9hx3bwhYpqjXXB4wHqpH\nFHbimiRTLg5ypxaBZuiQeGromPCu/KTHMAb8gloZwQKBgQDxbIwc16KtsmPjBiT1\n7yi1Qn18t9jESsB34sT1Fboz2oPznFCiQzoIOoOhmSH62O54ovYo79mO2EjRSM9E\nNsnY3eJfnG+1I4bB5gKg3x6MvKR0/hDwYAj4ulQbplIO/y8SkQKf21nMbHctYrTv\n2dXdPACr8AX0s9sKoDjifru0IQKBgQDeygknzHX9OEg+2XeLDk6BTPdtDewPJ1rn\nq6+Tcsxu5As3sGcjj888s7wnIlzOVSh/ii6r6JLft2hBhXPIhFpLeY6jYazjt/zv\nBsHrdQ/rsWHtKFpM4CN/vM6kJ4/BPKZej1f4XBCq9IQ20szcFLKpccaRLcA6C5S3\nTDywRSgM4wKBgQC2o2J/81W7R8gvGBfgAbRvI8ThFAglv1NJnsFXk79QuQ+3vNp3\nVppRXUr1dm5xYalOlCHbKFASs2arBQTf2v7qVDmMEUGk7CJnD4WPhBuNZqyXYRkZ\nb915pSQ54qITfFN1HUS6AGw3rRqfuBufk9Ep09nCOQuYanPb3wgJuMxxYQKBgQDK\nJrSMAkAFVi5nqNeJu5+MP5Q6xekuDt2zXNthhUbuT8nF7DCJ2hGG2Oee8tUW+7pV\nj8KthcjPahIVccwPY9iyp0fAA/7mWaoOESmgRoX9rORYVsco/i/31hACb0tHYYrs\nPlDqME+Hb3sQa9Iq2DUM/wnX7ZWAlcWJVIm0v+uJVQKBgFns6ZjvwW1hVtPYwadQ\nIBWZhNnFu2wxeSKms/P4vXNcirl7lyYH5BzfAWE3ff0u8uR4E5wcTbi8ea/PLn4D\naQbf7M6Lb0S6ezZYzEjuXBGfL10MBMH4EXzz8cQQprYjcyYBb5MtPrd5zVGafGa4\n5jlOe/NbMqVN+gf7JO2YmJuC\n-----END PRIVATE KEY-----\n';  // ''
      const oauth = Endpoints.$.makeGoogOauthService('Chat', email, privateKey, ['https://www.googleapis.com/auth/chat.bot']);
      const endpoint = Endpoints.$.createGoogEndpointWithOauth('chat', 'v1', 'spaces', 'list', oauth);
      const request = endpoint.httpget();
      const response = request.fetch();
      it("Spaces available", _ => {
        const actual = response.json.spaces;
        assert.notUndefined({actual});
      });
    });

    describe("http get requests to sheets v4 service, expected to fail", _ => {
      const endpoint = Endpoints.$.createGoogEndpoint('sheets', 'v4', 'spreadsheets', 'get');
      const baseUrl = endpoint.baseUrl;

      it("Endpoint#baseUrl returns templated string of endpoint", _ => {
        const actual = baseUrl;
        const expected = 'https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}';
        assert.equals({actual, expected});
      });

      const substitutions = {spreadsheetId: 'id'};
      const request = endpoint.httpget(substitutions);

      const url = request.url;
      it("Request#getUrl returns url based on substitutions within baseUrl", _ => {
        const actual = url;
        const expected = 'https://sheets.googleapis.com/v4/spreadsheets/id';
        assert.equals({actual, expected});
      });

      const response = request.fetch();
      const ok = response.ok;

      it("Response#isOk indicates unsuccessful request", _ => {
        const actual = ok;
        const expected = false;
        assert.equals({actual, expected});
      });

      const status = response.statusCode;
      it("Response#statusCode indicates 403 error (permission denied)", _ => {
        const actual = status;
        const expected = 403;
        assert.equals({actual, expected});
      });

      const json = response.json;
      const headers = response.headers;
      it("Response#headers returns headers with Content-Type 'application/json; charset=UTF-8'", _ => {
        const actual = headers['Content-Type'];
        const expected = 'application/json; charset=UTF-8';
        assert.equals({actual, expected});
      });

      it("Response#json returns json with error.status set to 'PERMISSION_DENIED'", _ => {
        const actual = json.error.status;
        const expected = 'PERMISSION_DENIED';
        assert.equals({actual, expected});
      });

      const sendRequest = response.requestObject;
      it("Response#response returns the original request", _ => {
        const actual = sendRequest;
        assert.notUndefined({actual});
      });

      const sentHeaders = sendRequest.headers;
      it("Request#headers returns Authorization: Bearer", _ => {
        const collection = Object.keys(sentHeaders);
        const value = 'Authorization';
        assert.contains({value, collection});
      });

    });

    describe("http get request with no authentication", _ => {
      const wpurl = 'https://test.wikipedia.org/w/api.php';
      const page = 'Albert_Einstein';
      const req = Endpoints.$.createGetRequest(wpurl);

      it("internally, Request#query object starts with empty object", _ => {
        const actual = req.query;
        const expected = {};
        assert.objectEquals({actual, expected});
      });

      it("internally, Request#url is same as original passed", _ => {
        const actual = req.url;
        const expected = wpurl;
        assert.equals({actual, expected});
      });

      req.addQuery({action: 'query', prop: 'images', format: 'json'});

      it("Request#addQuery appends query parameters to returned url", _ => {
        const actual = req.url;
        const expected = `${wpurl}?action=query&prop=images&format=json`;
        assert.equals({actual, expected});
      });

      req.addQuery({titles: page});

      it("Request#addQuery appends query parameters to url, keeping old values", _ => {
        const actual = req.url;
        const expected = `${wpurl}?action=query&prop=images&format=json&titles=Albert_Einstein`;
        assert.equals({actual, expected});
      });

      const resp = req.fetch(req);
      const ok = resp.ok;
      it("Response#ok returns true on success", _ => {
        const actual = ok;
        const expected = true;
        assert.equals({actual, expected});
      });

      const json = resp.json;
      it("Response#json returns parsed json", _ => {
        const actual = Object.keys(json);
        const expected = ['batchcomplete', 'query'];
        const comment = "test object keys as values might change over time";
        assert.arrayEquals({actual, expected, comment});
      });

      const status = resp.statusCode;
      it("Response#statusCode returns 200 on success", _ => {
        const actual = status;
        const expected = 200;
        assert.equals({actual, expected});
      });

    });
  })();

  if (remote) Log();

  (function longform() {
    // mimic how to use it in library context
    const Endpoints = __mocklib();
    const startTime = new Date().getTime();

    describe("interacting incorrectly with endpoint that produces 404", _ => {
      const endpoint = Endpoints.$.createGoogEndpoint('sheets', 'v4', 'spreadsheets', 'get');
      const request = endpoint.httppost({spreadsheetId: '12345'});
      const response = request.fetch();
      let json;
      assert.doesNotThrowError("parsing json on known 404 does not throw error", _ => {
        json = response.json;
      });
      it("json instead contains error object with message and information", _ => {
        let actual = Object.keys(json);
        let expected = ['error', 'text'];
        assert.arrayEquals({actual, expected});
        actual = Object.keys(json.error);
        expected = ['status', 'message', 'charset', 'mime'];
        assert.arrayEquals({actual, expected});
      });
    });

    describe("using batch mode to mirror spreadsheet writes", _ => {
      const SheetsUpdateEndpoint = Endpoints.$.createGoogEndpoint('sheets', 'v4', 'spreadsheets.values', 'update');
      const ids = ['1Z3AVtlz3ZwwkV5Hl8MfhQEl4vo5VYysjb0BfhAtVt_g', '1fZgGhMsLPFeI_7Jhl2vE7SFJDh6AEBVVWs4wSjn-yMg'];
      const batch = Endpoints.$.initBatch();

      ids.forEach(id => {
        const request = Endpoints.Endpoint.createRequest(SheetsUpdateEndpoint, 'put',
          { /* path parameters */
            range: 'Sheet1!A1',
            spreadsheetId: id
          },{ /* query parameters */
            valueInputOption: 'RAW'
          },{ /* payload */
            range: 'Sheet1!A1',
            majorDimension: 'ROWS',
            values: [[1]]
          }
        );
        Endpoints.Batch.add(batch, request);
      });

      const responses = Endpoints.Batch.fetchAll(batch);
      it("responses has length of 2", _ => {
        const actual = responses.length;
        const expected = 2;
        assert.equals({actual, expected});
      });
    });

    describe("using service account to create", _ => {
      // tester must fill in valid values for email/privateKey to test, instructions are to make service account and download json credentials
      const email = 'starting-account-m8b0jts7iwss@geek-squad-bot-1584535963981.iam.gserviceaccount.com'; // ''
      const privateKey = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDSGqnJ6wlaB7Ki\nkB1fm4gsXPDI7ARM4PqAZChwfbUvRnMxzC3j0BSB5KEHS4yOM5gcaStwrPLifRKQ\nEBglckEYemkz57W9XZoYerVPXqmuU1ez/ZYhNGmeTXmmNVzYMGNr35/OPmCEBAgX\nsb9IX9XYNmp1SCzlW8MZelfH60brZtcDdb0OSp/aqkWGqmTcnzBcvUp9KKhRoZx5\ndUX6MmKq+epReYXpRtutdmRAXIknByfs9dffKZbT+d9yL+oP5mPNvgALqPHEugar\neH3X+OguwCetZBYH9H4BSZ7BSMSBA0X8+sj5tDwwNBdx8Cg7tC57wbzycI4lFA5Z\nBlg3CkVDAgMBAAECggEADnhlpJF6exKNUWLpkvx28XnpNNKvLSL66GgoMi8w5l5M\nxWuRkYodj3X78oZX2jIK0jzFZXo+iYN3CX2s8WSgFRvWg7ZRWbHI+3ygC3pdPLNi\nwUkVfkNKLuvuaphsROYi7Xq2WpGzO1m9EPIIrDxlfFcAbVluNicOwIIg6j+gX8qn\nyukpge7fjBPjHWNN2WsQalIHeeSh9E8eLPVHwZIZos0V9jGTQDTiXVhZIlp/bplk\nQIAYXEN03YHCDlwxljUsAm16VDo2pBaTlecgxXnmHnjs9hx3bwhYpqjXXB4wHqpH\nFHbimiRTLg5ypxaBZuiQeGromPCu/KTHMAb8gloZwQKBgQDxbIwc16KtsmPjBiT1\n7yi1Qn18t9jESsB34sT1Fboz2oPznFCiQzoIOoOhmSH62O54ovYo79mO2EjRSM9E\nNsnY3eJfnG+1I4bB5gKg3x6MvKR0/hDwYAj4ulQbplIO/y8SkQKf21nMbHctYrTv\n2dXdPACr8AX0s9sKoDjifru0IQKBgQDeygknzHX9OEg+2XeLDk6BTPdtDewPJ1rn\nq6+Tcsxu5As3sGcjj888s7wnIlzOVSh/ii6r6JLft2hBhXPIhFpLeY6jYazjt/zv\nBsHrdQ/rsWHtKFpM4CN/vM6kJ4/BPKZej1f4XBCq9IQ20szcFLKpccaRLcA6C5S3\nTDywRSgM4wKBgQC2o2J/81W7R8gvGBfgAbRvI8ThFAglv1NJnsFXk79QuQ+3vNp3\nVppRXUr1dm5xYalOlCHbKFASs2arBQTf2v7qVDmMEUGk7CJnD4WPhBuNZqyXYRkZ\nb915pSQ54qITfFN1HUS6AGw3rRqfuBufk9Ep09nCOQuYanPb3wgJuMxxYQKBgQDK\nJrSMAkAFVi5nqNeJu5+MP5Q6xekuDt2zXNthhUbuT8nF7DCJ2hGG2Oee8tUW+7pV\nj8KthcjPahIVccwPY9iyp0fAA/7mWaoOESmgRoX9rORYVsco/i/31hACb0tHYYrs\nPlDqME+Hb3sQa9Iq2DUM/wnX7ZWAlcWJVIm0v+uJVQKBgFns6ZjvwW1hVtPYwadQ\nIBWZhNnFu2wxeSKms/P4vXNcirl7lyYH5BzfAWE3ff0u8uR4E5wcTbi8ea/PLn4D\naQbf7M6Lb0S6ezZYzEjuXBGfL10MBMH4EXzz8cQQprYjcyYBb5MtPrd5zVGafGa4\n5jlOe/NbMqVN+gf7JO2YmJuC\n-----END PRIVATE KEY-----\n';  // ''
      const oauth = Endpoints.$.makeGoogOauthService('Chat', email, privateKey, ['https://www.googleapis.com/auth/chat.bot']);
      const endpoint = Endpoints.$.createGoogEndpointWithOauth('chat', 'v1', 'spaces', 'list', oauth);
      const request = Endpoints.Endpoint.httpget(endpoint);
      const response = Endpoints.Request.fetch(request);
      it("Spaces available", _ => {
        const actual = response.json.spaces;
        assert.notUndefined({actual});
      });

    });

    describe("http get requests to sheets v4 service, expected to fail", _ => {
      const endpoint = Endpoints.$.createGoogEndpoint('sheets', 'v4', 'spreadsheets', 'get');
      const baseUrl = Endpoints.Endpoint.getBaseUrl(endpoint);

      it("Endpoint.endpoint.getBaseUrl returns templated string of endpoint", _ => {
        const actual = baseUrl;
        const expected = 'https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}';
        assert.equals({actual, expected});
      });

      const substitutions = {spreadsheetId: 'id'};
      const request = Endpoints.Endpoint.httpget(endpoint, substitutions);

      const url = Endpoints.Request.getUrl(request);
      it("Endpoints.Request.getUrl returns url based on substitutions within baseUrl", _ => {
        const actual = url;
        const expected = 'https://sheets.googleapis.com/v4/spreadsheets/id';
        assert.equals({actual, expected});
      });

      const response = Endpoints.Request.fetch(request);
      const ok = Endpoints.Response.isOk(response);

      it("Endpoints.Response.isOk indicates unsuccessful request", _ => {
        const actual = ok;
        const expected = false;
        assert.equals({actual, expected});
      });

      const status = Endpoints.Response.getStatusCode(response);
      it("Endpoints.Response.getStatusCode indicates 403 error (permission denied)", _ => {
        const actual = status;
        const expected = 403;
        assert.equals({actual, expected});
      });

      const json = Endpoints.Response.getJson(response);
      const headers = Endpoints.Response.getHeaders(response);
      it("Endpoints.Response.getHeaders returns headers with Content-Type 'application/json; charset=UTF-8'", _ => {
        const actual = headers['Content-Type'];
        const expected = 'application/json; charset=UTF-8';
        assert.equals({actual, expected});
      });

      it("Endpoints.Response.getJson returns json with error.status set to 'PERMISSION_DENIED'", _ => {
        const actual = json.error.status;
        const expected = 'PERMISSION_DENIED';
        assert.equals({actual, expected});
      });

      const sendRequest = Endpoints.Response.getRequestObject(response);
      it("Endpoints.Response.getResponse returns the original request", _ => {
        const actual = sendRequest;
        assert.notUndefined({actual});
      });

      const sentHeaders = sendRequest.headers;
      it("Endpoints.Request.getHeaders returns Authorization: Bearer", _ => {
        const collection = Object.keys(sentHeaders);
        const value = 'Authorization';
        assert.contains({value, collection});
      });

    });

    describe("http get request with no authentication", _ => {
      const wpurl = 'https://test.wikipedia.org/w/api.php';
      const page = 'Albert_Einstein';
      const req = Endpoints.$.createGetRequest(wpurl);

      it("internally, Request#query object starts with empty object", _ => {
        const actual = req.query;
        const expected = {};
        assert.objectEquals({actual, expected});
      });

      it("internally, Request#url is same as original passed", _ => {
        const actual = req.url;
        const expected = wpurl;
        assert.equals({actual, expected});
      });

      Endpoints.Request.addQuery(req, {action: 'query', prop: 'images', format: 'json'});

      it("Endpoints.Request.addQuery appends query parameters to returned url", _ => {
        const actual = req.url;
        const expected = `${wpurl}?action=query&prop=images&format=json`;
        assert.equals({actual, expected});
      });

      Endpoints.Request.addQuery(req, {titles: page});

      it("Endpoints.Request.addQuery appends query parameters to url, keeping old values", _ => {
        const actual = req.url;
        const expected = `${wpurl}?action=query&prop=images&format=json&titles=Albert_Einstein`;
        assert.equals({actual, expected});
      });

      const resp = Endpoints.Request.fetch(req);
      const ok = Endpoints.Response.isOk(resp);
      it("Endpoints.Response.isOk returns true on success", _ => {
        const actual = ok;
        const expected = true;
        assert.equals({actual, expected});
      });

      const json = Endpoints.Response.getJson(resp);
      it("Endpoints.Response.getJson returns parsed json", _ => {
        const actual = Object.keys(json);
        const expected = ['batchcomplete', 'query'];
        const comment = "test object keys as values might change over time";
        assert.arrayEquals({actual, expected, comment});
      });

      const status = Endpoints.Response.getStatusCode(resp);
      it("Endpoints.Response.getStatusCode returns 200 on success", _ => {
        const actual = status;
        const expected = 200;
        assert.equals({actual, expected});
      });

    });

    const endTime = new Date().getTime();
    const seconds = (endTime - startTime) / 1000;
    Logger.log(seconds);

  })();

}());
try { return Log.get() } catch (e) {} }
