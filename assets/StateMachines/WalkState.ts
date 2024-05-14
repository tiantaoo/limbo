import { BoxCollider2D, Node } from "cc"
import { PLayer } from "../Scripts/Player"
import BaseState from "./BaseState"
import { InputType, PlaterState } from "./interface"

// 行走状态
export default class walkState extends BaseState {
    state: PlaterState = PlaterState.walk
    protected onStateEntry(preState: PlaterState): void {
        if ([PlaterState.walk].includes(preState)) {
            this.play('walk', 0)
        } else {
            this.fadeIn('walk', 0.3, 1)
        }
    }
    protected onAccept(data: { type?: InputType; nodes?: Node[]; }): void {
        const scale = this.node.getComponent(PLayer).scale
        const collider2D = this.node.getComponent(BoxCollider2D)
        switch (data.type) {
            case InputType.LEFT:
            case InputType.RIGHT:
                this.turnAround(data.type)
                this.play('walk', 0)
                this.moveX(data.type)
                break;
            case InputType.PUSH:
                this.fsm.changeState(PlaterState.push)
                break;
            case InputType.JUMP:
                this.fsm.changeState(PlaterState.jump)
                break;
            case InputType.TOUCH:
                this.findJuNodeAndJoint()
                break;
            case InputType.EXIT:
                this.toWait()
                break;
            default:
                break;
        }
    }
    public onAnimationEnd(): void {
        this.toWait()
    }

}