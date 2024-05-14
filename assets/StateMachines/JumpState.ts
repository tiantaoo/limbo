import { Node, v2 } from "cc";
import BaseState from "./BaseState";
import { InputType, PlaterState } from "./interface";

// 跳状态
export default class JumpState extends BaseState {
    state: PlaterState = PlaterState.jump
    protected onStateEntry(preState: PlaterState): void {
        if ([PlaterState.wait, PlaterState.walk].includes(preState)) {
            this.fadeIn('jump1', 0.3, 1)
            this.moveY()
        }
    }
    protected onAccept(data: { type?: InputType; nodes?: Node[]; }): void {
        switch (data.type) {
            case InputType.LEFT:
            case InputType.RIGHT:
                this.turnAround(data.type)
                this.moveX(data.type)
                break;
            case InputType.CRAWL:
                this.rig2D.linearVelocity = v2()
                this.fsm.changeState(PlaterState.crawl)
                break;
            case InputType.CORD:
                this.fsm.changeState(PlaterState.cord)
                break;
            default:
                break;
        }
    }
    public onAnimationEnd(): void {
        this.toWait()
    }
    public onStateExit(): void {
        this.rig2D.enabled = true
    }
}