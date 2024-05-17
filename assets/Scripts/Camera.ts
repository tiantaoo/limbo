import { Camera, CameraComponent, Component, Node, Vec3, _decorator, director, v3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CameraCtrl')
export class CameraCtrl extends Component {
    // 玩家角色
    @property({ type: Node })
    player: Node;
    // 相机节点
    @property({ type: Camera })
    camera: Camera;
    // 相机的最后位置
    lastCameraPos: Vec3
    lastFov:number
    newFov:number
    lastY:number
    newY:number
    onLoad() {
        const Ca = this.camera.getComponent(CameraComponent)
        this.lastCameraPos = this.node.getPosition()
        this.lastFov = this.newFov = Ca.fov
        this.lastY = this.newY = 0
        
        director.on('update_camera', this.setCameraParam)
        director.once('hurt', () => {
            director.loadScene('Level1')
        })
    }
    protected start(): void {
        this.setCameraParam({fov:30,posY:-200})
    }
    update(deltaTime: number) {
        const { x, y } = this.player.position;
        // 相机缓慢跟随主角移动
        const x1 = this.lastCameraPos.x + (x - this.lastCameraPos.x) * deltaTime * 2
        const y1 = this.lastCameraPos.y + (y - this.lastCameraPos.y) * deltaTime
        this.updateCamera(v3(x1, y1));
        if(this.newY > this.lastY){
            this.addY(deltaTime)
        }else if(this.newY < this.lastY){
            this.subY(deltaTime)
        }
        if(this.newFov > this.lastFov){
            this.addFov(deltaTime)
        } else if(this.newFov < this.lastFov){
            this.subFov(deltaTime)
        }  
    }
    /**
     * 设置相机参数
     * @param data 
     */
    setCameraParam(data:{fov:number,posY?:number}){
        const {fov,posY} = data;
        this.newFov = fov
        // 根据比例计算摄像机Y轴的位移，x轴一直跟着主角走的，不用管
        this.newY = posY || (fov - 64.25) * (360/64.25)
        console.log('设置相机',this.newFov,this.newY)
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
            console.log('fov坐标同步',this.camera.fov)
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
            console.log('Y坐标同步',this.lastY)
        }
    }
    subY(deltaTime){
        const {x,y} = this.camera.node.getPosition();
        const y1 = y + (this.newY - this.lastY) * deltaTime
        this.camera.node.setPosition(x, y1)
        if(y1 < this.newY){
            this.lastY = this.newY

        }
    }
}


