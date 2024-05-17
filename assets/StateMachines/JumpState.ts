import { Node, ParticleSystem2D, v2 } from "cc";
import BaseState from "./BaseState";
import { InputType, PlaterState } from "./interface";

// 跳状态
export default class JumpState extends BaseState {
    state: PlaterState = PlaterState.jump
    protected onStateEntry(preState: PlaterState): void {
        if ([PlaterState.wait, PlaterState.walk].includes(preState)) {
            this.moveY()
            const jump = this.fadeIn('jump1', 0.3, 1)
            if(jump){
                jump.timeScale = 1.3
            }
        }
        this.node.once('player_floor',this.onFloor,this)
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
        console.log('退出跳')
    }
    private onFloor(){
        console.log('粒子')
        this.ppp.getComponent(ParticleSystem2D).resetSystem()
    }
}