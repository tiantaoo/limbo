import BaseState from "./BaseState"
import { PlaterState } from "./interface"

// 行走状态
export default class walkState extends BaseState {
    state: PlaterState = PlaterState.walk
    onAnimationEnd(): void {
    }
}