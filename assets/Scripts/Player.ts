import { BoxCollider2D, CircleCollider2D, Collider2D, Component, Contact2DType, ERigidBody2DType, EventKeyboard, FixedJoint2D, HingeJoint2D, Input, Node, PolygonCollider2D, RigidBody2D, UITransform, Vec2, Vec3, _decorator, director, dragonBones, input, misc, v2, v3 } from 'cc';
import FSMManger from 'db://assets/StateMachines/FSMManger';
import { InputType, PlaterState } from 'db://assets/StateMachines/interface';
import { RopeNode } from './Rope';

const { ccclass, property } = _decorator;

export const PhysicBodyName = {
    HEAD: '头',
    BODY: '身体',
    LEFT_HAND1: '左手上',
    LEFT_HAND2: '左手下',
    RIGHT_HAND1: '右手上',
    RIGHT_HAND2: '右手下',
    LEFT_FOOT1: '左腿上',
    LEFT_FOOT2: '左腿下',
    RIGHT_FOOT1: '右腿上',
    RIGHT_FOOT2: '右腿下',
}

@ccclass('PLayer')
export class PLayer extends Component {
    // 可碰撞挂点集合
    @property({ type: [Node] })
    socketNodes: Node[] = [];
    // 骨骼中心挂点
    @property({ type: Node })
    boneCenter: Node;
    // 刚体
    rig2D: RigidBody2D;
    // 碰撞盒子
    collider2D: BoxCollider2D;
    // 动画组件
    armatureDisplay: dragonBones.ArmatureDisplay
    // 动画状态
    animation: dragonBones.Animation
    // 最大推力
    maxPushF: number = 1600;
    // 行走速度
    wakeV: number = 3
    // 跳跃力
    jumpF: number = 10;
    // 角色缩放
    scale: number = 0.1
    // 角色正在靠近的需要处理的节点
    nearNodes: Node[] = []
    // 动画播放器
    armature: dragonBones.Armature
    // 模拟骨骼刚体的父节点
    boneRigParent: Node
    // 状态机实例
    fsm: FSMManger
    // 角色的链接节点
    jointNode: Node
    // 角色当前正在链接的其他节点
    curJoinNode: RopeNode

    protected onLoad(): void {
        // 获取部分组件
        this.collider2D = this.node.getComponent(BoxCollider2D)
        this.rig2D = this.node.getComponent(RigidBody2D)
        this.armatureDisplay = this.node.getComponent(dragonBones.ArmatureDisplay)
        this.armature = this.armatureDisplay.armature()
        this.jointNode = this.node.getChildByName('JointNode')
        // 状态机
        this.fsm = new FSMManger(this.node)
        // 监听
        input.on(Input.EventType.KEY_DOWN, this.handDown, false);
        input.on(Input.EventType.KEY_PRESSING, this.handPress, false);
        input.on(Input.EventType.KEY_UP, this.handUp, false);
        // 碰撞监听
        this.createContactListener()
    }
    start() {
        this.fsm.entry(PlaterState.wait)
        console.log(this.rig2D.getMass())
    }
    /**
     * 创建碰撞监听
     */
    createContactListener = () => {
        this.collider2D.on(Contact2DType.BEGIN_CONTACT, this.beginContact, false)
        this.collider2D.on(Contact2DType.END_CONTACT, this.endContact, false)
        // 监听挂点的碰撞事件
        this.socketNodes.forEach(node => {
            node.getComponent(CircleCollider2D).on(Contact2DType.BEGIN_CONTACT, this.socketNodesBeginContact)
        })
    }
    // 取消碰撞监听
    cancleContactListener = () => {
        this.collider2D.off(Contact2DType.BEGIN_CONTACT, this.beginContact, false)
        this.collider2D.off(Contact2DType.END_CONTACT, this.endContact, false)
        // 监听挂点的碰撞事件
        this.socketNodes.forEach(node => {
            node.getComponent(CircleCollider2D).off(Contact2DType.BEGIN_CONTACT, this.socketNodesBeginContact)
        })
    }

