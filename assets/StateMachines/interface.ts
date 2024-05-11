import { KeyCode } from "cc"
import CordState from "./CordState"
import CrawlState from "./CrawlState"
import DragState from "./DragState"
import Jump2State from "./Jump2State"
import JumpState from "./JumpState"
import PushState from "./PushState"
import waitState from "./WaitState"
import walkState from "./WalkState"

// 角色状态
export enum PlaterState{
    init = -1, // 伪状态
    wait = 0,  // 放松
    walk,  // 走
    jump,  // 跳
    jump2,  // 跳
    crawl, // 爬
    drag, // 拖
    push, //
    cord, // 拉 

    hurt,
    
}
// 状态类数组
export const stateClassList = [
    waitState,
    walkState,
    JumpState,
    Jump2State,
    CrawlState,
    DragState,
    PushState,
    CordState,
]
// 状态对应动画
export const stateToAnimation = {
    [PlaterState.wait]:'wait',
    [PlaterState.walk]:'walk',
    [PlaterState.jump]:'jump1',
    [PlaterState.jump2]:'jump2',
    [PlaterState.crawl]:'crawl',
    [PlaterState.drag]:'drag',
    [PlaterState.push]:'push',
    [PlaterState.cord]:'cord',
}

// 输入事件
export enum InputType {
    LEFT = KeyCode.ARROW_LEFT, // 左
    RIGHT = KeyCode.ARROW_RIGHT,// 右
    UP = KeyCode.ARROW_UP,// 上
    DOWN = KeyCode.ARROW_DOWN,// 下
    JUMP = KeyCode.CTRL_LEFT,// 左CTRL
    TOUCH = KeyCode.ALT_LEFT,// 左ALT

    CRAWL = 0, // 爬
    PUSH = 1,
    DRAG = 2,
    CORD = 3,
    NO_OPT = -1,// 无操作
    END = -99,// 动画结束
}
// 状态机输出
export enum OutputType{
    // 动画开始
    ANIMATION_IN,
    // 动画完成
    ANIMATION_COMPLETE,
    //
    ANIMATION_FADEIN_COMPLETE,
    ANIMATION_FADEOUT_IN
}
export interface OutputFn{
    (state:PlaterState):void
}
// 过渡条件行为树
//  当前状态：行为：[下一个状态，淡入时间，播放次数]
export const transferMap = {
    [PlaterState.init]:{
        [InputType.END]:[PlaterState.wait,0,0],
    },
    [PlaterState.wait]:{
        [InputType.LEFT]:[PlaterState.walk,0.3,1],
        [InputType.RIGHT]:[PlaterState.walk,0.3,1],
        [InputType.JUMP]:[PlaterState.jump,0.3,1],
        [InputType.TOUCH]:[PlaterState.drag,0.5,1],
        [InputType.PUSH]:[PlaterState.push,0.3,1],
        [InputType.END]:[PlaterState.wait,0,0],
    },
    [PlaterState.walk]:{
        [InputType.LEFT]:[PlaterState.walk,0,1],
        [InputType.RIGHT]:[PlaterState.walk,0,1],
        [InputType.JUMP]:[PlaterState.jump,0.3,1],
        [InputType.NO_OPT]:[PlaterState.wait,0.3,1],
        [InputType.PUSH]:[PlaterState.push,0.3,1],
        [InputType.END]:[PlaterState.walk,0,1],
    },
    [PlaterState.jump]:{
        [InputType.CRAWL]:[PlaterState.crawl,0.3,1],
        [InputType.CORD]:[PlaterState.cord,0.3,1],
        [InputType.END]:[PlaterState.wait,0.3,0],
    },
    [PlaterState.jump2]:{
        [InputType.CRAWL]:[PlaterState.crawl,0.3,1],
        [InputType.END]:[PlaterState.wait,0.3,0],
    },
    [PlaterState.crawl]:{
        [InputType.END]:[PlaterState.wait,0.3,0],
    },
    [PlaterState.drag]:{
        [InputType.LEFT]:[PlaterState.drag,0,0],
        [InputType.RIGHT]:[PlaterState.drag,0,0],
        [InputType.UP]:[PlaterState.wait,0.3,0],
        // [InputType.NO_OPT]:[PlaterState.drag,0,1],
    },
    [PlaterState.push]:{
        [InputType.END]:[PlaterState.wait,0.3,0],
        [InputType.NO_OPT]:[PlaterState.wait,0.3,0],
    },
    [PlaterState.cord]:{
        [InputType.UP]:[PlaterState.cord,0,1],
        [InputType.DOWN]:[PlaterState.cord,0,1],
        [InputType.JUMP]:[PlaterState.jump2,0.2,1],
        // [InputType.END]:[PlaterState.jump,0.2,1],
    },
}

