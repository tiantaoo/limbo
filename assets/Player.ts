import { BoxCollider2D, CircleCollider2D, Collider2D, Component, Contact2DType, DistanceJoint2D, ERigidBody2DType, EventKeyboard, FixedJoint2D, HingeJoint2D, Input, Joint2D, KeyCode, Node, PolygonCollider2D, RigidBody2D, UITransform, Vec2, Vec3, _decorator, dragonBones, input, misc, tween, v2, v3 } from 'cc';
import { RopeNode } from './Rope';
import FSMManger from './StateMachines/FSMManger';
import { InputType, OutputType, PlaterState, transferMap } from './StateMachines/interface';

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
    jumpF: number = 20;
    // 角色缩放
    scale: number = 0.1
    // 角色正在靠近的需要处理的节点
    nearNodes: Node[] = []
    curJoinNode: RopeNode
    // 动画播放器
    armature: dragonBones.Armature
    // 模拟骨骼刚体的父节点
    boneRigParent: Node
    fsm: FSMManger

    protected onLoad(): void {
        // 按键监听
        input.on(Input.EventType.KEY_DOWN, this.handDown, false);
        input.on(Input.EventType.KEY_PRESSING, this.handPress, false);
        input.on(Input.EventType.KEY_UP, this.handUp, false);
        this.collider2D = this.node.getComponent(BoxCollider2D)
        this.rig2D = this.node.getComponent(RigidBody2D)
        this.armatureDisplay = this.node.getComponent(dragonBones.ArmatureDisplay)
        this.armature = this.armatureDisplay.armature()
        // 状态机
        this.fsm = new FSMManger(this.node)
        // 动画开始淡入
        this.fsm.on(OutputType.ANIMATION_IN, state => {
            if (state === PlaterState.crawl) {
                this.rig2D.type = ERigidBody2DType.Static
            } else if (state === PlaterState.wait) {
                // 移除手上的关节
                this.socketNodes[0].getComponent(DistanceJoint2D)?.destroy()
            } else if (state === PlaterState.jump) {
                // 开始跳的时候需要开启R1，可以连接其他节点
                this.node.getChildByName('R1').active = true
                this.scheduleOnce(() => {
                    this.rig2D.applyLinearImpulseToCenter(v2(this.node.scale.x * this.wakeV, this.jumpF), true)
                }, 0.42)
            } else if (state === PlaterState.jump2) {
                this.removeJoint(this.node.getChildByName('R1'), 'hands')
            }
        })
        // 动画开始淡出
        this.fsm.on(OutputType.ANIMATION_FADEOUT_IN, state => { })
        // 动画淡入完成
        this.fsm.on(OutputType.ANIMATION_FADEIN_COMPLETE, state => {
            if (state === PlaterState.drag) {
                this.handleDragFadeInComplete()
            }
        })
        // 动画结束
        this.fsm.on(OutputType.ANIMATION_COMPLETE, state => {
            if (state === PlaterState.crawl) {
                this.handleCrawlComplete()
            } else if (state === PlaterState.jump) {}
        })
    }
    start() {
        this.initSocketNode()
        this.fsm.changeState(PlaterState.wait, InputType.END)
        // 碰撞监听
        this.collider2D.on(Contact2DType.BEGIN_CONTACT, this.beginContact, false)
        this.collider2D.on(Contact2DType.END_CONTACT, this.endContact, false)

    }
    /**
     * 初始化挂点的事件监听
     */
    initSocketNode = () => {
        this.socketNodes.forEach(node => {
            // 监听所有可以碰撞挂点的碰撞事件
            node.getComponent(CircleCollider2D).on(Contact2DType.BEGIN_CONTACT, this.crawlBegin)
        })
    }
    /**
     * 拉绳动画开始
     */
    handleCordStart = (e:EventKeyboard) => {
        // 上下移动
        // 找到下一个关节
        const R1 = this.node.getChildByName('R1')
        const dir = e.keyCode === KeyCode.ARROW_UP ? -1 : 1;
        const curIndex = this.curJoinNode.no
        const preNode: RopeNode = this.curJoinNode.parent.children.find(item => item['no'] === (curIndex + dir))
        const joint = R1.getComponents(Joint2D).find(item => item.name === 'hands')
        joint.enabled = false;
        if (preNode) {
            //开始缓动
            const op = this.node.getPosition()
            let den = this.collider2D.density
            tween(this.node.position).to(1.25 / 2, v3(op.x, op.y + (-dir * 18)), {
                onUpdate: (target: Vec3) => {
                    this.node.position = target
                },
                onComplete: () => {
                    joint.connectedBody = preNode.getComponent(RigidBody2D)
                    joint.enabled = true;
                    this.curJoinNode = preNode
                    this.collider2D.density = den
                },
                onStart: () => {
                    this.collider2D.density = 0

                }
            }).start()
        } else {
            this.removeJoint(R1, 'hands')
        }
    }
    handleCrawlComplete = () => {
        // 计算该次动画位移的距离，将节点缓动到新位置
        const currentPos = this.node.getWorldPosition()
        const targetPos = this.node.getComponent(UITransform).convertToWorldSpaceAR(this.boneCenter.position)
        const dist = targetPos.subtract(currentPos)
        const newPos = this.node.getPosition().add(dist)
        // 缓动时间要与淡入到休息动画的时间相同，否则会闪烁
        const [, fadeTime,] = transferMap[PlaterState.crawl][InputType.END]
        tween(this.node.position).to(fadeTime, newPos, {
            onUpdate: (target: Vec3) => {
                this.node.position = v3(target.x, target.y)
            },
            onComplete: () => {
                this.rig2D.enabled = true
                this.rig2D.type = ERigidBody2DType.Dynamic
            },
            onStart: () => {
                // 执行缓动的时候，先把物理刚体组件禁用
                this.rig2D.enabled = false
            }
        }).start()
    }
    /**
     * 拖淡入完成
     */
    handleDragFadeInComplete = () => {
        const _node = this.nearNodes.find(item => item.name === 'Ju')
        // 得到扑兽夹的一半宽度，手要刚好接触到这一端点
        const _box = _node.getComponents(BoxCollider2D).find(item => item.tag === 1)
        const isPlayerToNode: boolean = this.node.worldPosition.x < _node.worldPosition.x
        const dir = isPlayerToNode ? -1 : 1
        // 添加关节，将主角和捕兽夹绑定
        const joint1 = this.socketNodes[0].getComponent(DistanceJoint2D)
        const joint = joint1 ? joint1 : this.socketNodes[0].addComponent(DistanceJoint2D)
        joint.enabled = false
        joint.connectedBody = _node.getComponent(RigidBody2D)
        joint.collideConnected = true
        joint.anchor = v2(0, 0)
        joint.connectedAnchor = v2(dir * (_box.size.width / 2 + 5), -10)
        joint.maxLength = 1
        joint.autoCalcDistance = false
        joint.enabled = true
        this.rig2D.linearVelocity = v2(dir * 4, 0)
    }

    /**
     * 按键按下
     * @param e 
     * @returns 
     */
    handDown = (e: EventKeyboard) => {
        if (this.fsm.currentStateId === PlaterState.crawl) return
        // 左右键
        if ([KeyCode.ARROW_RIGHT, KeyCode.ARROW_LEFT].includes(e.keyCode)) {
            // 触发状态机中输入事件
            this.fsm.onInput(e.keyCode as unknown as InputType)
            // 左右移动
            this.move(e.keyCode)
            // 角色在休息、走的状态，需要转身
            if ([PlaterState.wait, PlaterState.walk, PlaterState.jump].includes(this.fsm.currentStateId)) {
                this.node.setScale((e.keyCode === KeyCode.ARROW_LEFT ? -1 : 1) * this.scale, this.node.scale.y, 1)
                this.collider2D.apply()
            }
            // 上下键
        } else if (e.keyCode === KeyCode.ARROW_UP || e.keyCode === KeyCode.ARROW_DOWN) {
            this.fsm.onInput(e.keyCode as unknown as InputType)
            if([PlaterState.cord].includes(this.fsm.currentStateId)){
                this.handleCordStart(e)
            }
            // 拉绳中
            // 跳跃
        } else if (e.keyCode === KeyCode.CTRL_LEFT) {
            // 触发状态机中输入事件
            this.fsm.onInput(e.keyCode as unknown as InputType)
            // 操作键
        } else if (e.keyCode === KeyCode.ALT_LEFT) {
            // 查询附近是否有可以连接的节点
            if (this.nearNodes.length !== 0) {
                // 查找附近是否存在捕兽夹
                const _node = this.nearNodes.find(item => item.name === 'Ju')
                if (_node) {
                    const isPlayerToNode: boolean = this.node.worldPosition.x < _node.worldPosition.x
                    const dir = isPlayerToNode ? -1 : 1
                    // 方向是:人->捕兽夹
                    if (isPlayerToNode && this.node.scale.x < 0) {
                        // 人朝左，需要转向
                        this.node.setScale(this.scale, this.node.scale.y, 1)
                    } else if (!isPlayerToNode && this.node.scale.x > 0) {
                        // 人朝右，需要转向
                        this.node.setScale(dir * this.scale, this.node.scale.y, 1)
                    }
                    this.collider2D.apply()
                    // 触发状态机中输入事件
                    this.fsm.onInput(e.keyCode as unknown as InputType)
                }

            }
        }
    }
    /**
     * 长按
     * @param e 
     */
    handPress = (e: EventKeyboard) => {
        if (this.fsm.currentStateId === PlaterState.hurt) return
        if ([KeyCode.ARROW_RIGHT, KeyCode.ARROW_LEFT].includes(e.keyCode)) {
            this.move(e.keyCode)
        }
    }
    /**
     * 松开
     * @param e 
     */
    handUp = (e: EventKeyboard) => {
        if (this.fsm.currentStateId === PlaterState.hurt) return
        this.fsm.onInput(InputType.NO_OPT)
    }
    /**
     * 横向移动
     * @param dirCode 方向码 
     * @returns 
     */
    move = (dirCode: KeyCode) => {
        const FFlag = {
            [KeyCode.ARROW_LEFT]: -1,
            [KeyCode.ARROW_RIGHT]: 1
        }[dirCode]
        // 横向力，方向*力
        let XF: number = FFlag * this.wakeV;
        this.rig2D.linearVelocity = v2(XF, this.rig2D.linearVelocity.y)
    }
    /**
     * 挂点碰撞检测
     * @param self 
     * @param other 
     * @param contact 
     */
    crawlBegin = (self: Collider2D, other: Collider2D, contact) => {
        if (other.node.name === 'Crawl' && this.fsm.currentStateId !== PlaterState.crawl) {
            this.rig2D.linearVelocity = v2(0, 0)
            const _pos = self.node.getWorldPosition()
            const pos = this.node.getComponent(UITransform).convertToWorldSpaceAR(other.node.getPosition())
            const dis = pos.y - _pos.y
            const nodeP = this.node.getPosition()
            this.node.setPosition(v3(nodeP.x, nodeP.y + dis))
            this.fsm.onInput(InputType.CRAWL)
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
                this.idie()
            })
            return
        }
        switch (other.node.name) {
            // 碰撞石头
            case 'Ston1':
                this.fsm.onInput(InputType.PUSH)
                this.push(other.node) // 推
                break;
            // 碰到绳子
            case 'Chains':
                contact.disabledOnce = true;
                this.fsm.onInput(InputType.CORD)
                // 角色R1节点没有绑定绳子时、可以绑定
                const R1 = self.node.getChildByName('R1')
                if (R1.active && !R1.getComponents(Joint2D).find(item => item.name === 'hands')) {
                    // 增加手关节，绑定绳子
                    console.log('连接')
                    this.joint(R1, other.node, 'hands', v2(0, -8))
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
                        // this.idie()
                    })
                }
                break;
            case 'Mutou':

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
            this.fsm.onInput(InputType.NO_OPT)
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
            this.fsm.onInput(InputType.PUSH)
        }
    }
    /**
     * 连接关节
     * @param self  自身节点 
     * @param target 目标节点
     * @param jointName 关节名称
     * @param tagetAnchor 目标节点锚点坐标
     */
    joint = (self: Node, target: Node, jointName: string, tagetAnchor: Vec2 = v2(0, 0)) => {
        // 在自身节点上增加一个关节
        const joint = self.addComponent(FixedJoint2D)
        joint.name = jointName
        joint.enabled = false;
        // 角色的关节连接到绳子刚体上
        joint.connectedBody = target.getComponent(RigidBody2D);
        joint.connectedAnchor = tagetAnchor
        joint.anchor = v2(0, 0)
        joint.enabled = true;
        this.curJoinNode = target
    }
    /**
     * 移除关节
     * @param self 
     * @param jointName 
     */
    removeJoint = (self: Node, jointName: string) => {
        self.getComponents(FixedJoint2D).find(item => item.name === jointName)?.destroy()
        this.curJoinNode = null
        self.active = false
    }


    protected onDestroy(): void {
        input.off(Input.EventType.KEY_DOWN, this.handDown, false);
        input.off(Input.EventType.KEY_PRESSING, this.handPress, false);
        input.off(Input.EventType.KEY_UP, this.handUp, false);
        this.collider2D.off(Contact2DType.BEGIN_CONTACT, this.beginContact, false)
        this.collider2D.off(Contact2DType.END_CONTACT, this.endContact, false)
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
    addBody = () => {
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
    addJoint = () => {
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
        this.addBody()
        this.addJoint()
        this.rig2D.enabled = false
        this.collider2D.enabled = false
    }

    idie = () => {
        console.log('死亡')
        this.node.removeChild(this.node.getChildByName('R1'))
        this.scheduleOnce(() => {
            this.createAllJoint()
        })
        this.scheduleOnce(() => {
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

    update(deltaTime: number) {
        const { x, y } = this.node.getPosition()
        if (y < -640 && this.fsm.currentStateId !== PlaterState.hurt) {
            this.idie()
        }
        if (this.boneRigParent && ([PlaterState.hurt].includes(this.fsm.currentStateId))) {
            this.setBoneTransform()
        }
    }
}




