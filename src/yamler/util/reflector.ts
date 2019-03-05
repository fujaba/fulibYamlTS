export class Reflector {
  private _clazz: any;
  private _properties: string[];

  constructor() {
    this._clazz = null;
    this._properties = new Array<string>();
  }

  public removeObject(object: any) {
    // call remove you if possible
    if (Reflect.has(object, 'removeYou')) {
      object.removeYou();
    }
  }

  public getProperties(): string[] {
    if (this._properties.length > 0) {
      return this._properties;
    }

    const fieldNames: string[] = new Array();
    for (const field of Reflect.ownKeys(this._clazz)) {
      if (typeof field === 'string' && field !== 'constructor') {
        fieldNames.push(field);
      }
    }

    this._properties = fieldNames.sort();
    return this._properties;
  }

  public newInstance(): any {
    if (this._clazz) {
      return Reflect.construct(this._clazz, []);
    }
    return null;
  }

  public getValue(object: any, attribute: string): any {
    if (!object) {
      return null;
    }

    if (Reflect.has(object, attribute)) {
      return Reflect.get(object, attribute);
    }

    return null;
  }

  public setValue(object: any, attribute: string, value: any): any {
    if (!object) {
      return null;
    }

    if (Reflect.has(object, attribute)) {
      return Reflect.set(object, attribute, value);
    }

    return null;
  }

  set clazz(clazz: any) {
    this._clazz = clazz;
  }

  get clazz(): any {
    return this._clazz;
  }
}
