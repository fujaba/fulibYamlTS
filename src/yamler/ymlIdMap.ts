import { ReflectorMap, YamlObject, Reflector, YamlObjectReflector } from './util';
import { Yamler } from './yamler';

export class YamlIdMap {
  private readonly REMOVE: string = 'remove';

  private _attrTimeStamps: Map<string, string>;
  private _decodingPropertyChange: boolean;
  private _idObjMap: Map<any, string>;
  private _maxUsedIdNum: number;
  private _objIdMap: Map<string, any>;
  private _packageNames: string[];
  private _reflectorMap: ReflectorMap;
  private _userId: string;
  private _yaml: string;
  private _yamler: Yamler;
  private _yamlChangeText: string;

  constructor(packageNames: string[]) {
    if (!packageNames || packageNames.length === 0) {
      throw new Error('Missing package names');
    }
    this._packageNames = packageNames;
    this._attrTimeStamps = new Map();
    this._decodingPropertyChange = false;
    this._idObjMap = new Map();
    this._maxUsedIdNum = 0;
    this._objIdMap = new Map();
    this._reflectorMap = new ReflectorMap(this._packageNames);
    this._userId = '';
    this._yaml = '';
    this._yamler = new Yamler();
    this._yamlChangeText = '';
  }

  public decode(yaml: string): any {
    this._decodingPropertyChange = false;
    this._yamlChangeText = '';
    this._yaml = yaml;

    let root: any = null;
    this._yamler = new Yamler(yaml);

    if (this._yamler.currentToken !== '-') {
      return this._yamler.decode(yaml);
    }

    root = this.parseObjectIds();
    this._yamler = new Yamler(yaml);
    this.parseObjectAttrs();

    // reset property change decoding
    this._decodingPropertyChange = false;
    this._yamlChangeText = '';

    return root;
  }

  public async encode(rootObjList: any[]): Promise<string> {
    if (!rootObjList || rootObjList.length === 0) {
      throw new Error('Missing package names');
    }
    let result: string = '';
    await this.collectObjects(rootObjList);

    const iterate = async () => {
      await this.asyncForEach(Array.from(this._objIdMap.entries()), async (entry: any) => {
        const key: string = entry[0];
        const obj: any = entry[1];
        const className = obj.constructor.name;
        result += `- ${key}: \t${className}\n`;

        // attrs
        const creator: YamlObjectReflector | Reflector | null = await this._reflectorMap.getReflector('', obj);
        if (creator) {
          for (const prop of await creator.getProperties()) {
            if (prop.startsWith('.')) {
              continue;
            }
            let value: any = creator.getValue(obj, prop);
            if (!value) {
              continue;
            }
            if (value instanceof Array) {
              if (value.length === 0) {
                continue;
              }
              result += `  ${prop}: \t`;
              for (const valueObj of value) {
                const valueKey: string | undefined = this._idObjMap.get(valueObj);
                if (valueKey) {
                  result += `${valueKey}\t`;
                }
              }
              result += '\n';
            } else {
              const valueKey: string | undefined = this._idObjMap.get(value);
              if (valueKey) {
                result += `  ${prop}: \t${valueKey}\n`;
              } else {
                if (typeof value === 'string') {
                  value = Yamler.encapsulate(value);
                }
                result += `  ${prop}: \t${value}\n`;
              }
                 // add timestamp?
              if (this._userId !== '') {
                const timeKey: string = `${key}.${prop}`;
                const timeStamp: string | undefined = this._attrTimeStamps.get(timeKey);
                if (timeStamp) {
                  result += `  ${prop}.time: \t${timeStamp}\n`;
                }
              }
            }
          }
          result += '\n';
        }
      });
      return result;
    };
    return iterate();
  }

