import { FixedJoint2D, Joint2D, Node, RigidBody2D, UITransform, Vec2, Vec3, tween, v2, v3 } from "cc"
import { RopeNode } from "../Scripts/Rope"
import BaseState from "./BaseState"
import { InputType, PlaterState } from "./interface"

// la状态
export default class CordState extends BaseState {
    state: PlaterState = PlaterState.cord
    // 当前连接的节点
    curJoinNode: RopeNode
    selfJointNode: Node
    /**
     * 进入状态
     * @param preState 
     */
    protected onStateEntry(preState: PlaterState): void {
        // 得到触发拉绳动作的上一个状态接触的节点
        this.relevancyNodes = this.fsm.stateList[preState].relevancyNodes
        if (this.relevancyNodes.length !== 0) {
            this.selfJointNode = this.node.getChildByName('JointNode')
            this.addJoint(this.selfJointNode, this.relevancyNodes[0], 'hands', v2(0, -8))
            this.animation.gotoAndStopByFrame('cord', 1)
        }
    }
    /**
     * 接收用户输入
     * @param data 
     */
    protected onAccept(data: { type?: InputType; nodes?: Node[]; }): void {
        switch (data.type) {
            case InputType.LEFT:
            case InputType.RIGHT:
                this.impulseX(data.type)
                break;
            case InputType.UP:
            case InputType.DOWN:
                this.fadeIn('cord', 0.1, 1)
                this.findNextNode(data.type)
                break;
            case InputType.JUMP:
                this.removeJoint()
                this.fsm.changeState(PlaterState.jump2)
                break;
            default:
                break;
        }
    }
    /**
     * 连接关节
     * @param self  自身节点 
     * @param target 目标节点
     * @param jointName 关节名称
     * @param tagetAnchor 目标节点锚点坐标
     */
    addJoint(self: Node, target: Node, jointName: string, tagetAnchor: Vec2 = v2(0, 0)) {
        // 自身节点上增加一个关节
        let joint: FixedJoint2D = self.addComponent(FixedJoint2D)
        joint.enabled = false;
        joint.name = jointName
        // 角色的关节连接到目标刚体上
        joint.connectedBody = target.getComponent(RigidBody2D);
        joint.connectedAnchor = tagetAnchor
        joint.anchor = v2(0, 0)
        joint.enabled = true;
        this.curJoinNode = target
        console.log('连接完成', joint)
    }
    findNextNode(code: InputType.UP | InputType.DOWN) {
        // 找到下一个关节
        const dir = code === InputType.UP ? -1 : 1;
        const curIndex = this.curJoinNode.no
        const preNode: RopeNode = this.curJoinNode.parent.children.find(item => item['no'] === (curIndex + dir))
        const joint = this.selfJointNode.getComponents(Joint2D).find(item => item.name === 'hands')
        joint.enabled = false;
        if (preNode) {
            const getTarget  = () => {
                const p1 = this.node.getComponent(UITransform).convertToWorldSpaceAR(preNode.getWorldPosition())
                const dis = p1.subtract(this.node.getWorldPosition())
                return this.node.getPosition().add(v3(dis.x-195,-dir*dis.y))
            }
            //开始缓动 TODO 需要实现实时朝向目标节点移动
            let t = getTarget()
            let den = this.collider2D.density
            tween(this.node.position).to(1.25 / 2, t, {
                onUpdate: (target: Vec3,r:number) => {
                    // const a = this.node.getPosition()
                    // t = getTarget()
                    this.node.position = target
                },
                onComplete: () => {
                    joint.connectedBody = preNode.getComponent(RigidBody2D)
                    joint.enabled = true;
                    this.curJoinNode = preNode
                    this.collider2D.density = den
                },
                onStart: () => {
                    this.collider2D.density = 0

                }
            }).start()
        } else {
            this.removeJoint()
        }
    }
    removeJoint() {
        this.curJoinNode = null
        const joint = this.selfJointNode.getComponents(FixedJoint2D).find(item => item.name === 'hands')
        if (joint) {
            joint.destroy()
            this.fsm.changeState(PlaterState.jump2)
        }
    }
}