import BaseState from "./BaseState"
import { PlaterState } from "./interface"

export default class HurtState extends BaseState {
    state: PlaterState = PlaterState.walk
    
}