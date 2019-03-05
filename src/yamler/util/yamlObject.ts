export class YamlObject {
  private readonly ID: string = '.id';
  private readonly TYPE: string = 'type';

  private _map: Map<string, any> = new Map();

  constructor(id?: string, type?: string) {
    if (id && type) {
      this._map.set(this.ID, id);
      this._map.set(this.TYPE, type);
    }
  }

  public put(tag: string, value: any): YamlObject {
    this._map.set(tag, value);
    return this;
  }

  public get(tag: string): any {
    return this._map.get(tag);
  }

  get map(): Map<string, any> {
    return this._map;
  }
}