    /**
     * 按键按下
     * @param e 
     * @returns 
     */
    handDown = (e: EventKeyboard) => {
        this.fsm.onInput(e.keyCode as unknown as InputType, [])
    }
    /**
     * 长按
     * @param e 
     */
    handPress = (e: EventKeyboard) => {
        this.fsm.onInput(e.keyCode as unknown as InputType,[])
    }
    /**
     * 松开
     * @param e 
     */
    handUp = (e: EventKeyboard) => {
    }
    /**
     * 挂点碰撞检测
     * @param self 
     * @param other 
     * @param contact 
     */
    socketNodesBeginContact = (self: Collider2D, other: Collider2D, contact) => {
        if (other.node.name === 'Crawl' && this.fsm.currentState !== PlaterState.crawl) {
            this.rig2D.linearVelocity = v2(0, 0)
            const _pos = self.node.getWorldPosition()
            const pos = this.node.getComponent(UITransform).convertToWorldSpaceAR(other.node.getPosition())
            const dis = pos.y - _pos.y
            const nodeP = this.node.getPosition()
            this.node.setPosition(v3(nodeP.x, nodeP.y + dis))
            this.fsm.onInput(InputType.CRAWL,[other.node])
        }
    }
    /**
     * 碰撞检测-开始
     * @param self 
     * @param other 
     */
    beginContact = (self: Collider2D, other: Collider2D, contact) => {
        if (this.rig2D.getLinearVelocityFromWorldPoint(v2(0, 0), this.node.worldPosition).y < -700) {
            // 受伤
            this.scheduleOnce(() => {
                this.die()
            })
            return
        }
        switch (other.node.name) {
            // 碰撞石头
            case 'Ston1':
                this.push(other.node) // 推
                break;
            // 碰到绳子
            case 'Chains':
                contact.disabledOnce = true;
                const haveHands = this.jointNode.getComponents(FixedJoint2D).find(item => item.name === 'hands')
                // 角色链接节点没有绑定绳子时、可以绑定
                if (!haveHands) {
                    console.log('允许链接')
                    this.fsm.onInput(InputType.CORD,[other.node])
                }
                break;
            // 碰到地刺    
            case 'Ju':
                // 地刺前端把手
                if (other.tag === 0) {
                    // 如果当前点不存在附近的点集合，则加入
                    if (this.nearNodes.findIndex(node => node.uuid === other.node.uuid) === -1) {
                        this.nearNodes.push(other.node)
                    }
                    // 地刺
                } else if (other.tag === 1) {
                    this.nearNodes = this.nearNodes.filter(item => item.name !== 'Ju')
                    // 受伤
                    this.scheduleOnce(() => {
                        this.die()
                    })
                }
                break;
            default:
                break;
        }
    }
    /**
     * 碰撞检测-结束
     * @param self 
     * @param other 
     */
    endContact = (self: Collider2D, other: Collider2D) => {
        // 离开石头
        if (other.node.name === 'Ston1') {
            this.fsm.onInput(InputType.EXIT,[])
        } else if (other.node.name === 'Ju') {
            if (other.tag === 0) {
                this.nearNodes = this.nearNodes.filter(item => item.name !== 'Ju')
            }
        }
    }
    /**
     * 推
     * @param targrt 目标 
     */
    push = (targrt: Node) => {
        // 用力方向,通过判断角色和目标的位置
        const [selfX, targetX] = [this.node.getWorldPosition().x, targrt.getWorldPosition().x]
        // 自身和目标在x轴的距离
        const dist = Math.abs(selfX - targetX) + 10;
        // 两者之间的最小水平距离
        const minDist = (this.node.getComponent(BoxCollider2D).size.width * this.node.scale.x) / 2 + targrt.getComponent(CircleCollider2D).radius
        // 两节点在x轴的距离大于等于两节点的宽度，才执行 推
        if (dist >= minDist) {
            this.fsm.onInput(InputType.PUSH,[targrt])
        }
    }
    
