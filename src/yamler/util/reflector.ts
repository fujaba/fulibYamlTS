export class Reflector {
  private _className: string;
  private _properties: string[];

  constructor() {
    this._className = '';
    this._properties = new Array<string>();
  }

  public removeObject(object: any) {
    // call remove you if possible
    if (Reflect.has(object, 'removeYou')) {
      object.removeYou();
    }
  }

  public async getProperties(): Promise<string[]> {
    if (this._properties.length > 0) {
      return this._properties;
    }

    try {
      const clazz = await import(this._className);
      const fieldNames: string[] = new Array();
      for (const field of Reflect.ownKeys(clazz.default.prototype)) {
        if (typeof field === 'string' && field !== 'constructor') {
          fieldNames.push(field);
        }
      }

      this._properties = fieldNames.sort();
      return this._properties;

    } catch (error) {
      console.error(error);
    }

    return [];
  }

  public newInstance(): any {
    const clazz: any = require(this.className);
    if (clazz) {
      return Reflect.construct(clazz, []);
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

  set className(className: string) {
    this._className = className;
  }

  get className(): string {
    return this._className;
  }
}
