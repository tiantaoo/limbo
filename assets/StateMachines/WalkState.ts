import { Node } from "cc"
import BaseState from "./BaseState"
import { InputType, PlaterState } from "./interface"

// 行走状态
export default class walkState extends BaseState {
    state: PlaterState = PlaterState.walk
    timeScale = 2.5
    protected onStateEntry(preState: PlaterState): void {
        if ([PlaterState.walk].includes(preState)) {
            const t = this.play('run1', 1)
            t && (t.timeScale = this.timeScale)
        } else {
            const t  = this.fadeIn('run1', 0.2, 1)
            t && (t.timeScale = this.timeScale)
        }
        this.node.on('player_map',this.addDust)
    }
    protected onAccept(data: { type?: InputType; nodes?: Node[]; }): void {
        switch (data.type) {
            case InputType.LEFT:
            case InputType.RIGHT:
                this.turnAround(data.type)
                const t  = this.play('run1', 1)
                t && (t.timeScale = this.timeScale)
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
            case InputType.KEY_UP:
                this.toWait()
                break;
            case InputType.EXIT:
                this.toWait()
                break;
            default:
                break;
        }
    }
    public onAnimationEnd(): void {
        this.node.off('player_map',this.addDust)
    }
    private addDust(){

    }

}