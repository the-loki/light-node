import { NodeSystem, Renderer, DefaultNodeRenderer, DefaultEdgeRouter, DefaultEdgeRenderer, type Node, type Position, type NodeConfig, type PortRef } from "@vibe-kanban/node-system";
import { RoundedNodeRenderer, OrthogonalEdgeRouter, GradientEdgeRenderer } from "./customRenderers.js";

// 获取 Canvas 元素
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element not found");
}

// 创建节点系统
const nodeSystem = new NodeSystem();

// 创建渲染器(使用默认渲染器)
const renderer = new Renderer(canvas, nodeSystem);

// 渲染器模式
type RendererMode = "default" | "custom";
let currentRendererMode: RendererMode = "default";

// 调整画布大小
function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  renderer.resize(canvas.width, canvas.height);
  renderer.render();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// 演示节点
const demoNodes: NodeConfig[] = [
  {
    id: "node1",
    position: { x: 100, y: 100 },
    label: "输入节点",
    inputs: [],
    outputs: [
      { id: "out1", type: "output", dataType: "number", label: "数值" },
      { id: "out2", type: "output", dataType: "string", label: "文本" },
    ],
  },
  {
    id: "node2",
    position: { x: 400, y: 100 },
    label: "处理节点",
    inputs: [
      { id: "in1", type: "input", dataType: "number", label: "输入" },
      { id: "in2", type: "input", dataType: "string", label: "文本" },
    ],
    outputs: [
      { id: "out1", type: "output", dataType: "any", label: "结果" },
    ],
  },
  {
    id: "node3",
    position: { x: 700, y: 100 },
    label: "输出节点",
    inputs: [
      { id: "in1", type: "input", dataType: "any", label: "数据" },
    ],
    outputs: [],
  },
  {
    id: "node4",
    position: { x: 400, y: 300 },
    label: "计算节点",
    inputs: [
      { id: "in1", type: "input", dataType: "number", label: "数值A" },
      { id: "in2", type: "input", dataType: "number", label: "数值B" },
    ],
    outputs: [
      { id: "out1", type: "output", dataType: "number", label: "和" },
      { id: "out2", type: "output", dataType: "number", label: "积" },
    ],
  },
];

// 添加节点
for (const nodeConfig of demoNodes) {
  nodeSystem.addNode(nodeConfig);
}

// 添加连接
nodeSystem.addConnection({
  id: "conn1",
  from: { nodeId: "node1", portId: "out1" },
  to: { nodeId: "node2", portId: "in1" },
});

nodeSystem.addConnection({
  id: "conn2",
  from: { nodeId: "node1", portId: "out2" },
  to: { nodeId: "node2", portId: "in2" },
});

nodeSystem.addConnection({
  id: "conn3",
  from: { nodeId: "node2", portId: "out1" },
  to: { nodeId: "node3", portId: "in1" },
});

nodeSystem.addConnection({
  id: "conn4",
  from: { nodeId: "node1", portId: "out1" },
  to: { nodeId: "node4", portId: "in1" },
});

nodeSystem.addConnection({
  id: "conn5",
  from: { nodeId: "node1", portId: "out1" },
  to: { nodeId: "node4", portId: "in2" },
});

// 交互状态
let isDragging = false;
let dragStart: Position = { x: 0, y: 0 };
let selectedNode: Node;
let hasSelectedNode = false;
let nodeStartPos: Position = { x: 0, y: 0 };
let isPanning = false;
let panStart: Position = { x: 0, y: 0 };
let viewportStart: Position = { x: 0, y: 0 };

// 连线拖拽状态
let isDraggingConnection = false;
let connectionDragStartPort: PortRef;

/**
 * 验证连接结果
 */
interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * 验证连接是否有效（应用层验证逻辑）
 */
function validateConnection(fromPort: PortRef, toPort: PortRef): ValidationResult {
  // 不能连接到同一节点
  if (fromPort.nodeId === toPort.nodeId) {
    return { valid: false, reason: "不能连接到同一节点" };
  }

  // 必须是从输出端口到输入端口
  if (fromPort.portType !== "output") {
    return { valid: false, reason: "必须从输出端口开始拖拽" };
  }

  if (toPort.portType !== "input") {
    return { valid: false, reason: "只能连接到输入端口" };
  }

  // 检查连接是否已存在
  if (nodeSystem.connectionExists(fromPort, toPort)) {
    return { valid: false, reason: "连接已存在" };
  }

  return { valid: true };
}

// 设置事件监听器（用于演示事件系统）
nodeSystem.on("connectionDragStart", (event) => {
  console.log("连线拖拽开始:", event);
});

nodeSystem.on("connectionDragMove", (event) => {
  // console.log("连线拖拽移动:", event);
});

