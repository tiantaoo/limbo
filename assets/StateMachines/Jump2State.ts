import BaseState from "./BaseState";
import { PlaterState } from "./interface";

// 跳状态
export default class Jump2State extends BaseState {
    state: PlaterState = PlaterState.jump2
    /**
     * 动画完成
     */
    onAnimationEnd(): void {
    }
}