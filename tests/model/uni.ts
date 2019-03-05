import Room from './room';

export default class Uni {
  private _id: string;
  private _name: string;
  private _rooms: Room[];

  constructor() {
    this._id = '';
    this._name = '';
    this._rooms = new Array();
  }

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  get rooms(): Room[] {
    return this._rooms;
  }

  get id(): string {
    return this._id;
  }

  set id(id: string) {
    this._id = id;
  }
}
