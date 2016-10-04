export {Parser, ParseState, ParseError, ParseResult};

interface ParseResult<T> {
  error?: string,
  value : T,
  state : ParseState
}
interface ParseState {
  input: string,
  offset: number
}

interface ParseError {
  message: any,
  state  : ParseState
}

function parseError(message, state): ParseError {
  return {message, state};
}

class Either<A, B> {
  private _isRight: boolean;
  left: A;
  right: B;

  constructor(left: A, right?: B){
    if(left){
      this._isRight = false;
      this.left = left;
    } else {
      this._isRight = true;
      this.right = right;
    }
  }

  isRight(): boolean {
    return this._isRight;
  }

  isLeft(): boolean {
    return !this.isRight();
  }

  static unit<L, R>(v: R): Either<L,R>{
    return Right<L, R>(v);
  }
}

function Left<A, B>(value: A): Either<A, B>{
  return new Either<A, B>(value, null);
}

function Right<A, B>(value: B): Either<A, B>{
  return new Either<A, B>(null, value);
}

class Pair<A, B> {
  constructor(public first: A, public second: B){}
}

type ParseFunction<A> = {
  (ParseState): Either<ParseError, Pair<A, ParseState>>
}

/**
 * Represents a parser that can be applied to a string and
 * yields a value of type A
 */
class Parser<A> {
  constructor(public parseFunc: ParseFunction<A>){}
  
  /**
   * Applies this to the given input and returns either
   * the result in case of successful parsing or ParseError
   * in case of parsing error
   */
  parse(input: string): Either<ParseError, A> {
    let initialState: ParseState = {
      input: input, offset: 0
    };
    let result = this.parseFunc(initialState);

    if(result.isLeft()){
      return Left<ParseError, any>(
        result.left
      );
    } else {
      return Right<any, A>(result.right.first);
    }
  }

  /**
   * Returns a parser that matches against this parser
   * and passes on the result to f, and then matches
   * using the result of calling f with the result of this.
   */
  flatMap<B>(f: (A)=>Parser<B>): Parser<B>{
    return new Parser<B>(
      (state: ParseState) => {
        let result = this.parseFunc(state);
        if(result.isLeft()){
          return Left<ParseError, any>(result.left);
        } else {
          let a = result.right.first;
          let newState = result.right.second;
          let f1 = f(a).parseFunc;
          return f1(newState);
        }
      }
    )
  }

  /**
   * Gives a parser that applies the function f to the
   * result of this.
   */
  map<B>(f: (A) => B): Parser<B>{
    let p = this;
    return p.flatMap(v => Parser.unit(f(v)));
  }

  /**
   * Gives a parser that consumes no input and yields the
   * value a
   */
  static unit<T>(a: T): Parser<T>{
    return new Parser<T>(
      (state: ParseState) => Right<ParseError, Pair<T, ParseState>>(
        new Pair<T, ParseState>(a, state)
      )
    )
  }

  /**
   * Returns a parser that tries to match using this and
   * if it fails, matches using p2
   */
  or(p2: Parser<A>): Parser<A>{
    let f1 = this.parseFunc;
    let f2 = p2.parseFunc;
    return new Parser<A>(
      (state: ParseState) => {
        let result = f1(state);
        if(result.isRight()){
          return Right<ParseError, Pair<A, ParseState>>(
            result.right
          );
        } else {
          return f2(state);
        }
      }
    )
  }

  /**
   * Takes a function that returns a parser and returns
   * a parser matches using the parser returned by the
   * function. The function is called only when parser
   * has to consume some input
   */
  static lazy<T>(f: () => Parser<T>): Parser<T>{
    return new Parser<T>(
      s => 
       f().parseFunc(s)
    )
  }

  /**
   * Returns a parser that consumes using this and then
   * p and yields the result of this
   */  
  consume<B>(p: Parser<B>): Parser<A>{
    return this.flatMap(result =>
      p.flatMap(x => Parser.unit(result))
    )
  }

  /**
   * Takes either a parser or a function (A) => Parser<B>
   * If a is a function, then it flatMaps the function to this
   * parser. Otherwise, it returns a parser that returns the
   * parser that ignores the result of this parser and returns
   * the value yielded by the parser a.
   */
  then<B>(a: Parser<B> | ((A) => Parser<B>)): Parser<B> {
    if(a instanceof Parser){
      return this.flatMap(x => a)
    } else {
      return this.flatMap(a)
    }
  }