  public async collectObjects(rootObjList: any[]): Promise<any[]> {
    const simpleList: any[] = new Array();
    const collectedObjects: any[] = new Array();
    simpleList.push(...rootObjList);

    while (simpleList.length > 0) {
      const obj: any = simpleList.pop();
      if (!collectedObjects.includes(obj)) {
        collectedObjects.push(obj);
      }

      // already known?
      let key: string | undefined = this._idObjMap.get(obj);
      if (!key) {
        // add to map
        key = this.addToObjIdMap(obj);

        // find neighbors
        const reflector: YamlObjectReflector | Reflector | null = await this._reflectorMap.getReflector('', obj);
        if (reflector) {
          for (const prop of await reflector.getProperties()) {
            const value: any = reflector.getValue(obj, prop);
            if (!value) {
              continue;
            }
            if (value instanceof Array) {
              for (const valueObj of value) {
                if (typeof valueObj !== 'object') {
                  break;
                }
                simpleList.push(valueObj);
              }
            } else if (typeof value !== 'object') {
              continue;
            } else {
              simpleList.push(value);
            }
          }
        }
      }
    }

    // collect objects
    return collectedObjects;
  }

  private parseObjectAttrs(): void {
    while (this._yamler.currentToken !== '') {
      if (this._yamler.currentToken !== '-') {
        this._yamler.printError('"-" expected');
        this._yamler.nextToken();
        continue;
      }
      const key: string = this._yamler.nextToken();
      if (key.endsWith(':')) {
        // usual
        this.parseUsualObjectAttrs();
      } else {
        this.parseObjectTableAttrs();
      }
    }
  }

  private parseUsualObjectAttrs(): void {
    const objectId: string = this._yamler.stripColon(this._yamler.currentToken);
    const className: string = this._yamler.nextToken();
    this._yamler.nextToken();
    if (className.endsWith('.remove')) {
      this._objIdMap.delete(objectId);
      // skip time stamp, if necessary
      while (this._yamler.currentToken !== '' && this._yamler.currentToken !== '-') {
        this._yamler.nextToken();
      }
      return;
    }

    if (className === '.Map') {
      const yamlObj: YamlObject = this._objIdMap.get(objectId) as YamlObject;
      const map: Map<string, any> = yamlObj.map;
      while (this._yamler.currentToken !== '' && this._yamler.currentToken !== '-') {
        const attrName = this._yamler.stripColon(this._yamler.currentToken);
        this._yamler.nextToken();
        if (!map) {
          // no object created by parseObjectIds. Object has been removed.
          // ignore attr changes
          while (this._yamler.currentToken !== ''
              && !this._yamler.currentToken.endsWith(':')
              && this._yamler.currentToken !== '-') {
            this._yamler.nextToken();
          }
          continue;
        }

        // many values
        let previousValue: any = null;
        while (this._yamler.currentToken !== ''
            && !this._yamler.currentToken.endsWith(':')
            && this._yamler.currentToken !== '-') {
          const attrValue: string = this._yamler.currentToken;
          const target: any = this._objIdMap.get(attrValue);
          if (target) {
            if (previousValue) {
              previousValue.push(target);
              map.set(attrName, previousValue);
            } else {
              previousValue = new Array<any>();
              previousValue.push(target);
              map.set(attrName, target);
            }
          } else {
            if (previousValue) {
              previousValue.push(attrValue);
              map.set(attrName, previousValue);
            } else {
              previousValue = new Array<any>();
              previousValue.push(attrValue);
              map.set(attrName, attrValue);
            }
          }
          this._yamler.nextToken();
        }
      }
    } else {
      this._reflectorMap.getReflector(className).then((reflector: Reflector | null) => {
        if (!reflector) {
          return;
        }
        const obj: any = this._objIdMap.get(objectId);

        // read attributes
        while (this._yamler.currentToken !== '' && this._yamler.currentToken !== '-') {
          const attrName: string = this._yamler.stripColon(this._yamler.currentToken);
          this._yamler.nextToken();
          if (!obj) {
            // no object created by parseObjectIDs. Object has been removed.
            // ignore attr changes
            while (this._yamler.currentToken !== ''
                && !this._yamler.currentToken.endsWith(':')
                && this._yamler.currentToken !== '-') {
              this._yamler.nextToken();
            }
            continue;
          }

          // many values
          while (this._yamler.currentToken !== ''
                && !this._yamler.currentToken.endsWith(':')
                && this._yamler.currentToken !== '-') {
            const attrValue: string = this._yamler.currentToken;
            if (this._yamler.lookAheadToken.endsWith('.time:')) {
              this._yamler.nextToken();
              const newTimeStamp: string = this._yamler.nextToken();
              const oldTimeStamp: string | undefined = this._attrTimeStamps.get(`${objectId}.${attrName}`);
              if (!oldTimeStamp || oldTimeStamp.localeCompare(newTimeStamp) <= 0) {
                this._decodingPropertyChange = true;
                if (this._yamlChangeText === '') {
                  this._yamlChangeText = this._yaml;
                }
                this.setValue(reflector, obj, attrName, attrValue);
                this._attrTimeStamps.set(`${objectId}.${attrName}`, newTimeStamp);
              }
            } else {
              this.setValue(reflector, obj, attrName, attrValue);
            }
            this._yamler.nextToken();
          }
        }
      });
    }
  }

