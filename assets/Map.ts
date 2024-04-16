import { _decorator, BoxCollider2D, Component, director, EPhysics2DDrawFlags, find, PhysicsSystem2D, PolygonCollider2D, size, TiledMap, v2 } from 'cc';
const { ccclass, property } = _decorator;
PhysicsSystem2D.instance.debugDrawFlags = EPhysics2DDrawFlags.Joint
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
            _point.friction = 0.5
            _point.offset = v2(object.x, object.y)
            for (let i = 0; i < object.points.length; i++) {
                _point.points[i] = v2(object.points[i].x, object.points[i].y)
            }
        }
    }
}


