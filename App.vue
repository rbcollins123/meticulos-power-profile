<template>
  <div class="outer-wrap">
    <div class="p-6 inner-content">
      <h2 class="text-xl font-bold mb-4 text-center">Meticulous Force Profile Designer</h2>
      <div class="mb-2 flex flex-col items-center">
        <label class="font-semibold mb-1" for="interpolation-input">Interpolation (stages between points):</label>
        <input
          id="interpolation-input"
          type="number"
          min="1"
          v-model.number="interpolation"
          class="border px-2 py-1 w-24 rounded text-center"
        />
      </div>
      <div class="flex flex-col items-center">
        <canvas
          ref="curveCanvas"
          width="600"
          height="320"
          class="border rounded shadow"
          @mousedown="startDrag"
          @mousemove="onDrag"
          @mouseup="endDrag"
          @mouseleave="endDrag"
          @dblclick="addPointAtCursor"
          @contextmenu.prevent="removePointAtCursor"
          @click="onCanvasClick"
          style="touch-action: none;"
        ></canvas>
        <div v-if="selectedIdx !== null" class="mt-3 bg-gray-50 border rounded p-4 flex flex-col items-start">
          <div class="mb-1 font-semibold text-gray-700">Edit Point</div>
          <div class="flex gap-3 items-center">
            <label>
              X (%):
              <input type="number" min="0" max="100" v-model.number="editPos" @change="commitEdit('pos')" class="ml-1 w-20 border rounded px-1 py-0.5"/>
            </label>
            <label>
              Y (N):
              <input type="number" min="-3000" max="3000" v-model.number="editForce" @change="commitEdit('force')" class="ml-1 w-24 border rounded px-1 py-0.5"/>
            </label>
            <button @click="selectedIdx = null" class="ml-4 px-2 py-1 rounded bg-gray-300 text-xs">Done</button>
          </div>
        </div>
      </div>
      <div class="mt-4 flex gap-4 justify-center">
        <button @click="addPoint" class="px-4 py-2 bg-blue-600 text-white rounded">Add Point</button>
        <button @click="removePoint" class="px-4 py-2 bg-red-500 text-white rounded">Remove Point</button>
        <button @click="downloadJSON" class="px-4 py-2 bg-green-600 text-white rounded">Download JSON</button>
      </div>
      <div class="mt-2 text-gray-600 text-sm text-center">
        Drag points to adjust.<br>
        Double-click to add a point. Right-click a point to remove it.<br>
        Click a point to edit. Piston Position: 0–100% (X), Force: -3000 N (up) to +3000 N (down).
      </div>
      <div v-if="jsonOutput" class="mt-4">
        <h3 class="font-semibold">Preview:</h3>
        <pre class="bg-gray-100 p-2 rounded">{{ jsonOutput }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from "vue";

const canvasWidth = 600;
const canvasHeight = 320;
const margin = 60;
const pistonMin = 0;
const pistonMax = 100;
const forceMin = -3000;
const forceMax = 3000;

const curvePoints = ref([
  { pos: 0, force: 3000 },
  { pos: 15, force: 3000 },
  { pos: 30, force: 2500 },
  { pos: 45, force: 1750 }
]);
let dragIndex = -1;

const interpolation = ref(3);

const curveCanvas = ref(null);
const jsonOutput = ref("");

// --- Editing state for a point ---
const selectedIdx = ref(null);
const editPos = ref(0);
const editForce = ref(0);

function onCanvasClick(e) {
  const rect = curveCanvas.value.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const idx = curvePoints.value.findIndex(
    (pt) =>
      Math.abs(posToX(pt.pos) - mx) < 12 && Math.abs(forceToY(pt.force) - my) < 12
  );
  if (idx !== -1) {
    selectedIdx.value = idx;
    editPos.value = curvePoints.value[idx].pos;
    editForce.value = curvePoints.value[idx].force;
  } else {
    selectedIdx.value = null;
  }
}

function commitEdit(field) {
  if (selectedIdx.value === null) return;
  let newPos = Math.max(pistonMin, Math.min(pistonMax, editPos.value));
  let newForce = Math.max(forceMin, Math.min(forceMax, editForce.value));
  // Prevent overlap with neighbor points on X (no same pos)
  if (
    (selectedIdx.value > 0 && newPos <= curvePoints.value[selectedIdx.value - 1].pos) ||
    (selectedIdx.value < curvePoints.value.length - 1 && newPos >= curvePoints.value[selectedIdx.value + 1].pos)
  ) {
    // Snap back to old value if invalid
    editPos.value = curvePoints.value[selectedIdx.value].pos;
    return;
  }
  curvePoints.value[selectedIdx.value] = { pos: newPos, force: newForce };
  // Ensure edit fields match clipped/stored values
  editPos.value = newPos;
  editForce.value = newForce;
}

watch(selectedIdx, idx => {
  if (idx !== null) {
    editPos.value = curvePoints.value[idx].pos;
    editForce.value = curvePoints.value[idx].force;
  }
});

// Utility: Manhattan/step lines between array of points [{pos, force}]
function drawStepLine(ctx, points, color, width = 3, alpha = 1.0, dash = []) {
  if (points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.setLineDash(dash);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  let x0 = posToX(points[0].pos);
  let y0 = forceToY(points[0].force);
  ctx.moveTo(x0, y0);
  for (let i = 1; i < points.length; i++) {
    let x1 = posToX(points[i].pos);
    let y1 = forceToY(points[i].force);
    ctx.lineTo(x1, y0);
    ctx.lineTo(x1, y1);
    x0 = x1;
    y0 = y1;
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1.0;
  ctx.restore();
}

function posToX(pos) {
  return margin + ((pos - pistonMin) / (pistonMax - pistonMin)) * (canvasWidth - 2 * margin);
}
function forceToY(force) {
  return canvasHeight - margin - ((force - forceMin) / (forceMax - forceMin)) * (canvasHeight - 2 * margin);
}
function xToPos(x) {
  return Math.round(
    ((x - margin) / (canvasWidth - 2 * margin)) * (pistonMax - pistonMin) + pistonMin
  );
}
function yToForce(y) {
  return Math.round(
    ((canvasHeight - margin - y) / (canvasHeight - 2 * margin)) * (forceMax - forceMin) + forceMin
  );
}

function redraw() {
  const ctx = curveCanvas.value.getContext("2d");
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw axes
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, margin);
  ctx.lineTo(margin, canvasHeight - margin);
  ctx.lineTo(canvasWidth - margin, canvasHeight - margin);
  ctx.stroke();

  // Draw X-axis ticks (every 1% and 10%)
  for (let i = 0; i <= 100; i++) {
    const x = posToX(i);
    ctx.beginPath();
    if (i % 10 === 0) {
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 2;
      ctx.moveTo(x, canvasHeight - margin);
      ctx.lineTo(x, canvasHeight - margin + 14);
      ctx.stroke();

      ctx.fillStyle = "#333";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(i.toString(), x, canvasHeight - margin + 28);
    } else {
      ctx.strokeStyle = "#bbb";
      ctx.lineWidth = 1;
      ctx.moveTo(x, canvasHeight - margin);
      ctx.lineTo(x, canvasHeight - margin + 7);
      ctx.stroke();
    }
  }

  // Draw Y-axis ticks (every 1000 and 500 for major)
  for (let i = forceMin; i <= forceMax; i += 100) {
    const y = forceToY(i);
    ctx.beginPath();
    if (i % 1000 === 0) {
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 2;
      ctx.moveTo(margin - 22, y);
      ctx.lineTo(margin, y);
      ctx.stroke();

      ctx.fillStyle = "#333";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(i.toString(), margin - 28, y);
    } else if (i % 500 === 0) {
      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 1;
      ctx.moveTo(margin - 10, y);
      ctx.lineTo(margin, y);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "#eee";
      ctx.lineWidth = 1;
      ctx.moveTo(margin - 5, y);
      ctx.lineTo(margin, y);
      ctx.stroke();
    }
  }

  // Draw y=0 horizontal reference line
  const yZero = forceToY(0);
  ctx.beginPath();
  ctx.moveTo(margin, yZero);
  ctx.lineTo(canvasWidth - margin, yZero);
  ctx.strokeStyle = "#d0d0d0";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Interpolated points and step lines ---
  const n = Math.max(1, Math.floor(interpolation.value));
  const allInterpPoints = [];
  for (let i = 1; i < curvePoints.value.length; i++) {
    const prev = curvePoints.value[i-1];
    const next = curvePoints.value[i];
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const pos = prev.pos + (next.pos - prev.pos) * t;
      const force = prev.force + (next.force - prev.force) * t;
      allInterpPoints.push({ pos, force });
    }
  }
  allInterpPoints.push(curvePoints.value[curvePoints.value.length - 1]);
  drawStepLine(ctx, allInterpPoints, "#bbb", 2, 0.8);

  // Draw grey dots for interpolated stages
  for (let i = 1; i < curvePoints.value.length; i++) {
    const prev = curvePoints.value[i-1];
    const next = curvePoints.value[i];
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const pos = prev.pos + (next.pos - prev.pos) * t;
      const force = prev.force + (next.force - prev.force) * t;
      const x = posToX(pos);
      const y = forceToY(force);
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = "#bbb";
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }

  drawStepLine(ctx, curvePoints.value, "#2a2", 3);

  curvePoints.value.forEach((pt, idx) => {
    const x = posToX(pt.pos);
    const y = forceToY(pt.force);

    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = idx === dragIndex ? "#f33" : "#368ee0";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "11px monospace";
    ctx.fillStyle = "#222";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(
      `(${Math.round(pt.pos)}, ${Math.round(pt.force)}N)`,
      x + 12,
      y - 10
    );
  });

  ctx.fillStyle = "#222";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "Piston Position (%)",
    canvasWidth / 2,
    canvasHeight - 4 + 24
  );
  ctx.save();
  ctx.translate(-36, canvasHeight / 2 + 40);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText("Force (N)", 0, 0);
  ctx.restore();
}

