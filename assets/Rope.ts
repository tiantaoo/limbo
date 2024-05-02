import { _decorator, CCFloat, Component, DistanceJoint2D, HingeJoint2D, instantiate, Node, Prefab, RigidBody2D, UITransform, v2 } from 'cc';
const { ccclass, property } = _decorator;
export interface RopeNode extends Node {
    no?:number
}

@ccclass('Rope')
export class Rope extends Component {
    @property({type:CCFloat,tooltip:'节点个数'})
    ropeCount = 10

    @property({type:Prefab,tooltip:'节点预制体'})
    ropePrefab:Prefab

    pointA:Node

    start() {

        this.createRope()
    }

    createRope = () => {
        const ropeArr = []
        const pos = this.node.getPosition()
        for (let i = 0; i < this.ropeCount; i++) {
            const ropeNode:RopeNode = instantiate(this.ropePrefab)
            const size = ropeNode.getComponent(UITransform).contentSize
            ropeNode.setPosition(pos.x+i,pos.y-(size.height*i))
            ropeNode.no = i
            ropeArr.push(ropeNode)
            const joint = ropeNode.getComponent(HingeJoint2D)||ropeNode.getComponent(DistanceJoint2D)
            if(i === 0){
                joint.connectedBody = this.node.getComponent(RigidBody2D)
                joint.connectedAnchor = v2(0,0)
            }else{
                joint.connectedBody = ropeArr[i-1].getComponent(RigidBody2D)
            }
            if(i === this.ropeCount-1){
                ropeNode.getComponent(RigidBody2D).gravityScale = 20
            }
            this.node.parent.addChild(ropeNode)
        }
        // this.pointA = this.node.getChildByName('Rope')
        // console.log(this.node.getChildByName('Rope').getWorldPosition(),
        // this.node.getPosition())
    }

    update(deltaTime: number) {
        // console.log(this.pointA.getWorldPosition().subtract(this.node.getPosition()).length())
        // if(this.pointA.getWorldPosition().subtract(this.node.getPosition()).length()>10){
        //     this.pointA.setWorldPosition(v3(this.pointA.getWorldPosition().x,this.node.getPosition().y+10))
        // }
    }
}


