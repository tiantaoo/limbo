import { Camera, ERigidBody2DType, UITransform, Vec3, director, tween, v2, v3 } from "cc"
import { PLayer } from "../Scripts/Player"
import BaseState from "./BaseState"
import { PlaterState } from "./interface"

// 爬状态
export default class CrawlState extends BaseState {
    state: PlaterState = PlaterState.crawl
    cameta:Camera
    protected onStateEntry(preState: PlaterState): void {
        director.emit('update_fov',{fov:40})
        this.fadeIn('crawl', 0.3, 1)
        this.cameta = this.node.parent.getChildByName('Camera').getComponent(Camera)
        console.log( this.cameta.node.position.y)
        setTimeout(() => {
            this.rig2D.linearVelocity = v2(0,0)
            this.rig2D.type = ERigidBody2DType.Static
        })
    }
    /**
     * 动画结束
     */
    onAnimationEnd(): void {
        this.toWait()
        const boneCenter = this.node.getComponent(PLayer).boneCenter
        // 计算该次动画位移的距离，将节点缓动到新位置
        const currentPos = this.node.getWorldPosition()
        const targetPos = this.node.getComponent(UITransform).convertToWorldSpaceAR(boneCenter.position)
        const dist = targetPos.subtract(currentPos)
        const newPos = this.node.getPosition().add(dist)
        // 缓动时间要与淡入到休息动画的时间相同，否则会闪烁
        tween(this.node.position).to(0.3, newPos, {
            onUpdate: (target: Vec3) => {
                this.node.position = v3(target.x, target.y)
            },
            onComplete: () => {
                setTimeout(() => {
                    this.rig2D.type = ERigidBody2DType.Dynamic
                })
            },
            onStart: () => {
            }
        }).start()
    }
    protected onStateExit(): void {
        director.emit('update_fov',{fov:64.25})
        console.log( this.cameta.node.position.y)
    }
}