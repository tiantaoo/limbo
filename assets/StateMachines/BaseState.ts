import { dragonBones } from "cc"
import { InputType, PlaterState, stateToAnimation, transferMap } from "./interface"

export default class BaseState{
    readonly animation: dragonBones.Animation
    state: PlaterState
    // 动画组件
    armatureDisplay: dragonBones.ArmatureDisplay
    
    constructor(armatureDisplay: dragonBones.ArmatureDisplay) {
        this.armatureDisplay = armatureDisplay
        this.animation = this.armatureDisplay.armature().animation
    }
    /**
     * 状态退出
     */
    public onStateExit() { }
    /**
     * 动画开始-调用
     */
    public onAnimationStatr(){}
    /**
     * 动画结束-调用
     */
    public onAnimationEnd(){}
    /**
     * 动画淡入结束-调用
     */
    public onAnimationFadeInComplete(){}
    /**
     * 进入状态
     */
    public onStateEntry(from: PlaterState,inputType:InputType): void {
        this.play(from,inputType)
    }
    /**
     * 开始播放
     */
    protected play(from: PlaterState,inputType:InputType) {
        const [,fadeInTimes,playTimes] = transferMap[from][inputType]||[]
        this.animation.fadeIn(stateToAnimation[this.state], fadeInTimes, playTimes)
    }
}