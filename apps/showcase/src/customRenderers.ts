import type { NodeRenderer, EdgeRenderer, EdgeRouter, RenderContext, EdgeRoutePoint, Position } from "@vibe-kanban/node-system";

/**
 * 自定义节点渲染器 - 圆角风格
 */
export class RoundedNodeRenderer implements NodeRenderer {
  render(node: Parameters<NodeRenderer["render"]>[0], context: RenderContext): void {
    const { ctx, viewport, worldToScreen } = context;
    const screenPos = worldToScreen(node.position);
    const width = node.size.width * viewport.scale;
    const height = node.size.height * viewport.scale;
    const radius = 10 * viewport.scale;

    // 绘制圆角矩形节点
    ctx.fillStyle = "#2c3e50";
    ctx.strokeStyle = "#34495e";
    ctx.lineWidth = 2;

    this.drawRoundedRect(ctx, screenPos.x, screenPos.y, width, height, radius);
    ctx.fill();
    ctx.stroke();

    // 绘制标题
    const headerHeight = 35 * viewport.scale;
    ctx.fillStyle = "#3498db";
    this.drawRoundedRect(ctx, screenPos.x, screenPos.y, width, headerHeight, radius);
    ctx.fill();

    // 节点标签
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${14 * viewport.scale}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(node.label, screenPos.x + 15, screenPos.y + headerHeight / 2);

    // 绘制端口
    this.drawPorts(ctx, node, context);
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private drawPorts(ctx: CanvasRenderingContext2D, node: Parameters<NodeRenderer["render"]>[0], context: RenderContext): void {
    const { viewport, worldToScreen } = context;
    const portRadius = 8 * viewport.scale;

    // 输入端口
    for (const port of node.inputs) {
      const portPos = this.getPortPosition(node, port.id, "input");
      const screenPos = worldToScreen(portPos);

      ctx.fillStyle = "#27ae60";
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, portRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#2ecc71";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#ecf0f1";
      ctx.font = `${11 * viewport.scale}px sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(port.label, screenPos.x + portRadius + 8, screenPos.y);
    }

    // 输出端口
    for (const port of node.outputs) {
      const portPos = this.getPortPosition(node, port.id, "output");
      const screenPos = worldToScreen(portPos);

      ctx.fillStyle = "#e67e22";
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, portRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#f39c12";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#ecf0f1";
      ctx.font = `${11 * viewport.scale}px sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(port.label, screenPos.x - portRadius - 8, screenPos.y);
    }
  }

  private getPortPosition(node: Parameters<NodeRenderer["render"]>[0], portId: string, type: "input" | "output"): Position {
    const ports = type === "input" ? node.inputs : node.outputs;
    const portIndex = ports.findIndex((port) => port.id === portId);
    if (portIndex === -1) {
      throw new Error(`${type} port ${portId} not found`);
    }

    const portSpacing = 25;
    const startY = 50;
    const x = type === "input" ? node.position.x : node.position.x + node.size.width;
    return {
      x,
      y: node.position.y + startY + portIndex * portSpacing,
    };
  }
}

/**
 * 自定义连线路由器 - 直角路由
 */
export class OrthogonalEdgeRouter implements EdgeRouter {
  calculateRoute(
    _connection: Parameters<EdgeRouter["calculateRoute"]>[0],
    fromNode: Parameters<EdgeRouter["calculateRoute"]>[1],
    toNode: Parameters<EdgeRouter["calculateRoute"]>[2],
    context: RenderContext
  ): EdgeRoutePoint[] {
    const fromPortPos = this.getPortPosition(fromNode, "output");
    const toPortPos = this.getPortPosition(toNode, "input");

    const fromScreen = context.worldToScreen(fromPortPos);
    const toScreen = context.worldToScreen(toPortPos);

    // 直角路由: 水平 -> 垂直 -> 水平
    const midX = (fromScreen.x + toScreen.x) / 2;

    return [
      { x: fromScreen.x, y: fromScreen.y },
      { x: midX, y: fromScreen.y },
      { x: midX, y: toScreen.y },
      { x: toScreen.x, y: toScreen.y },
    ];
  }

  private getPortPosition(node: Parameters<EdgeRouter["calculateRoute"]>[1], type: "input" | "output"): Position {
    const portId = type === "input" ? node.inputs[0]?.id : node.outputs[0]?.id;
    if (!portId) {
      return { x: node.position.x, y: node.position.y + 50 };
    }

    const portIndex = type === "input"
      ? node.inputs.findIndex((port) => port.id === portId)
      : node.outputs.findIndex((port) => port.id === portId);

    const portSpacing = 25;
    const startY = 50;
    const x = type === "input" ? node.position.x : node.position.x + node.size.width;
    return {
      x,
      y: node.position.y + startY + portIndex * portSpacing,
    };
  }
}

/**
 * 自定义连线渲染器 - 渐变线条
 */
export class GradientEdgeRenderer implements EdgeRenderer {
  render(connection: Parameters<EdgeRenderer["render"]>[0], route: EdgeRoutePoint[], context: RenderContext): void {
    const { ctx, viewport } = context;

    if (route.length < 2) {
      return;
    }

    // 创建渐变
    const gradient = ctx.createLinearGradient(route[0].x, route[0].y, route[route.length - 1].x, route[route.length - 1].y);
    gradient.addColorStop(0, "#3498db");
    gradient.addColorStop(1, "#9b59b6");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3 * viewport.scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(route[0].x, route[0].y);

    for (let i = 1; i < route.length; i++) {
      ctx.lineTo(route[i].x, route[i].y);
    }

    ctx.stroke();

    // 绘制箭头
    this.drawArrow(ctx, route[route.length - 2], route[route.length - 1]);
  }

  private drawArrow(
    ctx: CanvasRenderingContext2D,
    from: EdgeRoutePoint,
    to: EdgeRoutePoint
  ): void {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;

    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - arrowLength * Math.cos(angle - arrowAngle),
      to.y - arrowLength * Math.sin(angle - arrowAngle)
    );
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(
      to.x - arrowLength * Math.cos(angle + arrowAngle),
      to.y - arrowLength * Math.sin(angle + arrowAngle)
    );
    ctx.stroke();
  }
}
