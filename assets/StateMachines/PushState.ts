import { Node } from "cc"
import BaseState from "./BaseState"
import { InputType, PlaterState } from "./interface"

// 推状态
export default class PushState extends BaseState {
    state: PlaterState = PlaterState.push
    tempFlag:boolean = false
    protected onStateEntry(preState: PlaterState): void {
        this.fadeIn('push', 0.1, 1)
    }
    protected onAccept(data: { type?: InputType; nodes?: Node[]; }): void {
        switch (data.type) {
            case InputType.LEFT:
            case InputType.RIGHT:
                this.moveX(data.type)
                this.fadeIn('push', 0.1, 1)
                break;
            case InputType.EXIT:
                this.tempFlag = true
                this.leave()
                break;
            case InputType.PUSH:
                this.fadeIn('push', 0.1, 1)
                this.tempFlag = false
                break;
            default:
                break;
        }
    }
    private leave() {
        this.fadeIn('wait', 0.3, 0)
        setTimeout(() => {
            if(this.tempFlag){
                this.toWait()
            }
        },500)
    }
}