  private parseObjectTableAttrs(): void {
    // skip column names
    const className: string = this._yamler.currentToken;
    this._reflectorMap.getReflector(className).then((creator: Reflector | null) => {
      if (!creator) { return; }
      this._yamler.nextToken();
      const colNameList: string[] = new Array();

      while (this._yamler.currentToken !== '' && this._yamler.lookAheadToken.endsWith(':')) {
        const colName = this._yamler.stripColon(this._yamler.currentToken);
        colNameList.push(colName);
        this._yamler.nextToken();
      }

      while (this._yamler.currentToken !== '' && this._yamler.currentToken !== '-') {
        const objectId: string = this._yamler.stripColon(this._yamler.currentToken);
        this._yamler.nextToken();
        const obj: any = this._objIdMap.get(objectId);

        // column values
        let colNum: number = 0;
        while (this._yamler.currentToken !== '' && !this._yamler.currentToken.endsWith(':') && this._yamler.currentToken !== '-') {
          const attrName: string = colNameList[colNum];
          if (this._yamler.currentToken.startsWith('[')) {
            let value: string = this._yamler.currentToken.substring(1);
            if (value.trim() === '') {
              value = this._yamler.nextToken();
            }
            this.setValue(creator, obj, attrName, value);
            while (this._yamler.currentToken !== '' && !this._yamler.currentToken.endsWith(']')) {
              this._yamler.nextToken();
              value = this._yamler.currentToken;
              if (this._yamler.currentToken.endsWith(']')) {
                value = this._yamler.currentToken.substring(0, this._yamler.currentToken.length - 1);
              }
              if (value.trim() !== '') {
                this.setValue(creator, obj, attrName, value);
              }
            }
          } else {
            this.setValue(creator, obj, attrName, this._yamler.currentToken);
          }
          colNum++;
          this._yamler.nextToken();
        }
      }
    });
  }

  private setValue(reflector: Reflector, obj: any, attrName: string, attrValue: string): void {
    let type: string = 'new';
    if (attrName.endsWith('.remove')) {
      attrName = attrName.substring(0, attrName.length - '.remove'.length);
      if (reflector.getValue(obj, attrName) instanceof Array) {
        type = this.REMOVE;
      } else {
        attrValue = '';
      }
    }
    const setResult: any = reflector.setValue(obj, attrName, attrValue);
    if (!setResult) {
      const targetObj: any = this._objIdMap.get(attrValue);
      if (targetObj) {
        reflector.setValue(obj, attrName, targetObj);
      }
    }
  }

  private parseObjectIds(): any {
    let root: any = null;
    while (this._yamler.currentToken !== '') {
      if (this._yamler.currentToken !== '-') {
        this._yamler.printError('"-" expected');
        this._yamler.nextToken();
        continue;
      }

      const key: string = this._yamler.nextToken();

      if (key.endsWith(':')) {
        // usual
        const now: any = this.parseUsualObjectId();
        if (!root) { root = now; }
        continue;
      } else {
        const now: any = this.parseObjectTableIds();
        if (!root) { root = now; }
        continue;
      }
    }

    return root;
  }