    // 初始化角色碰撞盒
    initCollider = () => {
        for (let key in PhysicBodyName) {
            // 获取骨骼包围盒数据
            const name = PhysicBodyName[key]
            const BBD: dragonBones.BoundingBoxData & { vertices?: number[] } = this.armature.getSlot(`${name}_boundingBox`).boundingBoxData
            const bonePoint = BBD.vertices
            const _point = this.node.addComponent(PolygonCollider2D)
            _point.enabled = false
            _point.friction = 0.2
            _point.restitution = 0
            _point.group = 1 << 1;
            const l = bonePoint.length / 2
            for (let i = 0; i < l; i++) {
                let newPos = v2();
                // 头和身体锚点特殊处理过，所以这里需要特殊处理
                if (['头', '身体'].includes(name)) {
                    newPos = v2(bonePoint[i * 2], -bonePoint[i * 2 + 1]).rotate(Math.PI / 2)
                } else {
                    newPos = v2(bonePoint[i * 2], bonePoint[i * 2 + 1]).rotate(-Math.PI / 2)
                }
                _point.points[i] = newPos
            }
            _point.enabled = true
            _point.apply()
        }
    }
    // 根据骨骼信息，分别添加对应的刚体节点
    addRigByBone = () => {
        // 先创建父节点，父节点和角色所在层级相同，这样骨骼的本地变换才能和对应刚体的变换相同
        if (!this.boneRigParent) {
            this.boneRigParent = new Node('RigdNode')
            this.boneRigParent.addComponent(UITransform)
            this.boneRigParent.parent = this.armatureDisplay.node.parent
        }
        // 缩放和位置同步
        this.boneRigParent.scale = this.armatureDisplay.node.scale
        this.boneRigParent.position = this.armatureDisplay.node.getPosition()
        //循环添加骨骼对应的刚体
        for (let key in PhysicBodyName) {
            const node = new Node(PhysicBodyName[key]);
            const name = node.name;
            const UITr = node.addComponent(UITransform)
            //节点锚点设置，方便与骨骼同步,头和身体的原点在最底端，其他肢体在顶端
            UITr.setAnchorPoint(v2(0.5, ['头', '身体'].includes(name) ? 0 : 1));
            node.parent = this.boneRigParent;
            let bones = this.armature.getBone(name);//根据名称获取骨骼
            let len = 0;
            if (bones) {
                //读取骨骼的长度
                len = bones.boneData.length;
            }
            // 添加刚体
            let body = node.addComponent(RigidBody2D);
            body.type = ERigidBody2DType.Dynamic;
            // body.angularDamping = 1
            // 物理分组 1
            body.group = 1 << 1
            body.wakeUp()
            body.allowSleep = false;
            if (len > 0) {
                // 获取骨骼包围盒数据
                const BBD: dragonBones.BoundingBoxData & { vertices?: number[] } = this.armature.getSlot(`${name}_boundingBox`).boundingBoxData
                const bonePoint = BBD.vertices
                const _point = node.addComponent(PolygonCollider2D)
                _point.enabled = false
                _point.friction = 0.3
                _point.restitution = 0.3
                _point.group = 1 << 1;
                const l = bonePoint.length / 2
                for (let i = 0; i < l; i++) {
                    let newPos = v2();
                    // 头和身体锚点特殊处理过，所以这里需要特殊处理
                    if (['头', '身体'].includes(name)) {
                        newPos = v2(bonePoint[i * 2], -bonePoint[i * 2 + 1]).rotate(Math.PI / 2)
                    } else {
                        newPos = v2(bonePoint[i * 2], bonePoint[i * 2 + 1]).rotate(-Math.PI / 2)
                    }
                    _point.points[i] = newPos
                }
                _point.enabled = true
                _point.apply()
            }
            let bmm = bones.globalTransformMatrix;
            node.setPosition(bmm.tx, bmm.ty);
            let radius = v2(bmm.a, bmm.b).signAngle(v2(node.getWorldMatrix().m11, node.getWorldMatrix().m12).normalize());
            //实际角度需要进行一次变换，因为龙骨跟cocos节点旋转有变差
            let angle = 180 - radius * 180 / Math.PI
            if (name === '头' || name === '身体') {
                angle += 180
            }
            node.angle = angle
        }
    }
    /**
     * 给构建的骨骼刚体添加铰链关节，模拟人体关节
     */
    addJointByBoneRig = () => {
        for (let i = 0, len = this.boneRigParent.children.length; i < len; i++) {
            // 当前骨头刚体
            const node = this.boneRigParent.children[i];
            // 当前骨头
            const bones = this.armature.getBone(node.name);
            // 将IK取消掉
            bones._hasConstraint = false;
            // 如果骨头存在父骨骼，且父骨骼 不是根骨架
            if (node.name !== '身体') {
                // 父骨骼
                const parentbones = bones.parent;
                // 当前骨骼刚体的父级刚体节点
                const parentnode = node.parent.getChildByName(parentbones.name);
                // 如果当前骨骼有父骨骼
                if (parentnode && parentbones.name != "center") {
                    // 添加关节
                    const joint = node.addComponent(HingeJoint2D);
                    joint.enabled = false
                    joint.connectedBody = parentnode.getComponent(RigidBody2D);
                    joint.collideConnected = false
                    joint.enableLimit = true
                    joint.upperAngle = 360
                    joint.lowerAngle = -45
                    joint.enableMotor = false
                    // 这几个骨骼需要连接它们父骨骼的上端
                    if (['头', '左手上', '右手上'].includes(node.name)) {
                        joint.connectedAnchor = new Vec2(0, (parentbones.boneData.length * this.scale));
                        joint.upperAngle = 90
                        // 这几个骨骼需要连接它们父骨骼的下端
                    } else if (['左腿下', '右腿下', '左手下', '右手下'].includes(node.name)) {
                        joint.connectedAnchor = v2(0, (-parentbones.boneData.length * this.scale));
                    }
                    joint.enabled = true;
                }
            }
        }
    }
    // 创建所有关节
    createAllJoint = () => {
        this.addRigByBone()
        this.addJointByBoneRig()
        this.rig2D.enabled = false
        this.collider2D.enabled = false
    }

