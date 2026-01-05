import type { RenderConfig, Position, RenderContext, NodeRenderer, EdgeRouter, EdgeRenderer, EdgeRoutePoint } from "./types.js";
import type { NodeSystem } from "./NodeSystem.js";
import type { Node } from "./Node.js";
import { DefaultNodeRenderer } from "./renderers/DefaultNodeRenderer.js";
import { DefaultEdgeRouter } from "./renderers/DefaultEdgeRouter.js";
import { DefaultEdgeRenderer } from "./renderers/DefaultEdgeRenderer.js";

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
 * 支持自定义节点渲染器、连线路由器和连线渲染器
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;
  private nodeSystem: NodeSystem;
  private nodeRenderer: NodeRenderer;
  private edgeRouter: EdgeRouter;
  private edgeRenderer: EdgeRenderer;

  constructor(
    canvas: HTMLCanvasElement,
    nodeSystem: NodeSystem,
    config?: Partial<RenderConfig>,
    nodeRenderer?: NodeRenderer,
    edgeRouter?: EdgeRouter,
    edgeRenderer?: EdgeRenderer
  ) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("无法获取 Canvas 2D 上下文");
    }
    this.ctx = context;
    this.nodeSystem = nodeSystem;
    this.config = { ...DEFAULT_RENDER_CONFIG, ...config };

    // 使用传入的渲染器或默认渲染器
    this.nodeRenderer = nodeRenderer || new DefaultNodeRenderer();
    this.edgeRouter = edgeRouter || new DefaultEdgeRouter();
    this.edgeRenderer = edgeRenderer || new DefaultEdgeRenderer();
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
   * 创建渲染上下文
   */
  private createRenderContext(): RenderContext {
    return {
      canvas: this.canvas,
      ctx: this.ctx,
      nodeSystem: this.nodeSystem,
      viewport: this.nodeSystem.viewport,
      worldToScreen: (pos) => this.nodeSystem.worldToScreen(pos),
      screenToWorld: (pos) => this.nodeSystem.screenToWorld(pos),
    };
  }

  /**
   * 主渲染方法
   */
  render(): void {
    this.clear();
    this.drawGrid();

    const renderContext = this.createRenderContext();
    const nodes = this.nodeSystem.getAllNodes();

    // 先绘制连接线
    const connections = this.nodeSystem.connectionManager.getAllConnections();
    for (const conn of connections) {
      const fromNode = this.nodeSystem.getNode(conn.from.nodeId);
      const toNode = this.nodeSystem.getNode(conn.to.nodeId);

      if (fromNode && toNode) {
        const route = this.edgeRouter.calculateRoute(conn, fromNode, toNode, renderContext);
        this.edgeRenderer.render(conn, route, renderContext);
      }
    }

    // 再绘制节点
    for (const node of nodes) {
      this.nodeRenderer.render(node, renderContext);
    }
  }

  /**
   * 设置节点渲染器
   */
  setNodeRenderer(nodeRenderer: NodeRenderer): void {
    this.nodeRenderer = nodeRenderer;
  }

  /**
   * 设置连线路由器
   */
  setEdgeRouter(edgeRouter: EdgeRouter): void {
    this.edgeRouter = edgeRouter;
  }

  /**
   * 设置连线渲染器
   */
  setEdgeRenderer(edgeRenderer: EdgeRenderer): void {
    this.edgeRenderer = edgeRenderer;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<RenderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
