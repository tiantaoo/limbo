import { BoxCollider2D, CircleCollider2D, Collider2D, Component, Contact2DType, EventKeyboard, EventTarget, FixedJoint2D, Input, Joint2D, KeyCode, Node, RelativeJoint2D, RigidBody2D, Vec2, Vec3, _decorator, director, dragonBones, input, tween, v2 } from 'cc';
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
    PULL = 'pull', // 拉
    JUMP = 'jump', // 跳
    HURT = 'hurt', // 伤
    CRAWL = 'crawl',// 爬
    CRAWL1 = 'crawl4',
    NONE = 'none'
}

@ccclass('Player1')
export class Player1 extends Component {
    // 碰撞盒子
    collider2D: BoxCollider2D;
    @property({ type: Node })
    crawl: Node;
    crawl2D: CircleCollider2D
    // 刚体
    rig2D: RigidBody2D;
    // 动画组件
    armatureDisplay: dragonBones.ArmatureDisplay
    // 动画状态
    animation: dragonBones.Animation
    // 是否在地刺把手范围
    isInHand: boolean = false
    // 是否在地上
    isOnFloor: boolean = false
    // 最大推力
    maxPushF: number = 120;
    // 行走速度
    wakeV: number = 4
    // 跳跃力
    jumpF: number = 1100;
    // 角色缩放
    scale: number = 1
    // 角色运动状态,默认放松
    playState: PlayState = PlayState.RELAX
    // 角色正在靠近的需要处理的节点
    nearNodes: Node[] = []
    curJoinNode: RopeNode
    isT: boolean = false
    // 动画播放器
    armature: dragonBones.Armature

    pointA:Vec3
    pointB:Vec3

