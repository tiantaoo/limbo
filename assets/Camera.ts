import { Camera, Component, Node, _decorator, director, math } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraCtrl')
export class CameraCtrl extends Component {
    @property({ type: Node })
    player: Node;

    @property({ type: Camera })
    camera: Camera;

    // 摄像机可见尺寸
    cameraSize: math.Size;
    // 地图尺寸
    mapSize: math.Size;

    lastPlayerY: number = 0;
    scoreNode: Node;

    onLoad() {
        // this.camera.orthoHeight = 500
        const Ca = this.camera.getComponent(Camera)
        console.log(Ca.clearColor)
        director.once('hurt',() => {
            Ca.clearColor.set(255,255,255)
            console.log('结束',Ca.clearColor)
        })
    }
    update(deltaTime: number) {
        const { x, y } = this.player.position;
        this.updateCameraY(x);
            // 玩家在上升过程中，相机要一直跟随
            // this.updateCameraX(x);
            // if (x > this.lastPlayerY) {
            //     this.updateCameraY(x);
            //     // this.updateScore(y);
            //     // this.updateLevel();
            // }

    }
    updateLevel() {

    }
    updateCameraX(posX: number) {
        this.camera.node.setPosition(posX, this.camera.node.position.y)
    }
    updateCameraY(posY: number) {
        // this.lastPlayerY = posY;
        this.camera.node.setPosition(posY, this.camera.node.position.y)
    }
    
}


