import type { EdgeRenderer, RenderContext, Connection, EdgeRoutePoint } from "../types.js";

/**
 * 默认连线渲染器
 * 使用贝塞尔曲线渲染连线
 */
export class DefaultEdgeRenderer implements EdgeRenderer {
  render(connection: Connection, route: EdgeRoutePoint[], context: RenderContext): void {
    const { ctx, viewport } = context;

    if (route.length < 4) {
      return;
    }

    ctx.strokeStyle = "#666666";
    ctx.lineWidth = 2 * viewport.scale;
    ctx.beginPath();

    ctx.moveTo(route[0].x, route[0].y);

    // 使用前3个点作为贝塞尔曲线的控制点
    // route[0] 起点
    // route[1] 第一个控制点
    // route[2] 第二个控制点
    // route[3] 终点
    ctx.bezierCurveTo(
      route[1].x,
      route[1].y,
      route[2].x,
      route[2].y,
      route[3].x,
      route[3].y
    );

    ctx.stroke();
  }
}