nodeSystem.on("connectionDragEnd", (event) => {
  console.log("连线拖拽结束:", event);
});

nodeSystem.on("connectionCreated", (event) => {
  console.log("连线创建成功:", event);
  updateDebugInfo();
});

nodeSystem.on("connectionCreateFailed", (event) => {
  console.warn("连线创建失败:", event);
});

// 鼠标事件处理
canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const screenPos: Position = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
  const worldPos = nodeSystem.screenToWorld(screenPos);

  // 中键：平移
  if (e.button === 1) {
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
    viewportStart = { ...nodeSystem.viewport.offset };
    canvas.style.cursor = "grabbing";
    return;
  }

  // 左键：选择节点或开始拖拽连线
  if (e.button === 0) {
    // 首先检查是否点击了端口
    const hasPort = nodeSystem.hasPortAtPosition(worldPos);

    if (hasPort) {
      const clickedPort = nodeSystem.findPortAtPosition(worldPos);
      // 只能从输出端口开始拖拽连线
      if (clickedPort.portType === "output") {
        isDraggingConnection = true;
        connectionDragStartPort = clickedPort;
        renderer.setDraggingConnection(clickedPort, worldPos, true);

        // 触发拖拽开始事件
        nodeSystem.emit("connectionDragStart", {
          fromPort: clickedPort,
          startPosition: worldPos,
        });
      }
      return;
    }

    // 如果没有点击端口，检查是否点击了节点
    const hasNode = nodeSystem.hasNodeAtPosition(worldPos);
    if (hasNode) {
      selectedNode = nodeSystem.findNodeAtPosition(worldPos);
      hasSelectedNode = true;
      isDragging = true;
      dragStart = worldPos;
      nodeStartPos = { ...selectedNode.position };
      canvas.style.cursor = "grabbing";
    }
  }
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const screenPos: Position = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
  const worldPos = nodeSystem.screenToWorld(screenPos);

  if (isPanning) {
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    nodeSystem.viewport.offset = {
      x: viewportStart.x + dx,
      y: viewportStart.y + dy,
    };
    renderer.render();
    updateDebugInfo();
    return;
  }

  // 拖拽连线
  if (isDraggingConnection && connectionDragStartPort) {
    renderer.updateDraggingConnectionPosition(worldPos);
    renderer.render();

    // 触发拖拽移动事件
    nodeSystem.emit("connectionDragMove", {
      fromPort: connectionDragStartPort,
      currentPosition: worldPos,
    });
    return;
  }

  // 拖拽节点
  if (isDragging && hasSelectedNode) {
    const dx = worldPos.x - dragStart.x;
    const dy = worldPos.y - dragStart.y;
    selectedNode.setPosition({
      x: nodeStartPos.x + dx,
      y: nodeStartPos.y + dy,
    });
    renderer.render();
    updateDebugInfo();
  }
});

canvas.addEventListener("mouseup", (e) => {
  const rect = canvas.getBoundingClientRect();
  const screenPos: Position = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
  const worldPos = nodeSystem.screenToWorld(screenPos);

  // 结束拖拽连线
  if (isDraggingConnection) {
    const hasTargetPort = nodeSystem.hasPortAtPosition(worldPos);
    let success = false;

    if (hasTargetPort) {
      const targetPort = nodeSystem.findPortAtPosition(worldPos);

      if (targetPort.portType === "input") {
        // 应用层验证连接有效性
        const validation = validateConnection(connectionDragStartPort, targetPort);

        if (validation.valid) {
          // 创建连接
          const result = nodeSystem.createConnection(connectionDragStartPort, targetPort);
          success = result.success;
        } else {
          // 验证失败，触发失败事件
          const failReason = validation.reason !== undefined ? validation.reason : "验证失败";
          nodeSystem.emit("connectionCreateFailed", {
            fromPort: connectionDragStartPort,
            toPort: targetPort,
            reason: failReason,
          });
        }

        // 触发拖拽结束事件
        nodeSystem.emit("connectionDragEnd", {
          fromPort: connectionDragStartPort,
          toPort: targetPort,
          endPosition: worldPos,
          success,
        });
      } else {
        // 连接到了输出端口，失败
        const dummyPort: PortRef = { nodeId: "", portId: "", portType: "input" };
        nodeSystem.emit("connectionDragEnd", {
          fromPort: connectionDragStartPort,
          toPort: dummyPort,
          endPosition: worldPos,
          success: false,
        });
      }
    } else {
      // 没有连接到任何端口
      const dummyPort: PortRef = { nodeId: "", portId: "", portType: "input" };
      nodeSystem.emit("connectionDragEnd", {
        fromPort: connectionDragStartPort,
        toPort: dummyPort,
        endPosition: worldPos,
        success: false,
      });
    }

    // 清理拖拽状态
    isDraggingConnection = false;
    renderer.setDraggingConnection(connectionDragStartPort, worldPos, false);
    renderer.render();
  }

  // 结束节点拖拽
  isDragging = false;
  hasSelectedNode = false;
  isPanning = false;
  canvas.style.cursor = "default";
});

