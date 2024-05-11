import BaseState from "./BaseState"
import { PlaterState } from "./interface"

// 爬状态
export default class CrawlState extends BaseState {
    state: PlaterState = PlaterState.crawl

    onAnimationStart(): void {
    }
    /**
     * 动画结束
     */
    onAnimationExit(): void {
    }
}