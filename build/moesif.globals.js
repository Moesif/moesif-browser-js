(function () {
    'use strict';

    var Config = {
        DEBUG: false,
        LIB_VERSION: '1.6.2'
    };

    // since es6 imports are static and we run unit tests from the console, window won't be defined when importing this file
    var win;
    if (typeof(window) === 'undefined') {
        win = {
            navigator: {}
        };
    } else {
        win = window;
    }


    /*
     * Saved references to long variable names, so that closure compiler can
     * minimize file size.
     */

    var ArrayProto = Array.prototype;
    var FuncProto = Function.prototype;
    var ObjProto = Object.prototype;
    var slice = ArrayProto.slice;
    var toString = ObjProto.toString;
    var hasOwnProperty = ObjProto.hasOwnProperty;
    var windowConsole = win.console;
    var navigator$1 = win.navigator;
    var document$1 = win.document;
    var userAgent = navigator$1.userAgent;
    var nativeBind = FuncProto.bind;
    var nativeForEach = ArrayProto.forEach;
    var nativeIndexOf = ArrayProto.indexOf;
    var nativeMap = ArrayProto.map;
    var nativeIsArray = Array.isArray;
    var breaker = {};
    var _ = {
        trim: function(str) {
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/Trim#Polyfill
            return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        }
    };

    // Console override
    var console = {
        /** @type {function(...[*])} */
        log: function() {
            if (Config.DEBUG && !_.isUndefined(windowConsole) && windowConsole) {
                try {
                    windowConsole.log.apply(windowConsole, arguments);
                } catch (err) {
                    _.each(arguments, function(arg) {
                        windowConsole.log(arg);
                    });
                }
            }
        },
        /** @type {function(...[*])} */
        error: function() {
            if (Config.DEBUG && !_.isUndefined(windowConsole) && windowConsole) {
                var args = ['Moesif error:'].concat(_.toArray(arguments));
                try {
                    windowConsole.error.apply(windowConsole, args);
                } catch (err) {
                    _.each(args, function(arg) {
                        windowConsole.error(arg);
                    });
                }
            }
        },
        /** @type {function(...[*])} */
        critical: function() {
            if (!_.isUndefined(windowConsole) && windowConsole) {
                var args = ['Moesif error:'].concat(_.toArray(arguments));
                try {
                    windowConsole.error.apply(windowConsole, args);
                } catch (err) {
                    _.each(args, function(arg) {
                        windowConsole.error(arg);
                    });
                }
            }
        }
    };


    // UNDERSCORE
    // Embed part of the Underscore Library
    _.bind = function(func, context) {
        var args, bound;
        if (nativeBind && func.bind === nativeBind) {
            return nativeBind.apply(func, slice.call(arguments, 1));
        }
        if (!_.isFunction(func)) {
            throw new TypeError();
        }
        args = slice.call(arguments, 2);
        bound = function() {
            if (!(this instanceof bound)) {
                return func.apply(context, args.concat(slice.call(arguments)));
            }
            var ctor = {};
            ctor.prototype = func.prototype;
            var self = new ctor();
            ctor.prototype = null;
            var result = func.apply(self, args.concat(slice.call(arguments)));
            if (Object(result) === result) {
                return result;
            }
            return self;
        };
        return bound;
    };

    _.bind_instance_methods = function(obj) {
        for (var func in obj) {
            if (typeof(obj[func]) === 'function') {
                obj[func] = _.bind(obj[func], obj);
            }
        }
    };

    _.isEmptyString = function isEmptyString(str) {
      return (!str || str.length === 0);
    };

    /**
     * @param {*=} obj
     * @param {function(...[*])=} iterator
     * @param {Object=} context
     */
    _.each = function(obj, iterator, context) {
        if (obj === null || obj === undefined) {
            return;
        }
        if (nativeForEach && obj.forEach === nativeForEach) {
            obj.forEach(iterator, context);
        } else if (obj.length === +obj.length) {
            for (var i = 0, l = obj.length; i < l; i++) {
                if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) {
                    return;
                }
            }
        } else {
            for (var key in obj) {
                if (hasOwnProperty.call(obj, key)) {
                    if (iterator.call(context, obj[key], key, obj) === breaker) {
                        return;
                    }
                }
            }
        }
    };

    _.escapeHTML = function(s) {
        var escaped = s;
        if (escaped && _.isString(escaped)) {
            escaped = escaped
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
        return escaped;
    };

    _.extend = function(obj) {
        _.each(slice.call(arguments, 1), function(source) {
            for (var prop in source) {
                if (source[prop] !== void 0) {
                    obj[prop] = source[prop];
                }
            }
        });
        return obj;
    };

    _.isArray = nativeIsArray || function(obj) {
        return toString.call(obj) === '[object Array]';
    };

    // from a comment on http://dbj.org/dbj/?p=286
    // fails on only one very rare and deliberate custom object:
    // var bomb = { toString : undefined, valueOf: function(o) { return "function BOMBA!"; }};
    _.isFunction = function(f) {
        try {
            return /^\s*\bfunction\b/.test(f);
        } catch (x) {
            return false;
        }
    };

    _.isArguments = function(obj) {
        return !!(obj && hasOwnProperty.call(obj, 'callee'));
    };

    _.toArray = function(iterable) {
        if (!iterable) {
            return [];
        }
        if (iterable.toArray) {
            return iterable.toArray();
        }
        if (_.isArray(iterable)) {
            return slice.call(iterable);
        }
        if (_.isArguments(iterable)) {
            return slice.call(iterable);
        }
        return _.values(iterable);
    };

    _.map = function(arr, callback) {
      if (nativeMap && arr.map === nativeMap) {
          return arr.map(callback);
      } else {
          var results = [];
          _.each(arr, function(item) {
              results.push(callback(item));
          });
          return results;
      }
    };

    _.values = function(obj) {
        var results = [];
        if (obj === null) {
            return results;
        }
        _.each(obj, function(value) {
            results[results.length] = value;
        });
        return results;
    };

    _.identity = function(value) {
        return value;
    };

    _.include = function(obj, target) {
        var found = false;
        if (obj === null) {
            return found;
        }
        if (nativeIndexOf && obj.indexOf === nativeIndexOf) {
            return obj.indexOf(target) != -1;
        }
        _.each(obj, function(value) {
            if (found || (found = (value === target))) {
                return breaker;
            }
        });
        return found;
    };

    _.includes = function(str, needle) {
        return str.indexOf(needle) !== -1;
    };

    // Underscore Addons
    _.inherit = function(subclass, superclass) {
        subclass.prototype = new superclass();
        subclass.prototype.constructor = subclass;
        subclass.superclass = superclass.prototype;
        return subclass;
    };

    _.isArrayBuffer = function(value) {
      var hasArrayBuffer = typeof ArrayBuffer === 'function';
      return hasArrayBuffer && (value instanceof ArrayBuffer || toString.call(value) === '[object ArrayBuffer]');
    };

    _.isObject = function(obj) {
        return (obj === Object(obj) && !_.isArray(obj));
    };

    _.isEmptyObject = function(obj) {
        if (_.isObject(obj)) {
            for (var key in obj) {
                if (hasOwnProperty.call(obj, key)) {
                    return false;
                }
            }
            return true;
        }
        return false;
    };

    _.isUndefined = function(obj) {
        return obj === void 0;
    };

    _.isString = function(obj) {
        return toString.call(obj) == '[object String]';
    };

    _.isDate = function(obj) {
        return toString.call(obj) == '[object Date]';
    };

    _.isNumber = function(obj) {
        return toString.call(obj) == '[object Number]';
    };

    _.isElement = function(obj) {
        return !!(obj && obj.nodeType === 1);
    };

    _.encodeDates = function(obj) {
        _.each(obj, function(v, k) {
            if (_.isDate(v)) {
                obj[k] = _.formatDate(v);
            } else if (_.isObject(v)) {
                obj[k] = _.encodeDates(v); // recurse
            }
        });
        return obj;
    };

    _.timestamp = function() {
        Date.now = Date.now || function() {
            return +new Date;
        };
        return Date.now();
    };

    _.formatDate = function(d) {
        // YYYY-MM-DDTHH:MM:SS in UTC
        function pad(n) {
            return n < 10 ? '0' + n : n;
        }
        return d.getUTCFullYear() + '-' +
            pad(d.getUTCMonth() + 1) + '-' +
            pad(d.getUTCDate()) + 'T' +
            pad(d.getUTCHours()) + ':' +
            pad(d.getUTCMinutes()) + ':' +
            pad(d.getUTCSeconds());
    };

    _.safewrap = function(f) {
        return function() {
            try {
                return f.apply(this, arguments);
            } catch (e) {
                console.critical('Implementation error. Please contact support@moesif.com.');
            }
        };
    };

    _.safewrap_class = function(klass, functions) {
        for (var i = 0; i < functions.length; i++) {
            klass.prototype[functions[i]] = _.safewrap(klass.prototype[functions[i]]);
        }
    };

    _.safewrap_instance_methods = function(obj) {
        for (var func in obj) {
            if (typeof(obj[func]) === 'function') {
                obj[func] = _.safewrap(obj[func]);
            }
        }
    };

    _.strip_empty_properties = function(p) {
        var ret = {};
        _.each(p, function(v, k) {
            if (_.isString(v) && v.length > 0) {
                ret[k] = v;
            }
        });
        return ret;
    };

    /*
     * this function returns a copy of object after truncating it.  If
     * passed an Array or Object it will iterate through obj and
     * truncate all the values recursively.
     */
    _.truncate = function(obj, length) {
        var ret;

        if (typeof(obj) === 'string') {
            ret = obj.slice(0, length);
        } else if (_.isArray(obj)) {
            ret = [];
            _.each(obj, function(val) {
                ret.push(_.truncate(val, length));
            });
        } else if (_.isObject(obj)) {
            ret = {};
            _.each(obj, function(val, key) {
                ret[key] = _.truncate(val, length);
            });
        } else {
            ret = obj;
        }

        return ret;
    };

    _.JSONEncode = (function() {
        return function(mixed_val) {
            var value = mixed_val;
            var quote = function(string) {
                var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
                var meta = { // table of character substitutions
                    '\b': '\\b',
                    '\t': '\\t',
                    '\n': '\\n',
                    '\f': '\\f',
                    '\r': '\\r',
                    '"': '\\"',
                    '\\': '\\\\'
                };

                escapable.lastIndex = 0;
                return escapable.test(string) ?
                    '"' + string.replace(escapable, function(a) {
                        var c = meta[a];
                        return typeof c === 'string' ? c :
                            '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                    }) + '"' :
                    '"' + string + '"';
            };

            var str = function(key, holder) {
                var gap = '';
                var indent = '    ';
                var i = 0; // The loop counter.
                var k = ''; // The member key.
                var v = ''; // The member value.
                var length = 0;
                var mind = gap;
                var partial = [];
                var value = holder[key];

                // If the value has a toJSON method, call it to obtain a replacement value.
                if (value && typeof value === 'object' &&
                    typeof value.toJSON === 'function') {
                    value = value.toJSON(key);
                }

                // What happens next depends on the value's type.
                switch (typeof value) {
                    case 'string':
                        return quote(value);

                    case 'number':
                        // JSON numbers must be finite. Encode non-finite numbers as null.
                        return isFinite(value) ? String(value) : 'null';

                    case 'boolean':
                    case 'null':
                        // If the value is a boolean or null, convert it to a string. Note:
                        // typeof null does not produce 'null'. The case is included here in
                        // the remote chance that this gets fixed someday.

                        return String(value);

                    case 'object':
                        // If the type is 'object', we might be dealing with an object or an array or
                        // null.
                        // Due to a specification blunder in ECMAScript, typeof null is 'object',
                        // so watch out for that case.
                        if (!value) {
                            return 'null';
                        }

                        // Make an array to hold the partial results of stringifying this object value.
                        gap += indent;
                        partial = [];

                        // Is the value an array?
                        if (toString.apply(value) === '[object Array]') {
                            // The value is an array. Stringify every element. Use null as a placeholder
                            // for non-JSON values.

                            length = value.length;
                            for (i = 0; i < length; i += 1) {
                                partial[i] = str(i, value) || 'null';
                            }

                            // Join all of the elements together, separated with commas, and wrap them in
                            // brackets.
                            v = partial.length === 0 ? '[]' :
                                gap ? '[\n' + gap +
                                partial.join(',\n' + gap) + '\n' +
                                mind + ']' :
                                '[' + partial.join(',') + ']';
                            gap = mind;
                            return v;
                        }

                        // Iterate through all of the keys in the object.
                        for (k in value) {
                            if (hasOwnProperty.call(value, k)) {
                                v = str(k, value);
                                if (v) {
                                    partial.push(quote(k) + (gap ? ': ' : ':') + v);
                                }
                            }
                        }

                        // Join all of the member texts together, separated with commas,
                        // and wrap them in braces.
                        v = partial.length === 0 ? '{}' :
                            gap ? '{' + partial.join(',') + '' +
                            mind + '}' : '{' + partial.join(',') + '}';
                        gap = mind;
                        return v;
                }
            };

            // Make a fake root object containing our value under the key of ''.
            // Return the result of stringifying the value.
            return str('', {
                '': value
            });
        };
    })();

    _.JSONDecode = (function() { // https://github.com/douglascrockford/JSON-js/blob/master/json_parse.js
        var at, // The index of the current character
            ch, // The current character
            escapee = {
                '"': '"',
                '\\': '\\',
                '/': '/',
                'b': '\b',
                'f': '\f',
                'n': '\n',
                'r': '\r',
                't': '\t'
            },
            text,
            error = function(m) {
                throw {
                    name: 'SyntaxError',
                    message: m,
                    at: at,
                    text: text
                };
            },
            next = function(c) {
                // If a c parameter is provided, verify that it matches the current character.
                if (c && c !== ch) {
                    error('Expected \'' + c + '\' instead of \'' + ch + '\'');
                }
                // Get the next character. When there are no more characters,
                // return the empty string.
                ch = text.charAt(at);
                at += 1;
                return ch;
            },
            number = function() {
                // Parse a number value.
                var number,
                    string = '';

                if (ch === '-') {
                    string = '-';
                    next('-');
                }
                while (ch >= '0' && ch <= '9') {
                    string += ch;
                    next();
                }
                if (ch === '.') {
                    string += '.';
                    while (next() && ch >= '0' && ch <= '9') {
                        string += ch;
                    }
                }
                if (ch === 'e' || ch === 'E') {
                    string += ch;
                    next();
                    if (ch === '-' || ch === '+') {
                        string += ch;
                        next();
                    }
                    while (ch >= '0' && ch <= '9') {
                        string += ch;
                        next();
                    }
                }
                number = +string;
                if (!isFinite(number)) {
                    error('Bad number');
                } else {
                    return number;
                }
            },

            string = function() {
                // Parse a string value.
                var hex,
                    i,
                    string = '',
                    uffff;
                // When parsing for string values, we must look for " and \ characters.
                if (ch === '"') {
                    while (next()) {
                        if (ch === '"') {
                            next();
                            return string;
                        }
                        if (ch === '\\') {
                            next();
                            if (ch === 'u') {
                                uffff = 0;
                                for (i = 0; i < 4; i += 1) {
                                    hex = parseInt(next(), 16);
                                    if (!isFinite(hex)) {
                                        break;
                                    }
                                    uffff = uffff * 16 + hex;
                                }
                                string += String.fromCharCode(uffff);
                            } else if (typeof escapee[ch] === 'string') {
                                string += escapee[ch];
                            } else {
                                break;
                            }
                        } else {
                            string += ch;
                        }
                    }
                }
                error('Bad string');
            },
            white = function() {
                // Skip whitespace.
                while (ch && ch <= ' ') {
                    next();
                }
            },
            word = function() {
                // true, false, or null.
                switch (ch) {
                    case 't':
                        next('t');
                        next('r');
                        next('u');
                        next('e');
                        return true;
                    case 'f':
                        next('f');
                        next('a');
                        next('l');
                        next('s');
                        next('e');
                        return false;
                    case 'n':
                        next('n');
                        next('u');
                        next('l');
                        next('l');
                        return null;
                }
                error('Unexpected "' + ch + '"');
            },
            value, // Placeholder for the value function.
            array = function() {
                // Parse an array value.
                var array = [];

                if (ch === '[') {
                    next('[');
                    white();
                    if (ch === ']') {
                        next(']');
                        return array; // empty array
                    }
                    while (ch) {
                        array.push(value());
                        white();
                        if (ch === ']') {
                            next(']');
                            return array;
                        }
                        next(',');
                        white();
                    }
                }
                error('Bad array');
            },
            object = function() {
                // Parse an object value.
                var key,
                    object = {};

                if (ch === '{') {
                    next('{');
                    white();
                    if (ch === '}') {
                        next('}');
                        return object; // empty object
                    }
                    while (ch) {
                        key = string();
                        white();
                        next(':');
                        if (Object.hasOwnProperty.call(object, key)) {
                            error('Duplicate key "' + key + '"');
                        }
                        object[key] = value();
                        white();
                        if (ch === '}') {
                            next('}');
                            return object;
                        }
                        next(',');
                        white();
                    }
                }
                error('Bad object');
            };

        value = function() {
            // Parse a JSON value. It could be an object, an array, a string,
            // a number, or a word.
            white();
            switch (ch) {
                case '{':
                    return object();
                case '[':
                    return array();
                case '"':
                    return string();
                case '-':
                    return number();
                default:
                    return ch >= '0' && ch <= '9' ? number() : word();
            }
        };

        // Return the json_parse function. It will have access to all of the
        // above functions and variables.
        return function(source) {
            var result;

            text = source;
            at = 0;
            ch = ' ';
            result = value();
            white();
            if (ch) {
                error('Syntax error');
            }

            return result;
        };
    })();

    _.base64Encode = function(data) {
        var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
            ac = 0,
            enc = '',
            tmp_arr = [];

        if (!data) {
            return data;
        }

        data = _.utf8Encode(data);

        do { // pack three octets into four hexets
            o1 = data.charCodeAt(i++);
            o2 = data.charCodeAt(i++);
            o3 = data.charCodeAt(i++);

            bits = o1 << 16 | o2 << 8 | o3;

            h1 = bits >> 18 & 0x3f;
            h2 = bits >> 12 & 0x3f;
            h3 = bits >> 6 & 0x3f;
            h4 = bits & 0x3f;

            // use hexets to index into b64, and append result to encoded string
            tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
        } while (i < data.length);

        enc = tmp_arr.join('');

        switch (data.length % 3) {
            case 1:
                enc = enc.slice(0, -2) + '==';
                break;
            case 2:
                enc = enc.slice(0, -1) + '=';
                break;
        }

        return enc;
    };

    _.utf8Encode = function(string) {
        string = (string + '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        var utftext = '',
            start,
            end;
        var stringl = 0,
            n;

        start = end = 0;
        stringl = string.length;

        for (n = 0; n < stringl; n++) {
            var c1 = string.charCodeAt(n);
            var enc = null;

            if (c1 < 128) {
                end++;
            } else if ((c1 > 127) && (c1 < 2048)) {
                enc = String.fromCharCode((c1 >> 6) | 192, (c1 & 63) | 128);
            } else {
                enc = String.fromCharCode((c1 >> 12) | 224, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128);
            }
            if (enc !== null) {
                if (end > start) {
                    utftext += string.substring(start, end);
                }
                utftext += enc;
                start = end = n + 1;
            }
        }

        if (end > start) {
            utftext += string.substring(start, string.length);
        }

        return utftext;
    };

    _.UUID = (function() {

        // Time/ticks information
        // 1*new Date() is a cross browser version of Date.now()
        var T = function() {
            var d = 1 * new Date(),
                i = 0;

            // this while loop figures how many browser ticks go by
            // before 1*new Date() returns a new number, ie the amount
            // of ticks that go by per millisecond
            while (d == 1 * new Date()) {
                i++;
            }

            return d.toString(16) + i.toString(16);
        };

        // Math.Random entropy
        var R = function() {
            return Math.random().toString(16).replace('.', '');
        };

        // User agent entropy
        // This function takes the user agent string, and then xors
        // together each sequence of 8 bytes.  This produces a final
        // sequence of 8 bytes which it returns as hex.
        var UA = function() {
            var ua = userAgent,
                i, ch, buffer = [],
                ret = 0;

            function xor(result, byte_array) {
                var j, tmp = 0;
                for (j = 0; j < byte_array.length; j++) {
                    tmp |= (buffer[j] << j * 8);
                }
                return result ^ tmp;
            }

            for (i = 0; i < ua.length; i++) {
                ch = ua.charCodeAt(i);
                buffer.unshift(ch & 0xFF);
                if (buffer.length >= 4) {
                    ret = xor(ret, buffer);
                    buffer = [];
                }
            }

            if (buffer.length > 0) {
                ret = xor(ret, buffer);
            }

            return ret.toString(16);
        };

        return function() {
            var se = (screen.height * screen.width).toString(16);
            return (T() + '-' + R() + '-' + UA() + '-' + se + '-' + T());
        };
    })();

    // _.isBlockedUA()
    // This is to block various web spiders from executing our JS and
    // sending false tracking data
    _.isBlockedUA = function(ua) {
        if (/(google web preview|baiduspider|yandexbot|bingbot|googlebot|yahoo! slurp)/i.test(ua)) {
            return true;
        }
        return false;
    };

    /**
     * @param {Object=} formdata
     * @param {string=} arg_separator
     */
    _.HTTPBuildQuery = function(formdata, arg_separator) {
        var use_val, use_key, tmp_arr = [];

        if (_.isUndefined(arg_separator)) {
            arg_separator = '&';
        }

        _.each(formdata, function(val, key) {
            use_val = encodeURIComponent(val.toString());
            use_key = encodeURIComponent(key);
            tmp_arr[tmp_arr.length] = use_key + '=' + use_val;
        });

        return tmp_arr.join(arg_separator);
    };

    _.getQueryParamByName = function(name, query) {
      // expects a name
      // and a query string. aka location part.
      name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
      var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
      var results = regex.exec(query);
      return results === null ? undefined : decodeURIComponent(results[1].replace(/\+/g, ' '));
    };

    _.getQueryParam = function(url, param) {
        // Expects a raw URL
        param = param.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]');
        var regexS = '[\\?&]' + param + '=([^&#]*)',
            regex = new RegExp(regexS),
            results = regex.exec(url);
        if (results === null || (results && typeof(results[1]) !== 'string' && results[1].length)) {
            return '';
        } else {
            return decodeURIComponent(results[1]).replace(/\+/g, ' ');
        }
    };

    _.getHashParam = function(hash, param) {
        var matches = hash.match(new RegExp(param + '=([^&]*)'));
        return matches ? matches[1] : null;
    };

    // _.cookie
    // Methods partially borrowed from quirksmode.org/js/cookies.html
    _.cookie = {
        get: function(name) {
            var nameEQ = name + '=';
            var ca = document$1.cookie.split(';');
            for (var i = 0; i < ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) == ' ') {
                    c = c.substring(1, c.length);
                }
                if (c.indexOf(nameEQ) === 0) {
                    return decodeURIComponent(c.substring(nameEQ.length, c.length));
                }
            }
            return null;
        },

        parse: function(name) {
            var cookie;
            try {
                cookie = _.JSONDecode(_.cookie.get(name)) || {};
            } catch (err) {
                // noop
            }
            return cookie;
        },

        set_seconds: function(name, value, seconds, cross_subdomain, is_secure) {
            var cdomain = '',
                expires = '',
                secure = '';

            if (cross_subdomain) {
                var matches = document$1.location.hostname.match(/[a-z0-9][a-z0-9\-]+\.[a-z\.]{2,6}$/i),
                    domain = matches ? matches[0] : '';

                cdomain = ((domain) ? '; domain=.' + domain : '');
            }

            if (seconds) {
                var date = new Date();
                date.setTime(date.getTime() + (seconds * 1000));
                expires = '; expires=' + date.toGMTString();
            }

            if (is_secure) {
                secure = '; secure';
            }

            document$1.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/' + cdomain + secure;
        },

        set: function(name, value, days, cross_subdomain, is_secure) {
            var cdomain = '', expires = '', secure = '';

            if (cross_subdomain) {
                var matches = document$1.location.hostname.match(/[a-z0-9][a-z0-9\-]+\.[a-z\.]{2,6}$/i),
                    domain = matches ? matches[0] : '';

                cdomain   = ((domain) ? '; domain=.' + domain : '');
            }

            if (days) {
                var date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = '; expires=' + date.toGMTString();
            }

            if (is_secure) {
                secure = '; secure';
            }

            var new_cookie_val = name + '=' + encodeURIComponent(value) + expires + '; path=/' + cdomain + secure;
            document$1.cookie = new_cookie_val;
            return new_cookie_val;
        },

        remove: function(name, cross_subdomain) {
            _.cookie.set(name, '', -1, cross_subdomain);
        }
    };

    var _localStorageSupported = null;
    var localStorageSupported = function(storage, forceCheck) {
        if (_localStorageSupported !== null && !forceCheck) {
            return _localStorageSupported;
        }

        var supported = true;
        try {
            storage = storage || window.localStorage;
            var key = '__mplss_' + cheap_guid(8),
                val = 'xyz';
            storage.setItem(key, val);
            if (storage.getItem(key) !== val) {
                supported = false;
            }
            storage.removeItem(key);
        } catch (err) {
            supported = false;
        }

        _localStorageSupported = supported;
        return supported;
    };

    // _.localStorage
    _.localStorage = {
        error: function(msg) {
            console.error('localStorage error: ' + msg);
        },

        get: function(name) {
            try {
                return window.localStorage.getItem(name);
            } catch (err) {
                _.localStorage.error(err);
            }
            return null;
        },

        parse: function(name) {
            try {
                return _.JSONDecode(_.localStorage.get(name)) || {};
            } catch (err) {
                // noop
            }
            return null;
        },

        set: function(name, value) {
            try {
                window.localStorage.setItem(name, value);
            } catch (err) {
                _.localStorage.error(err);
            }
        },

        remove: function(name) {
            try {
                window.localStorage.removeItem(name);
            } catch (err) {
                _.localStorage.error(err);
            }
        }
    };

    _.dom_query = (function() {
        /* document.getElementsBySelector(selector)
        - returns an array of element objects from the current document
        matching the CSS selector. Selectors can contain element names,
        class names and ids and can be nested. For example:

        elements = document.getElementsBySelector('div#main p a.external')

        Will return an array of all 'a' elements with 'external' in their
        class attribute that are contained inside 'p' elements that are
        contained inside the 'div' element which has id="main"

        New in version 0.4: Support for CSS2 and CSS3 attribute selectors:
        See http://www.w3.org/TR/css3-selectors/#attribute-selectors

        Version 0.4 - Simon Willison, March 25th 2003
        -- Works in Phoenix 0.5, Mozilla 1.3, Opera 7, Internet Explorer 6, Internet Explorer 5 on Windows
        -- Opera 7 fails

        Version 0.5 - Carl Sverre, Jan 7th 2013
        -- Now uses jQuery-esque `hasClass` for testing class name
        equality.  This fixes a bug related to '-' characters being
        considered not part of a 'word' in regex.
        */

        function getAllChildren(e) {
            // Returns all children of element. Workaround required for IE5/Windows. Ugh.
            return e.all ? e.all : e.getElementsByTagName('*');
        }

        var bad_whitespace = /[\t\r\n]/g;

        function hasClass(elem, selector) {
            var className = ' ' + selector + ' ';
            return ((' ' + elem.className + ' ').replace(bad_whitespace, ' ').indexOf(className) >= 0);
        }

        function getElementsBySelector(selector) {
            // Attempt to fail gracefully in lesser browsers
            if (!document$1.getElementsByTagName) {
                return [];
            }
            // Split selector in to tokens
            var tokens = selector.split(' ');
            var token, bits, tagName, found, foundCount, i, j, k, elements, currentContextIndex;
            var currentContext = [document$1];
            for (i = 0; i < tokens.length; i++) {
                token = tokens[i].replace(/^\s+/, '').replace(/\s+$/, '');
                if (token.indexOf('#') > -1) {
                    // Token is an ID selector
                    bits = token.split('#');
                    tagName = bits[0];
                    var id = bits[1];
                    var element = document$1.getElementById(id);
                    if (!element || (tagName && element.nodeName.toLowerCase() != tagName)) {
                        // element not found or tag with that ID not found, return false
                        return [];
                    }
                    // Set currentContext to contain just this element
                    currentContext = [element];
                    continue; // Skip to next token
                }
                if (token.indexOf('.') > -1) {
                    // Token contains a class selector
                    bits = token.split('.');
                    tagName = bits[0];
                    var className = bits[1];
                    if (!tagName) {
                        tagName = '*';
                    }
                    // Get elements matching tag, filter them for class selector
                    found = [];
                    foundCount = 0;
                    for (j = 0; j < currentContext.length; j++) {
                        if (tagName == '*') {
                            elements = getAllChildren(currentContext[j]);
                        } else {
                            elements = currentContext[j].getElementsByTagName(tagName);
                        }
                        for (k = 0; k < elements.length; k++) {
                            found[foundCount++] = elements[k];
                        }
                    }
                    currentContext = [];
                    currentContextIndex = 0;
                    for (j = 0; j < found.length; j++) {
                        if (found[j].className &&
                            _.isString(found[j].className) && // some SVG elements have classNames which are not strings
                            hasClass(found[j], className)
                        ) {
                            currentContext[currentContextIndex++] = found[j];
                        }
                    }
                    continue; // Skip to next token
                }
                // Code to deal with attribute selectors
                var token_match = token.match(/^(\w*)\[(\w+)([=~\|\^\$\*]?)=?"?([^\]"]*)"?\]$/);
                if (token_match) {
                    tagName = token_match[1];
                    var attrName = token_match[2];
                    var attrOperator = token_match[3];
                    var attrValue = token_match[4];
                    if (!tagName) {
                        tagName = '*';
                    }
                    // Grab all of the tagName elements within current context
                    found = [];
                    foundCount = 0;
                    for (j = 0; j < currentContext.length; j++) {
                        if (tagName == '*') {
                            elements = getAllChildren(currentContext[j]);
                        } else {
                            elements = currentContext[j].getElementsByTagName(tagName);
                        }
                        for (k = 0; k < elements.length; k++) {
                            found[foundCount++] = elements[k];
                        }
                    }
                    currentContext = [];
                    currentContextIndex = 0;
                    var checkFunction; // This function will be used to filter the elements
                    switch (attrOperator) {
                        case '=': // Equality
                            checkFunction = function(e) {
                                return (e.getAttribute(attrName) == attrValue);
                            };
                            break;
                        case '~': // Match one of space seperated words
                            checkFunction = function(e) {
                                return (e.getAttribute(attrName).match(new RegExp('\\b' + attrValue + '\\b')));
                            };
                            break;
                        case '|': // Match start with value followed by optional hyphen
                            checkFunction = function(e) {
                                return (e.getAttribute(attrName).match(new RegExp('^' + attrValue + '-?')));
                            };
                            break;
                        case '^': // Match starts with value
                            checkFunction = function(e) {
                                return (e.getAttribute(attrName).indexOf(attrValue) === 0);
                            };
                            break;
                        case '$': // Match ends with value - fails with "Warning" in Opera 7
                            checkFunction = function(e) {
                                return (e.getAttribute(attrName).lastIndexOf(attrValue) == e.getAttribute(attrName).length - attrValue.length);
                            };
                            break;
                        case '*': // Match ends with value
                            checkFunction = function(e) {
                                return (e.getAttribute(attrName).indexOf(attrValue) > -1);
                            };
                            break;
                        default:
                            // Just test for existence of attribute
                            checkFunction = function(e) {
                                return e.getAttribute(attrName);
                            };
                    }
                    currentContext = [];
                    currentContextIndex = 0;
                    for (j = 0; j < found.length; j++) {
                        if (checkFunction(found[j])) {
                            currentContext[currentContextIndex++] = found[j];
                        }
                    }
                    // alert('Attribute Selector: '+tagName+' '+attrName+' '+attrOperator+' '+attrValue);
                    continue; // Skip to next token
                }
                // If we get here, token is JUST an element (not a class or ID selector)
                tagName = token;
                found = [];
                foundCount = 0;
                for (j = 0; j < currentContext.length; j++) {
                    elements = currentContext[j].getElementsByTagName(tagName);
                    for (k = 0; k < elements.length; k++) {
                        found[foundCount++] = elements[k];
                    }
                }
                currentContext = found;
            }
            return currentContext;
        }

        return function(query) {
            if (_.isElement(query)) {
                return [query];
            } else if (_.isObject(query) && !_.isUndefined(query.length)) {
                return query;
            } else {
                return getElementsBySelector.call(this, query);
            }
        };
    })();

    _.info = {
        campaignParams: function() {
            var campaign_keywords = 'utm_source utm_medium utm_campaign utm_content utm_term'.split(' '),
                kw = '',
                params = {};
            _.each(campaign_keywords, function(kwkey) {
                kw = _.getQueryParam(document$1.URL, kwkey);
                if (kw.length) {
                    params[kwkey] = kw;
                }
            });

            return params;
        },

        searchEngine: function(referrer) {
            if (referrer.search('https?://(.*)google.([^/?]*)') === 0) {
                return 'google';
            } else if (referrer.search('https?://(.*)bing.com') === 0) {
                return 'bing';
            } else if (referrer.search('https?://(.*)yahoo.com') === 0) {
                return 'yahoo';
            } else if (referrer.search('https?://(.*)duckduckgo.com') === 0) {
                return 'duckduckgo';
            } else {
                return null;
            }
        },

        searchInfo: function(referrer) {
            var search = _.info.searchEngine(referrer),
                param = (search != 'yahoo') ? 'q' : 'p',
                ret = {};

            if (search !== null) {
                ret['$search_engine'] = search;

                var keyword = _.getQueryParam(referrer, param);
                if (keyword.length) {
                    ret['mp_keyword'] = keyword;
                }
            }

            return ret;
        },

        /**
         * This function detects which browser is running this script.
         * The order of the checks are important since many user agents
         * include key words used in later checks.
         */
        browser: function(user_agent, vendor, opera) {
            vendor = vendor || ''; // vendor is undefined for at least IE9
            if (opera || _.includes(user_agent, ' OPR/')) {
                if (_.includes(user_agent, 'Mini')) {
                    return 'Opera Mini';
                }
                return 'Opera';
            } else if (/(BlackBerry|PlayBook|BB10)/i.test(user_agent)) {
                return 'BlackBerry';
            } else if (_.includes(user_agent, 'IEMobile') || _.includes(user_agent, 'WPDesktop')) {
                return 'Internet Explorer Mobile';
            } else if (_.includes(user_agent, 'Edge')) {
                return 'Microsoft Edge';
            } else if (_.includes(user_agent, 'FBIOS')) {
                return 'Facebook Mobile';
            } else if (_.includes(user_agent, 'Chrome')) {
                return 'Chrome';
            } else if (_.includes(user_agent, 'CriOS')) {
                return 'Chrome iOS';
            } else if (_.includes(user_agent, 'UCWEB') || _.includes(user_agent, 'UCBrowser')) {
                return 'UC Browser';
            } else if (_.includes(user_agent, 'FxiOS')) {
                return 'Firefox iOS';
            } else if (_.includes(vendor, 'Apple')) {
                if (_.includes(user_agent, 'Mobile')) {
                    return 'Mobile Safari';
                }
                return 'Safari';
            } else if (_.includes(user_agent, 'Android')) {
                return 'Android Mobile';
            } else if (_.includes(user_agent, 'Konqueror')) {
                return 'Konqueror';
            } else if (_.includes(user_agent, 'Firefox')) {
                return 'Firefox';
            } else if (_.includes(user_agent, 'MSIE') || _.includes(user_agent, 'Trident/')) {
                return 'Internet Explorer';
            } else if (_.includes(user_agent, 'Gecko')) {
                return 'Mozilla';
            } else {
                return '';
            }
        },

        /**
         * This function detects which browser version is running this script,
         * parsing major and minor version (e.g., 42.1). User agent strings from:
         * http://www.useragentstring.com/pages/useragentstring.php
         */
        browserVersion: function(userAgent, vendor, opera) {
            var browser = _.info.browser(userAgent, vendor, opera);
            var versionRegexs = {
                'Internet Explorer Mobile': /rv:(\d+(\.\d+)?)/,
                'Microsoft Edge': /Edge\/(\d+(\.\d+)?)/,
                'Chrome': /Chrome\/(\d+(\.\d+)?)/,
                'Chrome iOS': /CriOS\/(\d+(\.\d+)?)/,
                'UC Browser' : /(UCBrowser|UCWEB)\/(\d+(\.\d+)?)/,
                'Safari': /Version\/(\d+(\.\d+)?)/,
                'Mobile Safari': /Version\/(\d+(\.\d+)?)/,
                'Opera': /(Opera|OPR)\/(\d+(\.\d+)?)/,
                'Firefox': /Firefox\/(\d+(\.\d+)?)/,
                'Firefox iOS': /FxiOS\/(\d+(\.\d+)?)/,
                'Konqueror': /Konqueror:(\d+(\.\d+)?)/,
                'BlackBerry': /BlackBerry (\d+(\.\d+)?)/,
                'Android Mobile': /android\s(\d+(\.\d+)?)/,
                'Internet Explorer': /(rv:|MSIE )(\d+(\.\d+)?)/,
                'Mozilla': /rv:(\d+(\.\d+)?)/
            };
            var regex = versionRegexs[browser];
            if (regex === undefined) {
                return null;
            }
            var matches = userAgent.match(regex);
            if (!matches) {
                return null;
            }
            return parseFloat(matches[matches.length - 2]);
        },

        os: function() {
            var a = userAgent;
            if (/Windows/i.test(a)) {
                if (/Phone/.test(a) || /WPDesktop/.test(a)) {
                    return 'Windows Phone';
                }
                return 'Windows';
            } else if (/(iPhone|iPad|iPod)/.test(a)) {
                return 'iOS';
            } else if (/Android/.test(a)) {
                return 'Android';
            } else if (/(BlackBerry|PlayBook|BB10)/i.test(a)) {
                return 'BlackBerry';
            } else if (/Mac/i.test(a)) {
                return 'Mac OS X';
            } else if (/Linux/.test(a)) {
                return 'Linux';
            } else {
                return '';
            }
        },

        device: function(user_agent) {
            if (/Windows Phone/i.test(user_agent) || /WPDesktop/.test(user_agent)) {
                return 'Windows Phone';
            } else if (/iPad/.test(user_agent)) {
                return 'iPad';
            } else if (/iPod/.test(user_agent)) {
                return 'iPod Touch';
            } else if (/iPhone/.test(user_agent)) {
                return 'iPhone';
            } else if (/(BlackBerry|PlayBook|BB10)/i.test(user_agent)) {
                return 'BlackBerry';
            } else if (/Android/.test(user_agent)) {
                return 'Android';
            } else {
                return '';
            }
        },

        referringDomain: function(referrer) {
            var split = referrer.split('/');
            if (split.length >= 3) {
                return split[2];
            }
            return '';
        },

        properties: function() {
            return _.extend(_.strip_empty_properties({
                '$os': _.info.os(),
                '$browser': _.info.browser(userAgent, navigator$1.vendor, window.opera),
                '$referrer': document$1.referrer,
                '$referring_domain': _.info.referringDomain(document$1.referrer),
                '$device': _.info.device(userAgent)
            }), {
                '$current_url': window.location.href,
                '$browser_version': _.info.browserVersion(userAgent, navigator$1.vendor, window.opera),
                '$screen_height': screen.height,
                '$screen_width': screen.width,
                'mp_lib': 'web',
                '$lib_version': Config.LIB_VERSION
            });
        },

        people_properties: function() {
            return _.extend(_.strip_empty_properties({
                '$os': _.info.os(),
                '$browser': _.info.browser(userAgent, navigator$1.vendor, window.opera)
            }), {
                '$browser_version': _.info.browserVersion(userAgent, navigator$1.vendor, window.opera)
            });
        },

        pageviewInfo: function(page) {
            return _.strip_empty_properties({
                'mp_page': page,
                'mp_referrer': document$1.referrer,
                'mp_browser': _.info.browser(userAgent, navigator$1.vendor, window.opera),
                'mp_platform': _.info.os()
            });
        }
    };

    var cheap_guid = function(maxlen) {
      var guid = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      return maxlen ? guid.substring(0, maxlen) : guid;
    };

    var log_func_with_prefix = function(func, prefix) {
      return function() {
          arguments[0] = '[' + prefix + '] ' + arguments[0];
          return func.apply(console, arguments);
      };
    };

    var console_with_prefix = function(prefix) {
      return {
          log: log_func_with_prefix(console.log, prefix),
          error: log_func_with_prefix(console.error, prefix),
          critical: log_func_with_prefix(console.critical, prefix)
      };
    };

    var JSONStringify = null;
    var JSONParse = null;
    if (typeof JSON !== 'undefined') {
        JSONStringify = JSON.stringify;
        JSONParse = JSON.parse;
    }
    JSONStringify = JSONStringify || _.JSONEncode;
    JSONParse = JSONParse || _.JSONDecode;


    // EXPORTS (for closure compiler)
    _['toArray']            = _.toArray;
    _['isObject']           = _.isObject;
    _['JSONEncode']         = _.JSONEncode;
    _['JSONDecode']         = _.JSONDecode;
    _['isBlockedUA']        = _.isBlockedUA;
    _['isEmptyObject']      = _.isEmptyObject;
    _['isEmptyString']      = _.isEmptyString;
    _['each']               = _.each;
    _['info']               = _.info;
    _['info']['device']     = _.info.device;
    _['info']['browser']    = _.info.browser;
    _['info']['properties'] = _.info.properties;

    // eslint-disable-line camelcase

    var logger$1 = console_with_prefix('parsers');

    var attemptParseText = function(text) {
      try {
        return { 'body': _.JSONDecode(text) };
      } catch(err) {
        logger$1.log('JSON decode failed');
        logger$1.log(err);
        return {
          'transfer_encoding': 'base64',  // eslint-disable-line camelcase
          'body': _.base64Encode(text)
        };
      }
    };

    /**
     * @param {*} buffer
     * this checks the buffer and
     * returns something to start building the response or request model
     * with body filled in.
     */
    var attemptParseBuffer = function (buffer) {
      if (!buffer) return {};
      logger$1.log('about to decode buffer');
      logger$1.log(buffer);
      logger$1.log(buffer.byteLength);

      if (buffer.byteLength <= 0) {
        // empty body.
        return {};
      }

      try {
        var decoder = new TextDecoder('utf-8');
        var text = decoder.decode(buffer);

        try {
          return { 'body': _.JSONDecode(text) };
        } catch (err) {
          logger$1.error(err);
          return {
            'transfer_encoding': 'base64',
            'body': _.base64Encode(text)
          };
        }
      } catch (err) {
        logger$1.error(err);
        logger$1.log(buffer);
        return {
          'transfer_encoding': 'base64',
          'body': 'can not be decoded'
        };
      }
    };

    var logger = console_with_prefix('capture');

    var HTTP_PROTOCOL$1 = (('http:' === (document && document.location.protocol)) ? 'http://' : 'https://');

    function handleRequestFinished(xhrInstance, postData, recorder) {
      logger.log('processResponse for' + xhrInstance._url);
      var endTime = (new Date()).toISOString();

      if (recorder) {
        // avoid apiRequest.io and moesif.com
        var myUrl = xhrInstance._url ? xhrInstance._url.toLowerCase() : xhrInstance._url;
        if(myUrl && myUrl.indexOf('moesif.com') < 0 && myUrl.indexOf('apirequest.io') < 0) {

          var requestModel = {
            'uri': convertToFullUrl(xhrInstance._url),
            'verb': xhrInstance._method,
            'time': xhrInstance._startTime,
            'headers': xhrInstance._requestHeaders
          };

          if (postData) {
            if (typeof postData === 'string') {
              logger.log('request post data is string');
              logger.log(postData);

              var parseResult = attemptParseText(postData);
              requestModel['transfer_encoding'] = parseResult['transfer_encoding'];
              requestModel['body'] = parseResult['body'];
            } else if (typeof postData === 'object' || Array.isArray(postData) || typeof postData === 'number' || typeof postData === 'boolean') {
              requestModel['body'] = postData;
            }
          }
          var rawResponseHeaders = xhrInstance.getAllResponseHeaders();

          logger.log('rawResponseHeaders are ' + rawResponseHeaders);

          var responseHeaders = parseResponseHeaders(rawResponseHeaders);

          var _status = xhrInstance.status;
          // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
          if (_status === 1223) {
            _status = 204;
          }

          var responseModel = {
            'status': _status,
            'time': endTime,
            'headers': responseHeaders
          };

          logger.log('responseType: ' + xhrInstance.responseType);
          logger.log('responseText: ' + xhrInstance.responseText);
          logger.log('response: ' + xhrInstance.response);

          // responseText is accessible only if responseType is '' or 'text' and on older browsers
          // but we attempt to grab it anyways.
          var rawText = xhrInstance.responseText;

          var parsedBody = {};

          if (rawText) {
            // responseText is string or null
            parsedBody = attemptParseText(rawText);
            responseModel['body'] = parsedBody['body'];
            responseModel['transfer_encoding'] = parsedBody['transfer_encoding'];
          } else if (xhrInstance.response) {
            // if there is no responseText, but response exists, we'll try process it.
            logger.log('no responseText trying with xhr.response');
            if (_.isString(xhrInstance.response)) {
              logger.log('response is string. attempt to parse');
              parsedBody = attemptParseText(xhrInstance.response);
              responseModel['body'] = parsedBody['body'];
              responseModel['transfer_encoding'] = parsedBody['transfer_encoding'];
            } else if (_.isArrayBuffer(xhrInstance.response)) {
              logger.log('response is arraybuffer. attempt to parse');
              parsedBody = attemptParseBuffer(xhrInstance.response);
              responseModel['body'] = parsedBody['body'];
              responseModel['transfer_encoding'] = parsedBody['transfer_encoding'];
            } else if (_.isArray(xhrInstance.response) || _.isObject(xhrInstance.response)) {
              responseModel['body'] = xhrInstance.response;
            }
          }

          var event = {
            'request': requestModel,
            'response': responseModel
          };

          recorder(event);
        }
      }
    }

    function parseResponseHeaders(headerStr) {
      var headers = {};
      if (!headerStr) {
        return headers;
      }
      var headerPairs = headerStr.split('\u000d\u000a');
      for (var i = 0; i < headerPairs.length; i++) {
        var headerPair = headerPairs[i];
        var index = headerPair.indexOf('\u003a\u0020');
        if (index > 0) {
          var key = headerPair.substring(0, index);
          headers[key] = headerPair.substring(index + 2);
        }
      }
      return headers;
    }

    function convertToFullUrl(url) {
      if (url && typeof url === 'string') {
        var trimedUrl = _.trim(url);
        if (trimedUrl.indexOf('http') !== 0) {
          return HTTP_PROTOCOL$1 + window.location.host + '/' + trimedUrl.replace(/^\./, '').replace(/^\//, '');
        } else {
          return url;
        }
      }
      return url;
    }

    /**
     * @param recorder
     * @returns {undoPatch}
     *
     * The recorder is a function that takes an Event and records it.
     *
     */
    function captureXMLHttpRequest(recorder, options) {
      var XHR = XMLHttpRequest.prototype;

      var shouldPatchOnReadyState = options && options.eagerBodyLogging;

      var open = XHR.open;
      var send = XHR.send;
      var setRequestHeader = XHR.setRequestHeader;

      // Collect data:
      XHR.open = function(method, url) {
        logger.log('XHR open triggered');
        this._method = method;
        this._url = url;
        this._requestHeaders = {};
        this._startTime = (new Date()).toISOString();
        return open.apply(this, arguments);
      };

      XHR.setRequestHeader =  function(header, value) {
        this._requestHeaders[header] = value;
        return setRequestHeader.apply(this, arguments);
      };

      XHR.send = function(postData) {
        logger.log('XHR send started for ' + this._url);

        var _self = this;

        // in case of eagerBodyLogging, we'll
        // patch onreadystatechange which is more of
        // replacement or if addEventListener does not exist.
        if (shouldPatchOnReadyState || !this.addEventListener) {
          var _onreadystatechange = this.onreadystatechange;
          this.onreadystatechange = function() {
            var readyState = _self.readyState;
            logger.log('readyState ' + readyState);
            if (readyState === XMLHttpRequest.DONE) {
              logger.log('XHR onreadystatechange DONE triggered for ' + _self._url);
              handleRequestFinished(_self, postData, recorder);
            }

            if (_onreadystatechange && _.isFunction(_onreadystatechange)) {
              logger.log('trigger old onreadystatechange');
              return _onreadystatechange.apply(this, arguments);
            }
          };
        } else {
          // this only adds another listener.
          this.addEventListener('loadend', function() {
            logger.log('XHR loadend triggered for ' + _self._url);
            handleRequestFinished(_self, postData, recorder);
          });
        }

        return send.apply(this, arguments);
      };

      var undoPatch = function () {
        XHR.open = open;
        XHR.send = send;
        XHR.setRequestHeader = setRequestHeader;
      };

      // so caller have a handle to undo the patch if needed.
      return undoPatch;
    }

    // eslint-disable-line

    var logger$2 = console_with_prefix('web3capture');

    function computeUrl(provider) {
      if (provider && provider.host) {
        return provider.host;
      }

      return '/';
    }

    function createEventModel(provider, startTime, endTime, payload, result, error) {
      // JSONRPC will always be POST.
      var requestModel = {
        'uri': computeUrl(provider),
        'verb': 'POST',
        'time': startTime,
        'headers': {}
      };

      if (provider['headers']) {
        var hdrs = {};

        _['each'](provider['headers'], function (item) {
          hdrs[item['name']] = item['value'];
        });

        requestModel['headers'] = hdrs;
      }

      if (payload) {
        if (typeof payload === 'string') {
          logger$2.log('request post data is string');
          logger$2.log(payload);
          try {
            requestModel['body'] = _.JSONDecode(payload);
          } catch(err) {
            logger$2.log('JSON decode failed');
            logger$2.log(err);
            requestModel['transfer_encoding'] = 'base64';
            requestModel['body'] = _.base64Encode(payload);
          }
        } else if (typeof payload === 'object' || Array.isArray(payload) || typeof payload === 'number' || typeof postData === 'boolean') {
          requestModel['body'] = payload;
        }
      }

      // var responseHeaders = parseResponseHeaders(this.getAllResponseHeaders());

      var responseModel = {
        'status': 200,
        // it is always 200 for JSON RPC.
        'time': endTime,
        'headers': {}
      };

      if (result) {
        // responseText is string or null
        responseModel['body'] = result;
        // if (isJsonHeader(responseHeaders) || isStartJson(this.responseText)) {
        //   responseModel['body'] = parseBody(this.responseText);
        // } else {
        //   responseModel['transfer_encoding'] = 'base64';
        //   responseModel['body'] = _.base64Encode(this.responseText);
        // }
      } else if (error) {
        responseModel['body'] = {
          'error': error
        };
      }

      var event = {
        'request': requestModel,
        'response': responseModel,
        'metadata': {
          '_web3': {
            'via_web3_provider': true,
            'path': provider['path'],
            'host': provider['host']
          }
        }
      };

      if (provider['isMetaMask']) {
        event['metadata']['_web3']['is_metamask'] = true;
      }

      return event;
    }

    /**
     * @param recorder
     * @returns {undoPatch}
     *
     * The recorder is a function that takes an Event and records it.
     *
     */
    function captureWeb3Requests(myWeb3, recorder, options) {
      if (myWeb3['currentProvider']) {
        logger$2.log('found my currentProvider, patching it');
        var CPDR = myWeb3['currentProvider'];

        var send = CPDR['send'];
        var sendAsync = CPDR['sendAsync'];

        CPDR['send'] = function(payload) {
          logger$2.log('patched send is called');
          logger$2.log(payload);
          var _startTime = (new Date()).toISOString();
          var result = send.apply(CPDR, arguments);

          logger$2.log('patch send result is back');
          logger$2.log(result);
          var _endTime = (new Date()).toISOString();
          if (recorder) {
            recorder(createEventModel(CPDR, _startTime, _endTime, payload, result));
          }

          return result;
        };

        CPDR['sendAsync'] = function(payload, callback) {
          logger$2.log('patched sendAsync is called');
          logger$2.log(payload);
          var _startTime = (new Date()).toISOString();
          var provider = CPDR;

          var _callback = function(err, result) {
            var _endTime = (new Date()).toISOString();

            logger$2.log('inside patched callback');
            logger$2.log(result);
            if (recorder) {
              recorder(createEventModel(provider, _startTime, _endTime, payload, result, err));
            }
            if (callback) {
              callback(err, result);
            }
          };

          sendAsync.apply(CPDR, [payload, _callback]);
        };

        var undoPatch = function () {
          CPDR.send = send;
          CPDR.sendAsync = sendAsync;
        };
        return undoPatch;
      }
      return null;
      // so caller have a handle to undo the patch if needed.
    }

    var logger$3 = console_with_prefix('capture fetch');

    /**
     *
     * @param {*} headers
     * headers must be a Headers object.
     */
    function parseHeaders(headers) {
      var result = {};
      logger$3.log('parseheaders is called');

      var entries = headers.entries();

      var entry = entries.next();
      while (!entry.done) {
        logger$3.log(entry.value); // 1 3 5 7 9
        result[entry.value[0]] = entry.value[1];

        entry = entries.next();
      }

      return result;
    }

    function processSavedRequestResponse(savedRequest, savedResponse, startTime, endTime, recorder) {
      try {
        setTimeout(function() {
          logger$3.log('interception is here.');
          logger$3.log(savedRequest);
          logger$3.log(savedResponse);
          if (savedRequest && savedResponse) {
            // try to exract out information:
            // var reqHeaders = {};
            // var resHeaders = {};

            // for (var pair of savedRequest.headers.entries()) {
            //   reqHeaders[pair[0]] = pair[1];
            // }

            // for (var pair2 of savedResponse.headers.entries()) {
            //   resHeaders[pair2[0]] = pair2[1];
            // }
            try {
              Promise.all([savedRequest.arrayBuffer(), savedResponse.arrayBuffer()]).then(function(
                bodies
              ) {
                // attemptParseBuffer will return either {}, { body }, or { body, transfer_enconding }
                var processedBodies = bodies.map(attemptParseBuffer);

                var requestModel = Object.assign(processedBodies[0], {
                  'uri': savedRequest.url,
                  'verb': savedRequest.method,
                  'time': startTime,
                  'headers': parseHeaders(savedRequest.headers)
                });

                var responseModel = Object.assign(processedBodies[1], {
                  'status': savedResponse.status,
                  'time': endTime,
                  'headers': parseHeaders(savedResponse.headers)
                });

                logger$3.log(requestModel);
                logger$3.log(responseModel);

                var event = {
                  'request': requestModel,
                  'response': responseModel
                };

                recorder(event);
              });
            } catch (err) {
              logger$3.error('error processing body');
            }
          } else {
            logger$3.log('savedRequest');
          }
        }, 50);
      } catch (err) {
        logger$3.error('error processing saved fetch request and response, but move on anyways.');
        logger$3.log(err);
      }
    }

    function interceptor(recorder, fetch, arg1, arg2) {
      var savedRequest = null;

      try {
        savedRequest = new Request(arg1, arg2);
      } catch (err) {
        // for internal errors only.
      }
      var startTime = new Date().toISOString();
      var endTime = null;

      var promise = null;

      promise = fetch(arg1, arg2);

      var savedResponse = null;
      // add handlers for response.
      promise = promise.then(function(response) {
        //
        savedResponse = response.clone();
        endTime = new Date().toISOString();

        processSavedRequestResponse(savedRequest, savedResponse, startTime, endTime, recorder);

        return response;
      });

      return promise;
    }

    // var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';

    function patch(recorder, env) {
      var myenv = env || window || self;

      if (myenv['fetch']) {
        logger$3.log('found fetch method.');
        if (!myenv['fetch']['polyfill']) {
          // basically, if it is polyfill, it means
          // that it is using XMLhttpRequest underneath,
          // then no need to patch fetch.
          var oldFetch = myenv['fetch'];

          logger$3.log('fetch is not polyfilled so instrumenting it');

          myenv['fetch'] = (function(fetch) {
            return function(arg1, arg2) {
              return interceptor(recorder, fetch, arg1, arg2);
            };
          })(myenv['fetch']);

          var unpatch = function() {
            myenv['fetch'] = oldFetch;
          };

          return unpatch;
        } else {
          // should not patch if it is polyfilled.
          // since it would duplicate the data.
          logger$3.log('skip patching fetch since it is polyfilled');
          return null;
        }
      } else {
        logger$3.log('there is no fetch found, so skipping instrumentation.');
      }
    }

    function _getReferrerStr() {
      return document && document.referrer;
    }

    function _getReferringDomain(referrer) {
      if (_.isEmptyString(referrer)) {
        return null;
      }
      var parts = referrer.split('/');
      if (parts.length >= 3) {
        return parts[2];
      }
      return null;
    }

    function getReferrer() {
      var referrer = _getReferrerStr();

      if (_.isEmptyString(referrer)) {
        return;
      }

      var referrerInfo = {
        'referrer': referrer,
        'referring_domain': _getReferringDomain(referrer)
      };

      return referrerInfo;
    }

    // eslint-disable-line

    var logger$5 = console_with_prefix('utm');

    var Constants = {  // UTM Params
      UTM_SOURCE: 'utm_source',
      UTM_MEDIUM: 'utm_medium',
      UTM_CAMPAIGN: 'utm_campaign',
      UTM_TERM: 'utm_term',
      UTM_CONTENT: 'utm_content'
    };

    function _getUrlParams$1() {
      return location && location.search;
    }

    function getUtmData(rawCookie, query) {
      // Translate the utmz cookie format into url query string format.
      var cookie = rawCookie ? '?' + rawCookie.split('.').slice(-1)[0].replace(/\|/g, '&') : '';

      logger$5.log('cookie');
      logger$5.log(cookie);

      var fetchParam = function fetchParam(queryName, query, cookieName, cookie) {
        return _.getQueryParamByName(queryName, query) ||
               _.getQueryParamByName(cookieName, cookie);
      };

      var utmSource = fetchParam(Constants.UTM_SOURCE, query, 'utmcsr', cookie);
      var utmMedium = fetchParam(Constants.UTM_MEDIUM, query, 'utmcmd', cookie);
      var utmCampaign = fetchParam(Constants.UTM_CAMPAIGN, query, 'utmccn', cookie);
      var utmTerm = fetchParam(Constants.UTM_TERM, query, 'utmctr', cookie);
      var utmContent = fetchParam(Constants.UTM_CONTENT, query, 'utmcct', cookie);

      var utmData = {};
      var addIfNotNull = function addIfNotNull(key, value) {
        if (!_.isEmptyString(value)) {
          utmData[key] = value;
        }
      };

      addIfNotNull(Constants.UTM_SOURCE, utmSource);
      addIfNotNull(Constants.UTM_MEDIUM, utmMedium);
      addIfNotNull(Constants.UTM_CAMPAIGN, utmCampaign);
      addIfNotNull(Constants.UTM_TERM, utmTerm);
      addIfNotNull(Constants.UTM_CONTENT, utmContent);

      return utmData;
    }

    function getUtm(queryParams, cookieParams) {
      queryParams = _getUrlParams$1();
      cookieParams = _.cookie.get('__utmz');
      var utmProperties = getUtmData(cookieParams, queryParams);
      return utmProperties;
    }

    var logger$4 = console_with_prefix('campaign');

    function _getUrlParams() {
      return location && location.search;
    }

    function getGclid(urlParams) {
      var gclid = _.getQueryParamByName('gclid', urlParams);
      if (_.isEmptyString(gclid)) {
        return;
      }
      return gclid;
    }

    function getCampaignData(opt) {
      try {
        var result = {};

        if (!opt.disableUtm) {
          result = getUtm() || {};
        }

        if (!opt.disableReferer) {
          var referrer = getReferrer();
          if (referrer) {
            result['referrer'] = referrer['referrer'];
            result['referring_domain'] = referrer['referring_domain'];
          }
        }
        if (!opt.disableRGclid) {
          var gclid = getGclid(_getUrlParams());
          if (gclid) {
            result['gclid'] = gclid;
          }
        }

        return result;
      } catch (err) {
        logger$4.log(err);
      }
    }

    // eslint-disable-line

    var logger$8 = console_with_prefix('lock');

    /**
     * SharedLock: a mutex built on HTML5 localStorage, to ensure that only one browser
     * window/tab at a time will be able to access shared resources.
     *
     * Implementation based on the original version by David Wolever (https://github.com/wolever)
     * at https://gist.github.com/wolever/5fd7573d1ef6166e8f8c4af286a69432.
     *
     * @example
     * const myLock = new SharedLock('some-key');
     * myLock.withLock(function() {
     *   console.log('I hold the mutex!');
     * });
     *
     * @constructor
     */
    var SharedLock = function(key, options) {
        options = options || {};

        this.storageKey = key;
        this.storage = options.storage || window.localStorage;
        this.pollIntervalMS = options.pollIntervalMS || 100;
        this.timeoutMS = options.timeoutMS || 2000;
    };

    // pass in a specific pid to test contention scenarios; otherwise
    // it is chosen randomly for each acquisition attempt
    SharedLock.prototype.withLock = function(lockedCB, errorCB, pid) {
        if (!pid && typeof errorCB !== 'function') {
            pid = errorCB;
            errorCB = null;
        }

        var i = pid || (new Date().getTime() + '|' + Math.random());
        var startTime = new Date().getTime();

        var key = this.storageKey;
        var pollIntervalMS = this.pollIntervalMS;
        var timeoutMS = this.timeoutMS;
        var storage = this.storage;

        var keyX = key + ':X';
        var keyY = key + ':Y';
        var keyZ = key + ':Z';

        var reportError = function(err) {
            errorCB && errorCB(err);
        };

        var delay = function(cb) {
            if (new Date().getTime() - startTime > timeoutMS) {
                logger$8.error('Timeout waiting for mutex on ' + key + '; clearing lock. [' + i + ']');
                storage.removeItem(keyZ);
                storage.removeItem(keyY);
                loop();
                return;
            }
            setTimeout(function() {
                try {
                    cb();
                } catch(err) {
                    reportError(err);
                }
            }, pollIntervalMS * (Math.random() + 0.1));
        };

        var waitFor = function(predicate, cb) {
            if (predicate()) {
                cb();
            } else {
                delay(function() {
                    waitFor(predicate, cb);
                });
            }
        };

        var getSetY = function() {
            var valY = storage.getItem(keyY);
            if (valY && valY !== i) { // if Y == i then this process already has the lock (useful for test cases)
                return false;
            } else {
                storage.setItem(keyY, i);
                if (storage.getItem(keyY) === i) {
                    return true;
                } else {
                    if (!localStorageSupported(storage, true)) {
                        throw new Error('localStorage support dropped while acquiring lock');
                    }
                    return false;
                }
            }
        };

        var loop = function() {
            storage.setItem(keyX, i);

            waitFor(getSetY, function() {
                if (storage.getItem(keyX) === i) {
                    criticalSection();
                    return;
                }

                delay(function() {
                    if (storage.getItem(keyY) !== i) {
                        loop();
                        return;
                    }
                    waitFor(function() {
                        return !storage.getItem(keyZ);
                    }, criticalSection);
                });
            });
        };

        var criticalSection = function() {
            storage.setItem(keyZ, '1');
            try {
                lockedCB();
            } finally {
                storage.removeItem(keyZ);
                if (storage.getItem(keyY) === i) {
                    storage.removeItem(keyY);
                }
                if (storage.getItem(keyX) === i) {
                    storage.removeItem(keyX);
                }
            }
        };

        try {
            if (localStorageSupported(storage, true)) {
                loop();
            } else {
                throw new Error('localStorage support check failed');
            }
        } catch(err) {
            reportError(err);
        }
    };

    var logger$7 = console_with_prefix('batch');

    /**
     * RequestQueue: queue for batching API requests with localStorage backup for retries.
     * Maintains an in-memory queue which represents the source of truth for the current
     * page, but also writes all items out to a copy in the browser's localStorage, which
     * can be read on subsequent pageloads and retried. For batchability, all the request
     * items in the queue should be of the same type (events, people updates, group updates)
     * so they can be sent in a single request to the same API endpoint.
     *
     * LocalStorage keying and locking: In order for reloads and subsequent pageloads of
     * the same site to access the same persisted data, they must share the same localStorage
     * key (for instance based on project token and queue type). Therefore access to the
     * localStorage entry is guarded by an asynchronous mutex (SharedLock) to prevent
     * simultaneously open windows/tabs from overwriting each other's data (which would lead
     * to data loss in some situations).
     * @constructor
     */
    var RequestQueue = function(storageKey, options) {
        options = options || {};
        this.storageKey = storageKey;
        this.storage = options.storage || window.localStorage;
        this.lock = new SharedLock(storageKey, {storage: this.storage});

        this.pid = options.pid || null; // pass pid to test out storage lock contention scenarios

        this.memQueue = [];
    };

    /**
     * Add one item to queues (memory and localStorage). The queued entry includes
     * the given item along with an auto-generated ID and a "flush-after" timestamp.
     * It is expected that the item will be sent over the network and dequeued
     * before the flush-after time; if this doesn't happen it is considered orphaned
     * (e.g., the original tab where it was enqueued got closed before it could be
     * sent) and the item can be sent by any tab that finds it in localStorage.
     *
     * The final callback param is called with a param indicating success or
     * failure of the enqueue operation; it is asynchronous because the localStorage
     * lock is asynchronous.
     */
    RequestQueue.prototype.enqueue = function(item, flushInterval, cb) {
        var queueEntry = {
            'id': cheap_guid(),
            'flushAfter': new Date().getTime() + flushInterval * 2,
            'payload': item
        };

        this.lock.withLock(_.bind(function lockAcquired() {
            var succeeded;
            try {
                var storedQueue = this.readFromStorage();
                storedQueue.push(queueEntry);
                succeeded = this.saveToStorage(storedQueue);
                if (succeeded) {
                    // only add to in-memory queue when storage succeeds
                    logger$7.log('succeeded saving to storage');
                    this.memQueue.push(queueEntry);
                }
            } catch(err) {
                logger$7.error('Error enqueueing item', item);
                succeeded = false;
            }
            if (cb) {
                cb(succeeded);
            }
        }, this), function lockFailure(err) {
            logger$7.error('Error acquiring storage lock', err);
            if (cb) {
                cb(false);
            }
        }, this.pid);
    };

    /**
     * Read out the given number of queue entries. If this.memQueue
     * has fewer than batchSize items, then look for "orphaned" items
     * in the persisted queue (items where the 'flushAfter' time has
     * already passed).
     */
    RequestQueue.prototype.fillBatch = function(batchSize) {
        var batch = this.memQueue.slice(0, batchSize);

        if (batch.length < batchSize) {
            // don't need lock just to read events; localStorage is thread-safe
            // and the worst that could happen is a duplicate send of some
            // orphaned events, which will be deduplicated on the server side
            var storedQueue = this.readFromStorage();
            logger$7.log('current storedQueue size ' + storedQueue.length);
            if (storedQueue.length) {
                // item IDs already in batch; don't duplicate out of storage
                var idsInBatch = {}; // poor man's Set
                _.each(batch, function(item) { idsInBatch[item['id']] = true; });

                for (var i = 0; i < storedQueue.length; i++) {
                    var item = storedQueue[i];
                    if (new Date().getTime() > item['flushAfter'] && !idsInBatch[item['id']]) {
                        batch.push(item);
                        if (batch.length >= batchSize) {
                            break;
                        }
                    }
                }
            }
        }
        return batch;
    };

    /**
     * Remove items with matching 'id' from array (immutably)
     * also remove any item without a valid id (e.g., malformed
     * storage entries).
     */
    var filterOutIDsAndInvalid = function(items, idSet) {
        var filteredItems = [];
        _.each(items, function(item) {
            if (item['id'] && !idSet[item['id']]) {
                filteredItems.push(item);
            }
        });
        return filteredItems;
    };

    /**
     * Remove items with matching IDs from both in-memory queue
     * and persisted queue
     */
    RequestQueue.prototype.removeItemsByID = function(ids, cb) {
        var idSet = {}; // poor man's Set
        _.each(ids, function(id) { idSet[id] = true; });

        this.memQueue = filterOutIDsAndInvalid(this.memQueue, idSet);
        this.lock.withLock(_.bind(function lockAcquired() {
            var succeeded;
            try {
                var storedQueue = this.readFromStorage();
                storedQueue = filterOutIDsAndInvalid(storedQueue, idSet);
                logger$7.log('new storedQueue ' + storedQueue && storedQueue.length);
                succeeded = this.saveToStorage(storedQueue);
            } catch(err) {
                logger$7.error('Error removing items', ids);
                succeeded = false;
            }
            if (cb) {
                logger$7.log('triggering callback of removalItems');
                cb(succeeded);
            }
        }, this), function lockFailure(err) {
            logger$7.error('Error acquiring storage lock', err);
            if (cb) {
                cb(false);
            }
        }, this.pid);
    };

    /**
     * Read and parse items array from localStorage entry, handling
     * malformed/missing data if necessary.
     */
    RequestQueue.prototype.readFromStorage = function() {
        var storageEntry;
        try {
            logger$7.log('trying to get storage with storage key ' + this.storageKey);
            storageEntry = this.storage.getItem(this.storageKey);
            if (storageEntry) {
                storageEntry = JSONParse(storageEntry);
                if (!_.isArray(storageEntry)) {
                    logger$7.error('Invalid storage entry:', storageEntry);
                    storageEntry = null;
                }
            } else {
              logger$7.log('storageEntry is empty');
            }
        } catch (err) {
            logger$7.error('Error retrieving queue', err);
            storageEntry = null;
        }
        return storageEntry || [];
    };

    /**
     * Serialize the given items array to localStorage.
     */
    RequestQueue.prototype.saveToStorage = function(queue) {
        try {
            this.storage.setItem(this.storageKey, JSONStringify(queue));
            return true;
        } catch (err) {
            logger$7.error('Error saving queue', err);
            return false;
        }
    };

    /**
     * Clear out queues (memory and localStorage).
     */
    RequestQueue.prototype.clear = function() {
        this.memQueue = [];
        this.storage.removeItem(this.storageKey);
    };

    // eslint-disable-line camelcase

    // maximum interval between request retries after exponential backoff
    var MAX_RETRY_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

    var logger$6 = console_with_prefix('batch');

    /**
     * RequestBatcher: manages the queueing, flushing, retry etc of requests of one
     * type (events, people, groups).
     * Uses RequestQueue to manage the backing store.
     * @constructor
     */
    var RequestBatcher = function(storageKey, endpoint, options) {
        this.queue = new RequestQueue(storageKey, {storage: options.storage});
        this.endpoint = endpoint;

        this.libConfig = options.libConfig;
        this.sendRequest = options.sendRequestFunc;

        // seed variable batch size + flush interval with configured values
        this.batchSize = this.libConfig['batch_size'];
        this.flushInterval = this.libConfig['batch_flush_interval_ms'];

        this.stopped = false;
    };

    /**
     * Add one item to queue.
     */
    RequestBatcher.prototype.enqueue = function(item, cb) {
        this.queue.enqueue(item, this.flushInterval, cb);
    };

    /**
     * Start flushing batches at the configured time interval. Must call
     * this method upon SDK init in order to send anything over the network.
     */
    RequestBatcher.prototype.start = function() {
        this.stopped = false;
        this.flush();
    };

    /**
     * Stop flushing batches. Can be restarted by calling start().
     */
    RequestBatcher.prototype.stop = function() {
        this.stopped = true;
        if (this.timeoutID) {
            clearTimeout(this.timeoutID);
            this.timeoutID = null;
        }
    };

    /**
     * Clear out queue.
     */
    RequestBatcher.prototype.clear = function() {
        this.queue.clear();
    };

    /**
     * Restore batch size configuration to whatever is set in the main SDK.
     */
    RequestBatcher.prototype.resetBatchSize = function() {
        this.batchSize = this.libConfig['batch_size'];
    };

    /**
     * Restore flush interval time configuration to whatever is set in the main SDK.
     */
    RequestBatcher.prototype.resetFlush = function() {
        this.scheduleFlush(this.libConfig['batch_flush_interval_ms']);
    };

    /**
     * Schedule the next flush in the given number of milliseconds.
     */
    RequestBatcher.prototype.scheduleFlush = function(flushMS) {
        this.flushInterval = flushMS;
        if (!this.stopped) { // don't schedule anymore if batching has been stopped
            this.timeoutID = setTimeout(_.bind(this.flush, this), this.flushInterval);
        }
    };

    /**
     * Flush one batch to network. Depending on success/failure modes, it will either
     * remove the batch from the queue or leave it in for retry, and schedule the next
     * flush. In cases of most network or API failures, it will back off exponentially
     * when retrying.
     * @param {Object} [options]
     * @param {boolean} [options.sendBeacon] - whether to send batch with
     * navigator.sendBeacon (only useful for sending batches before page unloads, as
     * sendBeacon offers no callbacks or status indications)
     */
    RequestBatcher.prototype.flush = function(options) {
        try {
            if (this.requestInProgress) {
                logger$6.log('Flush: Request already in progress');
                return;
            }

            options = options || {};
            var currentBatchSize = this.batchSize;
            var batch = this.queue.fillBatch(currentBatchSize);
            logger$6.log('current batch size is ' + batch.length);

            if (batch.length < 1) {
                this.resetFlush();
                return; // nothing to do
            }

            this.requestInProgress = true;

            var timeoutMS = this.libConfig['batch_request_timeout_ms'];
            var startTime = new Date().getTime();
            var dataForRequest = _.map(batch, function(item) { return item['payload']; });
            var batchSendCallback = _.bind(function(res) {
                this.requestInProgress = false;

                try {
                    // handle API response in a try-catch to make sure we can reset the
                    // flush operation if something goes wrong

                    var removeItemsFromQueue = false;
                    if (
                        _.isObject(res) &&
                        res.error === 'timeout' &&
                        new Date().getTime() - startTime >= timeoutMS
                    ) {
                        logger$6.error('Network timeout; retrying');
                        this.flush();
                    } else if (
                        _.isObject(res) &&
                        res.xhr_req &&
                        (res.xhr_req['status'] >= 500 || res.xhr_req['status'] <= 0)
                    ) {
                        // network or API error, retry
                        var retryMS = this.flushInterval * 2;
                        var headers = res.xhr_req['responseHeaders'];
                        if (headers) {
                            var retryAfter = headers['Retry-After'];
                            if (retryAfter) {
                                retryMS = (parseInt(retryAfter, 10) * 1000) || retryMS;
                            }
                        }
                        retryMS = Math.min(MAX_RETRY_INTERVAL_MS, retryMS);
                        logger$6.error('Error; retry in ' + retryMS + ' ms');
                        this.scheduleFlush(retryMS);
                    } else if (_.isObject(res) && res.xhr_req && res.xhr_req['status'] === 413) {
                        // 413 Payload Too Large
                        if (batch.length > 1) {
                            var halvedBatchSize = Math.max(1, Math.floor(currentBatchSize / 2));
                            this.batchSize = Math.min(this.batchSize, halvedBatchSize, batch.length - 1);
                            logger$6.error('413 response; reducing batch size to ' + this.batchSize);
                            this.resetFlush();
                        } else {
                            logger$6.error('Single-event request too large; dropping', batch);
                            this.resetBatchSize();
                            removeItemsFromQueue = true;
                        }
                    } else {
                        // successful network request+response; remove each item in batch from queue
                        // (even if it was e.g. a 400, in which case retrying won't help)
                        removeItemsFromQueue = true;
                    }

                    if (removeItemsFromQueue) {
                        this.queue.removeItemsByID(
                            _.map(batch, function(item) { return item['id']; }),
                            _.bind(this.flush, this) // handle next batch if the queue isn't empty
                        );
                    }

                } catch(err) {
                    logger$6.error('Error handling API response', err);
                    this.resetFlush();
                }
            }, this);
            var requestOptions = {
                method: 'POST',
                verbose: true,
                ignore_json_errors: true, // eslint-disable-line camelcase
                timeout_ms: timeoutMS // eslint-disable-line camelcase
            };
            if (options.sendBeacon) {
                requestOptions.transport = 'sendBeacon';
            }
            logger$6.log('Moesif Request:', this.endpoint, dataForRequest);
            this.sendRequest(this.endpoint, dataForRequest, requestOptions, batchSendCallback);

        } catch(err) {
            logger$6.error('Error flushing request queue', err);
            this.resetFlush();
        }
    };

    var MOESIF_CONSTANTS = {
      //The base Uri for API calls
      HOST: 'api.moesif.net',
      EVENT_ENDPOINT: '/v1/events',
      EVENT_BATCH_ENDPOINT: '/v1/events/batch',
      ACTION_ENDPOINT: '/v1/actions',
      ACTION_BATCH_ENDPOINT: '/v1/actions/batch',
      USER_ENDPOINT: '/v1/users',
      COMPANY_ENDPOINT: '/v1/companies',
      STORED_USER_ID: 'moesif_stored_user_id',
      STORED_COMPANY_ID: 'moesif_stored_company_id',
      STORED_SESSION_ID: 'moesif_stored_session_id'
    };

    /*
     * Dynamic... constants? Is that an oxymoron?
     */
    // http://hacks.mozilla.org/2009/07/cross-site-xmlhttprequest-with-cors/
    // https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest#withCredentials
    var USE_XHR = (window.XMLHttpRequest && 'withCredentials' in new XMLHttpRequest());
    // IE<10 does not support cross-origin XHR's but script tags
    // with defer won't block window.onload; ENQUEUE_REQUESTS
    // should only be true for Opera<12

    var ENQUEUE_REQUESTS = !USE_XHR && (userAgent.indexOf('MSIE') === -1) && (userAgent.indexOf('Mozilla') === -1);

    // save reference to navigator.sendBeacon so it can be minified
    var sendBeacon = null;
    if (navigator['sendBeacon']) {
      sendBeacon = function () {
        // late reference to navigator.sendBeacon to allow patching/spying
        return navigator['sendBeacon'].apply(navigator, arguments);
      };
    }


    var HTTP_PROTOCOL = (('http:' === (document && document.location.protocol)) ? 'http://' : 'https://');

    function isMoesif(event) {
      try {
        return event['request']['headers']['X-Moesif-SDK'];
      } catch(err) {
        return false;
      }
    }

    function ensureValidOptions(options) {
      if (!options) throw new Error('options are required by moesif-express middleware');
      if (!options['applicationId']) throw new Error('A moesif application id is required. Please obtain it through your settings at www.moesif.com');

      if (options['getTags'] && !_.isFunction(options['getTags'])) {
        throw new Error('getTags should be a function');
      }
      if (options['getMetadata'] && !_.isFunction(options['getMetadata'])) {
        throw new Error('getMetadata should be a function');
      }
      if (options['getApiVersion'] && !_.isFunction(options['getApiVersion'])) {
        throw new Error('identifyUser should be a function');
      }
      if (options['maskContent'] && !_.isFunction(options['maskContent'])) {
        throw new Error('maskContent should be a function');
      }
      if (options['skip'] && !_.isFunction(options['skip'])) {
        throw new Error('skip should be a function');
      }
    }

    function moesifCreator () {
      console.log('moesif object creator is called');

      return {
        'init': function (options) {
          if (!window) {
            console.critical('Warning, this library need to be initiated on the client side');
          }

          ensureValidOptions(options);

          var ops = {};

          ops.getTags = options['getTags'] || function () {
            return undefined;
          };
          ops.maskContent = options['maskContent'] || function (eventData) {
            return eventData;
          };

          ops.getMetadata = options['getMetadata'] || function () {
            return undefined;
          };

          ops.skip = options['skip'] || function () {
            return false;
          };

          ops.debug = options['debug'];
          ops.callback = options['callback'];
          ops.applicationId = options['applicationId'];
          ops.apiVersion = options['apiVersion'];
          ops.disableFetch = options['disableFetch'];

          ops.disableReferrer = options['disableReferrer'];
          ops.disableGclid = options['disableGclid'];
          ops.disableUtm = options['disableUtm'];

          ops.eagerBodyLogging = options['eagerBodyLogging'];

          ops.batchEnabled = options['batchEnabled'] || false;

          ops['batch_size'] = options['batchSize'] || 25,
          ops['batch_flush_interval_ms'] = options['batchMaxTime'] || 2500;
          ops['batch_request_timeout_ms'] = options['batchTimeout'] || 90000;

          this.requestBatchers = {};

          this._options = ops;
          try {
            this._userId = localStorage.getItem(MOESIF_CONSTANTS.STORED_USER_ID);
            this._session = localStorage.getItem(MOESIF_CONSTANTS.STORED_SESSION_ID);
            this._companyId = localStorage.getItem(MOESIF_CONSTANTS.STORED_COMPANY_ID);
            this._campaign = getCampaignData(ops);
          } catch(err) {
            console.error('error loading saved data from local storage but continue');
          }

          if (ops.batchEnabled) {
            if (!localStorageSupported || !USE_XHR) {
              ops.batchEnabled = false;
              console.log('Turning off batch processing because it needs XHR and localStorage');
            } else {
              this.initBatching();
              if (sendBeacon && window.addEventListener) {
                window.addEventListener('unload', _.bind(function () {
                  // Before page closes, attempt to flush any events queued up via navigator.sendBeacon.
                  // Since sendBeacon doesn't report success/failure, events will not be removed from
                  // the persistent store; if the site is loaded again, the events will be flushed again
                  // on startup and deduplicated on the Mixpanel server side.
                  this.requestBatchers.events.flush({ sendBeacon: true });
                }, this));
              }
            }
          }

          console.log('moesif initiated');
          return this;
        },
        _executeRequest: function (url, data, options, callback) {
          // options structure
          // {
          //   method: 'POST',
          //   verbose: true,
          //   ignore_json_errors: true, // eslint-disable-line camelcase
          //   timeout_ms: timeoutMS, // eslint-disable-line camelcase
          //   applicationId
          // };
          var token = (options && options.applicationId) || this._options.applicationId;
          var method = (options && options.method) || 'POST';

          // right now we onlu support USE_XHR

          try {
            var xmlhttp = new XMLHttpRequest();   // new HttpRequest instance
            xmlhttp.open(method, url);
            xmlhttp.setRequestHeader('Content-Type', 'application/json');
            xmlhttp.setRequestHeader('X-Moesif-Application-Id', token);
            xmlhttp.setRequestHeader('X-Moesif-SDK', 'moesif-browser-js/' + Config.LIB_VERSION);

            if (options.timeout_ms && typeof xmlhttp.timeout !== 'undefined') {
              xmlhttp.timeout = options.timeout_ms;
              var startTime = new Date().getTime();
            }
            xmlhttp.onreadystatechange = function () {
              if (xmlhttp.readyState === 4) { // XMLHttpRequest.DONE == 4, except in safari 4
                if (xmlhttp.status >= 200 && xmlhttp.status <= 300) {
                  if (callback) {
                    var response = XMLHttpRequest.responseText;
                    callback(response);
                  }
                } else {
                  var error;
                  if (
                    xmlhttp.timeout &&
                    !xmlhttp.status &&
                    new Date().getTime() - startTime >= xmlhttp.timeout
                  ) {
                    error = 'timeout';
                  } else {
                    error = 'Bad HTTP status: ' + xmlhttp.status + ' ' + xmlhttp.statusText;
                  }
                  console.error(error);
                  if (callback) {
                    callback({ status: 0, error: error, xhr_req: xmlhttp }); // eslint-disable-line camelcase
                  }
                }
              }
            };

            xmlhttp.send(JSONStringify(data));
          } catch (err) {
            console.error('failed to send event to moesif' + event['request']['uri']);
            console.error(err);
             if (callback) {
              callback({status: 0, error: err });
            }
          }
        },
        initBatching: function () {
          var applicationId = this._options.applicationId;

          console.log('does requestBatch.events exists? ' + this.requestBatchers.events);

          if (!this.requestBatchers.events) {
            var batchConfig = {
              libConfig: this._options,
              sendRequestFunc: _.bind(function (endPoint, data, options, cb) {
                this._executeRequest(
                  endPoint,
                  data,
                  options,
                  cb
                );
              }, this)
            };

            var eventsBatcher = new RequestBatcher('__mf_' + applicationId + '_ev', HTTP_PROTOCOL + MOESIF_CONSTANTS.HOST + MOESIF_CONSTANTS.EVENT_BATCH_ENDPOINT, batchConfig);
            var actionsBatcher = new RequestBatcher('__mf_' + applicationId + '_ac', HTTP_PROTOCOL + MOESIF_CONSTANTS.HOST + MOESIF_CONSTANTS.ACTION_BATCH_ENDPOINT, batchConfig);

            this.requestBatchers = {
              events: eventsBatcher,
              actions: actionsBatcher
            };
          }

          _.each(this.requestBatchers, function (batcher) {
            batcher.start();
          });
        },
        _sendOrBatch: function(data, applicationId, endPoint, batcher, callback) {
          var requestInitiated = true;

          if (this._options.batchEnabled && batcher) {
            console.log('current batcher storage key is  ' + batcher.queue.storageKey);

            batcher.enqueue(data);
          } else {
            // execute immediately
            var executeOps = {
              applicationId: applicationId
            };

            requestInitiated = this._executeRequest(endPoint, data, executeOps, callback);
          }
          return requestInitiated;
        },
        'start': function (passedInWeb3) {
          var _self = this;


          if (this._stopRecording || this._stopWeb3Recording) {
            console.log('recording has already started, please call stop first.');
            return false;
          }

          function recorder(event) {
            _self.recordEvent(event);
          }

          console.log('moesif starting');
          this._stopRecording = captureXMLHttpRequest(recorder, this._options);

          if (!this._options.disableFetch) {
            console.log('also instrumenting fetch API');
            this._stopFetchRecording = patch(recorder);
          }
          this['useWeb3'](passedInWeb3);
          // if (passedInWeb3) {
          //   this._stopWeb3Recording = patchWeb3WithCapture(passedInWeb3, _self.recordEvent, this._options);
          // } else if (window['web3']) {
          //   // try to patch the global web3
          //   console.log('found global web3, will capture from it');
          //   this._stopWeb3Recording = patchWeb3WithCapture(window['web3'], _self.recordEvent, this._options);
          // }
          return true;
        },
        'useWeb3': function (passedInWeb3) {
          var _self = this;

          function recorder(event) {
            _self.recordEvent(event);
          }

          if (this._stopWeb3Recording) {
            this._stopWeb3Recording();
            this._stopWeb3Recording = null;
          }
          if (passedInWeb3) {
            this._stopWeb3Recording = captureWeb3Requests(passedInWeb3, recorder, this._options);
          } else if (window['web3']) {
            // try to patch the global web3
            console.log('found global web3, will capture from it');
            this._stopWeb3Recording = captureWeb3Requests(window['web3'], recorder, this._options);
          }
          if (this._stopWeb3Recording) {
            // if function is returned it means we succeeded.
            return true;
          }
          return false;
        },
        updateUser: function(userObject, applicationId, callback) {
          this._executeRequest(
            HTTP_PROTOCOL + MOESIF_CONSTANTS.HOST + MOESIF_CONSTANTS.USER_ENDPOINT,
            userObject,
            { applicationId: applicationId },
            callback
          );
        },
        'identifyUser': function (userId, metadata) {
          this._userId = userId;
          if (!(this._options && this._options.applicationId)) {
            throw new Error('Init needs to be called with a valid application Id before calling identify User.');
          }
          var userObject = {
            'user_id': userId
          };

          if (metadata) {
            userObject['metadata'] = metadata;
          }
          if (this._session) {
            userObject['session_token'] = this._session;
          }
          if (this._campaign) {
            userObject['campaign'] = this._campaign;
          }
          if (this._companyId) {
            userObject['company_id'] = this._companyId;
          }

          this.updateUser(userObject, this._options.applicationId, this._options.callback);
          try {
            localStorage.setItem(MOESIF_CONSTANTS.STORED_USER_ID, userId);
          } catch (err) {
            console.error('error saving to local storage');
          }
        },
        updateCompany: function(companyObject, applicationId, callback) {
          this._executeRequest(
            HTTP_PROTOCOL + MOESIF_CONSTANTS.HOST + MOESIF_CONSTANTS.COMPANY_ENDPOINT,
            companyObject,
            { applicationId: applicationId },
            callback
          );
        },
        'identifyCompany': function (companyId, metadata, companyDomain) {
          this._companyId = companyId;
          if (!(this._options && this._options.applicationId)) {
            throw new Error('Init needs to be called with a valid application Id before calling identify User.');
          }
          var companyObject = {
            'company_id': companyId
          };

          if (companyDomain) {
            companyObject['company_domain'] = companyDomain;
          }

          if (metadata) {
            companyObject['metadata'] = metadata;
          }
          if (this._session) {
            companyObject['session_token'] = this._session;
          }
          if (this._campaign) {
            companyObject['campaign'] = this._campaign;
          }

          this.updateCompany(companyObject, this._options.applicationId, this._options.callback);

          try {
            localStorage.setItem(MOESIF_CONSTANTS.STORED_COMPANY_ID, companyId);
          } catch (err) {
            console.error('error saving to local storage');
          }
        },
        'identifySession': function (session) {
          this._session = session;
          localStorage.setItem(MOESIF_CONSTANTS.STORED_SESSION_ID, session);
        },
        'track': function (actionName, metadata) {
          var _self = this;
          if (!actionName) {
            throw new Error('track name must have action Name defined');
          }

          var actionObject = {
            'action_name': actionName
          };

          if (_self._companyId) {
            actionObject['company_id'] = _self._companyId;
          }
          if (_self._userId) {
            actionObject['user_id'] = _self._userId;
          }
          if (this._session) {
            actionObject['session_token'] = this._session;
          }

          actionObject['request'] = {
            'uri': document.location.href,
            'verb': 'GET', // for UI events on a current page, the current page verb is always get
            'user_agent_string': navigator.userAgent
          };

          if (metadata) {
            actionObject['metadata'] = metadata;
          }

          // sendAction(actionObject, this._options.applicationId, this._options.debug, this._options.callback);
          var endPoint = HTTP_PROTOCOL + MOESIF_CONSTANTS.HOST + MOESIF_CONSTANTS.ACTION_ENDPOINT;
          console.log('sending or queuing: ' + actionName);
          return _self._sendOrBatch(
            actionObject,
            _self._options.applicationId,
            endPoint,
            _self.requestBatchers.actions,
            _self._options.callback
          );
        },
        recordEvent: function (event) {
          if (isMoesif(event)) {
            console.log('skipped logging for requests to moesif');
            return;
          }

          var _self = this;
          console.log('determining if should log: ' + event['request']['uri']);
          var logData = Object.assign({}, event);
          if (_self._getUserId()) {
            logData['user_id'] = _self._getUserId();
          }
          if (_self._getCompanyId()) {
            logData['company_id'] = _self._getCompanyId();
          }
          if (_self._getSession()) {
            logData['session_token'] = _self._getSession();
          }

          logData['tags'] = _self._options.getTags(event) || '';

          if (_self._options.apiVersion) {
            logData['request']['api_version'] = _self._options.apiVersion;
          }

          if (_self._options.maskContent) {
            logData = _self._options.maskContent(logData);
          }

          if (_self._options.getMetadata) {
            if (logData['metadata']) {
              var newMetadata = _self._options.getMetadata(logData);
              logData['metadata'] = Object.assign(logData['metadata'], newMetadata);
            } else {
              logData['metadata'] = _self._options.getMetadata(logData);
            }
          }

          if (!_self._options.skip(event) && !isMoesif(event)) {
            // sendEvent(logData, _self._options.applicationId, _self._options.callback);
            console.log('sending or queuing: ' + event['request']['uri']);
            var endPoint = HTTP_PROTOCOL + MOESIF_CONSTANTS.HOST + MOESIF_CONSTANTS.EVENT_ENDPOINT;
            _self._sendOrBatch(
              logData,
              _self._options.applicationId,
              endPoint,
              _self.requestBatchers.events,
              _self._options.callback
            );
          } else {
            console.log('skipped logging for ' + event['request']['uri']);
          }
        },
        _getUserId: function () {
          return this._userId;
        },
        _getCompanyId: function () {
          return this._companyId;
        },
        _getSession: function () {
          return this._session;
        },
        'stop': function () {
          if (this._stopRecording) {
            this._stopRecording();
            this._stopRecording = null;
          }
          if (this._stopWeb3Recording) {
            this._stopWeb3Recording();
            this._stopWeb3Recording = null;
          }
          if (this._stopFetchRecording) {
            this._stopFetchRecording();
            this._stopFetchRecording = null;
          }
        }
      };
    }

    /*
     * Moesif Browser JS Library
     *
     * Copyright 2017, Moesif Inc. All Rights Reserved
     */

    // ==ClosureCompiler==
    // @compilation_level ADVANCED_OPTIMIZATIONS
    // @output_file_name moesif-1.0.min.js
    // ==/ClosureCompiler==

    /*
    SIMPLE STYLE GUIDE:

    this.x === public function
    this._x === internal - only use within this file
    this.__x === private - only use within the class

    Globals should be all caps
    */

    var init_type;       var INIT_SNIPPET = 1;

    /*
     * Constants
     */
    /** @const */   var PRIMARY_INSTANCE_NAME     = 'moesif';


    // var DOM_LOADED = false;

    function init_from_snippet() {
      init_type = INIT_SNIPPET;
      window[PRIMARY_INSTANCE_NAME] = moesifCreator();
    }

    init_from_snippet();

}());