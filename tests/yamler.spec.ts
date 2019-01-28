import Yamler from '../src/yamler';

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
});
