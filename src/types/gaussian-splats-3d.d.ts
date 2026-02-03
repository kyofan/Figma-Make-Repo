declare module '@mkkellogg/gaussian-splats-3d' {
    export class Viewer {
        constructor(options?: any);
        addSplatScene(url: string, options?: any): Promise<void>;
        start(): void;
        update(): void;
        dispose(): void;
        camera?: any;
        controls?: any;
    }
    export class DropInViewer extends Viewer { }
}
