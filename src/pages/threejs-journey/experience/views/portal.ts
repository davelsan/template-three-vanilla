import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  sRGBEncoding,
  Texture,
} from 'three';
// import { GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { GLTF } from 'three-stdlib';

import { ResourceLoader } from '../loaders';
import { portalFragmentShader, portalVertexShader } from '../shaders/portal';
import { Store } from '../store';
import { WebGLView } from '../types/ui';

interface ModelMeshes {
  baked: Mesh;
  poleLightL: Mesh;
  poleLightR: Mesh;
  portalLight: Mesh;
}

interface ModelMaterials {
  baked: MeshBasicMaterial;
  poleLight: MeshBasicMaterial;
  portalLight: ShaderMaterial;
}

interface Props {
  portalColorStart: Color;
  portalColorEnd: Color;
  uvDisplacementOffset: number;
  uvStrengthOffset: number;
}

export class Portal extends Group implements WebGLView {
  private portalBakedTexture: Texture;
  private portalScene: GLTF;

  private model: Group;
  private meshes: ModelMeshes;
  private materials: ModelMaterials;

  private _props: Props = {
    portalColorStart: new Color(0x000000),
    portalColorEnd: new Color(0xffffff),
    uvDisplacementOffset: 5.0,
    uvStrengthOffset: 5.0,
  };

  public namespace = 'Portal';

  constructor(props?: Partial<Props>) {
    super();
    Object.assign(this._props, props);
  }

  public async init() {
    await this.setupAssets();
    this.setupMaterial();
    this.setupModel();
    this.setupSubscriptions();

    Store.world.addViewLoaded(this.namespace);
  }

  public destroy() {
    Store.debug.unsubscribe(this.namespace);
    Store.time.unsubscribe(this.namespace);

    this.materials.baked.dispose();
    this.materials.poleLight.dispose();
    this.materials.portalLight.dispose();
    this.remove(this.model);
  }

  /* SETUP */

  private async setupAssets() {
    const portalBakedTexture = await ResourceLoader.loadTexture(
      'portalBakedTexture'
    );
    this.portalBakedTexture = portalBakedTexture;
    this.portalBakedTexture.flipY = false;
    this.portalBakedTexture.encoding = sRGBEncoding;
    const portalModel = await ResourceLoader.loadGltfModel('portalModel');
    this.portalScene = portalModel;
  }

  private setupMaterial() {
    const bakedMaterial = new MeshBasicMaterial({
      map: this.portalBakedTexture,
    });

    const poleLightMaterial = new MeshBasicMaterial({
      color: 0xffffe5,
    });

    const portalLightMaterial = new ShaderMaterial({
      fragmentShader: portalFragmentShader,
      vertexShader: portalVertexShader,
      uniforms: {
        uColorEnd: { value: this._props.portalColorEnd },
        uColorStart: { value: this._props.portalColorStart },
        uOffsetDisplacementUv: { value: this._props.uvDisplacementOffset },
        uOffsetStrengthUv: { value: this._props.uvStrengthOffset },
        uTime: { value: 0 },
      },
    });

    this.materials = {
      baked: bakedMaterial,
      poleLight: poleLightMaterial,
      portalLight: portalLightMaterial,
    };
  }

  private setupModel() {
    this.model = this.portalScene.scene;
    this.model.name = 'PortalScene';

    try {
      this.meshes = Object.fromEntries(
        this.model.children.map((child) => {
          return [child.name, child];
        })
      ) as unknown as ModelMeshes;

      console.log(this.meshes);

      this.meshes.baked.material = this.materials.baked;
      this.meshes.poleLightL.material = this.materials.poleLight;
      this.meshes.poleLightR.material = this.materials.poleLight;
      this.meshes.portalLight.material = this.materials.portalLight;
    } catch (error) {
      console.error(
        'One or more of the model meshes in the Portal',
        'scene could not be assigned a material.',
        error
      );
    }
    this.add(this.model);
  }

  private setupSubscriptions() {
    Store.debug.subscribeNs(
      this.namespace,
      (state) => state.enabled,
      this.debug,
      { fireImmediately: true }
    );

    Store.time.subscribeNs(
      this.namespace,
      (state) => state.elapsed,
      this.update
    );
  }

  /* CALLBACKS */

  private debug = (active?: boolean) => {
    if (!active) return;

    Store.debug.addConfig({
      folder: {
        title: 'Portal',
      },
      inputs: [
        {
          object: this.materials.portalLight.uniforms.uColorStart,
          key: 'value',
          options: {
            label: 'uColorStart',
            color: { type: 'float' },
          },
        },
        {
          object: this.materials.portalLight.uniforms.uColorEnd,
          key: 'value',
          options: {
            label: 'uColorEnd',
            color: { type: 'float' },
          },
        },
        {
          object: this.materials.portalLight.uniforms.uOffsetDisplacementUv,
          key: 'value',
          options: {
            label: 'uDisplacement',
            min: 0,
            max: 50,
            step: 0.1,
          },
        },
        {
          object: this.materials.portalLight.uniforms.uOffsetStrengthUv,
          key: 'value',
          options: {
            label: 'uStrength',
            min: 0,
            max: 50,
            step: 0.1,
          },
        },
      ],
    });

    Store.debug.addConfig({
      folder: {
        title: 'Environment',
      },
      inputs: [
        {
          object: this.materials.poleLight,
          key: 'color',
          options: {
            label: 'poleLightColor',
            color: { type: 'float' },
          },
        },
      ],
    });
  };

  private update = (elapsed: number) => {
    this.materials.portalLight.uniforms.uTime.value = elapsed;
  };
}
