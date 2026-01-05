import type { Connection, ConnectionPoint } from "./types.js";
import type { Node } from "./Node.js";

/**
 * 连接类
 */
export class ConnectionManager {
  private connections: Map<string, Connection> = new Map();

  /**
   * 添加连接
   */
  addConnection(connection: Connection): boolean {
    if (this.connections.has(connection.id)) {
      return false;
    }

    // 检查是否形成环（简单检查）
    if (this.wouldCreateCycle(connection)) {
      return false;
    }

    this.connections.set(connection.id, connection);
    return true;
  }

  /**
   * 移除连接
   */
  removeConnection(connectionId: string): boolean {
    return this.connections.delete(connectionId);
  }

  /**
   * 获取连接
   */
  getConnection(connectionId: string): Connection {
    const connection = this.connections.get(connectionId);
    if (connection === undefined) {
      throw new Error(`Connection ${connectionId} not found`);
    }
    return connection;
  }

  /**
   * 检查连接是否存在
   */
  hasConnection(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }

  /**
   * 获取所有连接
   */
  getAllConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  /**
   * 获取节点的输入连接
   */
  getInputConnections(nodeId: string, portId?: string): Connection[] {
    return this.getAllConnections().filter((conn) => {
      const matchesNode = conn.to.nodeId === nodeId;
      const matchesPort = !portId || conn.to.portId === portId;
      return matchesNode && matchesPort;
    });
  }

  /**
   * 获取节点的输出连接
   */
  getOutputConnections(nodeId: string, portId?: string): Connection[] {
    return this.getAllConnections().filter((conn) => {
      const matchesNode = conn.from.nodeId === nodeId;
      const matchesPort = !portId || conn.from.portId === portId;
      return matchesNode && matchesPort;
    });
  }

  /**
   * 检查是否会创建环路
   */
  private wouldCreateCycle(newConnection: Connection): boolean {
    const visited = new Set<string>();
    const stack = [newConnection.to.nodeId];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;

      if (current === newConnection.from.nodeId) {
        return true;
      }

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      // 添加所有输出连接的目标节点
      const outputs = this.getOutputConnections(current);
      for (const conn of outputs) {
        stack.push(conn.to.nodeId);
      }
    }

    return false;
  }

  /**
   * 清除所有连接
   */
  clear(): void {
    this.connections.clear();
  }
}
