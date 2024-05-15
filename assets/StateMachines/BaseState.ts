import { BoxCollider2D, dragonBones, Node, RigidBody2D, v2 } from "cc"
import { PLayer } from "../Scripts/Player"
import FSMManger from "./FSMManger"
import { InputType, PlaterState } from "./interface"
/**
 * 角色状态基类
 */
export default class BaseState {
    // 动画播放器
    readonly animation: dragonBones.Animation
    state: PlaterState
    // 动画组件
    armatureDisplay: dragonBones.ArmatureDisplay
    // 绑定节点
    node: Node
    // 互动节点
    relevancyNodes: Node[]
    // 上一个状态
    preState: PlaterState
    // 触发条件
    inputType: InputType
    fsm: FSMManger
    playerCtrl: PLayer

    constructor(node: Node, fsm: FSMManger) {
        this.node = node;
        this.armatureDisplay = this.node.getComponent(dragonBones.ArmatureDisplay)
        this.animation = this.armatureDisplay.armature().animation
        this.fsm = fsm
        this.playerCtrl = this.node.getComponent(PLayer)
    }
    get nearNodes() {
        return this.playerCtrl.nearNodes
    }
    get collider2D() {
        return this.node.getComponent(BoxCollider2D)
    }
    get rig2D() {
        return this.node.getComponent(RigidBody2D)
    }
    public accept(data: { type?: InputType, nodes?: Node[] }) {
        this.relevancyNodes = data.nodes || [];
        this.inputType = data.type;
        this.onAccept(data)
    }
    protected onAccept(data: { type?: InputType, nodes?: Node[] }) {}

    /**
     * 进入状态
     */
    public stateEntry(preState: PlaterState): void {
        this.preState = preState;
        console.log(`状态：${preState}=>${this.state}`)
        this.onStateEntry(preState)
    }
    protected onStateEntry(preState: PlaterState) { }
    /**
     * 状态退出
     */
    public stateExit() {
        this.onStateExit()
    }
    protected onStateExit() {}
    /**
     * 动画开始-调用
     */
    public onAnimationStatr() { }
    /**
     * 动画结束-调用
     */
    public onAnimationEnd() { }
    /**
     * 动画淡入结束-调用
     */
    public onAnimationFadeInComplete() { }

    /**
     * 开始播放
     */
    play(name: string, playTimes: number):dragonBones.AnimationState|null {
        if (this.animation.isPlaying && this.fsm.currentState === this.state) return
        return this.animation.play(name, playTimes)
    }
    fadeIn(name: string, fadeInTimes: number, playTimes: number):dragonBones.AnimationState|null {
        if (this.animation.isPlaying && this.fsm.currentState === this.state) return null
        return this.animation.fadeIn(name, fadeInTimes, playTimes)
    }
    // 转移到wait
    protected toWait() {
        this.fsm.changeState(PlaterState.wait)
    }
    // 找到附近的锯齿，找到就连接
    protected findJuNodeAndJoint() {
        // 查询附近是否有可以连接的节点
        if (this.nearNodes.length !== 0) {
            console.log('附近有可触碰对象')
            // 查找附近是否存在捕兽夹
            const _node = this.nearNodes.find(item => item.name === 'Ju')
            if (_node) {
                console.log('附近有地刺')
                const isPlayerToNode: boolean = this.node.worldPosition.x < _node.worldPosition.x
                const dir = isPlayerToNode ? -1 : 1
                // 方向是:人->捕兽夹
                if (isPlayerToNode && this.node.scale.x < 0) {
                    // 人朝左，需要转向
                    this.node.setScale(this.playerCtrl.scale, this.node.scale.y, 1)
                } else if (!isPlayerToNode && this.node.scale.x > 0) {
                    // 人朝右，需要转向
                    this.node.setScale(dir * this.playerCtrl.scale, this.node.scale.y, 1)
                }
                this.collider2D.apply()
                // 切换拖
                this.fsm.changeState(PlaterState.drag)
            }

        }
    }
    /**
     * 水平移动
     * @param type 
     */
    protected moveX(type: InputType,flag?:1|-1) {
        // 横向力，方向*力
        const dir = flag ? flag : type === InputType.LEFT ? -1 : type === InputType.RIGHT ? 1 : 0
        let XF: number = dir * this.playerCtrl.wakeV;
        this.rig2D.linearVelocity = v2(XF, this.rig2D.linearVelocity.y)
    }
    /**
     * 垂直移动
     */
    protected moveY() {
        // 横向力，方向*力
        setTimeout(() => {
            this.rig2D.applyLinearImpulseToCenter(v2(0, this.playerCtrl.jumpF), true)
        }, 420)
    }
    /**
     * 转身
     */
    protected turnAround(type: InputType.LEFT | InputType.RIGHT) {
        if ((type === InputType.LEFT && this.node.scale.x < 0) ||
            (type === InputType.RIGHT && this.node.scale.x > 0)) {
            return
        }
        const dir = type === InputType.LEFT ? -1 : 1
        this.node.setScale(dir * this.playerCtrl.scale, this.node.scale.y, 1)
        this.collider2D.apply()
    }
    /**
     * 水平冲量
     * @param type 
     */
    protected impulseX(type: InputType) {
        // 横向力，方向*力
        const dir = type === InputType.LEFT ? -1 : type === InputType.RIGHT ? 1 : 0
        let XF: number = dir * 10;
        this.rig2D.applyLinearImpulseToCenter(v2(XF, 0),true)
    }
}