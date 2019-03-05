import { Reflector, YamlObject } from './';
import { YamlObjectReflector } from './yamlObjectReflector';

export class ReflectorMap {
  private _packageNames: string[];
  private _reflectorMap: Map<string, Reflector>;

  constructor(packageNames: string[]) {
    this._packageNames = packageNames;
    this._reflectorMap = new Map<string, Reflector>();
  }

  public async getReflector(clazzName: string, newObject?: object): Promise<Reflector | any> {
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

    for (const packageName of this._packageNames) {
      // Try to find the class
      try {
        const theClass: any = await import(`${packageName}/${clazzName.toLowerCase()}`);
        if (theClass) {
          reflector = new Reflector();
          reflector.className = `${packageName}/${clazzName.toLowerCase()}`;
          this._reflectorMap.set(clazzName, reflector);
          return reflector;
        }
      } catch (error) {
        console.error(error);
        reflector = null;
      }
    }

    return reflector;
  }
}
