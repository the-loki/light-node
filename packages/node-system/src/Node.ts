import type { NodeConfig, Port, Position, Size } from "./types.js";

/**
 * 节点类
 */
export class Node {
  public readonly id: string;
  public position: Position;
  public size: Size;
  public label: string;
  public readonly inputs: Port[];
  public readonly outputs: Port[];
  public data: Record<string, unknown>;

  constructor(config: NodeConfig) {
    this.id = config.id;
    this.position = { ...config.position };
    this.size = config.size || { width: 200, height: 100 };
    this.label = config.label;
    this.inputs = config.inputs || [];
    this.outputs = config.outputs || [];
    this.data = config.data || {};
  }

  /**
   * 获取输入端口位置
   */
  getInputPortPosition(portId: string): Position {
    const portIndex = this.inputs.findIndex((port) => port.id === portId);
    if (portIndex === -1) {
      throw new Error(`Input port ${portId} not found`);
    }

    const portSpacing = 20;
    const startY = 40;
    return {
      x: this.position.x,
      y: this.position.y + startY + portIndex * portSpacing,
    };
  }

  /**
   * 获取输出端口位置
   */
  getOutputPortPosition(portId: string): Position {
    const portIndex = this.outputs.findIndex((port) => port.id === portId);
    if (portIndex === -1) {
      throw new Error(`Output port ${portId} not found`);
    }

    const portSpacing = 20;
    const startY = 40;
    return {
      x: this.position.x + this.size.width,
      y: this.position.y + startY + portIndex * portSpacing,
    };
  }

  /**
   * 检查点是否在节点内
   */
  containsPoint(point: Position): boolean {
    return (
      point.x >= this.position.x &&
      point.x <= this.position.x + this.size.width &&
      point.y >= this.position.y &&
      point.y <= this.position.y + this.size.height
    );
  }

  /**
   * 更新位置
   */
  setPosition(position: Position): void {
    this.position = { ...position };
  }

  /**
   * 更新尺寸
   */
  setSize(size: Size): void {
    this.size = { ...size };
  }
}
