export default class StringTokenizer {
  private tokens: string[];
  private currentToken: string;
  private currentIndex: number;

  constructor(text: string) {
    this.tokens = text.split(/\s+/);

    this.currentIndex = 0;
    this.currentToken = this.tokens[this.currentIndex];
  }

  public hasMoreTokens(): boolean {
    return this.currentIndex < this.tokens.length;
  }

  public nextToken(): string {
    const result = this.currentToken;
    this.currentIndex++;
    this.currentToken = this.tokens[this.currentIndex];
    return result;
  }
}
