import BaseState from "./BaseState"
import { PlaterState } from "./interface"

// 推状态
export default class PushState extends BaseState {
    state: PlaterState = PlaterState.push    
}