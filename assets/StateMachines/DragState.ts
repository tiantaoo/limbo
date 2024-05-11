import BaseState from "./BaseState"
import { PlaterState } from "./interface"

// 拖状态
export default class DragState extends BaseState {
    state: PlaterState = PlaterState.drag
    onAnimationEnd(): void {
        console.log('动画结束')
    }
    onAnimationStatr(): void {
        console.log('动画开始')
    }
    
}