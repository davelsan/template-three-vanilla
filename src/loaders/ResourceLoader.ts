import {
  CubeTexture,
  CubeTextureLoader,
  DataTexture,
  LoadingManager,
  Texture,
  TextureLoader,
} from 'three';
import { DRACOLoader, GLTF, GLTFLoader, RGBELoader } from 'three-stdlib';

import { AssetNotFoundError } from '@errors/AssetNotFoundError';
import {
  AssetType,
  CubeTextureAssets,
  DataTextureAssets,
  GLTFModelAssets,
  TextureAssets,
} from '@loaders/assets';
import { notifyAssetLoadedAtom, totalAssetsAtom } from '@state/rendering';
import { appStore } from '@state/store';
import { TypedObject } from '@utils/typedObject';

type LoaderOptions = {
  onProgress?: (event: ProgressEvent) => void;
};

type InitOptions = {
  draco?: boolean;
  loadingManager?: LoadingManager;
};

type Sources = {
  cubeTextures: CubeTextureAssets;
  dataTextures: DataTextureAssets;
  textures: TextureAssets;
  gltfs: GLTFModelAssets;
};

type CubeTextureCache = Record<string, CubeTexture>;
type DataTextureCache = Record<string, DataTexture>;
type TextureCache = Record<string, Texture>;
type GLTFCache = Record<string, GLTF>;

type Cache = {
  cubeTexture: CubeTextureCache;
  dataTexture: DataTextureCache;
  texture: TextureCache;
  gltf: GLTFCache;
};

export class ResourceLoader {
  private static _assets: Sources;
  private static _cache: Cache;

  private static _loadingManager?: LoadingManager;
  private static _cubeTextureLoader: CubeTextureLoader;
  private static _rgbeLoader: RGBELoader;
  private static _textureLoader: TextureLoader;
  private static _gltfLoader: GLTFLoader;

  public static init(
    cubeTextures: CubeTextureAssets,
    dataTextures: DataTextureAssets,
    textures: TextureAssets,
    gltfs: GLTFModelAssets,
    options?: InitOptions
  ) {
    this._assets = {
      cubeTextures,
      dataTextures,
      textures,
      gltfs,
    };
    this._cache = {
      cubeTexture: {},
      dataTexture: {},
      texture: {},
      gltf: {},
    };

    this._loadingManager = options?.loadingManager;
    this._cubeTextureLoader = new CubeTextureLoader(this._loadingManager);
    this._rgbeLoader = new RGBELoader(this._loadingManager);
    this._textureLoader = new TextureLoader(this._loadingManager);
    this._gltfLoader = new GLTFLoader(this._loadingManager);

    if (options?.draco) {
      const dracoLoader = new DRACOLoader();
      this._gltfLoader.setDRACOLoader(dracoLoader);
      dracoLoader.setDecoderPath('draco/'); // from node_modules/three/examples/js/libs/draco/
    }

    const cubeTextureCount = TypedObject.keys(cubeTextures).length;
    const textureCount = TypedObject.keys(textures).length;
    const gltfCount = TypedObject.keys(gltfs).length;
    const totalAssets = cubeTextureCount + textureCount + gltfCount;
    appStore.set(totalAssetsAtom, totalAssets);
  }

  /* LOADERS */

  public static async loadCubeTexture(
    name: keyof CubeTextureAssets,
    options?: LoaderOptions
  ) {
    if (this._cache.cubeTexture[name]) {
      return this._cache.cubeTexture[name];
    }

    const source = this._assets.cubeTextures[name];
    if (!source) {
      throw new AssetNotFoundError(name, AssetType.CubeTexture);
    }

    const texture = await this._cubeTextureLoader.loadAsync(
      source,
      options?.onProgress
    );

    this._cache.cubeTexture[name] = texture;
    appStore.set(notifyAssetLoadedAtom);
    return texture;
  }

  public static async loadRgbeTexture(
    name: keyof DataTextureAssets,
    options?: LoaderOptions
  ) {
    if (this._cache.dataTexture[name]) {
      return this._cache.dataTexture[name];
    }

    const source = this._assets.dataTextures[name];
    if (!source) {
      throw new AssetNotFoundError(name, AssetType.DataTexture);
    }

    const texture = await this._rgbeLoader.loadAsync(
      source,
      options?.onProgress
    );

    this._cache.dataTexture[name] = texture;
    appStore.set(notifyAssetLoadedAtom);
    return texture;
  }

  public static async loadTexture(
    name: keyof TextureAssets,
    options?: LoaderOptions
  ) {
    if (this._cache.texture[name]) {
      return this._cache.texture[name];
    }

    const source = this._assets.textures[name];
    if (!source) {
      throw new AssetNotFoundError(name, AssetType.Texture);
    }

    const texture = await this._textureLoader.loadAsync(
      source,
      options?.onProgress
    );
    texture.name = name as string;

    this._cache.texture[name] = texture;
    appStore.set(notifyAssetLoadedAtom);
    return texture;
  }

  public static async loadAllTextures(options?: LoaderOptions) {
    const texturePromises = TypedObject.keys(this._assets.textures).map(
      (name) => this.loadTexture(name, options)
    );

    return Promise.all(texturePromises);
  }

  public static async loadGltfModel(
    name: keyof GLTFModelAssets,
    options?: LoaderOptions
  ) {
    if (this._cache.gltf[name]) {
      return this._cache.gltf[name];
    }

    const source = this._assets.gltfs[name];
    if (!source) {
      throw new AssetNotFoundError(name, AssetType.GLTF);
    }

    const gltf = await this._gltfLoader.loadAsync(source, options?.onProgress);

    this._cache.gltf[name] = gltf;
    appStore.set(notifyAssetLoadedAtom);
    return gltf;
  }
}
