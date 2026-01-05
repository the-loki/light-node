# Vibe Kanban - 节点系统

一个基于 Canvas 的可拓展节点系统库，支持可视化编辑节点和连接。

## 项目结构

```
.
├── packages/
│   └── node-system/     # 节点系统核心库
├── apps/
│   └── showcase/        # 演示应用
└── README.md
```

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 构建节点系统包

```bash
pnpm --filter @vibe-kanban/node-system build
```

### 运行演示应用

```bash
pnpm --filter @vibe-kanban/showcase dev
```

访问 http://localhost:3000 查看演示。

## 节点系统核心功能

### 核心类

- **NodeSystem**: 节点系统管理类，负责节点和连接的管理
- **Node**: 节点类，表示单个节点
- **ConnectionManager**: 连接管理器，负责节点之间的连接
- **Renderer**: 渲染器，负责 Canvas 绘制

### 基础用法

```typescript
import { NodeSystem, Renderer } from "@vibe-kanban/node-system";

// 创建节点系统
const nodeSystem = new NodeSystem();

// 创建渲染器
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const renderer = new Renderer(canvas, nodeSystem);

// 添加节点
nodeSystem.addNode({
  id: "node1",
  position: { x: 100, y: 100 },
  label: "输入节点",
  inputs: [],
  outputs: [
    { id: "out1", type: "output", dataType: "number", label: "数值" },
  ],
});

// 添加连接
nodeSystem.addConnection({
  id: "conn1",
  from: { nodeId: "node1", portId: "out1" },
  to: { nodeId: "node2", portId: "in1" },
});

// 渲染
renderer.render();
```

### 交互功能

演示应用支持以下交互：

- **左键拖拽**: 移动节点
- **滚轮缩放**: 缩放画布（以鼠标位置为中心）
- **中键拖拽**: 平移画布
- **调试面板**: 右上角浮动窗口显示实时信息

## 技术栈

- **TypeScript**: 类型安全的开发体验
- **Canvas API**: 高性能 2D 渲染
- **tsup**: 快速打包工具
- **Vite**: 开发服务器和构建工具
- **pnpm**: 包管理器

## 开发计划

- [ ] 添加更多节点类型
- [ ] 实现节点数据流
- [ ] 支持撤销/重做
- [ ] 添加保存/加载功能
- [ ] 支持自定义节点样式
- [ ] 添加更多交互功能（如右键菜单、快捷键等）