canvas.addEventListener("mouseleave", () => {
  // 清理拖拽连线状态
  if (isDraggingConnection) {
    isDraggingConnection = false;
    renderer.setDraggingConnection(connectionDragStartPort, { x: 0, y: 0 }, false);
    renderer.render();
  }

  isDragging = false;
  hasSelectedNode = false;
  isPanning = false;
  canvas.style.cursor = "default";
});

// 滚轮缩放
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = Math.max(0.1, Math.min(5, nodeSystem.viewport.scale * zoomFactor));

  // 以鼠标位置为中心缩放
  const worldPos = nodeSystem.screenToWorld({ x: mouseX, y: mouseY });
  nodeSystem.viewport.scale = newScale;
  const newScreenPos = nodeSystem.worldToScreen(worldPos);

  nodeSystem.viewport.offset = {
    x: nodeSystem.viewport.offset.x + (mouseX - newScreenPos.x),
    y: nodeSystem.viewport.offset.y + (mouseY - newScreenPos.y),
  };

  renderer.render();
  updateDebugInfo();
});

// 更新调试信息
function updateDebugInfo(): void {
  const viewportInfo = document.getElementById("viewport-info");
  const nodeCount = document.getElementById("node-count");
  const connectionCount = document.getElementById("connection-count");
  const selectedNodeInfo = document.getElementById("selected-node");

  if (viewportInfo) {
    viewportInfo.innerHTML = `<pre>缩放: ${nodeSystem.viewport.scale.toFixed(2)}
偏移: (${nodeSystem.viewport.offset.x.toFixed(0)}, ${nodeSystem.viewport.offset.y.toFixed(0)})</pre>`;
  }

  if (nodeCount) {
    nodeCount.innerHTML = `<pre>${nodeSystem.getAllNodes().length}</pre>`;
  }

  if (connectionCount) {
    connectionCount.innerHTML = `<pre>${nodeSystem.connectionManager.getAllConnections().length}</pre>`;
  }

  if (selectedNodeInfo) {
    if (hasSelectedNode) {
      selectedNodeInfo.innerHTML = `<pre>ID: ${selectedNode.id}
位置: (${selectedNode.position.x.toFixed(0)}, ${selectedNode.position.y.toFixed(0)})
标签: ${selectedNode.label}</pre>`;
    } else {
      selectedNodeInfo.innerHTML = "<pre>无</pre>";
    }
  }
}

// 切换调试面板显示
(window as unknown as { toggleDebugPanel: () => void }).toggleDebugPanel =
  function toggleDebugPanel(): void {
    const panel = document.getElementById("debug-panel");
    const button = document.getElementById("toggle-debug");
    if (panel && button) {
      if (panel.style.display === "none") {
        panel.style.display = "block";
        button.textContent = "隐藏调试面板";
      } else {
        panel.style.display = "none";
        button.textContent = "显示调试面板";
      }
    }
  };

// 切换渲染器
(window as unknown as { toggleRenderer: () => void }).toggleRenderer =
  function toggleRenderer(): void {
    const button = document.getElementById("toggle-renderer");
    const rendererInfo = document.getElementById("renderer-info");

    if (currentRendererMode === "default") {
      // 切换到自定义渲染器
      renderer.setNodeRenderer(new RoundedNodeRenderer());
      renderer.setEdgeRouter(new OrthogonalEdgeRouter());
      renderer.setEdgeRenderer(new GradientEdgeRenderer());
      currentRendererMode = "custom";

      if (button) {
        button.textContent = "切换到默认渲染器";
      }
      if (rendererInfo) {
        rendererInfo.innerHTML = "<pre>自定义 (圆角节点 + 直角连线)</pre>";
      }
    } else {
      // 切换到默认渲染器
      renderer.setNodeRenderer(new DefaultNodeRenderer());
      renderer.setEdgeRouter(new DefaultEdgeRouter());
      renderer.setEdgeRenderer(new DefaultEdgeRenderer());
      currentRendererMode = "default";

      if (button) {
        button.textContent = "切换到自定义渲染器";
      }
      if (rendererInfo) {
        rendererInfo.innerHTML = "<pre>默认 (矩形节点 + 贝塞尔曲线)</pre>";
      }
    }

    renderer.render();
  };

// 初始渲染
renderer.render();
updateDebugInfo();

console.log("节点系统 Showcase 已启动");
console.log("节点数量:", nodeSystem.getAllNodes().length);
console.log("连接数量:", nodeSystem.connectionManager.getAllConnections().length);
