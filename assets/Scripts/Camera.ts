import { Camera, CameraComponent, Component, Node, SpriteFrame, Vec3, _decorator, director, math, v3 } from 'cc';
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

    @property({ type: SpriteFrame })
    spriteFrame: SpriteFrame;

    lastFov:number
    newFov:number
    lastY:number
    newY:number
    
    onLoad() {
        const Ca = this.camera.getComponent(CameraComponent)
        this.lastCameraPos = this.node.getPosition()
        this.lastFov = this.newFov = Ca.fov
        this.lastY = this.newY = 0
        director.once('hurt', () => {
            director.loadScene('Level1')
        })
        director.on('update_fov', (data:{fov:number,y:number}) => {
            this.newFov = data.fov
            // 根据比例计算摄像机Y轴的位移，x轴一直跟着主角走的，不用管
            this.newY = (data.fov - 64.25) * (360/64.25)
        })
    }
    update(deltaTime: number) {
        const { x, y } = this.player.position;
        // 相机缓慢跟随主角移动
        const x1 = this.lastCameraPos.x + (x - this.lastCameraPos.x) * deltaTime * 2
        this.updateCamera(v3(x1, y));
        if(this.newY > this.lastY){
            this.addY(deltaTime)
        }
        if(this.newY < this.lastY){
            this.subY(deltaTime)
        }  
        if(this.newFov > this.lastFov){
            this.addFov(deltaTime)
        }
        if(this.newFov < this.lastFov){
            this.subFov(deltaTime)
        }    
    }
    updateCamera(pos: Vec3) {
        this.lastCameraPos = pos
        if (pos.x < 0) {
            pos.x = 0
        }
        this.camera.node.setPosition(pos.x, this.camera.node.position.y)
    }
    addFov(deltaTime){
        this.camera.fov = this.camera.fov + (this.newFov - this.lastFov)* deltaTime
        if(this.camera.fov>this.newFov){
            this.lastFov = this.newFov
        }
    }
    subFov(deltaTime){
        this.camera.fov = this.camera.fov + (this.newFov - this.lastFov)* deltaTime
        if(this.camera.fov<this.newFov){
            this.lastFov = this.newFov
        }
    }
    addY(deltaTime){
        const {x, y } = this.camera.node.getPosition();
        const y1 = y + (this.newY - this.lastY) * deltaTime
        this.camera.node.setPosition(x, y1)
        if(y1 > this.newY){
            this.lastY = this.newY
            console.log('同步1',y1,this.newY)
        }
    }
    subY(deltaTime){
        const {x,y} = this.camera.node.getPosition();
        const y1 = y + (this.newY - this.lastY) * deltaTime
        this.camera.node.setPosition(x, y1)
        if(y1 < this.newY){
            this.lastY = this.newY
            console.log('同步2',y1,this.newY)
        }
    }
}