watch([curvePoints, interpolation], () => nextTick().then(redraw), { deep: true });
onMounted(() => nextTick().then(redraw));

function getPointAtCursor(e) {
  const rect = curveCanvas.value.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  return curvePoints.value.findIndex(
    (pt) =>
      Math.abs(posToX(pt.pos) - mx) < 12 && Math.abs(forceToY(pt.force) - my) < 12
  );
}

function addPointAtCursor(e) {
  const rect = curveCanvas.value.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  let pos = Math.round(xToPos(mx));
  let force = Math.round(yToForce(my));
  pos = Math.max(pistonMin, Math.min(pistonMax, pos));
  force = Math.max(forceMin, Math.min(forceMax, force));
  if (curvePoints.value.some(pt => pt.pos === pos)) return;
  let insertIdx = curvePoints.value.findIndex(pt => pt.pos > pos);
  if (insertIdx === -1) insertIdx = curvePoints.value.length;
  curvePoints.value.splice(insertIdx, 0, { pos, force });
}

function removePointAtCursor(e) {
  const rect = curveCanvas.value.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const idx = curvePoints.value.findIndex(
    (pt) =>
      Math.abs(posToX(pt.pos) - mx) < 12 && Math.abs(forceToY(pt.force) - my) < 12
  );
  if (idx !== -1 && curvePoints.value.length > 2) {
    curvePoints.value.splice(idx, 1);
    if (selectedIdx.value === idx) selectedIdx.value = null;
  }
}

