import { BoxCollider2D, CircleCollider2D, Collider2D, Component, Contact2DType, DistanceJoint2D, ERigidBody2DType, EventKeyboard, EventTarget, FixedJoint2D, HingeJoint2D, Input, Joint2D, KeyCode, Node, PolygonCollider2D, RelativeJoint2D, RigidBody2D, UITransform, Vec2, Vec3, _decorator, animation, director, dragonBones, input, misc, tween, v2, v3 } from 'cc';
import { RopeNode } from './Rope';
const { ccclass, property } = _decorator;
const eventTarget = new EventTarget();
// 运动状态
enum PlayState {
    RELAX,// 放松
    WALK, // 走
    PUSH, // 推
    DRAG, // 拖
    PULL, // 拉
    JUMP, // 跳
    HURT, // 伤
    CRAWL,// 爬
    CRAWL1,// 爬1
    NONE, // 无
    TEST,
}
// 动画类型
enum AnimationType {
    RELAX = 'wait',// 放松
    WALK = 'walk', // 走
    PUSH = 'push', // 推
    DRAG = 'drag', // 拖
    PULL = 'crawl', // 拉
    JUMP = 'jump1', // 跳
    HURT = 'hurt', // 伤
    CRAWL = 'crawl',// 爬
    CRAWL1 = 'crawl4',
    NONE = 'none',
    TEST = 'none',
}

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
    wakeV: number = 6
    // 跳跃力
    jumpF: number = 30;
    // 角色缩放
    scale: number = 0.1
    // 角色运动状态,默认放松
    playState: PlayState = PlayState.NONE
    // 角色正在靠近的需要处理的节点
    nearNodes: Node[] = []
    curJoinNode: RopeNode
    // 动画播放器
    armature: dragonBones.Armature
    // 模拟骨骼刚体的父节点
    boneRigParent: Node

    protected onLoad(): void {
        // 按键监听
        input.on(Input.EventType.KEY_DOWN, this.handDown, false);
        input.on(Input.EventType.KEY_PRESSING, this.handPress, false);
        input.on(Input.EventType.KEY_UP, this.handUp, false);
        this.collider2D = this.node.getComponent(BoxCollider2D)
        this.rig2D = this.node.getComponent(RigidBody2D)
        const animaStatus = this.node.getComponent(animation.AnimationController)
        console.log(animaStatus.graph)
        // this.armatureDisplay = this.node.getComponent(dragonBones.ArmatureDisplay)
        // this.armature = this.armatureDisplay.armature()
        // this.animation = this.armature.animation
    }
    start() {
        // this.playAnima()
        // this.initSocketNode()
        // 监听动画执行事件
        // this.armatureDisplay.addEventListener(dragonBones.EventObject.COMPLETE, this.handleDragonBonesComplete, this)
        // this.armatureDisplay.addEventListener(dragonBones.EventObject.FADE_IN, this.handleDragonBonesIN, this)
        // 碰撞监听
        this.collider2D.on(Contact2DType.BEGIN_CONTACT, this.beginContact, false)
        this.collider2D.on(Contact2DType.END_CONTACT, this.endContact, false)

    }
    startWait(){
        console.log('test1')
    }
    endWait(){
        console.log('test2')
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
    // 动画淡入事件
    handleDragonBonesIN = (e) => {}
    // 监听动画执行完毕事件
    handleDragonBonesComplete = (e) => {
        const { name } = e.animationState
        if ([AnimationType.WALK, AnimationType.PUSH, AnimationType.RELAX, AnimationType.JUMP].includes(name)) {
            this.playState = PlayState.RELAX
            this.scheduleOnce(() => {
                // 0.5S 后状态还不变，就执行休息动画
                if (this.playState === PlayState.RELAX) {
                    this.playAnima()
                }
            }, 0.5)
            if (this.node.getChildByName('R1').active === false) {
                this.node.getChildByName('R1').active = true
            }
            // 攀爬完成
        } else if (name === AnimationType.CRAWL1) {
            eventTarget.emit('crawl_complete')
            // 切换休息动画
            this.playState = PlayState.RELAX
            this.playAnima()
            // 计算该次动画位移的距离，将节点缓动到新位置
            const currentPos = this.node.getWorldPosition()
            const targetPos = this.node.getComponent(UITransform).convertToWorldSpaceAR(this.boneCenter.position)
            const dist = targetPos.subtract(currentPos)
            const newPos = this.node.getPosition().add(dist)
            // 缓动时间要与淡入到休息动画的时间相同，否则会闪烁
            tween(this.node.position).to(this.animation.getState(AnimationType.RELAX).fadeTotalTime, newPos, {
                onUpdate: (target: Vec3) => {
                    this.node.position = v3(target.x, target.y)
                },
                onComplete: () => {
                    this.rig2D.enabled = true
                },
                onStart: () => {
                    // 执行缓动的时候，先把物理刚体组件禁用
                    this.rig2D.enabled = false
                }
            }).start()
        } else if (name === AnimationType.HURT) {
            director.emit(AnimationType.HURT)
            // this.destroy()
        }
    }
    /**
     * 按键按下
     * @param e 
     * @returns 
     */
    handDown = (e: EventKeyboard) => {
        if (this.playState === PlayState.HURT) return
        // 左右键
        if ([KeyCode.ARROW_RIGHT, KeyCode.ARROW_LEFT].includes(e.keyCode)) {
            // 角色在休息、走的状态，需要转身
            if ([PlayState.RELAX, PlayState.WALK, PlayState.JUMP].includes(this.playState)) {
                this.node.setScale((e.keyCode === KeyCode.ARROW_LEFT ? -1 : 1) * this.scale, this.node.scale.y, 1)
                this.collider2D.apply()
            }
            // 移动
            this.move(e.keyCode)
            // 上下键
        } else if (e.keyCode === KeyCode.ARROW_UP || e.keyCode === KeyCode.ARROW_DOWN) {
            // 拉绳中
            if (this.playState === PlayState.PULL) {
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
                    tween(this.node.position).to(1.25/2, v3(op.x, op.y + (-dir*18)), {
                        onUpdate: (target: Vec3) => {
                            this.node.position = target
                        },
                        onComplete: () => {
                            joint.connectedBody = preNode.getComponent(RigidBody2D)
                            joint.enabled = true;
                            this.curJoinNode = preNode
                            this.collider2D.density = den
                        },
                        onStart:() => {
                            this.collider2D.density = 0
                            this.playAnima()
                        }
                    }).start()
                    // 状态不切换，直接播放爬绳子的动画
                } else {
                    this.removeJoint(R1, 'hands')
                    // 禁用R1节点，防止在跳下的过程中再次连接绳子
                    R1.active = false
                    this.playState = PlayState.JUMP
                    this.playAnima()
                }
                return
            }
            // 拖
            if (this.playState === PlayState.DRAG) {
                // 移除手关节
                this.socketNodes[0].getComponent(DistanceJoint2D)?.destroy()
                this.playState = PlayState.RELAX
                this.playAnima()
                return
            }
            // 跳跃
        } else if (e.keyCode === KeyCode.CTRL_LEFT) {
            // 放松、走、拉、推
            if ([PlayState.RELAX, PlayState.WALK, PlayState.PULL, PlayState.PUSH].includes(this.playState)) {
                // 拉绳中
                if (this.playState === PlayState.PULL) {
                    // 移除手关节
                    const R1 = this.node.getChildByName('R1')
                    this.removeJoint(R1, 'hands')
                    // 禁用R1节点，防止在跳下的过程中再次连接绳子
                    R1.active = false
                }
                this.playState = PlayState.JUMP
                this.playAnima()
                this.scheduleOnce(() => {
                    this.rig2D.applyLinearImpulseToCenter(v2(this.node.scale.x * this.wakeV, this.jumpF), true)
                }, 0.42)
            }
            // 操作键
        } else if (e.keyCode === KeyCode.ALT_LEFT) {
            // 查询附近是否有可以连接的节点
            if (this.nearNodes.length !== 0) {
                // 查找附近是否存在捕兽夹
                const _node = this.nearNodes.find(item => item.name === 'Ju')
                if (_node) {
                    // 先切换动画
                    this.playState = PlayState.DRAG
                    this.playAnima()
                    // 添加关节，将主角和捕兽夹绑定
                    const joint = this.socketNodes[0].addComponent(DistanceJoint2D)
                    joint.enabled = false
                    joint.connectedBody = _node.getComponent(RigidBody2D)
                    joint.collideConnected = true
                    joint.anchor = v2(0, 0)
                    // 得到扑兽夹的一半宽度，手要刚好接触到这一端点
                    const _box = _node.getComponents(BoxCollider2D).find(item => item.tag === 1)
                    const isPlayerToNode: boolean = this.node.worldPosition.x < _node.worldPosition.x
                    // 方向是:人->捕兽夹
                    if (isPlayerToNode) {
                        // 人朝左，需要转向
                        if (this.node.scale.x < 0) {
                            console.log('需要转向')
                            this.node.setScale(this.scale, this.node.scale.y, 1)
                            this.collider2D.apply()
                        }
                        // 方向是:捕兽夹->人
                    } else {
                        // 人朝右，需要转向
                        if (this.node.scale.x > 0) {
                            this.node.setScale(-1 * this.scale, this.node.scale.y, 1)
                            this.collider2D.apply()
                        }
                    }
                    const dir = isPlayerToNode ? -1 : 1
                    joint.connectedAnchor = v2(dir * (_box.size.width / 2 + 5), -10)
                    joint.maxLength = 1
                    joint.autoCalcDistance = false
                    this.scheduleOnce(() => {
                        // 0.5s后动画淡入完成，关节生效，且主角先后退一步，避免捕兽夹移位
                        joint.enabled = true
                        this.rig2D.linearVelocity = v2(-4, 0)
                    }, 0.5)
                }
            }
        }
    }
    /**
     * 长按
     * @param e 
     */
    handPress = (e: EventKeyboard) => {
        if (this.playState === PlayState.HURT) return
        // 长按左右键，移动玩家
        if ([KeyCode.ARROW_LEFT, KeyCode.ARROW_RIGHT].includes(e.keyCode)) {
            this.move(e.keyCode)
        }
    }
    /**
     * 松开
     * @param e 
     */
    handUp = (e: EventKeyboard) => {
        if (this.playState === PlayState.HURT) return
        // 停止行走后，马上切换休息动画
        if ([KeyCode.ARROW_LEFT, KeyCode.ARROW_RIGHT].includes(e.keyCode) && this.playState === PlayState.WALK) {
            this.playState = PlayState.RELAX
            this.playAnima()
        }
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
        // 动画状态切换
        // 角色如果正在休息或在走，切换 走 状态，执行 走 动画
        if ([PlayState.RELAX, PlayState.WALK].includes(this.playState)) {
            this.playState = PlayState.WALK
            this.playAnima()
            // 角色如果正在推或拖，执行 相应 动画，不切换状态
        } else if ([PlayState.PUSH, PlayState.DRAG].includes(this.playState)) {
            this.playAnima()
            XF = XF / 2
            // 角色如果正在跳或拉，不处理，因为这两种状态不需要持续播放动画
        } else {

        }
        this.rig2D.linearVelocity = v2(XF, this.rig2D.linearVelocity.y)
    }
    /**
     * 挂点碰撞检测
     * @param self 
     * @param other 
     * @param contact 
     */
    crawlBegin = (self: Collider2D, other: Collider2D, contact) => {
        if (other.node.name === 'Crawl' && this.playState !== PlayState.CRAWL1) {
            // 添加关节，将主角固定在原地
            const joint = this.node.addComponent(RelativeJoint2D)
            joint.enabled = false
            joint.connectedBody = other.node.getComponent(RigidBody2D)
            joint.autoCalcOffset = false;
            joint.collideConnected = true
            joint.correctionFactor = 0.9
            joint.maxForce = 10000
            joint.maxTorque = 10000
            joint.linearOffset = v2(0, 0)
            joint.anchor = v2(0, 0)
            const v = this.node.getWorldPosition().subtract(other.node.getWorldPosition())
            joint.connectedAnchor = v2(v.x, 0)
            joint.enabled = true
            // 切换动画
            console.log(this.armature.getBone('身体').boneData)
            this.playState = PlayState.CRAWL1
            this.playAnima()
            this.scheduleOnce(() => {
                //设置爬的物体不受力
                const otype = other.node.getComponent(RigidBody2D).type
                other.node.getComponent(RigidBody2D).type = ERigidBody2DType.Kinematic
                // 监听的动画执行完成后，恢复物体受力类型，且销毁关节
                eventTarget.once('crawl_complete', () => {
                    other.node.getComponent(RigidBody2D).type = otype
                    joint.destroy()
                })
            })
        } else if (other.node.name === 'Rope' && this.playState !== PlayState.PULL) {
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
                console.log('石头')
                if (![PlayState.DRAG, PlayState.PULL].includes(this.playState)) {
                    this.push(other.node) // 推
                }
                break;
            // 碰到绳子
            case 'Chains':
                console.log('碰到绳子')
                contact.disabledOnce = true;
                // 角色R1节点没有绑定绳子时、可以绑定
                const R1 = self.node.getChildByName('R1')
                if (R1.active && !R1.getComponents(Joint2D).find(item => item.name === 'hands')) {
                    // 增加手关节，绑定绳子
                    this.joint(R1, other.node, 'hands', v2(0, -8))
                    this.playState = PlayState.PULL
                    this.playAnima()
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
                        this.idie()
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
            this.playState = PlayState.RELAX
            this.scheduleOnce(() => {
                if (this.playState === PlayState.RELAX) {
                    this.playAnima()
                }
            }, 0.5)
        } else if (other.node.name === 'Ju') {
            eventTarget.off('pick')
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
            this.playState = PlayState.PUSH
            this.playAnima()
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
    }

    /**
     * 播放动画
     */
    playAnima = (name?: AnimationType) => {
        if (name) {
            if (this.animation.isPlaying && this.animation.lastAnimationName === name) return;
            const t = this.animation.play(name, 0)
            // t.timeScale = 0.5
            return
        }
        // 如果当前需要执行的动画，正在播放，不执行
        if (this.animation.isPlaying && this.animation.lastAnimationName === AnimationType[PlayState[this.playState]]) return;
        let temp: dragonBones.AnimationState;
        let fadeInT: number = 0;
        switch (this.playState) {
            case PlayState.RELAX:
                this.animation.fadeIn(AnimationType.RELAX, 0.2, 0) // 循环执行
                break;
            case PlayState.WALK:
                fadeInT = this.animation.lastAnimationName === AnimationType.WALK ? 0 : 0.2;
                temp = this.animation.fadeIn(AnimationType.WALK, fadeInT, 1) // 执行一次
                temp.timeScale = 1.2
                break;
            case PlayState.DRAG:
                if (this.animation.lastAnimationName !== AnimationType.DRAG) {
                    this.animation.fadeIn(AnimationType.DRAG, 0.5, 1)
                } else {
                    this.animation.fadeIn(AnimationType.DRAG, -1, 1)
                }
                break;
            case PlayState.JUMP:
                temp = this.animation.fadeIn(AnimationType.JUMP, 0, 1)
                temp.timeScale = 1.2
                break;
            case PlayState.CRAWL1:
                this.animation.fadeIn(AnimationType.CRAWL1, 0.2, 1)
                break;
            case PlayState.PULL:
                let fadeInTime = this.animation.lastAnimationName === AnimationType.PULL ? 0 : 0.2;
                this.animation.fadeIn(AnimationType.PULL, fadeInTime, 1)
                break;
            case PlayState.CRAWL:
                const ceawl1 = this.animation.fadeIn(AnimationType.CRAWL, 0.2, 1)
                ceawl1.timeScale = 5
                break;
            case PlayState.PUSH:
                let fadeInTime1 = this.animation.lastAnimationName === AnimationType.PUSH ? 0 : 0.2;
                temp = this.animation.fadeIn(AnimationType.PUSH, fadeInTime1, 1)
                break;
            case PlayState.HURT:
                temp = this.animation.fadeIn(AnimationType.HURT, -1, 1)
                temp.timeScale = 0.7
                break;
            default:
                break;
        }
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
        if (this.playState === PlayState.HURT) return
        console.log('死亡')
        this.animation.stop()
        this.playState = PlayState.HURT
        this.node.removeChild(this.node.getChildByName('R1'))
        this.scheduleOnce(() => {
            this.createAllJoint()
        })
        this.scheduleOnce(() => {
            director.emit(AnimationType.HURT)
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
        if (y < -640 && this.playState !== PlayState.HURT) {
            this.idie()
        }
        if (this.boneRigParent && ([PlayState.HURT, PlayState.TEST].includes(this.playState))) {
            this.setBoneTransform()
        }
    }
}




