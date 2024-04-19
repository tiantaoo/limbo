import { BoxCollider2D, CircleCollider2D, Collider2D, Component, Contact2DType, DistanceJoint2D, EventKeyboard, EventTarget, FixedJoint2D, Input, Joint2D, KeyCode, Node, RelativeJoint2D, RigidBody2D, UITransform, Vec2, Vec3, _decorator, director, dragonBones, input, v2, v3 } from 'cc';
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
}
// 动画类型
enum AnimationType {
    RELAX = 'relax',// 放松
    WALK = 'walk', // 走
    PUSH = 'push', // 推
    DRAG = 'drag', // 拖
    PULL = 'crawl', // 拉
    JUMP = 'jump2', // 跳
    HURT = 'hurt', // 伤
    CRAWL = 'crawl',// 爬
    CRAWL1 = 'crawl4',
    NONE = 'none'
}

@ccclass('PLayer')
export class PLayer extends Component {
    // 碰撞盒子
    collider2D: BoxCollider2D;
    // 可碰撞挂点集合
    @property({ type: [Node] })
    socketNodes: Node[] = [];
    // 骨骼中心挂点
    @property({ type: Node })
    boneCenter: Node;
    // 刚体
    rig2D: RigidBody2D;
    // 动画组件
    armatureDisplay: dragonBones.ArmatureDisplay
    // 动画状态
    animation: dragonBones.Animation
    // 是否在地上
    isOnFloor: boolean = false
    // 最大推力
    maxPushF: number = 120;
    // 行走速度
    wakeV: number = 6
    // 跳跃力
    jumpF: number = 600;
    // 角色缩放
    scale: number = 0.1
    // 角色运动状态,默认放松
    playState: PlayState = PlayState.RELAX
    // 角色正在靠近的需要处理的节点
    nearNodes: Node[] = []
    curJoinNode: RopeNode
    isT: boolean = false
    // 动画播放器
    armature: dragonBones.Armature