function startDrag(e) {
  dragIndex = getPointAtCursor(e);
}

function onDrag(e) {
  if (dragIndex === -1) return;
  const rect = curveCanvas.value.getBoundingClientRect();
  let x = e.clientX - rect.left;
  let y = e.clientY - rect.top;
  x = Math.max(margin, Math.min(canvasWidth - margin, x));
  y = Math.max(margin, Math.min(canvasHeight - margin, y));
  const pos = Math.max(0, Math.min(100, xToPos(x)));
  const force = Math.max(forceMin, Math.min(forceMax, yToForce(y)));
  if (dragIndex > 0 && pos <= curvePoints.value[dragIndex - 1].pos) return;
  if (dragIndex < curvePoints.value.length - 1 && pos >= curvePoints.value[dragIndex + 1].pos) return;
  curvePoints.value[dragIndex] = { pos, force };
  if (selectedIdx.value === dragIndex) {
    editPos.value = pos;
    editForce.value = force;
  }
}

function endDrag() {
  dragIndex = -1;
}

function addPoint() {
  let maxGap = 0, insertIdx = 1;
  for (let i = 1; i < curvePoints.value.length; i++) {
    const gap = curvePoints.value[i].pos - curvePoints.value[i-1].pos;
    if (gap > maxGap) {
      maxGap = gap;
      insertIdx = i;
    }
  }
  const prev = curvePoints.value[insertIdx - 1];
  const next = curvePoints.value[insertIdx];
  const newPos = Math.round((prev.pos + next.pos) / 2);
  const newForce = Math.round((prev.force + next.force) / 2);
  curvePoints.value.splice(insertIdx, 0, { pos: newPos, force: newForce });
}

