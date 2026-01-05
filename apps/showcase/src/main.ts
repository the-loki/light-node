import { NodeSystem, Renderer, type Node, type Position, type NodeConfig } from "@vibe-kanban/node-system";

// 获取 Canvas 元素
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas element not found");
}

// 创建节点系统
const nodeSystem = new NodeSystem();

// 创建渲染器
const renderer = new Renderer(canvas, nodeSystem);

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
let selectedNode: Node | undefined = undefined;
let nodeStartPos: Position = { x: 0, y: 0 };
let isPanning = false;
let panStart: Position = { x: 0, y: 0 };
let viewportStart: Position = { x: 0, y: 0 };

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

  // 左键：选择节点
  if (e.button === 0) {
    const node = nodeSystem.findNodeAtPosition(worldPos);
    if (node) {
      selectedNode = node;
      isDragging = true;
      dragStart = worldPos;
      nodeStartPos = { ...node.position };
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

  if (isDragging && selectedNode) {
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

canvas.addEventListener("mouseup", () => {
  isDragging = false;
  isPanning = false;
  canvas.style.cursor = "default";
});

canvas.addEventListener("mouseleave", () => {
  isDragging = false;
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
    if (selectedNode) {
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

// 初始渲染
renderer.render();
updateDebugInfo();

console.log("节点系统 Showcase 已启动");
console.log("节点数量:", nodeSystem.getAllNodes().length);
console.log("连接数量:", nodeSystem.connectionManager.getAllConnections().length);