    protected onLoad(): void {
        // 按键监听
        input.on(Input.EventType.KEY_DOWN, this.handDown, false);
        input.on(Input.EventType.KEY_PRESSING, this.handPress, false);
        input.on(Input.EventType.KEY_UP, this.handUp, false);
        this.collider2D = this.node.getComponent(BoxCollider2D)
        this.rig2D = this.node.getComponent(RigidBody2D)
        this.armatureDisplay = this.node.getComponent(dragonBones.ArmatureDisplay)
        this.armature = this.armatureDisplay.armature()
        this.animation = this.armature.animation

    }
    start() {
        this.playAnima()
        this.initSocketNode()
        // 监听动画执行事件
        this.armatureDisplay.addEventListener(dragonBones.EventObject.COMPLETE, this.handleDragonBonesComplete, this)
        this.armatureDisplay.addEventListener(dragonBones.EventObject.FADE_IN, this.handleDragonBonesIN, this)
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
    handleDragonBonesIN = (e) => {
        const { name } = e.animationState
    }
    // 监听动画执行完毕事件
    handleDragonBonesComplete = (e) => {
        const { name } = e.animationState
        if ([AnimationType.WALK, AnimationType.PUSH, AnimationType.RELAX, AnimationType.JUMP].includes(name)) {
            this.playState = PlayState.RELAX
            this.scheduleOnce(() => {
                // 0.5S 后状态还不变，就执行休息动画
                if(this.playState === PlayState.RELAX){
                    this.playAnima()
                }
            },0.5)
            
            if (this.node.getChildByName('R1').active === false) {
                this.node.getChildByName('R1').active = true
            }
        } else if (name === AnimationType.CRAWL1) {
            this.node.getComponent(RelativeJoint2D).destroy()
            this.setIKOffset(v3())
            const bodyPos = this.node.getWorldPosition()
            const centerPos = this.node.getComponent(UITransform).convertToWorldSpaceAR(this.boneCenter.position)
            const x = centerPos.x - bodyPos.x
            const y = centerPos.y - bodyPos.y
            this.node.setPosition(this.node.position.x + x, this.node.position.y + y)
            this.playState = PlayState.RELAX
            this.playAnima(AnimationType.RELAX)
        } else if (name === AnimationType.HURT) {
            director.emit(AnimationType.HURT)
            this.destroy()
        }
    }
    // 设置ik偏移
    setIKOffset = (pos: Vec3) => {
        const ik_left = this.armature.getBone('ik_left_hand')
        const ik_right = this.armature.getBone('ik_right_hand')
        const center = this.armature.getBone('center')

        ik_left.offset.x = pos.x
        ik_left.offset.y = pos.y
        ik_right.offset.x = pos.x
        ik_right.offset.y = pos.y
        center.offset.x = pos.x
        center.offset.y = pos.y
    }
    /**
     * 按键按下
     * @param e 
     * @returns 
     */
    handDown = (e: EventKeyboard) => {
        if(this.playState === PlayState.HURT) return
        // 左右键
        if ([KeyCode.ARROW_RIGHT, KeyCode.ARROW_LEFT].includes(e.keyCode)) {
            // 角色在休息、走的状态，需要转身
            if ([PlayState.RELAX, PlayState.WALK].includes(this.playState)) {
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
                const R1 = this.node.getChildByName('R1')
                const dir = e.keyCode === KeyCode.ARROW_UP ? -1 : 1;
                const curIndex = this.curJoinNode.no
                const preNode: RopeNode = this.curJoinNode.parent.children.find(item => item['no'] === (curIndex + dir))
                const joint = R1.getComponents(Joint2D).find(item => item.name === 'hands')
                joint.enabled = false;
                if(preNode){
                    joint.connectedBody = preNode.getComponent(RigidBody2D)
                    joint.enabled = true;
                    this.curJoinNode = preNode
                    // 状态不切换，直接播放爬绳子的动画
                    this.playAnima()
                }else{
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
                }, 0.25)
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
                    joint.connectedAnchor = v2(-50, -10)
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
        if(this.playState === PlayState.HURT) return
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
        if(this.playState === PlayState.HURT) return
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
        this.rig2D.linearVelocity = v2(XF, this.rig2D.linearVelocity.y)
        // 动画状态切换
        // 角色如果正在休息或在走，切换 走 状态，执行 走 动画
        if ([PlayState.RELAX, PlayState.WALK].includes(this.playState)) {
            this.playState = PlayState.WALK
            this.playAnima()
            // 角色如果正在推或拖，执行 相应 动画，不切换状态
        } else if ([PlayState.PUSH, PlayState.DRAG].includes(this.playState)) {
            this.playAnima()
            // 角色如果正在跳或拉，不处理，因为这两种状态不需要持续播放动画
        } else {

        }
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
            this.playState = PlayState.CRAWL1
            this.playAnima()
            // 将触发点的世界坐标转化为主角的节点坐标,这个点就是触发点的中心点
            const { x, y } = this.node.getComponent(UITransform).convertToNodeSpaceAR(other.node.worldPosition)
            // 将手掌的ik约束骨骼坐标设置为触发点的中心点，视觉上手掌抓住了某个点
            const pos = self.node.getPosition()
            const offset_x = x - pos.x;
            const offset_y = y - pos.y;
            this.setIKOffset(v3(offset_x-20, offset_y-60))
        } else if (other.node.name === 'Rope' && this.playState !== PlayState.PULL) {
        }
    }
    /**
     * 碰撞检测-开始
     * @param self 
     * @param other 
     */
    beginContact = (self: Collider2D, other: Collider2D, contact) => {
        switch (other.node.name) {
            // 碰撞石头
            case 'Ston1':
                console.log('石头')
                if (![PlayState.DRAG, PlayState.PULL].includes(this.playState)) {
                    this.push(other.node) // 推
                }
                break;
            // 碰到绳子
            case 'Rope':
                contact.disabledOnce = true;
                // 角色R1节点没有绑定绳子时、可以绑定
                const R1 = self.node.getChildByName('R1')
                if (R1.active && !R1.getComponents(Joint2D).find(item => item.name === 'hands')) {
                    // 增加手关节，绑定绳子
                    this.joint(R1, other.node, 'hands')
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
                    this.playState = PlayState.HURT
                    this.playAnima()
                    this.rig2D.linearVelocity = v2(0,0)
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
            this.playState = PlayState.RELAX
            this.scheduleOnce(() => {
                if(this.playState === PlayState.RELAX){
                    this.playAnima()
                }
            },0.5)
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
        joint.anchor = v2(0,0)
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
            const t = this.animation.play(name, 1)
            t.timeScale = 0.5
            return
        }
        // 如果当前需要执行的动画，正在播放，不执行
        if (this.animation.isPlaying && this.animation.lastAnimationName === AnimationType[PlayState[this.playState]]) return;
        let temp: dragonBones.AnimationState;
        let fadeInT:number = 0;
        switch (this.playState) {
            case PlayState.RELAX:
                this.animation.fadeIn(AnimationType.RELAX, 0.2, 0) // 循环执行
                break;
            case PlayState.WALK:
                fadeInT = this.animation.lastAnimationName === AnimationType.WALK ? 0 : 0.2;
                temp = this.animation.fadeIn(AnimationType.WALK, fadeInT, 1) // 执行一次
                temp.timeScale = 2.5
                break;
            case PlayState.DRAG:
                if (this.animation.lastAnimationName !== AnimationType.DRAG) {
                    this.animation.fadeIn(AnimationType.DRAG, 0.5, 1)
                } else {
                    this.animation.fadeIn(AnimationType.DRAG, -1, 1)
                }
                break;
            case PlayState.JUMP:
                temp = this.animation.play(AnimationType.JUMP, 1)
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
                this.animation.fadeIn(AnimationType.CRAWL, 0.2, 1)
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
    update(deltaTime: number) {

    }
}