function removePoint() {
  if (curvePoints.value.length > 2) {
    const idxToRemove = curvePoints.value.length - 2;
    curvePoints.value.splice(idxToRemove, 1);
    if (selectedIdx.value === idxToRemove) selectedIdx.value = null;
  }
}

function forceToPower(force) {
  return Math.round((force / 3000) * 100);
}

// --- Add the UUID generator function ---
function exportJSON() {
  const stages = [];
  const n = Math.max(1, Math.floor(interpolation.value));
  for (let i = 1; i < curvePoints.value.length; i++) {
    const prev = curvePoints.value[i-1];
    const next = curvePoints.value[i];
    for (let k = 0; k < n; k++) {
      const t0 = k / n;
      const t1 = (k + 1) / n;
      const pos0 = Math.round(prev.pos + (next.pos - prev.pos) * t0);
      const pos1 = Math.round(prev.pos + (next.pos - prev.pos) * t1);
      const force0 = prev.force + (next.force - prev.force) * t0;
      const powerValue = forceToPower(force0);

      stages.push({
        name: `Stage${stages.length + 1}`,
        type: "power",
        dynamics: {
          points: [[0, powerValue]],
          over: "time",
          interpolation: "curve"
        },
        exit_triggers: [
          {
            type: "piston_position",
            value: pos1,
            comparison: ">=",
            relative: false
          }
        ],
        limits: [
          {
            type: "pressure",
            value: 10
          }
        ],
        key: `power_${stages.length + 1}`
      });
    }
  }
  const uuid = generateUUIDv4();
  const author_id = generateUUIDv4();
  const profile = {
    name: "DrawnProfile",
    author: "YourName",
    author_id: author_id,
    id: uuid,
    temperature: 90,
    final_weight: 40,
    variables: [
      {
        name: "Pressure Limit",
        key: "pressure_Pressure Limit",
        type: "pressure",
        value: 10
      }
    ],
    stages
  };
  jsonOutput.value = JSON.stringify(profile, null, 2);
}

function generateUUIDv4() {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, "0"));
    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join("")
    ].join("-");
  } else {
    let uuid = "", i;
    for (i = 0; i < 36; i++) {
      if (i === 14) {
        uuid += "4";
      } else if (i === 19) {
        uuid += (8 + (Math.random() * 4 | 0)).toString(16);
      } else if ([8, 13, 18, 23].includes(i)) {
        uuid += "-";
      } else {
        uuid += (Math.random() * 16 | 0).toString(16);
      }
    }
    return uuid;
  }
}

function downloadJSON() {
  exportJSON();
  const blob = new Blob([jsonOutput.value], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "profile.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

</script>
