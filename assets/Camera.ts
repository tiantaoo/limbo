import { Camera, CameraComponent, Color, Component, Node, Sprite, Vec3, _decorator, director, math, tween, v3 } from 'cc';
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

    lastCameraPos: Vec3
    scoreNode: Node;

    onLoad() {
        const Ca = this.camera.getComponent(CameraComponent)
        this.lastCameraPos = this.node.getPosition()
        director.once('hurt', () => {
            const mask = this.node.getChildByPath('UI/Mask').getComponent(Sprite)
            const col = new Color(0, 0, 0, 255)
            tween(mask.color)
                .to(1, col, {
                    onUpdate: function (target: Color) {
                        mask.color.set(target)
                    }
                    , onComplete:() => {
                        director.loadScene('Level2')
                    }
                }).start();
        })
    }
    update(deltaTime: number) {
        const { x, y } = this.player.position;
        if(y<-640){
            
        }
        // 相机缓慢跟随主角移动
        this.updateCamera(v3(this.lastCameraPos.x + (x - this.lastCameraPos.x) * deltaTime * 2, y));
    }
    updateCamera(pos: Vec3) {
        this.lastCameraPos = pos
        if (pos.x < 0) {
            pos.x = 0
        }
        this.camera.node.setPosition(pos.x, this.camera.node.position.y)
    }

}


