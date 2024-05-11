import BaseState from "./BaseState"
import { PlaterState } from "./interface"

// 等待状态
export default class waitState extends BaseState {
    state: PlaterState = PlaterState.wait
    onAnimationEnd(): void {
    }
    
}