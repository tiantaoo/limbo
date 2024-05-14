import { BoxCollider2D, DistanceJoint2D, Node, RigidBody2D, v2 } from "cc"
import BaseState from "./BaseState"
import { InputType, PlaterState } from "./interface"

// 拖状态
export default class DragState extends BaseState {
    state: PlaterState = PlaterState.drag
    private jointJu:Node
    protected onStateEntry(preState: PlaterState): void {
        this.fadeIn('drag', 0.3, 1)
    }
    protected onAccept(data: { type?: InputType; nodes?: Node[]; }): void {
        switch (data.type) {
            case InputType.LEFT:
            case InputType.RIGHT:
                this.play('drag', 1)
                this.moveX(data.type)
                break;
            case InputType.UP:
                this.fsm.changeState(PlaterState.wait)
                break;

            default:
                break;
        }
    }
    public onAnimationFadeInComplete(): void {
        const _node = this.nearNodes.find(item => item.name === 'Ju')
        // 得到扑兽夹的一半宽度，手要刚好接触到这一端点
        const _box = _node.getComponents(BoxCollider2D).find(item => item.tag === 1)
        const isPlayerToNode: boolean = this.node.worldPosition.x < _node.worldPosition.x
        const dir = isPlayerToNode ? -1 : 1
        // 添加关节，将主角和捕兽夹绑定
        this.jointJu = this.playerCtrl.socketNodes[0]
        const joint1 = this.jointJu.getComponent(DistanceJoint2D)
        const joint = joint1 ? joint1 : this.jointJu.addComponent(DistanceJoint2D)
        joint.enabled = false
        joint.connectedBody = _node.getComponent(RigidBody2D)
        joint.collideConnected = true
        joint.anchor = v2(0, 0)
        joint.connectedAnchor = v2(dir * (_box.size.width / 2 + 5), -10)
        joint.maxLength = 1
        joint.autoCalcDistance = false
        joint.enabled = true
        this.rig2D.linearVelocity = v2(dir * 4, 0)
    }
    public onStateExit(): void {
        this.jointJu.getComponent(DistanceJoint2D)?.destroy()
    }


}