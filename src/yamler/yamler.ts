import { StringTokenizer } from './util';

export class Yamler {
  private _yaml: string;
  private _tokenizer: StringTokenizer;
  private _lookAheadToken: string;
  private _currentToken: string;
  private _currentPos: number;
  private _lookAheadPos: number;

  constructor(yaml?: string) {
    this._yaml = yaml || '';

    this._tokenizer = new StringTokenizer(yaml || '');
    this._lookAheadToken = '';
    this._currentToken = '';
    this._currentPos = 0;
    this._lookAheadPos = 0;
    this.nextToken();
    this.nextToken();
  }

  public decode(yaml: string): Map<string, string> {
    this.resetYamler(yaml);

    const result: Map<string, string> = new Map();

    while (this._currentToken.endsWith(':')) {
      const attrName: string = this.stripColon(this._currentToken);

      this.nextToken();

      let value: string = '';
      const valueStart: number = this._currentPos;

      // many values
      while (this._currentToken !== '' && !this._currentToken.endsWith(':')) {
        value = this._yaml.substring(valueStart, this._currentPos + this.currentToken.length);
        this.nextToken();
      }

      result.set(attrName, value);
    }

    return result;
  }

  public decodeList(yaml: string): Array<Map<string, string>> {
    this.resetYamler(yaml);
    const result: Array<Map<string, string>> = new Array();

    while (this._currentToken === '-') {
      const map: Map<string, string> = new Map();
      result.push(map);
      this.nextToken();
      while (this._currentToken.endsWith(':')) {
        const key: string = this.stripColon(this._currentToken);
        this.nextToken();
        const value: string = this._currentToken;
        this.nextToken();
        map.set(key, value);
      }
    }

    return result;
  }

  public static encapsulate(value: string): string {
    if (value.match(/[a-zA-Z0-9_\\.]+/)) {
      return value;
    }
    value = value.replace(/\"/g, '\\\\\"');
    return `"${value}"`;
  }

  public printError(msg: string) {
    let startPos: number = this._currentPos;
    if (startPos >= 10) {
      startPos -= 10;
    } else {
      startPos = 0;
    }

    let endPos: number = this._currentPos + 20;
    if (endPos >= this._yaml.length) {
      endPos = this._yaml.length;
    }

    console.error(`${this._yaml.substring(startPos, this._currentPos)} <-- ${msg} --> ${this._yaml.substring(this._currentPos, endPos)}`);
  }

  public nextToken(): string {
    this._currentToken = this._lookAheadToken;
    this._currentPos = this._lookAheadPos;

    if (this._tokenizer.hasMoreTokens()) {
      this._lookAheadToken = this._tokenizer.nextToken();
      this._lookAheadPos = this._yaml.indexOf(this._lookAheadToken, this._lookAheadPos + this._currentToken.length);
    } else {
      this._lookAheadToken = '';
    }

    if (this._lookAheadToken.startsWith('\"')) {
      // get up to the end of string
      const stringStartPos: number = this._lookAheadPos + 1;
      let subToken: string = this._lookAheadToken;
      let subTokenEnd: number = this._lookAheadPos + subToken.length;
      while (subTokenEnd < stringStartPos + 1 || (!subToken.endsWith('\"') || subToken.endsWith('\\\"')) && this._tokenizer.hasMoreTokens()) {
        subToken = this._tokenizer.nextToken();
        subTokenEnd = this._yaml.indexOf(subToken, subTokenEnd) + subToken.length;
      }
      this._lookAheadToken = this._yaml.substring(stringStartPos, subTokenEnd - 1);
      this._lookAheadToken = this.deEncapsulate(this._lookAheadToken);
    }

    return this._currentToken;
  }

  public stripColon(key: string) {
    let id: string = key;
    if (key.endsWith(':')) {
      id = key.substring(0, key.length - 1);
    } else {
      this.printError(`key does not end with ':' ${key}`);
    }

    return id;
  }

  get currentToken(): string {
    return this._currentToken;
  }

  get lookAheadToken(): string {
    return this._lookAheadToken;
  }

  private resetYamler(yaml: string) {
    this._yaml = yaml;
    this._tokenizer = new StringTokenizer(yaml);
    this._lookAheadToken = '';
    this._currentToken = '';
    this._currentPos = 0;
    this._lookAheadPos = 0;
    this.nextToken();
    this.nextToken();
  }

  private deEncapsulate(value: string) {
    return value.replace(/\\\\\"/g, '\"');
  }
}
