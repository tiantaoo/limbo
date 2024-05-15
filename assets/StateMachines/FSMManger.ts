import { dragonBones, Node } from "cc"
import BaseState from "./BaseState"
import { InputType, OutputFn, OutputType, PlaterState, stateClassList } from "./interface"

export default class FSMManger {
    // 状态集合
    stateList: BaseState[] = []
    // 当前状态
    currentState: number = -1
    // 动画组件
    armatureDisplay: dragonBones.ArmatureDisplay
    // 节点对象
    node: Node
    private eventList = {}

    constructor(node: Node) {
        this.node = node;
        this.armatureDisplay = this.node.getComponent(dragonBones.ArmatureDisplay)
        this.init()
        stateClassList.forEach((item, index) => {
            this.stateList.push(new stateClassList[index](node,this))
        })
    }
    private init(){
        this.armatureDisplay.on(dragonBones.EventObject.FADE_IN,this.animationStatr,this)
        this.armatureDisplay.on(dragonBones.EventObject.COMPLETE,this.animationEnd,this)
        this.armatureDisplay.on(dragonBones.EventObject.FADE_IN_COMPLETE,this.animationFadeInComplete,this)
        this.armatureDisplay.on(dragonBones.EventObject.FADE_OUT,this.animationFadeOutStart,this)
    }
    private destroy(){
        this.armatureDisplay.off(dragonBones.EventObject.FADE_IN,this.animationStatr,this)
        this.armatureDisplay.off(dragonBones.EventObject.COMPLETE,this.animationEnd,this)
        this.armatureDisplay.off(dragonBones.EventObject.FADE_IN_COMPLETE,this.animationFadeInComplete,this)
        this.armatureDisplay.off(dragonBones.EventObject.FADE_OUT,this.animationFadeOutStart,this)
    }
    // 监听输入
    onInput(type: InputType,nodes:Node[]) {
        // 游戏结束事件，取消动画监听，停止正在播放的动画
        if(type === InputType.GAME_OVER){
            this.destroy()
            this.armatureDisplay.armature().animation.stop()
            this.currentState = PlaterState.hurt
            return
        }
        // 当前状态接收输入事件
        this.stateList[this.currentState].accept({
            type,
            nodes
        })
    }
    // 进入某个状态
    entry(state:PlaterState){
        this.currentState = state
        this.stateList[state].stateEntry(state)
    }
    // 修改状态
    changeState(nextState: PlaterState) {
        // 进入下一个状态
        this.stateList[nextState].stateEntry(this.currentState)
        this.stateList[this.currentState].stateExit()
        // 更新状态机当前状态
        this.currentState = nextState
    }
    animationStatr(){
        // 调用子状态钩子
        this.stateList[this.currentState].onAnimationStatr()
        // 通知角色更新
        this.trigger(OutputType.ANIMATION_IN,this.currentState)
    }
    animationEnd(){
        // 调用子状态钩子
        this.stateList[this.currentState].onAnimationEnd()
        // 通知角色更新
        this.trigger(OutputType.ANIMATION_COMPLETE,this.currentState)
    }
    animationFadeInComplete(){
        // 调用子状态钩子
        this.stateList[this.currentState].onAnimationFadeInComplete()
        // 通知角色更新
        this.trigger(OutputType.ANIMATION_FADEIN_COMPLETE,this.currentState)
    }
    animationFadeOutStart(){
        // 通知角色更新
        this.trigger(OutputType.ANIMATION_FADEOUT_IN,this.currentState)
    }
    on(eventType: OutputType, fn?: OutputFn) {
        let fns = (this.eventList[eventType] = this.eventList[eventType] || []);
        if (fns.indexOf(fn) === -1) {
            fns.push(fn);
        }
        return this;
    }
    // 触发
    trigger(eventType: OutputType, state:PlaterState) {
        let fns = this.eventList[eventType];
        if (Array.isArray(fns)) {
            fns.forEach((fn) => {
                fn(state);
            });
        }
        return this;
    }
}