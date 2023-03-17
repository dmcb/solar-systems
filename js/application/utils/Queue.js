import EventEmitter from './EventEmitter.js';

export default class Queue extends EventEmitter {
  constructor() {
    super();

    this.items = [];
    this.callbacks = [];
    this.itemsToProcess = 0;
  }

  update() {
    if (this.itemsToProcess) {
      this.execute();
    }
  }

  add(item) {
    this.items.push(item);
    this.itemsToProcess++;
  }

  addCallback(callback) {
    this.callbacks.push(callback);
    this.itemsToProcess++;
  }
  
  execute() {
    if (this.items.length) {
      this.items[0]();
      this.trigger('progress', [(this.itemsToProcess-(this.items.length+this.callbacks.length))/this.itemsToProcess]);
      this.items.shift();
    }
    if (!this.items.length) {
      while (this.callbacks.length) {
        this.trigger('progress', [(this.itemsToProcess-(this.items.length+this.callbacks.length))/this.itemsToProcess]);
        this.callbacks[0]();
        this.callbacks.shift();
      }
      this.trigger('progress', [1]);
      this.itemsToProcess = 0;
    }
  }
}
