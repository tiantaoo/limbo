import { dragonBones, EventTarget, Node } from "cc"
import BaseState from "./BaseState"
import { InputType, OutputFn, OutputType, PlaterState, stateClassList, transferMap } from "./interface"

export default class FSMManger {
    // 状态集合
    stateList: BaseState[] = []
    // 当前状态id
    currentStateId: number = -1
    // 动画组件
    armatureDisplay: dragonBones.ArmatureDisplay
    // 节点对象
    node: Node
    private eventList = {}

    // 事件
    eventTarget: EventTarget
    constructor(node: Node) {
        this.node = node;
        this.armatureDisplay = this.node.getComponent(dragonBones.ArmatureDisplay)
        stateClassList.forEach((item, index) => {
            this.stateList.push(new stateClassList[index](this.armatureDisplay))
        })
        this.init()
    }
    private init(){
        this.armatureDisplay.on(dragonBones.EventObject.FADE_IN,this.animationStatr,this)
        this.armatureDisplay.on(dragonBones.EventObject.COMPLETE,this.animationEnd,this)
        this.armatureDisplay.on(dragonBones.EventObject.FADE_IN_COMPLETE,this.animationFadeInComplete,this)
        this.armatureDisplay.on(dragonBones.EventObject.FADE_OUT,this.animationFadeOutStart,this)
    }
    // 监听输入
    onInput(type: InputType) {
        // 如果存在可响应操作
        const transferObj = transferMap[this.currentStateId][type]
        if (transferObj) {
            // 转移到下一个状态
            this.changeState(transferObj[0],type)
        }
    }
    // 修改状态
    changeState(nextState: PlaterState,type: InputType) {
        if(this.currentStateId === nextState){
            return this.stateList[this.currentStateId].play(this.currentStateId,InputType.END)
        }
        // 当前状态退出
        if (this.stateList[this.currentStateId]) {
            this.stateList[this.currentStateId].onStateExit()
        }
        // 进入下一个状态
        this.stateList[nextState].onStateEntry(this.currentStateId,type)
        console.log(`状态：${this.currentStateId}=>${nextState}`)
        // 更新状态机当前状态
        this.currentStateId = nextState
    }
    animationStatr(){
        // 调用子状态钩子
        this.stateList[this.currentStateId].onAnimationStatr()
        // 通知角色更新
        this.trigger(OutputType.ANIMATION_IN,this.currentStateId)
    }
    animationEnd(){
        // 调用子状态钩子
        this.stateList[this.currentStateId].onAnimationEnd()
        // 通知角色更新
        this.trigger(OutputType.ANIMATION_COMPLETE,this.currentStateId)
        // 根据过度行为树，选择下一个状态
        const transferObj = transferMap[this.currentStateId][InputType.END]
        if (transferObj) {
            // 转移到下一个状态
            this.changeState(transferObj[0],InputType.END)
        }
    }
    animationFadeInComplete(){
        // 调用子状态钩子
        this.stateList[this.currentStateId].onAnimationFadeInComplete()
        // 通知角色更新
        this.trigger(OutputType.ANIMATION_FADEIN_COMPLETE,this.currentStateId)
    }
    animationFadeOutStart(){
        // 通知角色更新
        this.trigger(OutputType.ANIMATION_FADEOUT_IN,this.currentStateId)
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