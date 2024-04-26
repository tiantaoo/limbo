import { BoxCollider2D, Camera, CameraComponent, Component, ERigidBody2DType, HingeJoint2D, Node, RigidBody2D, Size, Sprite, SpriteFrame, UITransform, Vec3, _decorator, director, math, v2, v3 } from 'cc';
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

    @property({ type: Node })
    testR: Node;

    protected start(): void {
        // tween(this.testR)
        //         .to(5, {angle:-360}, {
        //             onUpdate: (target) => {
        //                 console.log(target.angle,this.testR.angle)
        //                 this.testR.angle = target.angle
        //             }
        //         }).start();
    }

    onLoad() {
        const Ca = this.camera.getComponent(CameraComponent)
        this.lastCameraPos = this.node.getPosition()
        director.once('hurt', () => {
            director.loadScene('Level2')
            // const mask = this.node.getChildByPath('UI/Mask').getComponent(Sprite)
            // const col = new Color(0, 0, 0, 255)
            // tween(mask.color)
            //     .to(1, col, {
            //         onUpdate: function (target: Color) {
            //             mask.color.set(target)
            //         }
            //         , onComplete:() => {
            //             director.loadScene('Level2')
            //         }
            //     }).start();
        })
    }
    update(deltaTime: number) {
        // let r:Vec3 = v3()
        // this.testR.getRotation().getEulerAngles(r)
        // let {x:x1,y:y1,z} = r;
        // if(x1===0){
        //     if(z<0){
        //         z = z
        //     }else{
        //         z = -360+z
        //     }
        // }else{
        //     if(z<0){
        //         z = -180-z
        //     }else{
        //         z = -180-z
        //     }
        // }
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
    test5 = () => {
        this.test()
    }
    test(){
        const node1 = new Node('node1')
        const sp1 = node1.addComponent(Sprite)
        sp1.spriteFrame = this.spriteFrame
        const ui1 = node1.addComponent(UITransform)
        ui1.setContentSize(new Size(100,100))
        ui1.setAnchorPoint(v2(0.5,0))
        const rig1 = node1.addComponent(RigidBody2D)
        rig1.type = ERigidBody2DType.Dynamic
        const box1 = node1.addComponent(BoxCollider2D)
        box1.group = 1 << 1
        box1.size = new Size(ui1.width, ui1.height);
        box1.offset = v2(0, ui1.height * 0.5*(ui1.anchorPoint.y === 0 ?1:-1))
        node1.setPosition(v3(0,100))

        const node2 = new Node('node2')
        const sp2 = node2.addComponent(Sprite)
        sp2.spriteFrame = this.spriteFrame
        const ui2 = node2.addComponent(UITransform)
        ui2.setAnchorPoint(v2(0.5,0))
        ui2.setContentSize(new Size(100,100))
        const rig2 = node2.addComponent(RigidBody2D)
        rig2.type = ERigidBody2DType.Dynamic
        const box2 = node2.addComponent(BoxCollider2D)
        box2.group = 1 << 1
        box2.size = new Size(ui2.width, ui2.height);
        box2.offset = v2(0, ui2.height * 0.5*(ui2.anchorPoint.y === 0 ?1:-1))
        node2.setPosition(v3(0,90))
       

        const joint1 = rig1.addComponent(HingeJoint2D)
        joint1.enabled = false;
        joint1.connectedBody = rig2
        // joint1.maxForce = 10000
        joint1.collideConnected = false
        joint1.connectedAnchor = v2(0,100)
        joint1.enabled = true;
        
        node1.parent = this.node
        node2.parent = this.node


    }

}


