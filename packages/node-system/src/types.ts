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

/**
 * 渲染上下文
 * 提供渲染所需的所有上下文信息
 */
export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  nodeSystem: unknown;
  viewport: Viewport;
  worldToScreen: (position: Position) => Position;
  screenToWorld: (position: Position) => Position;
}

/**
 * 节点渲染器接口
 * 用于自定义节点的渲染方式
 */
export interface NodeRenderer {
  /**
   * 渲染节点
   * @param node 要渲染的节点
   * @param context 渲染上下文
   */
  render(node: Node, context: RenderContext): void;
}

/**
 * 连线路由点
 */
export interface EdgeRoutePoint {
  x: number;
  y: number;
}

/**
 * 连线路由器接口
 * 用于计算连线的路径
 */
export interface EdgeRouter {
  /**
   * 计算连线路径
   * @param connection 连接信息
   * @param fromNode 源节点
   * @param toNode 目标节点
   * @param context 渲染上下文
   * @returns 路径点数组
   */
  calculateRoute(
    connection: Connection,
    fromNode: Node,
    toNode: Node,
    context: RenderContext
  ): EdgeRoutePoint[];
}

/**
 * 连线渲染器接口
 * 用于自定义连线的渲染方式
 */
export interface EdgeRenderer {
  /**
   * 渲染连线
   * @param connection 连接信息
   * @param route 连线路径
   * @param context 渲染上下文
   */
  render(connection: Connection, route: EdgeRoutePoint[], context: RenderContext): void;
}

/**
 * 节点数据接口(用于渲染器)
 */
export interface Node {
  id: string;
  position: Position;
  size: Size;
  label: string;
  inputs: Port[];
  outputs: Port[];
  data: Record<string, unknown>;
}

/**
 * 端口引用
 */
export interface PortRef {
  nodeId: string;
  portId: string;
  portType: PortType;
}

/**
 * 连线拖拽状态
 */
export interface ConnectionDragState {
  isDragging: boolean;
  fromPort: PortRef;
  currentPosition: Position;
}

/**
 * 连线拖拽开始事件
 */
export interface ConnectionDragStartEvent {
  fromPort: PortRef;
  startPosition: Position;
}

/**
 * 连线拖拽移动事件
 */
export interface ConnectionDragMoveEvent {
  fromPort: PortRef;
  currentPosition: Position;
}

/**
 * 连线拖拽结束事件
 */
export interface ConnectionDragEndEvent {
  fromPort: PortRef;
  toPort: PortRef;
  endPosition: Position;
  success: boolean;
}

/**
 * 连线创建成功事件
 */
export interface ConnectionCreatedEvent {
  connection: Connection;
}

/**
 * 连线创建失败事件
 */
export interface ConnectionCreateFailedEvent {
  fromPort: PortRef;
  toPort: PortRef;
  reason: string;
}

/**
 * 节点系统事件类型
 */
export type NodeSystemEvent =
  | ConnectionDragStartEvent
  | ConnectionDragMoveEvent
  | ConnectionDragEndEvent
  | ConnectionCreatedEvent
  | ConnectionCreateFailedEvent;

/**
 * 事件监听器类型
 */
export type EventListener<T extends NodeSystemEvent = NodeSystemEvent> = (event: T) => void;

/**
 * 事件类型映射
 */
export interface EventTypes {
  connectionDragStart: ConnectionDragStartEvent;
  connectionDragMove: ConnectionDragMoveEvent;
  connectionDragEnd: ConnectionDragEndEvent;
  connectionCreated: ConnectionCreatedEvent;
  connectionCreateFailed: ConnectionCreateFailedEvent;
}
