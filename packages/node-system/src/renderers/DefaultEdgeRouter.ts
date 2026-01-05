import type { EdgeRouter, RenderContext, Connection, Node, EdgeRoutePoint, Position } from "../types.js";

/**
 * 默认连线路由器
 * 使用贝塞尔曲线计算连线路径
 */
export class DefaultEdgeRouter implements EdgeRouter {
  calculateRoute(
    connection: Connection,
    fromNode: Node,
    toNode: Node,
    context: RenderContext
  ): EdgeRoutePoint[] {
    const fromPortPos = this.getOutputPortPosition(fromNode, connection.from.portId);
    const toPortPos = this.getInputPortPosition(toNode, connection.to.portId);

    const fromScreen = context.worldToScreen(fromPortPos);
    const toScreen = context.worldToScreen(toPortPos);

    return this.calculateBezierRoute(fromScreen, toScreen);
  }

  /**
   * 计算贝塞尔曲线路径
   */
  private calculateBezierRoute(from: Position, to: Position): EdgeRoutePoint[] {
    const points: EdgeRoutePoint[] = [
      { x: from.x, y: from.y },
    ];

    const controlOffset = Math.abs(to.x - from.x) * 0.5;

    // 贝塞尔曲线的起始控制点
    points.push({
      x: from.x + controlOffset,
      y: from.y,
    });

    // 贝塞尔曲线的结束控制点
    points.push({
      x: to.x - controlOffset,
      y: to.y,
    });

    // 终点
    points.push({
      x: to.x,
      y: to.y,
    });

    return points;
  }

  /**
   * 获取输入端口位置
   */
  private getInputPortPosition(node: Node, portId: string): Position {
    const portIndex = node.inputs.findIndex((port) => port.id === portId);
    if (portIndex === -1) {
      throw new Error(`Input port ${portId} not found`);
    }

    const portSpacing = 20;
    const startY = 40;
    return {
      x: node.position.x,
      y: node.position.y + startY + portIndex * portSpacing,
    };
  }

  /**
   * 获取输出端口位置
   */
  private getOutputPortPosition(node: Node, portId: string): Position {
    const portIndex = node.outputs.findIndex((port) => port.id === portId);
    if (portIndex === -1) {
      throw new Error(`Output port ${portId} not found`);
    }

    const portSpacing = 20;
    const startY = 40;
    return {
      x: node.position.x + node.size.width,
      y: node.position.y + startY + portIndex * portSpacing,
    };
  }
}
