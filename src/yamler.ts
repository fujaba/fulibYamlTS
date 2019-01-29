import StringTokenizer from './util/stringTokenizer';

export default class Yamler {
  private yaml: string;
  private tokenizer: StringTokenizer;
  private lookAheadToken: string;
  private currentToken: string;
  private currentPos: number;
  private lookAheadPos: number;

  constructor(yaml?: string) {
    this.yaml = yaml || '';

    this.tokenizer = new StringTokenizer(yaml || '');
    this.lookAheadToken = '';
    this.currentToken = '';
    this.currentPos = 0;
    this.lookAheadPos = 0;
    this.nextToken();
    this.nextToken();
  }

  public decode(yaml: string): Map<string, string> {
    this.resetYamler(yaml);

    const result: Map<string, string> = new Map();

    while (this.currentToken.endsWith(':')) {
      const attrName: string = this.stripColon(this.currentToken);

      this.nextToken();

      let value: string = '';
      const valueStart: number = this.currentPos;

      // many values
      while (this.currentToken !== '' && !this.currentToken.endsWith(':')) {
        value = this.yaml.substring(valueStart, this.currentPos + this.currentToken.length);
        this.nextToken();
      }

      result.set(attrName, value);
    }

    return result;
  }

  public decodeList(yaml: string): Array<Map<string, string>> {
    this.resetYamler(yaml);

    const result: Array<Map<string, string>> = new Array();

    while (this.currentToken === '-') {
      const map: Map<string, string> = new Map();
      result.push(map);
      this.nextToken();
      while (this.currentToken.endsWith(':')) {
        const key: string = this.stripColon(this.currentToken);
        this.nextToken();
        const value: string = this.currentToken;
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

  private nextToken(): string {
    this.currentToken = this.lookAheadToken;
    this.currentPos = this.lookAheadPos;

    if (this.tokenizer.hasMoreTokens()) {
      this.lookAheadToken = this.tokenizer.nextToken();
      this.lookAheadPos = this.yaml.indexOf(this.lookAheadToken, this.lookAheadPos + this.currentToken.length);
    } else {
      this.lookAheadToken = '';
    }

    if (this.lookAheadToken.startsWith('\"')) {
      // get up to the end of string
      const stringStartPos: number = this.lookAheadPos + 1;
      let subToken: string = this.lookAheadToken;
      let subTokenEnd: number = this.lookAheadPos + subToken.length;
      while (subTokenEnd < stringStartPos + 1 || (!subToken.endsWith('\"') || subToken.endsWith('\\\"')) && this.tokenizer.hasMoreTokens()) {
        subToken = this.tokenizer.nextToken();
        subTokenEnd = this.yaml.indexOf(subToken, subTokenEnd) + subToken.length;
      }
      this.lookAheadToken = this.yaml.substring(stringStartPos, subTokenEnd - 1);
      this.lookAheadToken = this.deEncapsulate(this.lookAheadToken);
    }

    return this.currentToken;
  }

  private resetYamler(yaml: string) {
    this.yaml = yaml;
    this.tokenizer = new StringTokenizer(yaml);
    this.lookAheadToken = '';
    this.currentToken = '';
    this.currentPos = 0;
    this.lookAheadPos = 0;
    this.nextToken();
    this.nextToken();
  }

  private stripColon(key: string) {
    let id: string = key;
    if (key.endsWith(':')) {
      id = key.substring(0, key.length - 1);
    } else {
      this.printError(`key does not end with ':' ${key}`);
    }

    return id;
  }

  private deEncapsulate(value: string) {
    return value.replace(/\\\\\"/g, '\"');
  }

  private printError(msg: string) {
    let startPos: number = this.currentPos;
    if (startPos >= 10) {
      startPos -= 10;
    } else {
      startPos = 0;
    }

    let endPos: number = this.currentPos + 20;
    if (endPos >= this.yaml.length) {
      endPos = this.yaml.length;
    }

    console.error(`${this.yaml.substring(startPos, this.currentPos)} <-- ${msg} --> ${this.yaml.substring(this.currentPos, endPos)}`);
  }
}
