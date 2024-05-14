import { BoxCollider2D, Node } from "cc"
import { PLayer } from "../Scripts/Player"
import BaseState from "./BaseState"
import { InputType, PlaterState } from "./interface"

// 等待状态
export default class waitState extends BaseState {
    state: PlaterState = PlaterState.wait
    protected onStateEntry(preState: PlaterState): void {
        if ([PlaterState.wait, PlaterState.init].includes(preState)) {
            this.play('wait', 0)
        } else {
            this.fadeIn('wait', 0.3, 0)
        }
    }
    protected onAccept(data: { type?: InputType; nodes?: Node[]; }): void {
        const scale = this.node.getComponent(PLayer).scale
        const collider2D = this.node.getComponent(BoxCollider2D)
        switch (data.type) {
            case InputType.LEFT:
            case InputType.RIGHT:
                this.turnAround(data.type)
                this.moveX(data.type)
                this.fsm.changeState(PlaterState.walk)
                break;
            case InputType.JUMP:
                this.fsm.changeState(PlaterState.jump)
                break;
            case InputType.PUSH:
                this.fsm.changeState(PlaterState.push)
                break;
            case InputType.TOUCH:
                this.findJuNodeAndJoint()
                break;
            default:
                break;
        }
    }

}