    protected onLoad(): void {
        // 按键监听
        input.on(Input.EventType.KEY_DOWN, this.handDown, false);
        input.on(Input.EventType.KEY_PRESSING, this.handPress, false);
        this.collider2D = this.node.getComponent(BoxCollider2D)
        this.crawl2D = this.crawl.getComponent(CircleCollider2D)
        this.rig2D = this.node.getComponent(RigidBody2D)
        this.armatureDisplay = this.node.getChildByName('Body').getComponent(dragonBones.ArmatureDisplay)
        this.armature = this.armatureDisplay.armature()
        this.animation = this.armature.animation

    }
    start() {
        this.playAnima()
        // 监听动画执行完毕事件
        this.armatureDisplay.addEventListener(dragonBones.EventObject.COMPLETE, this.handleDragonBonesComplete, this)
        // 碰撞监听
        this.crawl2D.on(Contact2DType.BEGIN_CONTACT, this.crawlBegin)
        this.collider2D.on(Contact2DType.BEGIN_CONTACT, this.beginContact, false)
        this.collider2D.on(Contact2DType.END_CONTACT, this.endContact, false)
    }
    // 监听动画执行完毕事件
    handleDragonBonesComplete = (e) => {
        const { name } = e.animationState
        console.log(`${name}完成`)
        if ([AnimationType.WALK, AnimationType.PUSH, AnimationType.RELAX, AnimationType.JUMP].includes(name)) {
            this.playState = PlayState.RELAX
            this.playAnima()
            if (this.node.getChildByName('R1').active === false) {
                this.node.getChildByName('R1').active = true
            }
        } else if (name === AnimationType.CRAWL1) {
            this.isT = false
            this.node.getComponent(RelativeJoint2D).destroy()
            this.pointB = this.crawl.getWorldPosition()
            const x = this.pointB.x - this.pointA.x
            const y = this.pointB.y - this.pointA.y
            console.log(x,y)
            this.node.setPosition(this.node.position.x+20,this.node.position.y+40)
            // tween(this.node.position).to(0.2, new Vec3(this.node.position.x + 20, this.node.position.y + 40, 0),    // 这里以node的位置信息坐标缓动的目标 
            // {
            //     onUpdate: (target: Vec3, ratio: number) => {
            //         this.node.position = target;
            //     },
            //     onComplete: () => {
            //         // this.collider2D.density = 50
            //         // this.collider2D.enabled = true
            //         // this.isT = false
            //         // this.playState = PlayState.RELAX
            //         // this.playAnima()
            //     }
            // }).start();
            // const joint = this.node.getComponent(RelativeJoint2D)
            // joint.enabled = false
            // joint.linearOffset = v2(40,-50)
            // joint.maxForce = 5000
            // joint.maxTorque = 1000
            // joint.enabled = true
            this.playState = PlayState.RELAX
            this.playAnima()

        } else if (name === AnimationType.HURT) {
            director.emit(AnimationType.HURT)
        }
    }
    /**
     * 攀爬动作--缓动系统实现
     */
    crawlAction = () => {
        this.isT = true
        this.collider2D.enabled = false
        this.collider2D.density = 0
        let tweenDuration: number = 1.42;
        this.animation.stop()
        this.animation.play('crawl1', 1)
        tween(this.node.position).to(tweenDuration, new Vec3(this.node.position.x + 28, this.node.position.y + 40, 0),    // 这里以node的位置信息坐标缓动的目标 
            {
                onUpdate: (target: Vec3, ratio: number) => {
                    this.node.position = target;
                },
                onComplete: () => {
                    this.collider2D.density = 50
                    this.collider2D.enabled = true
                    this.isT = false
                    this.playState = PlayState.RELAX
                    this.playAnima()
                }
            }).start();
    }
    /**
     * 攀爬动作--物理系统实现
     */
    crawlAction2 = () => {
        this.isT = true
        this.rig2D.linearVelocity = v2(0, 0)
        this.playState = PlayState.CRAWL1
        this.playAnima()
        this.rig2D.applyLinearImpulseToCenter(v2(0, this.rig2D.getMass() * 10), true)
    }
    protected onDestroy(): void {
        input.off(Input.EventType.KEY_DOWN, this.handDown, false);
        input.off(Input.EventType.KEY_PRESSING, this.handPress, false);
        this.collider2D.off(Contact2DType.BEGIN_CONTACT, this.beginContact, false)
        this.collider2D.off(Contact2DType.END_CONTACT, this.endContact, false)
    }
    /**
     * 按键按下
     * @param e 
     * @returns 
     */
    handDown = (e: EventKeyboard) => {
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
                joint.connectedBody = preNode.getComponent(RigidBody2D)
                joint.enabled = true;
                this.curJoinNode = preNode
                // 状态不切换，直接播放爬绳子的动画
                this.playAnima(AnimationType.CRAWL)
                return
            }
            // 拖
            if (this.playState === PlayState.DRAG) {
                // 移除手关节
                const R2 = this.node.getChildByName('R2')
                this.removeJoint(R2, 'hands')
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
                // this.animation.play(AnimationType.JUMP,1)
                this.scheduleOnce(() => {
                    this.rig2D.applyLinearImpulseToCenter(v2(this.node.scale.x * this.wakeV, this.jumpF), true)
                }, 0.25)
            }
            // 操作键
        } else if (e.keyCode === KeyCode.ALT_LEFT) {
            // 查询附近是否有可以连接的节点
            const _node = this.nearNodes.find(item => item.name === 'Ju')
            if (_node) {
                // 增加手关节，绑定地刺的前端把手
                this.joint(this.node.getChildByName('R2'), _node, 'hands', v2(-50, -5))
                this.playState = PlayState.DRAG
                this.playAnima()
            }
        }
    }
    /**
     * 长按
     * @param e 
     */
    handPress = (e: EventKeyboard) => {
        // 长按左右键，移动玩家
        if ([KeyCode.ARROW_LEFT, KeyCode.ARROW_RIGHT].includes(e.keyCode)) {
            this.move(e.keyCode)
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
     * 挂点碰撞
     * @param self 
     * @param other 
     * @param contact 
     */
    crawlBegin = (self: Collider2D, other: Collider2D, contact) => {
        if (other.node.name === 'Crawl' && !this.isT) {
            console.log('抓住')
            this.stopAnima(AnimationType.JUMP)
            this.isT = true
            this.collider2D.enabled = false
            this.rig2D.linearVelocity = v2(this.rig2D.linearVelocity.x, 0)
            this.playState = PlayState.CRAWL1
            this.playAnima()
            this.pointA = self.node.getWorldPosition()
            // 计算坐标差
            // const x = other.node.getWorldPosition().x - self.node.getWorldPosition().x
            // const y = other.node.getWorldPosition().y - self.node.getWorldPosition().y
            // this.armature.getBone('ik_left_hand').offset.x = 
            const joint = this.node.addComponent(RelativeJoint2D)
            joint.enabled = false
            joint.connectedBody = other.node.getComponent(RigidBody2D)
            joint.autoCalcOffset = false;
            joint.collideConnected = true
            joint.correctionFactor = 0.9
            joint.maxForce = 10000
            joint.maxTorque = 10000
            joint.linearOffset = v2(0,0)
            joint.anchor = v2(0, 0)
            joint.connectedAnchor = v2(0, -10)
            joint.enabled = true

        }
    }
    /**
     * 碰撞检测-开始
     * @param self 
     * @param other 
     */
    beginContact = (self: Collider2D, other: Collider2D, contact) => {
        // console.log(other.node.name)
        switch (other.node.name) {
            // 碰撞石头
            case 'Ston1':
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
                    this.isInHand = true;
                    // 角色R2节点没有绑定时、可以绑定
                    if (!self.node.getChildByName('R2').getComponents(Joint2D).find(item => item.name === 'hands')) {
                        this.nearNodes.push(other.node)
                    }
                    // 地刺
                } else if (other.tag === 1) {
                    this.isInHand = false
                    this.nearNodes = this.nearNodes.filter(item => item.name !== 'Ju')
                    // 受伤
                    console.log('手上')
                    this.playState = PlayState.HURT
                    this.playAnima()
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
        } else if (other.node.name === 'Ju') {
            eventTarget.off('pick')
            if (other.tag === 0) {
                this.isInHand = false
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
        const dist = Math.abs(selfX - targetX);
        // 两者之间的最小水平距离
        const minDist = (this.node.getComponent(BoxCollider2D).size.x + targrt.getComponent(CircleCollider2D).radius) / 2
        // 两节点在x轴的距离大于等于两节点的宽度，才执行 推
        if (dist >= minDist) {
            this.playState = PlayState.PUSH
            // this.playAnima()
            this.animation.play(AnimationType.PUSH, 1)
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
        joint.enabled = true;
        this.curJoinNode = target
    }
    /**
     * 移除关节
     * @param self 
     * @param jointName 
     */
    removeJoint = (self: Node, jointName: string) => {
        self.getComponents(Joint2D).find(item => item.name === jointName)?.destroy()
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
        switch (this.playState) {
            case PlayState.RELAX:
                this.animation.fadeIn(AnimationType.RELAX, 0.2, 0) // 循环执行
                break;
            case PlayState.WALK:
                temp = this.animation.fadeIn(AnimationType.WALK, 0, 1) // 执行一次
                temp.timeScale = 2
                break;
            case PlayState.DRAG:
                this.animation.fadeIn(AnimationType.DRAG, -1, 1)
                break;
            case PlayState.JUMP:
                temp = this.animation.play(AnimationType.JUMP, 1)
                temp.timeScale = 1.2
                break;
            case PlayState.CRAWL1:
                this.animation.fadeIn(AnimationType.CRAWL1, 0.2, 1)
                break;
            case PlayState.PULL:
                this.animation.fadeIn(AnimationType.PULL, -1, 1)
                break;
            case PlayState.CRAWL:
                this.animation.fadeIn(AnimationType.CRAWL, -1, 1)
                break;
            case PlayState.PUSH:
                temp = this.animation.fadeIn(AnimationType.PUSH, 0.1, 1)
                this.scheduleOnce(() => {
                    // 这里播放完成，在执行一遍动画，是因为推的过程中可能已经离开目标了，状态已经切换，就不能再维持推的动作
                    this.playAnima()
                }, temp.totalTime)
                break;
            case PlayState.HURT:
                temp = this.animation.fadeIn(AnimationType.HURT, -1, 1)
                temp.timeScale = 0.7
                break;
            default:
                break;
        }
    }
    /**
    * 停止动画
    * @param name 动画名称
    */
    stopAnima = (name: string = '') => {
        this.animation.stop(name)
    }

    update(deltaTime: number) {
        if (this.isT) {
            // this.rig2D.applyForceToCenter(v2(0, this.rig2D.getMass()), true)
            this.node.setWorldPosition(this.node.getChildByName('Body').getWorldPosition())
        }
    }
}


