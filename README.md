Libparsec
=======
Libparsec is a parsing library inspired by the Haskell
library Parsec. You can make parsers by combining and
composing smaller parsers.

## Simple parsers
Simple strings
```js
import {stringP} from "libparsec";
console.log(stringP("hello").parse("hello"));
// => Either { _isRight: true, right: 'hello' }
```
Calling .parse on a parser returns an object with the
result of parsing assigned to the "right" key on success.

If parsing fails, the error is returned through the 
"left" key.
```js
console.log(stringP("hello").parse("xyz").left)
// => { message: 'Expected \'h\' got \'x\'',
//      state: { input: 'xyz', offset: 0 } } }

```

```js
import {oneOf, noneOf} from "libparsec";
// Parsing one of many characters
console.log(oneOf("abcd").parse("b").right) // => b

// Characters other than given chars
console.log(noneOf("abcd").parse("x").right) // => x
console.log(noneOf("abcd").parse("a").right) // => undefined
```

## Basic combinators
Function many takes a parser and returns a parser that matches
multiple consecutive instances and returns an array.

Function many1 does the same thing except it requires atleast 1
instance to succeed.
```js
// multiple instances
import {many} from "libparsec";
many(stringP("ab")).parse("").right // => []
many(stringP("ab")).parse("ab").right // => ["ab"]
many(stringP("ab")).parse("abab").right // => ["ab", "ab"]
```
```js
// multiple items seperated by a seperator
stringP("ab").sepBy(stringP(","))
  .parse("ab,ab").right // => [ 'ab', 'ab' ]
```
```js
import {Parser} from "libparsec";
// Parser that returns a value without consuming any input
Parser.unit("asdf").parse("pqrs").right // => "asdf"
```
## Parser with multiple options
```js
stringP("abc")
  .or(stringP("xyz"))
  .or(stringP("pqr")).parse("xyz") // => "xyz"
```
## Chaining multiple parsers
parser.consume method takes in a Parser instance and returns a
parser that consumes the first parser and then second parser and
returns the result of first parser ignoring the result of second
parser  
```js
stringP("asdf")
  .consume(many(stringP(" ")))
  .parse("asdf     ").right // => 'asdf'
  
```
.then(p: Parser) is used to ignore the return values of previous
parsers
```js
stringP("function ")
  .then(variableP)
```
Here, result of the first parser (stringP("function ")) will be ignored
and the parser will return the result of variableP parser.
## Transforming the result
Parser<T> is a monad which means you can call map and flatMap
on it.
.map method transforms the result of a parse using the given
function
```js
import {digit} from "libparsec";
numberP = many1(noneOf(digit));
numberP.parse("234").right // => "234"
numberP.map(parseInt)
  .parse("234").right // => 234
```

## Passing parse results to chained parsers
`Parser<A>.flatMap(A => Parser<B>)`  matches using the starting parser
and passes the result of parse to the function argument, which returns
another parser
```js
stringP("true")
  .flatMap(t => ...) // Here t will be bound to the value
                     // "true" in case of successful match
```
flatMap can be used to pass the parsed value down a chain of parsers.
In case of parsers that must collect results from a sequence of 
parsers, nested flatMaps can become unweildy. In such a case, assign
method is useful. assign is used to build up the result of chained
parsers.
```js
Parser.unit({}) // start with a parser that returns an empty 
                // object and consumes no input
  .consume(stringP("function")) // match string "function"
  .consume(whiteSpace) // ignore whitespace
  .assign("name", many1(alphabet)) // assign function name to object
  .consume(optionalWhiteSpace)
  .consume(charP('('))
  .consume(optionalWhiteSpace)
  .assign("args", many1(alphabet).sepBy(comma)) // comma seperated list of parameters
  .consume(optionalWhiteSpace)
  .consume(charP(")"))
  .consume(optionalWhiteSpace)
  .consume(charP('{'))
  .consume(optionalWhiteSpace)
  .assign("body", stringP("body"))
  .consume(optionalWhiteSpace)
  .consume(charP("}"))
  .parse("function f(x,y){body}")
  /* => Either {
   _isRight: true,
   right: { name: 'f', args: [ 'x', 'y' ], body: 'body' } } */

```
Note that .assign should only be called on parsers with object 
return types otherwise, it will throw an exception.

## Mutually recursive parsers
In case of parsers that depend on each other, normal parsers don't
work. In such a caes, use the Parser.lazy function to make sure
that parsers aren't evaluated until parsing starts.
Parser.lazy takes a parser wrapped in an annonymous function.
```js
let expression: Parser<boolean> = Parser.lazy( () =>
  stringP("true").map(x => true)
  .or(stringP("false").map(x => false))
  .or(
    charP("(")
    .then(expression)
    .consume(charP(")")))
);

expression.parse("true").right // => true
expression.parse("((true))").right // => true
```
Note that for typescript, type annotation for expression is necessary
or else .then(expression) will throw a type error

## Other examples
Check out the json example for a mostly complete json example
in less than 100 lines.