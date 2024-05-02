import { _decorator, Component, Contact2DType, EPhysics2DDrawFlags, PhysicsSystem2D, PolygonCollider2D, RigidBody2D, v2, v3, Vec2, Vec3 } from 'cc';
const { ccclass, property } = _decorator;
PhysicsSystem2D.instance.debugDrawFlags = EPhysics2DDrawFlags.Shape
function inside(cp1, cp2, p) {
    return (cp2.x - cp1.x) * (p.y - cp1.y) > (cp2.y - cp1.y) * (p.x - cp1.x);
}

function intersection(cp1, cp2, s, e) {
    let dc = v2(cp1.x - cp2.x, cp1.y - cp2.y);
    let dp = v2(s.x - e.x, s.y - e.y);
    let n1 = cp1.x * cp2.y - cp1.y * cp2.x;
    let n2 = s.x * e.y - s.y * e.x;
    let n3 = (dc.x * dp.y - dc.y * dp.x);
    return v2((n1 * dp.x - n2 * dc.x) / n3, (n1 * dp.y - n2 * dc.y) / n3);
}
// 计算面积和中心点
function computeAC(vs:Vec2[]):[number,Vec2] {
    let count = vs.length;
    var c = v2(0, 0);
    var area = 0.0;
    var p1X = 0.0;
    var p1Y = 0.0;
    var inv3 = 1.0 / 3.0;
    for (var i = 0; i < count; ++i) {
        var p2 = vs[i];
        var p3 = i + 1 < count ? vs[i + 1] : vs[0];
        var e1X = p2.x - p1X;
        var e1Y = p2.y - p1Y;
        var e2X = p3.x - p1X;
        var e2Y = p3.y - p1Y;
        var D = (e1X * e2Y - e1Y * e2X);
        var triangleArea = 0.5 * D; area += triangleArea;
        c.x += triangleArea * inv3 * (p1X + p2.x + p3.x);
        c.y += triangleArea * inv3 * (p1Y + p2.y + p3.y);
    }


    return [area, c];
}
@ccclass('Fluid')
export class Fluid extends Component {
    inFluid: [RigidBody2D]
    fluidBody: RigidBody2D
    fluidCollider: PolygonCollider2D
    density = 4
    angularDrag = 1
    linearDrag = 1
    gravity:Vec3 = v3(0,10,0)
    onLoad() {
        this.fluidBody = this.node.getComponent(RigidBody2D)
        this.fluidCollider = this.node.getComponent(PolygonCollider2D)
        this.fluidCollider.on(Contact2DType.BEGIN_CONTACT, this.waterBeginContact, this)
        this.fluidCollider.on(Contact2DType.END_CONTACT, this.waterEndContact, this)
    }
    // 监听碰撞水
    waterBeginContact = (self: PolygonCollider2D, other: PolygonCollider2D, contact) => {
        const otherRig = other.node.getComponent(RigidBody2D)
        if(this.inFluid){
            this.inFluid.push(otherRig)
        }else{
            this.inFluid = [otherRig]
        }
        contact.disabled = true
        console.log(`${other.name}进入`)
    }
    waterEndContact = (self: PolygonCollider2D, other: PolygonCollider2D, contact) => {
        const otherRig = other.node.getComponent(RigidBody2D)
        let index = this.inFluid.indexOf(otherRig);
        this.inFluid.splice(index, 1);
        contact.disabled = true
        console.log(`${other.name}离开`)
    }

    findIntersectionAreaAndCentroid = (body:RigidBody2D): [number, Vec2] => {
        let fixtureB = body.node.getComponent(PolygonCollider2D);
        let centroid = v2(0, 0);
        let area = 0;
        let mass: number = 0;
        let temp = []
        if (fixtureB) {
            // 液体边界点
            let outputList:Vec2[] = this.getVertices(this.fluidBody,true);
            // 漂浮物边界点
            let clipPolygon:Vec2[] = this.getVertices(body);
            
            let cp1 = clipPolygon[clipPolygon.length - 1];
            for (let j = 0; j < clipPolygon.length; j++) {
                let cp2 = clipPolygon[j];
                let inputList = outputList;
                outputList = [];
                let s = inputList[inputList.length - 1]; //last on the input list
                for (let i = 0; i < inputList.length; i++) {
                    let e = inputList[i];
                    if (inside(cp1, cp2, e)) {
                        if (!inside(cp1, cp2, s)) {
                            outputList.push(intersection(cp1, cp2, s, e));
                        }
                        outputList.push(e);
                    }
                    else if (inside(cp1, cp2, s)) {
                        outputList.push(intersection(cp1, cp2, s, e));
                    }
                    s = e;
                }
                cp1 = cp2;
            }
            temp = outputList
            let ac = computeAC(outputList);
            let density = fixtureB.density;
            mass += ac[0] * density;
            area += ac[0];

            //centroid.addSelf(ac[1].mul(density));
            
            centroid.x += ac[1].x * density;
            centroid.y += ac[1].y * density;
        }
        centroid = centroid.multiplyScalar(1 / mass)
        if(area>0){
            console.log(area,temp)
        }
        return [area, centroid];

    }
    // 设置浮力
    applyBuoyancy(body:RigidBody2D) {
        //获取面积和质心
        let AC = this.findIntersectionAreaAndCentroid(body);
        if (AC[0] !== 0) {
            console.log('面积',AC[0])
            let mass = AC[0] * this.density;
            let centroid = AC[1];
            let buoyancyForce = new Vec2(mass * this.gravity.x, mass * this.gravity.y);
            body.applyForce(buoyancyForce, centroid,true);
            console.log('浮力',buoyancyForce)

            let body_vw = v2();
            let fluidBody_vw = v2();
            body.getLinearVelocityFromWorldPoint(centroid, body_vw);
            this.fluidBody.getLinearVelocityFromWorldPoint(centroid, fluidBody_vw);
            let velDir = body_vw.subtract(fluidBody_vw);
            console.log('中心点线性速度向量',velDir)

            let dragMag = this.density * this.linearDrag * mass;
            let dragForce = velDir.add2f(-dragMag,-dragMag);
            body.applyForce(dragForce, centroid,true);
            console.log('力',dragForce)

            let torque = -body.getInertia() / body.getMass() * mass * body.angularVelocity * this.angularDrag;
            body.applyTorque(torque,true);
            console.log('扭矩力',torque)
        }
    }
    getVertices(body:RigidBody2D,isFluid:boolean = false) {
        let shape:PolygonCollider2D
        if(isFluid){
            shape = this.fluidCollider;
        }else{
            shape = body.node.getComponent(PolygonCollider2D)
            console.log('漂浮物的点-本地坐标',shape.points)
        }
        let vertices = [];
        for (let i = 0; i < shape.points.length; i++) {
            let pos_w = v2(0,0)
            body.getWorldPoint(shape.points[i],pos_w)
            vertices.push(pos_w);
        }
        if(!isFluid){
            console.log('漂浮物的点-世界坐标',vertices)
        }else{
            console.log('液体的点-世界坐标',vertices)
        }
        return vertices;
    }
    protected update(dt: number): void {
        if(this.inFluid){
            for (let i = 0, l = this.inFluid.length; i < l; i++) {
                this.applyBuoyancy(this.inFluid[i]);
            }
        }
        
    }
}