  private parseUsualObjectId(): any {
    const objectId: string = this._yamler.stripColon(this._yamler.currentToken);
    let objectNum: number = 0;
    const pos: number = objectId.lastIndexOf('.');
    const numPart: string = objectId.substring(pos + 2);
    objectNum = Number.parseInt(numPart, 10);
    if (!objectNum) {
      objectNum = this._objIdMap.size + 1;
    }

    if (objectNum > this._maxUsedIdNum) {
      this._maxUsedIdNum = objectNum;
    }

    const className: string = this._yamler.nextToken();
    let obj: any = this._objIdMap.get(objectId);
    let userId: string = '';

    // skip attributes
    while (this._yamler.currentToken !== '' && this._yamler.currentToken !== '-') {
      let token: string = this._yamler.nextToken();
      if (token.endsWith('.time:')) {
        token = this._yamler.nextToken();
        userId = token.substring(token.lastIndexOf('.') +  1);
      }
    }

    let foreignChange: boolean = false;
    if (userId) {
      const dotIndex: number = objectId.indexOf('.');
      if (dotIndex > 0) {
        const ownerId: string = objectId.substring(0, dotIndex);
        foreignChange = userId !== ownerId;
      }
    }

    if (!obj && !className.endsWith('.remove') && !foreignChange) {
      if (className === '.Map') {
        obj = new YamlObject();
        (obj as YamlObject).put('.id', objectId);
      } else {
        const reflector: Reflector = new Reflector();
        obj = reflector.newInstance();
      }
      this._objIdMap.set(objectId, obj);
      this._idObjMap.set(obj, objectId);
    }

    return obj;
  }

  private parseObjectTableIds(): any {
    let root: any = null;

    // skip column names
    const className: string = this._yamler.currentToken;
    this._reflectorMap.getReflector(className).then((reflector: Reflector | null) => {
      if (reflector) {
        while (this._yamler.currentToken !== '' && this._yamler.lookAheadToken.endsWith(':')) {
          this._yamler.nextToken();
        }

        while (this._yamler.currentToken !== '' && this._yamler.currentToken !== '-') {
          const objectId: string = this._yamler.stripColon(this._yamler.currentToken);
          this._yamler.nextToken();

          const obj: any = reflector.newInstance();

          this._objIdMap.set(objectId, obj);
          this._idObjMap.set(obj, objectId);

          if (!root) { root = obj; }

          // skip column values
          while (this._yamler.currentToken !== '' && !this._yamler.currentToken.endsWith(':') && this._yamler.currentToken !== '-') {
            this._yamler.nextToken();
          }
        }
      }
    });

    return root;
  }

  private addToObjIdMap(obj: any): string {
    const className: string = obj.constructor.name;
    let key: string = '';

    if (obj instanceof YamlObject) {
      const yamlObj: YamlObject = obj as YamlObject;
      key = yamlObj.get('.id') as string;
    }

    if (key === '') {
      key = className.substring(0, 1).toLowerCase();
      if (Reflect.has(obj, 'id')) {
        key = (Reflect.get(obj, 'id') as string).replace(/\W+/, '_');
      } else if (Reflect.has(obj, 'name')) {
        key = (Reflect.get(obj, 'name') as string).replace(/\W+/, '_');
      }

      key.length === 1 ? key = key.substring(0, 1).toLocaleLowerCase() : key = key.substring(0, 1).toLocaleLowerCase() + key.substring(1);
      this._maxUsedIdNum++;
      key += this._maxUsedIdNum;

      if (this._maxUsedIdNum > 1 && this._userId !== '') {
        // all but the first get a userId key
        key = `${this._userId}.${key}`;
      }
    }
    this._objIdMap.set(key, obj);
    this._idObjMap.set(obj, key);

    return key;
  }

  /**
   * A little trick to handle asynchronous iteration over an array
   *
   * @param array The array to iterate over
   * @param callback A function which receives asynchronously the array elements
   */
  private async asyncForEach(array: any[], callback): Promise<void> {
    for (const entry of array) {
      await callback(entry);
    }
  }
}
