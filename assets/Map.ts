import { _decorator, BoxCollider2D, Collider2D, Component, director, EPhysics2DDrawFlags, find, PhysicsSystem2D, PolygonCollider2D, RigidBody2D, size, TiledMap, v2 } from 'cc';
const { ccclass, property } = _decorator;
PhysicsSystem2D.instance.debugDrawFlags = EPhysics2DDrawFlags.Shape

@ccclass('Map')
export class Map extends Component {
    onLoad() {
        // 地图
        const tiledMap = director.getScene().getChildByPath('Canvas/TiledMap').getComponent(TiledMap)
        // 初始化地图上的所有地形
        tiledMap.getObjectGroups().forEach(item => item.getObjects().forEach(item2 => this.initFloorCollider(item2)))
    }
    
    /**
     * 初始化地形
     * @param object 
     */
    initFloorCollider(object: any) {
        const collParent = find('Canvas/Colliders');
        if (object.type === 0) { // 矩形
            const _box2d = collParent.addComponent(BoxCollider2D)
            _box2d.group = 1 << 2;
            _box2d.size = size(object.width, object.height)
            const offsetX = object.offset.x + object.width / 2
            _box2d.offset = v2(offsetX, object.offset.y - object.height / 2)
        } else if (object.type === 2) { // 多边形
            const _point = collParent.addComponent(PolygonCollider2D)
            _point.group = 1 << 2;
            _point.friction = 0.9
            _point.offset = v2(object.x, object.y)
            for (let i = 0; i < object.points.length; i++) {
                _point.points[i] = v2(object.points[i].x, object.points[i].y)
            }
            _point.name = object.name
            if (object.name === 'water') {
                _point.sensor = true
                _point.density = 1
            }
        }
    }
    // 监听碰撞水
    waterBeginContact = (self: PolygonCollider2D, other: Collider2D, contact) => {
        const otherRig = other.node.getComponent(RigidBody2D)
        contact.disabled = true
        console.log(`${other.name}进入`)
    }
    waterEndContact = (self: PolygonCollider2D, other: Collider2D, contact) => {
        const otherRig = other.node.getComponent(RigidBody2D)
        otherRig.gravityScale = 1
        console.log(`${other.name}离开`)
    }
    switchDraw(e, str: EPhysics2DDrawFlags) {
        PhysicsSystem2D.instance.debugDrawFlags = Number(str)
    }
      
}


