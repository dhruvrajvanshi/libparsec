import {
  Parser,charP, stringP, many, noneOf,
  many1, digit
} from "../index";

let whiteSpace = Parser.many1(Parser.oneOf("\n\t "));
let optionalWhiteSpace = Parser.many(Parser.oneOf("\n\t "));
let comma = optionalWhiteSpace.then(charP(',')).then(optionalWhiteSpace);

const jsonValue = Parser.lazy(() =>
  jsonString
    .or(jsonFloat)
    .or(jsonInt)
    .or(stringP("true").map(x => true))
    .or(stringP("false").map(x => false))
    .or(jsonArray)
    .or(jsonObject));

const jsonString = Parser.lazy(() => 
  charP("\"") // opening quote
    .then(
      many(
        stringP('\\"').map(x => '"') // escaped quote
        .or(stringP('\\n').map(x => "\n")) // escaped newline
        .or(stringP('\\\\')).map(x => "\\") // escaped backslash
        .or(noneOf('"\\'))) // other characters
    )
    .consume(charP("\"")) // consume and ignore closing quote
    .map(arr => arr.reduce((p, n) => p + n, ""))); // concatenate array to string



const jsonArray = Parser.lazy(() =>
  charP("[")
    .consume(optionalWhiteSpace)
    .then(jsonValue.sepBy(comma)) // comma seperated json values
    .consume(optionalWhiteSpace)
    .consume(charP("]")));

const jsonObject = Parser.lazy(() =>
  Parser.unit({})
    .consume(charP("{"))
    .consume(optionalWhiteSpace)
    .then(keyValuePair.sepBy(comma))
    .map(createObject) // convert array of key value pairs to object
    .consume(optionalWhiteSpace)
    .consume(charP("}"))
    .consume(optionalWhiteSpace));

const jsonInt = Parser.lazy(() =>
  many1(digit)
  .map(arr => arr.reduce((p, n) => p + n))
  .map(parseInt)
);

const jsonFloat = Parser.lazy(() =>
  Parser.unit({})
  .assign("before", many1(digit).map(concatenate))
  .consume(charP("."))
  .assign("after", many1(digit).map(concatenate))
  .map(o => o.before + "." + o.after)
  .map(parseFloat)
);

function concatenate(arr: string[]): string {
  return arr.reduce((p, n) => p + n, "")
}

const keyValuePair = Parser.lazy(() =>
  Parser.unit({})
  .consume(optionalWhiteSpace)
  .assign("key", jsonString)
  .consume(optionalWhiteSpace)
  .consume(charP(":"))
  .consume(optionalWhiteSpace)
  .assign("value", jsonValue)
  .consume(optionalWhiteSpace)
);


function createObject(pairs){
  var result = {};
  for(let pair of pairs){
    result[pair.key] = pair.value
  }
  return result;
}
console.log(
  JSON.stringify(jsonValue.parse('{a":["asdf", 23, 234.43, true, false, [true, false, {}, [234, 234324,4]]]}'))
)