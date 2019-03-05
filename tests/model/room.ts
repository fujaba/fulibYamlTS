import Uni from './uni';

export default class Room {
  private _id: string;
  private _name: string;
  private _uni: Uni;

  constructor() {
    this._id = '';
    this._name = '';
    this._uni = new Uni();
  }

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  get id(): string {
    return this._id;
  }

  set id(id: string) {
    this._id = id;
  }

  get uni(): Uni {
    return this._uni;
  }

  set uni(uni: Uni) {
    this._uni = uni;
  }
}
