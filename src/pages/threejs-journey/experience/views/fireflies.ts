import { Subscription } from 'rxjs';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Points,
  ShaderMaterial,
} from 'three';

import {
  fireflyFragmentShader,
  fireflyVertexShader,
} from '../shaders/fireflies';
import { Store } from '../store';
import { Subscription as _Subscription } from '../types/store';
import { WebGLView } from '../types/ui';

interface Props {
  baseSize: number;
}

export class Fireflies extends Group implements WebGLView {
  private _props = {
    baseSize: 0.75,
  };

  private _subscriptions: Subscription[] = [];
  private _subscriptions2: _Subscription[] = [];

  private geometry: BufferGeometry;
  private material: ShaderMaterial;
  private fireflies: Points;

  public namespace = 'Fireflies';

  constructor(props?: Partial<Props>) {
    super();
    this._props = Object.assign(this._props, props);
  }

  public async init() {
    this.setupGeometry();
    this.setupMaterial();
    this.setupPoints();
    this.setupSubscriptions();

    Store.world.loadView(this.namespace);
  }

  public destroy() {
    this._subscriptions.forEach((subscription) => subscription.unsubscribe());

    this.geometry.dispose();
    this.material.dispose();
    this.remove(this.fireflies);
  }

  /* SETUP */

  private setupGeometry() {
    this.geometry = new BufferGeometry();

    const count = 30;
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const [x, y, z] = [i * 3 + 0, i * 3 + 1, i * 3 + 2];

      // Position firefly within the plane (ground) coordinates [-2, 2], but
      // slightly constrained (*3.5 instead of *4) to avoid the firefly to
      // appear too close to the edges of the plane.
      positions[x] = (Math.random() - 0.5) * 3.5;
      positions[z] = (Math.random() - 0.5) * 3.5;

      // Add some random elevation to the firefly
      positions[y] = (Math.random() + 0.1) * 1.5;

      // Randomly scale the firefly size
      scales[i] = Math.random() * 0.5 + 0.5;
    }

    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));

    this.geometry.setAttribute('aScale', new BufferAttribute(scales, 1));
  }

  private setupMaterial() {
    this.material = new ShaderMaterial({
      fragmentShader: fireflyFragmentShader,
      vertexShader: fireflyVertexShader,
      //
      blending: AdditiveBlending, // Blend the material color with the background color
      depthWrite: false, // Prevent particles to hide particles behind
      transparent: true,
      //
      uniforms: {
        uColor: { value: new Color(0xffffff) },
        uSize: { value: this._props.baseSize * Store.stage.pixelRatio },
        uScale: { value: Store.stage.height * 0.5 },
        uTime: { value: 0 },
      },
    });
  }

  private setupPoints() {
    this.fireflies = new Points(this.geometry, this.material);
    this.add(this.fireflies);
  }

  private setupSubscriptions() {
    const frameSub = Store.time.frame.subscribe(({ elapsed }) => {
      this.update(elapsed);
    });
    this._subscriptions.push(frameSub);

    const resizeSub = Store.stage.subscribe((state) => {
      this.resize(state.pixelRatio);
    });
    this._subscriptions2.push(resizeSub);

    const debugSub = Store.debug.subscribe((state) => {
      if (state.active) this.debug();
    });
    this._subscriptions.push(debugSub);
  }

  /* CALLBACKS */

  private debug = () => {
    Store.dispatch({
      controller: 'DebugController',
      action: {
        type: 'ADD_INPUT',
        payload: {
          inputs: [
            {
              object: this.material.uniforms.uSize,
              key: 'value',
              options: {
                label: 'baseSize',
                min: 0.01,
                max: 2.0,
                step: 0.01,
              },
            },
            {
              object: this.material.uniforms.uColor,
              key: 'value',
              options: {
                label: 'uColor',
                color: { type: 'float' },
              },
            },
          ],
          folder: {
            title: 'Fireflies',
          },
        },
      },
    });
  };

  private resize = (pixelRatio: number) => {
    /**
     * This is a hack to ensure that the fireflies are correctly sized
     * if the user moves the browser window to another screen with a
     * different pixel ratio.
     *
     * The assumption made is that the browser window will be resized
     * when moved to the other device.
     */
    this.material.uniforms.uSize.value = this._props.baseSize * pixelRatio;
  };

  private update = (elapsed: number) => {
    this.material.uniforms.uTime.value = elapsed;
  };
}
