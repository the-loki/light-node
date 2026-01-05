import type { RenderConfig, Position } from "./types.js";
import type { NodeSystem } from "./NodeSystem.js";
import type { Node } from "./Node.js";

/**
 * 默认渲染配置
 */
const DEFAULT_RENDER_CONFIG: RenderConfig = {
  gridSize: 20,
  gridColor: "#e0e0e0",
  backgroundColor: "#f5f5f5",
  nodeBackgroundColor: "#ffffff",
  nodeBorderColor: "#cccccc",
  nodeHeaderColor: "#f0f0f0",
  connectionColor: "#666666",
  selectionColor: "#2196f3",
  font: "12px sans-serif",
};

/**
 * 渲染器类
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;
  private nodeSystem: NodeSystem;

  constructor(canvas: HTMLCanvasElement, nodeSystem: NodeSystem, config?: Partial<RenderConfig>) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("无法获取 Canvas 2D 上下文");
    }
    this.ctx = context;
    this.nodeSystem = nodeSystem;
    this.config = { ...DEFAULT_RENDER_CONFIG, ...config };
  }

  /**
   * 调整画布大小
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * 清空画布
   */
  private clear(): void {
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * 绘制网格
   */
  private drawGrid(): void {
    const { offset, scale } = this.nodeSystem.viewport;
    const gridSize = this.config.gridSize * scale;

    this.ctx.strokeStyle = this.config.gridColor;
    this.ctx.lineWidth = 1;

    // 计算可见区域
    const startX = offset.x % gridSize;
    const startY = offset.y % gridSize;

    this.ctx.beginPath();

    // 垂直线
    for (let x = startX; x < this.canvas.width; x += gridSize) {
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
    }

    // 水平线
    for (let y = startY; y < this.canvas.height; y += gridSize) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
    }

    this.ctx.stroke();
  }

  /**
   * 绘制节点
   */
  private drawNode(node: Node): void {
    const screenPos = this.nodeSystem.worldToScreen(node.position);
    const width = node.size.width * this.nodeSystem.viewport.scale;
    const height = node.size.height * this.nodeSystem.viewport.scale;

    // 节点背景
    this.ctx.fillStyle = this.config.nodeBackgroundColor;
    this.ctx.strokeStyle = this.config.nodeBorderColor;
    this.ctx.lineWidth = 2;

    this.ctx.fillRect(screenPos.x, screenPos.y, width, height);
    this.ctx.strokeRect(screenPos.x, screenPos.y, width, height);

    // 节点标题
    const headerHeight = 30 * this.nodeSystem.viewport.scale;
    this.ctx.fillStyle = this.config.nodeHeaderColor;
    this.ctx.fillRect(screenPos.x, screenPos.y, width, headerHeight);

    // 节点标签
    this.ctx.fillStyle = "#000000";
    this.ctx.font = this.config.font;
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(
      node.label,
      screenPos.x + 10,
      screenPos.y + headerHeight / 2
    );

    // 绘制端口
    this.drawPorts(node);
  }

  /**
   * 绘制端口
   */
  private drawPorts(node: Node): void {
    const portRadius = 6 * this.nodeSystem.viewport.scale;

    // 输入端口
    for (const port of node.inputs) {
      const portPos = node.getInputPortPosition(port.id);
      const screenPos = this.nodeSystem.worldToScreen(portPos);

      this.ctx.fillStyle = "#4caf50";
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, portRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // 端口标签
      this.ctx.fillStyle = "#000000";
      this.ctx.font = `${10 * this.nodeSystem.viewport.scale}px sans-serif`;
      this.ctx.textAlign = "left";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(port.label, screenPos.x + portRadius + 5, screenPos.y);
    }

    // 输出端口
    for (const port of node.outputs) {
      const portPos = node.getOutputPortPosition(port.id);
      const screenPos = this.nodeSystem.worldToScreen(portPos);

      this.ctx.fillStyle = "#ff9800";
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, portRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // 端口标签
      this.ctx.fillStyle = "#000000";
      this.ctx.font = `${10 * this.nodeSystem.viewport.scale}px sans-serif`;
      this.ctx.textAlign = "right";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(port.label, screenPos.x - portRadius - 5, screenPos.y);
    }
  }

  /**
   * 绘制连接
   */
  private drawConnection(fromNode: Node, toNode: Node): void {
    const connections = this.nodeSystem.connectionManager.getAllConnections();

    for (const conn of connections) {
      if (conn.from.nodeId !== fromNode.id || conn.to.nodeId !== toNode.id) {
        continue;
      }

      const fromPortPos = fromNode.getOutputPortPosition(conn.from.portId);
      const toPortPos = toNode.getInputPortPosition(conn.to.portId);

      const fromScreen = this.nodeSystem.worldToScreen(fromPortPos);
      const toScreen = this.nodeSystem.worldToScreen(toPortPos);

      // 绘制贝塞尔曲线
      this.ctx.strokeStyle = this.config.connectionColor;
      this.ctx.lineWidth = 2 * this.nodeSystem.viewport.scale;
      this.ctx.beginPath();

      this.ctx.moveTo(fromScreen.x, fromScreen.y);

      const controlOffset = Math.abs(toScreen.x - fromScreen.x) * 0.5;
      this.ctx.bezierCurveTo(
        fromScreen.x + controlOffset,
        fromScreen.y,
        toScreen.x - controlOffset,
        toScreen.y,
        toScreen.x,
        toScreen.y
      );

      this.ctx.stroke();
    }
  }

  /**
   * 主渲染方法
   */
  render(): void {
    this.clear();
    this.drawGrid();

    const nodes = this.nodeSystem.getAllNodes();

    // 先绘制连接线
    const connections = this.nodeSystem.connectionManager.getAllConnections();
    for (const conn of connections) {
      const fromNode = this.nodeSystem.getNode(conn.from.nodeId);
      const toNode = this.nodeSystem.getNode(conn.to.nodeId);

      if (fromNode && toNode) {
        this.drawConnection(fromNode, toNode);
      }
    }

    // 再绘制节点
    for (const node of nodes) {
      this.drawNode(node);
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
