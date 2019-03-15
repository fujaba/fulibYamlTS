import Uni from './model/uni';
import Room from './model/room';
import { Yamler, YamlIdMap } from '../src';
import { YamlObject } from '../src/yamler/util';

describe('Yamler', () => {
  const yamler: Yamler = new Yamler();

  it('should parse a simple key value pair', () => {
    const yaml: string =
      'joining: abu \n' +
      'lastChanges: 2018-03-17T14:48:00.000.abu 2018-03-17T14:38:00.000.bob 2018-03-17T14:18:00.000.xia';

    const map: Map<string, string> = yamler.decode(yaml);
    expect(map.get('joining')).toBe('abu');
  });

  it('should parse a list of key value pairs', () => {
    const yaml: string =
      '- time: 2018.10.09T12:14:55.007\n' +
      '  source: g1\n' +
      '  sourceType: GroupEvent\n' +
      '  property: name\n' +
      '  newValue: BBQ\n' +
      '- time: 2018.10.09T12:14:55.008\n' +
      '  source: m2\n' +
      '  sourceType: Member\n' +
      '  property: name\n' +
      '  newValue: "Abu Aba"\n' +
      '- time: 2018.10.09T12:14:55.009\n' +
      '  source: g1\n' +
      '  sourceType: GroupEvent\n' +
      '  property: members\n' +
      '  newValue: m2\n' +
      '  newValueType: Member\n';

    const list: Array<Map<string, string>> = yamler.decodeList(yaml);
    expect(list.length).toBe(3);

    const map: Map<string, string> = list[1];
    expect(map.get('newValue')).toBe('Abu Aba');
  });

  it('should parse a list with key value pairs and references', () => {
    const yaml: string =
      '- sr: .Map\n' +
      '  clazz: Uni\n' +
      '  name: Study Right\n' +
      '  rooms: r1 r2\n' +
      '- r1: .Map\n' +
      '  clazz: Room\n' +
      '  name: wa1337\n' +
      '  uni: sr\n' +
      '- r2: .Map\n' +
      '  clazz: Room\n' +
      '  name: wa4242\n' +
      '  uni: sr\n';

    let idMap: YamlIdMap = new YamlIdMap();
    const yamlObj: YamlObject = idMap.decode(yaml);

    const map = yamlObj.map;
    expect(map.get('clazz')).toBe('Uni');

    const rooms: any[] = map.get('rooms') as any[];
    expect(rooms.length).toBe(2);

    const dumpMap: YamlIdMap = new YamlIdMap();
    const list: any[] = dumpMap.collectObjects([yamlObj]);
    expect(list.length).toBe(3);

    const uni: Uni = new Uni();
    uni.id = 'sr';
    uni.name = 'Study Right';
    const room1: Room = new Room();
    room1.id = 'r1';
    room1.name = 'wa1337';
    room1.uni = uni;
    const room2: Room = new Room();
    room2.id = 'r2';
    room2.name = 'wa4242';
    room2.uni = uni;
    uni.rooms.push(room1, room2);

    idMap = new YamlIdMap();
    const encodedYaml: string = idMap.encode([uni]);
    expect(encodedYaml).toContain('name: \t"Study Right"')
    expect(encodedYaml).toContain('- sr1: \tUni');
    expect(encodedYaml).toContain('- r22: \tRoom');
    expect(encodedYaml).toContain('- r13: \tRoom');
  });
});
