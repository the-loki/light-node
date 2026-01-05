# 节点系统渲染器扩展指南

节点系统现在支持完全自定义的渲染器,你可以自由扩展节点和连线的渲染方式。

## 核心概念

### 1. 渲染器接口

系统提供三个核心接口用于自定义渲染:

- **NodeRenderer**: 控制节点的外观渲染
- **EdgeRouter**: 计算连线的路径(路由)
- **EdgeRenderer**: 控制连线的视觉样式

### 2. 渲染上下文 (RenderContext)

渲染器通过 `RenderContext` 获取渲染所需的所有信息:

```typescript
interface RenderContext {
  canvas: HTMLCanvasElement;           // Canvas元素
  ctx: CanvasRenderingContext2D;       // 2D绘图上下文
  nodeSystem: NodeSystem;              // 节点系统实例
  viewport: Viewport;                  // 视口状态(偏移和缩放)
  worldToScreen: (pos) => Position;    // 世界坐标转屏幕坐标
  screenToWorld: (pos) => Position;    // 屏幕坐标转世界坐标
}
```

## 自定义节点渲染器

### 基础示例

```typescript
import type { NodeRenderer, RenderContext } from "@vibe-kanban/node-system";

class MyCustomNodeRenderer implements NodeRenderer {
  render(node: Node, context: RenderContext): void {
    const { ctx, viewport, worldToScreen } = context;
    const screenPos = worldToScreen(node.position);
    const scale = viewport.scale;

    // 自定义绘制逻辑
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(
      screenPos.x,
      screenPos.y,
      node.size.width * scale,
      node.size.height * scale
    );

    // 绘制标签
    ctx.fillStyle = "#ffffff";
    ctx.font = `${14 * scale}px sans-serif`;
    ctx.fillText(node.label, screenPos.x + 10, screenPos.y + 20);

    // 绘制端口...
  }
}
```

### 使用自定义节点渲染器

```typescript
import { Renderer, NodeSystem } from "@vibe-kanban/node-system";

const nodeSystem = new NodeSystem();
const renderer = new Renderer(canvas, nodeSystem);

// 设置自定义渲染器
renderer.setNodeRenderer(new MyCustomNodeRenderer());
renderer.render();
```

## 自定义连线路由器

连线路由器负责计算连线路径,但不负责绘制。

### 基础示例

```typescript
import type { EdgeRouter, EdgeRoutePoint, RenderContext } from "@vibe-kanban/node-system";

class StraightLineRouter implements EdgeRouter {
  calculateRoute(
    connection: Connection,
    fromNode: Node,
    toNode: Node,
    context: RenderContext
  ): EdgeRoutePoint[] {
    // 获取端口位置
    const fromPortPos = this.getOutputPortPosition(fromNode, connection.from.portId);
    const toPortPos = this.getInputPortPosition(toNode, connection.to.portId);

    const fromScreen = context.worldToScreen(fromPortPos);
    const toScreen = context.worldToScreen(toPortPos);

    // 返回直线路径
    return [
      { x: fromScreen.x, y: fromScreen.y },
      { x: toScreen.x, y: toScreen.y }
    ];
  }
}
```

### 使用自定义连线路由器

```typescript
renderer.setEdgeRouter(new StraightLineRouter());
renderer.render();
```

## 自定义连线渲染器

连线渲染器负责根据路由器计算的路径绘制连线。

### 基础示例

```typescript
import type { EdgeRenderer, EdgeRoutePoint, RenderContext } from "@vibe-kanban/node-system";

class DashedLineRenderer implements EdgeRenderer {
  render(connection: Connection, route: EdgeRoutePoint[], context: RenderContext): void {
    const { ctx, viewport } = context;

    if (route.length < 2) return;

    ctx.strokeStyle = "#666666";
    ctx.lineWidth = 2 * viewport.scale;
    ctx.setLineDash([5, 5]); // 虚线样式

    ctx.beginPath();
    ctx.moveTo(route[0].x, route[0].y);

    for (let i = 1; i < route.length; i++) {
      ctx.lineTo(route[i].x, route[i].y);
    }

    ctx.stroke();
    ctx.setLineDash([]); // 重置虚线样式
  }
}
```

