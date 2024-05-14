import { Node } from "cc";
import BaseState from "./BaseState";
import { InputType, PlaterState } from "./interface";

// 跳状态
export default class Jump2State extends BaseState {
    state: PlaterState = PlaterState.jump2
    protected onStateEntry(preState: PlaterState): void {
        this.fadeIn('jump2',0.1,1)
    }
    protected onAccept(data: { type?: InputType; nodes?: Node[]; }): void {
        switch (data.type) {
            case InputType.LEFT:
            case InputType.RIGHT:
                this.turnAround(data.type)
                this.moveX(data.type)
                break;
            case InputType.CRAWL:
                this.fsm.changeState(PlaterState.crawl)
                break;
            default:
                break;
        }
    }
    public onAnimationEnd(): void {
        this.toWait()
    }
}