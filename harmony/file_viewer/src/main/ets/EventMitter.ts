interface ICallbackList {
  [id: string]: Function;
}

interface IEventObject {
  [eventName: string]: ICallbackList;
}

export interface ISubscribe {
  id: number;
  $off: () => void;
}

interface IEventBus {
  $emit<T extends any[]>(eventName: string, ...args: T): void;

  $on(eventName: string, callback: Function): ISubscribe;

  clear(eventName: string): void;
}

export default class EventBus implements IEventBus {
  private _eventObject: IEventObject;
  private _callbackId: number;

  constructor() {
    this._eventObject = {};
    this._callbackId = 0;
  }

  // 发布事件
  $emit<T extends any[]>(eventName: string, ...args: T): void {
    const callbackObject = this._eventObject[eventName];
    if (!callbackObject) {
      return console.warn(eventName + ' not found!');
    }
    for (let id in callbackObject) {
      callbackObject[id](Number(id), ...args);
    }
  }

  // 订阅事件
  $on(eventName: string, callback: Function): ISubscribe {
    if (!this._eventObject[eventName]) {
      this._eventObject[eventName] = {};
    }
    const id = this._callbackId++;
    this._eventObject[eventName][id] = callback;
    const $off = () => {
      delete this._eventObject[eventName][id];
      if (Object.keys(this._eventObject[eventName]).length === 0) {
        delete this._eventObject[eventName];
      }
    };
    return {
      $off, id
    };
  }

  // 清除事件
  clear(eventName: string): void {
    if (!eventName) {
      this._eventObject = {};
      return;
    }
    delete this._eventObject[eventName];
  }
}