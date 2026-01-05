import type { NodeRenderer, RenderContext, Node, Position } from "../types.js";

/**
 * 默认节点渲染器
 * 提供标准的节点外观渲染
 */
export class DefaultNodeRenderer implements NodeRenderer {
  render(node: Node, context: RenderContext): void {
    const { ctx, viewport, worldToScreen } = context;
    const screenPos = worldToScreen(node.position);
    const width = node.size.width * viewport.scale;
    const height = node.size.height * viewport.scale;

    this.drawNodeBody(ctx, screenPos.x, screenPos.y, width, height);
    this.drawNodeHeader(ctx, screenPos.x, screenPos.y, width, viewport.scale, node.label);
    this.drawPorts(ctx, node, context);
  }

  /**
   * 绘制节点主体
   */
  private drawNodeBody(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 2;

    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
  }

  /**
   * 绘制节点标题栏
   */
  private drawNodeHeader(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    scale: number,
    label: string
  ): void {
    const headerHeight = 30 * scale;

    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(x, y, width, headerHeight);

    ctx.fillStyle = "#000000";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + 10, y + headerHeight / 2);
  }

  /**
   * 绘制端口
   */
  private drawPorts(ctx: CanvasRenderingContext2D, node: Node, context: RenderContext): void {
    const { viewport, worldToScreen } = context;
    const portRadius = 6 * viewport.scale;

    // 绘制输入端口
    for (const port of node.inputs) {
      const portPos = this.getInputPortPosition(node, port.id);
      const screenPos = worldToScreen(portPos);

      ctx.fillStyle = "#4caf50";
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, portRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#000000";
      ctx.font = `${10 * viewport.scale}px sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(port.label, screenPos.x + portRadius + 5, screenPos.y);
    }

    // 绘制输出端口
    for (const port of node.outputs) {
      const portPos = this.getOutputPortPosition(node, port.id);
      const screenPos = worldToScreen(portPos);

      ctx.fillStyle = "#ff9800";
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, portRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#000000";
      ctx.font = `${10 * viewport.scale}px sans-serif`;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(port.label, screenPos.x - portRadius - 5, screenPos.y);
    }
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
