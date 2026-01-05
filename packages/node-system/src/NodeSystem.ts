import type { NodeConfig, Connection, Position, Viewport } from "./types.js";
import { Node } from "./Node.js";
import { ConnectionManager } from "./Connection.js";

/**
 * 节点系统核心类
 */
export class NodeSystem {
  private nodes: Map<string, Node> = new Map();
  public connectionManager: ConnectionManager;
  public viewport: Viewport;

  constructor() {
    this.connectionManager = new ConnectionManager();
    this.viewport = {
      offset: { x: 0, y: 0 },
      scale: 1,
    };
  }

  /**
   * 添加节点
   */
  addNode(config: NodeConfig): Node {
    if (this.nodes.has(config.id)) {
      throw new Error(`Node with id ${config.id} already exists`);
    }

    const node = new Node(config);
    this.nodes.set(config.id, node);
    return node;
  }

  /**
   * 移除节点
   */
  removeNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return false;
    }

    // 移除所有相关连接
    const allConnections = this.connectionManager.getAllConnections();
    for (const conn of allConnections) {
      if (conn.from.nodeId === nodeId || conn.to.nodeId === nodeId) {
        this.connectionManager.removeConnection(conn.id);
      }
    }

    return this.nodes.delete(nodeId);
  }

  /**
   * 获取节点
   */
  getNode(nodeId: string): Node | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * 获取所有节点
   */
  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 添加连接
   */
  addConnection(connection: Connection): boolean {
    const fromNode = this.nodes.get(connection.from.nodeId);
    const toNode = this.nodes.get(connection.to.nodeId);

    if (!fromNode || !toNode) {
      return false;
    }

    return this.connectionManager.addConnection(connection);
  }

  /**
   * 移除连接
   */
  removeConnection(connectionId: string): boolean {
    return this.connectionManager.removeConnection(connectionId);
  }

  /**
   * 获取视口中点（屏幕坐标转世界坐标）
   */
  screenToWorld(screenPos: Position): Position {
    return {
      x: (screenPos.x - this.viewport.offset.x) / this.viewport.scale,
      y: (screenPos.y - this.viewport.offset.y) / this.viewport.scale,
    };
  }

  /**
   * 世界坐标转屏幕坐标
   */
  worldToScreen(worldPos: Position): Position {
    return {
      x: worldPos.x * this.viewport.scale + this.viewport.offset.x,
      y: worldPos.y * this.viewport.scale + this.viewport.offset.y,
    };
  }

  /**
   * 查找点击位置的节点
   */
  findNodeAtPosition(position: Position): Node | undefined {
    // 反向遍历，优先选择上层节点
    const nodes = this.getAllNodes();
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].containsPoint(position)) {
        return nodes[i];
      }
    }
    return undefined;
  }

  /**
   * 清空系统
   */
  clear(): void {
    this.nodes.clear();
    this.connectionManager.clear();
  }
}
