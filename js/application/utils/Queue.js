import EventEmitter from './EventEmitter.js';

export default class Queue extends EventEmitter {
  constructor() {
    super();

    this.items = [];
    this.callbacks = [];
  }

  update() {
    if (this.items.length) {
      this.execute();
    }
  }

  add(item) {
    this.items.push(item);
  }

  addCallback(callback) {
    this.callbacks.push(callback);
  }
  
  execute() {
    console.log('Executing function');
    this.items[0]();
    this.items.shift();
    if (!this.items.length) {
      for (let i=0; i<this.callbacks.length; i++) {
        this.callbacks[i]();
      }
      this.callbacks = [];
    }
  }
}
