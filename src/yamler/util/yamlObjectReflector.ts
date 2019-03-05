import { Reflector } from './reflector';
import { YamlObject } from './yamlObject';

export class YamlObjectReflector extends Reflector {
  private _yamlObject: YamlObject;

  constructor(yamlObject: YamlObject) {
    super();

    this._yamlObject = yamlObject;
  }

  public removeObject(object: any) {
    super.removeObject(object);
  }

  public async getProperties(): Promise<any[]> {
    return Array.from(this._yamlObject.map.keys());
  }

  public newInstance(): any {
    return new YamlObject();
  }

  // object is unused but need to be override
  public getValue(object: any, attribute: string): any {
    return this._yamlObject.get(attribute);
  }

  public setValue(attribute: string, value: string): any {
    return this._yamlObject.put(attribute, value);
  }
}
