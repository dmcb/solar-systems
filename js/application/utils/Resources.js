import * as THREE from 'three';
import ProgressBar from '../ui/ProgressBar.js';
import EventEmitter from './EventEmitter.js';

export default class Resources extends EventEmitter {
  constructor(sources) {
    super();

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
    this.progressBar = new ProgressBar();

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
    this.progressBar.updateProgress(Math.round(100*this.loaded/this.toLoad) + '%');

    if(this.loaded === this.toLoad) {
      this.trigger('ready');
    }
  }
}