import { Reflector, YamlObject } from './';
import { YamlObjectReflector } from './yamlObjectReflector';

export class ReflectorMap {
  private _reflectorMap: Map<string, Reflector>;

  constructor() {
    this._reflectorMap = new Map<string, Reflector>();
  }

  public getReflector(clazzName: string, newObject?: object): Reflector | any {
    if (newObject) {
      if (newObject instanceof YamlObject) {
        return new YamlObjectReflector(newObject);
      }

      clazzName = newObject.constructor.name;
    }

    let reflector: Reflector | null | undefined = this._reflectorMap.get(clazzName);
    if (reflector) {
      return reflector;
    }

    if (newObject) {
      reflector = new Reflector();
      reflector.clazz = newObject;
      this._reflectorMap.set(clazzName, reflector);
    }
    return reflector;
  }
}