  sepBy(seperator: Parser<any>): Parser<A[]> {
    return (this.consume(seperator)
      .flatMap(x =>
        this.sepBy(seperator).map(xs => [x].concat(xs))))
      .or(this.map(x => [x]))
      .or(Parser.unit([]))
  }

  /**
   * Assign the result of Parser p to the given key in
   * object. Should only be called on Parser instance that
   * returns an object
   */
  assign<B>(key: string, p: Parser<B>){
    return this.then(previous => 
      {
        if(!(previous instanceof Object)){
          throw "assign should be called on parser of object type";
        }
        return p.map(
        value => {
          let obj = {};
          obj[key] = value;
          return Object.assign({}, previous, obj)})})
  }

  /**
   * Returns this parser which gives the given error message
   * on failure
   */
  error(e: string){
    return new Parser<A>(
      s => {
        let result = this.parseFunc(s);
        if(result.isRight()){
          return result;
        } else {
          return Left<ParseError, any>(parseError(e, s));
        }
      }
    )
  }

  /**
   * Returns a parser that matches the given character c
   */
  static charP(c: string): Parser<string> {
    if(c.length !== 1){
      throw "The argument of charP should be a string of length 1";
    }
    return new Parser<string> ((state: ParseState) => {
      if(state.input[state.offset] === c){
        return Right<ParseError, Pair<string, ParseState>>(
          new Pair<string, ParseState>(c, {
            input: state.input,
            offset: state.offset + 1
          }));
      } else {
        return Left<ParseError, any>({
          message: `Expected '${c}' got '${state.input[state.offset]}'`,
          state: state
        })
      }
    });
  }

  /**
   * Returns a parser that matches given string
   */
  static stringP(s: string): Parser<string>{
    let charP = Parser.charP;
    if(s.length === 0){
      return Parser.unit("");
    } else if(s.length === 1){
      return charP(s[0]);
    } else {
      let x = s[0];
      let xs = s.slice(1);
      return charP(x)
        .flatMap(c => Parser.stringP(xs).flatMap(
          rest => Parser.unit(x + rest)
        ))
    }
  }

  /**
   * Returns a parser that matches a single instance of one
   * of the characters in s
   */
  static oneOf(s: string): Parser<string> {
    let p = Parser.charP(s[0]);
    for(let i = 1; i<s.length; i++){
      p = p.or(Parser.charP(s[i]));
    }
    return p;
  }

  /**
   * Returns a parser that matches many (including 0) instances
   * of given parser
   */
  static many<T>(p: Parser<T>): Parser<T[]>{
    let f = p.parseFunc;
    return new Parser<T[]>(s => {
      let result = f(s);
      let acc: T[] = [];
      let state: ParseState = s;
      while(result.isRight()){
        state = result.right.second;
         acc.push(result.right.first);
        result = f(state);
      }
      return Right<ParseError, Pair<T[], ParseState>>(
        new Pair<T[], ParseState>(
          acc, state
        )
      );
    });
  }

  /**
   * Returns a parser that matches one or more instances
   * of given parser
   */
  static many1<T>(p: Parser<T>): Parser<T[]> {
    return p.flatMap<T[]>(
      x => Parser.many(p).flatMap(
        xs => Parser.unit([x].concat(xs))
      )
    )
  }

  /**
   * Returns a parser that matches all characters except
   * those in s
   */
  static noneOf(s: string): Parser<string>{
    let set = new Set();
    for(let c of s){
      set.add(c);
    }
    return new Parser<string>(
      state => {
        if(set.has(state.input[state.offset])){
          return Left<ParseError, any>(parseError(
            `Expected none of ${s} got ${state.input[state.offset]}`, state))
        } else {
          return Right<ParseError, Pair<string, ParseState>>(
            new Pair<string, ParseState>(state.input[state.offset], {
              input: state.input,
              offset: state.offset + 1
            })
          )
        }
      }
    )
  }

  /**
   * Returns a parser that always fails with given error
   */
  static fail<T>(e: any): Parser<T> {
    return new Parser<T>(
      s => Left<ParseError, any>(parseError(e,s))
    )
  }
}

export let charP = Parser.charP;
export let stringP = Parser.stringP;
export let many    = Parser.many;
export let many1   = Parser.many1;
export let oneOf   = Parser.oneOf;
export let lower   = oneOf("qwertyuiopasdfghjklzxcvbnm");
export let upper   = oneOf("QWERTYUIOPASDFGHJKLZXCVBNM");
export let digit   = oneOf("1234567890");
export let alphabet = lower.or(upper);
export let alphanum = alphabet.or(digit);
export let noneOf   = Parser.noneOf;