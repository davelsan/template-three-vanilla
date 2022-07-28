import {
  CameraController,
  DebugController,
  RenderController,
  ResourceController,
  StageController,
  TimeController,
  WorldController,
} from './controllers';
import sources from './sources';
import { debugStore, subscriptions, worldStore } from './store';

interface ExperienceOptions {
  canvas?: HTMLCanvasElement;
}

export class Experience {
  private _cameraController: CameraController;
  private _debugController: DebugController;
  private _renderController: RenderController;
  private _resourceController: ResourceController;
  private _stageController: StageController;
  private _timeController: TimeController;
  private _worldController: WorldController;

  public namespace = 'Experience';

  public constructor(root: HTMLElement, options?: ExperienceOptions) {
    // Assets and resources
    this._resourceController = new ResourceController(sources);

    // DOM interactive interface and render context
    this._stageController = new StageController(root, {
      canvas: options?.canvas,
    });

    // DOM debug interface
    this._debugController = new DebugController();
    if (debugStore.enabled) {
      window.experience = this;
    }

    // Frames and clock
    this._timeController = new TimeController();

    // WebGL scene and views
    this._worldController = new WorldController();

    // WebGL camera
    this._cameraController = new CameraController(
      this._stageController.aspectRatio,
      this._stageController.canvas,
      {
        target: this._worldController.scene.position,
      }
    );

    // WebGL renderer
    this._renderController = new RenderController(
      this._stageController.canvas,
      this._stageController.width,
      this._stageController.height,
      this._cameraController.camera,
      this._worldController.scene
    );
  }

  /**
   * Destroy all dependencies.
   */
  public destroy = () => {
    subscriptions[this.namespace].forEach((sub) => sub());

    this._renderController.destroy();
    this._cameraController.destroy();
    this._worldController.destroy();

    this._debugController.destroy();
    this._timeController.destroy();
    this._stageController.destroy();
    this._resourceController.destroy();
  };

  /**
   * Handler function to execute after the experience is loaded.
   * @param callback callback function to execute
   */
  public onLoad(callback: () => void) {
    subscriptions[this.namespace].push(
      worldStore.subscribe(
        (state) => state.loadingReady,
        (loadingReady) => {
          if (loadingReady) callback();
        }
      )
    );
  }
}
