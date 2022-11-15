import * as THREE from 'three';
import Application from '../Application.js';
import EventEmitter from './EventEmitter.js';

export default class Resources extends EventEmitter {
  constructor(sources) {
    super();

    this.application = new Application();
    this.progressBar = this.application.progressBar;
    this.sources = sources;

    this.items = {};
    this.toLoad = this.sources.length;
    this.loaded = 0;

    this.setLoaders();
    this.startLoading();
  }

  setLoaders() {
    this.loaders = {};
    this.loaders.textureLoader = new THREE.TextureLoader();
  }

  startLoading() {
    // Add loader UI element
    this.progressBar.start();

    // Load each source
    for (const source of this.sources) {
      if(source.type === 'texture') {
        this.loaders.textureLoader.load(
          source.path,
          (file) => {
            this.sourceLoaded(source, file);
          }
        )
      }
    }
  }

  sourceLoaded(source, file) {
    this.items[source.name] = file;

    this.loaded++;
    this.progressBar.update(Math.round(100*this.loaded/this.toLoad) + '%');

    if(this.loaded === this.toLoad) {
      this.trigger('ready');
    }
  }
}