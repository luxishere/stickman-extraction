
import { audio } from './Audio';

export class InputHandler {
  keys: { [key: string]: boolean } = {};
  audioResumed: boolean = false;

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    // Prevent context menu to allow using right/thumb clicks without interruption
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private ensureAudio() {
    if (!this.audioResumed) {
      audio.resume();
      this.audioResumed = true;
    }
  }

  handleKeyDown = (e: KeyboardEvent) => {
    this.ensureAudio();
    this.keys[e.code] = true;
  };

  handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  handleMouseDown = (e: MouseEvent) => {
    this.ensureAudio();
    // Map mouse buttons: 0=Left, 1=Middle, 2=Right, 3=Thumb(Back), 4=Thumb(Forward)
    this.keys[`Mouse${e.button}`] = true;
  };

  handleMouseUp = (e: MouseEvent) => {
    this.keys[`Mouse${e.button}`] = false;
  };

  // Virtual input support for mobile
  setKey(code: string, isDown: boolean) {
    if (isDown) this.ensureAudio();
    this.keys[code] = isDown;
  }

  isDown(code: string): boolean {
    return !!this.keys[code];
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('contextmenu', (e) => e.preventDefault());
  }
}