### 使用自定义连线渲染器

```typescript
renderer.setEdgeRenderer(new DashedLineRenderer());
renderer.render();
```

## 完整示例

查看 `apps/showcase/src/customRenderers.ts` 获取完整的自定义渲染器示例,包括:

- **RoundedNodeRenderer**: 圆角风格节点,带渐变配色
- **OrthogonalEdgeRouter**: 直角路由(水平-垂直-水平)
- **GradientEdgeRenderer**: 渐变连线,带箭头

运行 showcase 并点击左下角的"切换到自定义渲染器"按钮查看效果。

## 最佳实践

### 1. 性能优化

- 避免在 `render` 方法中创建新对象
- 复用计算结果
- 使用 `viewport.scale` 适配缩放

### 2. 坐标转换

始终使用 `worldToScreen` 和 `screenToWorld` 进行坐标转换:

```typescript
// 错误: 直接使用世界坐标
ctx.fillRect(node.position.x, node.position.y, 100, 100);

// 正确: 转换为屏幕坐标
const screenPos = worldToScreen(node.position);
ctx.fillRect(screenPos.x, screenPos.y, 100, 100);
```

### 3. 端口位置

计算端口位置时,需要知道端口的索引:

```typescript
private getInputPortPosition(node: Node, portId: string): Position {
  const portIndex = node.inputs.findIndex(port => port.id === portId);
  const portSpacing = 20;
  const startY = 40;

  return {
    x: node.position.x,
    y: node.position.y + startY + portIndex * portSpacing
  };
}
```

### 4. 响应视口变化

所有尺寸都应乘以 `viewport.scale`:

```typescript
const fontSize = 14 * viewport.scale;
const lineWidth = 2 * viewport.scale;
ctx.font = `${fontSize}px sans-serif`;
ctx.lineWidth = lineWidth;
```

## 高级用法

### 条件渲染

根据节点类型或数据选择不同的渲染风格:

```typescript
render(node: Node, context: RenderContext): void {
  if (node.data.type === "special") {
    this.renderSpecialNode(node, context);
  } else {
    this.renderNormalNode(node, context);
  }
}
```

### 动态样式

根据节点状态改变颜色:

```typescript
const isActive = node.data.active === true;
ctx.fillStyle = isActive ? "#4caf50" : "#9e9e9e";
```

### 组合渲染器

创建渲染器工厂:

```typescript
function createNodeRenderer(theme: "light" | "dark"): NodeRenderer {
  return theme === "light"
    ? new LightThemeRenderer()
    : new DarkThemeRenderer();
}
```

## 类型参考

所有接口都在 `@vibe-kanban/node-system` 包中导出:

```typescript
import type {
  NodeRenderer,
  EdgeRouter,
  EdgeRenderer,
  RenderContext,
  EdgeRoutePoint,
  Node
} from "@vibe-kanban/node-system";
```

## 常见问题

### Q: 如何在节点中绘制自定义内容(如图标)?

A: 使用 Canvas 2D API 绘制图像:

```typescript
const image = new Image();
image.src = node.data.icon as string;
ctx.drawImage(image, screenPos.x, screenPos.y, width, height);
```

### Q: 如何实现动画效果?

A: 在渲染器外部使用 `requestAnimationFrame`:

```typescript
function animate() {
  renderer.render();
  requestAnimationFrame(animate);
}
animate();
```

### Q: 可以使用不同的连线宽度吗?

A: 可以,在 EdgeRenderer 中根据连接类型设置不同宽度:

```typescript
ctx.lineWidth = connection.data.width
  ? (connection.data.width as number) * viewport.scale
  : 2 * viewport.scale;
```
