System.register("index", [], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var Either, Pair, Parser, charP, stringP, many, many1, oneOf, lower, upper, digit, alphabet, alphanum, noneOf;
    function parseError(message, state) {
        return { message: message, state: state };
    }
    function Left(value) {
        return new Either(value, null);
    }
    function Right(value) {
        return new Either(null, value);
    }
    return {
        setters:[],
        execute: function() {
            exports_1("Parser", Parser);
            Either = (function () {
                function Either(left, right) {
                    if (left) {
                        this._isRight = false;
                        this.left = left;
                    }
                    else {
                        this._isRight = true;
                        this.right = right;
                    }
                }
                Either.prototype.isRight = function () {
                    return this._isRight;
                };
                Either.prototype.isLeft = function () {
                    return !this.isRight();
                };
                Either.unit = function (v) {
                    return Right(v);
                };
                return Either;
            }());
            Pair = (function () {
                function Pair(first, second) {
                    this.first = first;
                    this.second = second;
                }
                return Pair;
            }());
            /**
             * Represents a parser that can be applied to a string and
             * yields a value of type A
             */
            Parser = (function () {
                function Parser(parseFunc) {
                    this.parseFunc = parseFunc;
                }
                /**
                 * Applies this to the given input and returns either
                 * the result in case of successful parsing or ParseError
                 * in case of parsing error
                 */
                Parser.prototype.parse = function (input) {
                    var initialState = {
                        input: input, offset: 0
                    };
                    var result = this.parseFunc(initialState);
                    if (result.isLeft()) {
                        return Left(result.left);
                    }
                    else {
                        return Right(result.right.first);
                    }
                };
                /**
                 * Returns a parser that matches against this parser
                 * and passes on the result to f, and then matches
                 * using the result of calling f with the result of this.
                 */
                Parser.prototype.flatMap = function (f) {
                    var _this = this;
                    return new Parser(function (state) {
                        var result = _this.parseFunc(state);
                        if (result.isLeft()) {
                            return Left(result.left);
                        }
                        else {
                            var a = result.right.first;
                            var newState = result.right.second;
                            var f1 = f(a).parseFunc;
                            return f1(newState);
                        }
                    });
                };
                /**
                 * Gives a parser that applies the function f to the
                 * result of this.
                 */
                Parser.prototype.map = function (f) {
                    var p = this;
                    return p.flatMap(function (v) { return Parser.unit(f(v)); });
                };
                /**
                 * Gives a parser that consumes no input and yields the
                 * value a
                 */
                Parser.unit = function (a) {
                    return new Parser(function (state) { return Right(new Pair(a, state)); });
                };
                /**
                 * Returns a parser that tries to match using this and
                 * if it fails, matches using p2
                 */
                Parser.prototype.or = function (p2) {
                    var f1 = this.parseFunc;
                    var f2 = p2.parseFunc;
                    return new Parser(function (state) {
                        var result = f1(state);
                        if (result.isRight()) {
                            return Right(result.right);
                        }
                        else {
                            return f2(state);
                        }
                    });
                };
                /**
                 * Takes a function that returns a parser and returns
                 * a parser matches using the parser returned by the
                 * function. The function is called only when parser
                 * has to consume some input
                 */
                Parser.lazy = function (f) {
                    return new Parser(function (s) {
                        return f().parseFunc(s);
                    });
                };
                /**
                 * Returns a parser that consumes using this and then
                 * p and yields the result of this
                 */
                Parser.prototype.consume = function (p) {
                    return this.flatMap(function (result) {
                        return p.flatMap(function (x) { return Parser.unit(result); });
                    });
                };
                /**
                 * Takes either a parser or a function (A) => Parser<B>
                 * If a is a function, then it flatMaps the function to this
                 * parser. Otherwise, it returns a parser that returns the
                 * parser that ignores the result of this parser and returns
                 * the value yielded by the parser a.
                 */
                Parser.prototype.then = function (a) {
                    if (a instanceof Parser) {
                        return this.flatMap(function (x) { return a; });
                    }
                    else {
                        return this.flatMap(a);
                    }
                };
                Parser.prototype.sepBy = function (seperator) {
                    var _this = this;
                    return (this.consume(seperator)
                        .flatMap(function (x) {
                        return _this.sepBy(seperator).map(function (xs) { return [x].concat(xs); });
                    }))
                        .or(this.map(function (x) { return [x]; }))
                        .or(Parser.unit([]));
                };
                /**
                 * Assign the result of Parser p to the given key in
                 * object. Should only be called on Parser instance that
                 * returns an object
                 */
                Parser.prototype.assign = function (key, p) {
                    return this.then(function (previous) {
                        if (!(previous instanceof Object)) {
                            throw "assign should be called on parser of object type";
                        }
                        return p.map(function (value) {
                            var obj = {};
                            obj[key] = value;
                            return Object.assign({}, previous, obj);
                        });
                    });
                };
                /**
                 * Returns this parser which gives the given error message
                 * on failure
                 */
                Parser.prototype.error = function (e) {
                    var _this = this;
                    return new Parser(function (s) {
                        var result = _this.parseFunc(s);
                        if (result.isRight()) {
                            return result;
                        }
                        else {
                            return Left(parseError(e, s));
                        }
                    });
                };
                /**
                 * Returns a parser that matches the given character c
                 */
                Parser.charP = function (c) {
                    if (c.length !== 1) {
                        throw "The argument of charP should be a string of length 1";
                    }
                    return new Parser(function (state) {
                        if (state.input[state.offset] === c) {
                            return Right(new Pair(c, {
                                input: state.input,
                                offset: state.offset + 1
                            }));
                        }
                        else {
                            return Left({
                                message: "Expected '" + c + "' got '" + state.input[state.offset] + "'",
                                state: state
                            });
                        }
                    });
                };
                /**
                 * Returns a parser that matches given string
                 */
                Parser.stringP = function (s) {
                    var charP = Parser.charP;
                    if (s.length === 0) {
                        return Parser.unit("");
                    }
                    else if (s.length === 1) {
                        return charP(s[0]);
                    }
                    else {
                        var x_1 = s[0];
                        var xs_1 = s.slice(1);
                        return charP(x_1)
                            .flatMap(function (c) { return Parser.stringP(xs_1).flatMap(function (rest) { return Parser.unit(x_1 + rest); }); });
                    }
                };
                /**
                 * Returns a parser that matches a single instance of one
                 * of the characters in s
                 */
                Parser.oneOf = function (s) {
                    var p = Parser.charP(s[0]);
                    for (var i = 1; i < s.length; i++) {
                        p = p.or(Parser.charP(s[i]));
                    }
                    return p;
                };
                /**
                 * Returns a parser that matches many (including 0) instances
                 * of given parser
                 */
                Parser.many = function (p) {
                    var f = p.parseFunc;
                    return new Parser(function (s) {
                        var result = f(s);
                        var acc = [];
                        var state = s;
                        while (result.isRight()) {
                            state = result.right.second;
                            acc.push(result.right.first);
                            result = f(state);
                        }
                        return Right(new Pair(acc, state));
                    });
                };
                /**
                 * Returns a parser that matches one or more instances
                 * of given parser
                 */
                Parser.many1 = function (p) {
                    return p.flatMap(function (x) { return Parser.many(p).flatMap(function (xs) { return Parser.unit([x].concat(xs)); }); });
                };
                /**
                 * Returns a parser that matches all characters except
                 * those in s
                 */
                Parser.noneOf = function (s) {
                    var set = new Set();
                    for (var _i = 0, s_1 = s; _i < s_1.length; _i++) {
                        var c = s_1[_i];
                        set.add(c);
                    }
                    return new Parser(function (state) {
                        if (set.has(state.input[state.offset])) {
                            return Left(parseError("Expected none of " + s + " got " + state.input[state.offset], state));
                        }
                        else {
                            return Right(new Pair(state.input[state.offset], {
                                input: state.input,
                                offset: state.offset + 1
                            }));
                        }
                    });
                };
                /**
                 * Returns a parser that always fails with given error
                 */
                Parser.fail = function (e) {
                    return new Parser(function (s) { return Left(parseError(e, s)); });
                };
                return Parser;
            }());
            exports_1("charP", charP = Parser.charP);
            exports_1("stringP", stringP = Parser.stringP);
            exports_1("many", many = Parser.many);
            exports_1("many1", many1 = Parser.many1);
            exports_1("oneOf", oneOf = Parser.oneOf);
            exports_1("lower", lower = oneOf("qwertyuiopasdfghjklzxcvbnm"));
            exports_1("upper", upper = oneOf("QWERTYUIOPASDFGHJKLZXCVBNM"));
            exports_1("digit", digit = oneOf("1234567890"));
            exports_1("alphabet", alphabet = lower.or(upper));
            exports_1("alphanum", alphanum = alphabet.or(digit));
            exports_1("noneOf", noneOf = Parser.noneOf);
        }
    }
});
