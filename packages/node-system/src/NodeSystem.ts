import type {
  NodeConfig,
  Connection,
  Position,
  Viewport,
  PortRef,
  EventTypes,
  NodeSystemEvent,
  EventListener,
} from "./types.js";
import { Node } from "./Node.js";
import { ConnectionManager } from "./Connection.js";

/**
 * 节点系统核心类
 */
export class NodeSystem {
  private nodes: Map<string, Node> = new Map();
  public connectionManager: ConnectionManager;
  public viewport: Viewport;
  private eventListeners: Map<keyof EventTypes, Set<EventListener>> = new Map();

  constructor() {
    this.connectionManager = new ConnectionManager();
    this.viewport = {
      offset: { x: 0, y: 0 },
      scale: 1,
    };
  }

  /**
   * 添加事件监听器
   */
  on<K extends keyof EventTypes>(eventType: K, listener: EventListener<EventTypes[K]>): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener as EventListener);
  }

  /**
   * 移除事件监听器
   */
  off<K extends keyof EventTypes>(eventType: K, listener: EventListener<EventTypes[K]>): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener as EventListener);
    }
  }

  /**
   * 触发事件（公共方法，供应用层使用）
   */
  emit<K extends keyof EventTypes>(eventType: K, event: EventTypes[K]): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => listener(event));
    }
  }

  /**
   * 查找指定位置的端口
   */
  findPortAtPosition(position: Position): PortRef {
    const nodes = this.getAllNodes();
    const portHitRadius = 10;

    for (const node of nodes) {
      // 检查输出端口
      for (const port of node.outputs) {
        const portPosition = node.getOutputPortPosition(port.id);
        const distance = Math.sqrt(
          Math.pow(position.x - portPosition.x, 2) + Math.pow(position.y - portPosition.y, 2)
        );
        if (distance <= portHitRadius) {
          return {
            nodeId: node.id,
            portId: port.id,
            portType: "output",
          };
        }
      }

      // 检查输入端口
      for (const port of node.inputs) {
        const portPosition = node.getInputPortPosition(port.id);
        const distance = Math.sqrt(
          Math.pow(position.x - portPosition.x, 2) + Math.pow(position.y - portPosition.y, 2)
        );
        if (distance <= portHitRadius) {
          return {
            nodeId: node.id,
            portId: port.id,
            portType: "input",
          };
        }
      }
    }

    throw new Error("No port found at position");
  }

  /**
   * 检查位置是否有端口
   */
  hasPortAtPosition(position: Position): boolean {
    const nodes = this.getAllNodes();
    const portHitRadius = 10;

    for (const node of nodes) {
      // 检查输出端口
      for (const port of node.outputs) {
        const portPosition = node.getOutputPortPosition(port.id);
        const distance = Math.sqrt(
          Math.pow(position.x - portPosition.x, 2) + Math.pow(position.y - portPosition.y, 2)
        );
        if (distance <= portHitRadius) {
          return true;
        }
      }

      // 检查输入端口
      for (const port of node.inputs) {
        const portPosition = node.getInputPortPosition(port.id);
        const distance = Math.sqrt(
          Math.pow(position.x - portPosition.x, 2) + Math.pow(position.y - portPosition.y, 2)
        );
        if (distance <= portHitRadius) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 检查连接是否已存在
   */
  connectionExists(fromPort: PortRef, toPort: PortRef): boolean {
    const existingConnections = this.connectionManager.getAllConnections();
    return existingConnections.some(
      (conn) =>
        conn.from.nodeId === fromPort.nodeId &&
        conn.from.portId === fromPort.portId &&
        conn.to.nodeId === toPort.nodeId &&
        conn.to.portId === toPort.portId
    );
  }

  /**
   * 创建连接并返回结果
   */
  createConnection(
    fromPort: PortRef,
    toPort: PortRef,
    connectionId?: string
  ): { success: boolean; connection?: Connection; reason?: string } {
    const id = connectionId || `${fromPort.nodeId}-${fromPort.portId}-${toPort.nodeId}-${toPort.portId}`;
    const connection: Connection = {
      id,
      from: {
        nodeId: fromPort.nodeId,
        portId: fromPort.portId,
      },
      to: {
        nodeId: toPort.nodeId,
        portId: toPort.portId,
      },
    };

    const success = this.addConnection(connection);

    if (success) {
      this.emit("connectionCreated", { connection });
      return { success: true, connection };
    } else {
      const reason = "连接管理器拒绝连接（可能形成环路）";
      this.emit("connectionCreateFailed", {
        fromPort,
        toPort,
        reason,
      });
      return { success: false, reason };
    }
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
  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node === undefined) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // 移除所有相关连接
    const allConnections = this.connectionManager.getAllConnections();
    for (const conn of allConnections) {
      if (conn.from.nodeId === nodeId || conn.to.nodeId === nodeId) {
        this.connectionManager.removeConnection(conn.id);
      }
    }

    this.nodes.delete(nodeId);
  }

  /**
   * 获取节点
   */
  getNode(nodeId: string): Node {
    const node = this.nodes.get(nodeId);
    if (node === undefined) {
      throw new Error(`Node ${nodeId} not found`);
    }
    return node;
  }

  /**
   * 检查节点是否存在
   */
  hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId);
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
  findNodeAtPosition(position: Position): Node {
    // 反向遍历，优先选择上层节点
    const nodes = this.getAllNodes();
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].containsPoint(position)) {
        return nodes[i];
      }
    }
    throw new Error("No node found at position");
  }

  /**
   * 检查位置是否有节点
   */
  hasNodeAtPosition(position: Position): boolean {
    const nodes = this.getAllNodes();
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].containsPoint(position)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 清空系统
   */
  clear(): void {
    this.nodes.clear();
    this.connectionManager.clear();
  }
}