    die = () => {
        console.log('死亡')
        this.fsm.onInput(InputType.GAME_OVER,[])
        this.node.removeChild(this.jointNode)
        this.scheduleOnce(() => {
            this.createAllJoint()
        })
        this.scheduleOnce(() => {
            director.emit('hurt')
        }, 4)
    }
    // 设置骨头变换数据
    setBoneTransform = () => {
        for (let i = 0, len = this.boneRigParent.children.length; i < len; i++) {
            let node = this.boneRigParent.children[i];
            let bone = this.armature.getBone(node.name);
            bone.offsetMode = 2;
            let offset = bone.offset;
            offset.x = node.getPosition().x;
            offset.y = node.getPosition().y;
            const r: Vec3 = v3()
            node.getRotation().getEulerAngles(r)
            let { x: x1, z } = r;
            if (x1 === 0) {
                if (z < 0) {
                    z = z
                } else {
                    z = -360 + z
                }
            } else {
                if (z < 0) {
                    z = -180 - z
                } else {
                    z = -180 - z
                }
            }
            let ra = misc.degreesToRadians(z - 90)
            if (bone.name === '头' || bone.name === '身体') {
                ra += Math.PI
            }
            offset.rotation = ra
            // 强制下一帧变换
            bone.invalidUpdate();
        }
    }
    protected onDestroy(): void {
        input.off(Input.EventType.KEY_DOWN, this.handDown, false);
        input.off(Input.EventType.KEY_PRESSING, this.handPress, false);
        input.off(Input.EventType.KEY_UP, this.handUp, false);
        this.cancleContactListener()
    }
    update(deltaTime: number) {
        const { x, y } = this.node.getPosition()
        if (y < -640 && this.fsm.currentState !== PlaterState.hurt) {
            this.die()
        }
        if (this.boneRigParent && ([PlaterState.hurt].includes(this.fsm.currentState))) {
            this.setBoneTransform()
        }
    }
}




