import BaseState from "./BaseState";
import { PlaterState } from "./interface";

// 跳状态
export default class JumpState extends BaseState {
    state: PlaterState = PlaterState.jump
    /**
     * 动画完成
     */
    onAnimationEnd(): void {
        console.log('跳完成')
    }
}