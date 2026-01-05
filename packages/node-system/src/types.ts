/**
 * 节点端口类型
 */
export type PortType = "input" | "output";

/**
 * 端口数据类型
 */
export type PortDataType = "any" | "number" | "string" | "boolean" | "object" | "array";

/**
 * 节点端口定义
 */
export interface Port {
  id: string;
  type: PortType;
  dataType: PortDataType;
  label: string;
}

/**
 * 节点位置
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * 节点尺寸
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * 节点配置
 */
export interface NodeConfig {
  id: string;
  position: Position;
  size?: Size;
  label: string;
  inputs?: Port[];
  outputs?: Port[];
  data?: Record<string, unknown>;
}

/**
 * 连接点
 */
export interface ConnectionPoint {
  nodeId: string;
  portId: string;
}

/**
 * 连接定义
 */
export interface Connection {
  id: string;
  from: ConnectionPoint;
  to: ConnectionPoint;
}

/**
 * 视口状态
 */
export interface Viewport {
  offset: Position;
  scale: number;
}

/**
 * 渲染配置
 */
export interface RenderConfig {
  gridSize: number;
  gridColor: string;
  backgroundColor: string;
  nodeBackgroundColor: string;
  nodeBorderColor: string;
  nodeHeaderColor: string;
  connectionColor: string;
  selectionColor: string;
  font: string;
}
