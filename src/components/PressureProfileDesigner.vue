<template>
  <div class="p-6 inner-content" ref="canvasContainer">
    <div class="mb-4 text-sm text-amber-900 bg-amber-100 border border-amber-300 rounded p-3">
      ⚠️ Generated configurations can change how your espresso machine operates. Verify all settings before use. The developer assumes no responsibility for any outcome.
    </div>
    <h2 class="text-xl font-bold mb-4 text-center">Meticulous Pressure Profile Designer</h2>
    <div class="flex flex-col items-center">
      <canvas
        ref="curveCanvas"
        :width="canvasWidth"
        :height="canvasHeight"
        class="border rounded shadow curve-canvas"
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
        <div class="flex gap-3 items-center flex-wrap">
          <label>
            Piston Position (%):
            <input type="number" min="0" max="100" v-model.number="editPos" @change="commitEdit('pos')" class="ml-1 w-20 border rounded px-1 py-0.5"/>
          </label>
          <label>
            Pressure (bar):
            <input type="number" min="0" max="18" step="0.1" v-model.number="editPressure" @change="commitEdit('pressure')" class="ml-1 w-24 border rounded px-1 py-0.5"/>
          </label>
          <button @click="selectedIdx = null" class="ml-4 px-2 py-1 rounded bg-gray-300 text-xs">Done</button>
        </div>
        <div v-if="translationMode === 'on'" class="mt-2 text-xs text-slate-600">
          Translated (Meticulous): {{ formatPressure(translatePressure(editPressure)) }} bar
        </div>
      </div>
    </div>
    <div class="mt-2 text-gray-600 text-sm text-center">
      Legend: X-axis — Piston Position (% of travel); Y-axis — Pressure (bar)
    </div>
    <div class="mt-1 text-gray-600 text-sm text-center">
      Profile stages generated: <span class="font-semibold text-gray-800">{{ profileStageCount }}</span>
    </div>
    <div v-if="translationMode === 'on'" class="mt-1 text-xs text-slate-600 text-center">
      Translation active: {{ sourceDiameterMm }} mm piston → {{ meticulousPistonDiameterMm }} mm (ratio {{ translationRatio.toFixed(3) }}×)
    </div>
    <div class="mt-4 flex gap-4 justify-center flex-wrap">
      <button @click="addPoint" class="px-4 py-2 bg-blue-600 text-white rounded">Add Point</button>
      <button @click="removePoint" class="px-4 py-2 bg-red-500 text-white rounded">Remove Point</button>
      <button @click="resetGraph" class="px-4 py-2 bg-gray-200 text-gray-800 rounded">Reset Graph</button>
      <button @click="viewJSON" class="px-4 py-2 bg-slate-200 text-gray-800 rounded">View JSON</button>
      <button @click="downloadJSON" class="px-4 py-2 bg-green-600 text-white rounded">Download JSON</button>
    </div>
    <div class="mt-2 text-gray-600 text-sm text-center">
      Drag a point to adjust, or click a point to edit its values directly.<br>
      Double-click to add a point. Right-click a point to remove it.<br>
    </div>
    <div class="mb-2 flex items-center justify-center gap-2">
      <label class="font-semibold" for="distance-resolution-input">Distance resolution (mm):</label>
      <input
        id="distance-resolution-input"
        type="number"
        min="0.1"
        step="0.1"
        v-model.number="distanceResolutionMm"
        class="border px-2 py-1 w-20 rounded text-center"
      />
    </div>
    <div class="mb-4 flex items-center justify-center gap-2">
      <label class="font-semibold" for="max-pressure-input">Max pressure limit (bar):</label>
      <input
        id="max-pressure-input"
        type="number"
        min="0"
        step="0.1"
        v-model.number="maxPressure"
        class="border px-2 py-1 w-16 rounded text-center"
      />
    </div>
    <div class="mb-4 flex flex-wrap items-center justify-center gap-4">
      <span class="font-semibold">Piston position export:</span>
      <label class="flex items-center gap-2">
        <input type="radio" name="position-mode-pressure" value="relative" v-model="positionMode" />
        Relative
      </label>
      <label class="flex items-center gap-2">
        <input type="radio" name="position-mode-pressure" value="absolute" v-model="positionMode" />
        Absolute
      </label>
    </div>
    <div class="mb-4 flex flex-col items-center gap-2">
      <span class="font-semibold">Pre-infusion stage:</span>
      <label class="flex items-center gap-2">
        <input type="checkbox" v-model="preinfusionEnabled" />
        Enable pre-infusion
      </label>
      <div class="flex flex-wrap items-center justify-center gap-4">
        <label class="flex items-center gap-2">
          Target pressure (bar):
          <input
            type="number"
            min="0"
            max="18"
            step="0.1"
            v-model.number="preinfusionPressure"
            :disabled="!preinfusionEnabled"
            class="ml-1 w-20 border rounded px-1 py-0.5"
          />
        </label>
        <label class="flex items-center gap-2">
          Time exit (s):
          <input
            type="number"
            min="0"
            step="0.1"
            v-model.number="preinfusionTime"
            :disabled="!preinfusionEnabled"
            class="ml-1 w-20 border rounded px-1 py-0.5"
          />
        </label>
        <label class="flex items-center gap-2">
          Weight exit (g):
          <input
            type="number"
            min="0"
            step="0.1"
            v-model.number="preinfusionWeight"
            :disabled="!preinfusionEnabled"
            class="ml-1 w-20 border rounded px-1 py-0.5"
          />
        </label>
      </div>
    </div>
    <div class="mb-4 flex flex-col items-center gap-2">
      <span class="font-semibold">Piston diameter translation:</span>
      <div class="flex flex-wrap items-center gap-4">
        <label class="flex items-center gap-2">
          <input type="radio" name="diameter-translation" value="off" v-model="translationMode" />
          Off
        </label>
        <label class="flex items-center gap-2">
          <input type="radio" name="diameter-translation" value="on" v-model="translationMode" />
          On
        </label>
        <label class="flex items-center gap-2">
          Source piston diameter (mm):
          <input
            type="number"
            min="1"
            step="1"
            v-model.number="sourceDiameterMm"
            :disabled="translationMode === 'off'"
            class="ml-1 w-20 border rounded px-1 py-0.5"
          />
        </label>
      </div>
      <div class="text-xs text-slate-600">
        Meticulous piston diameter: {{ meticulousPistonDiameterMm }} mm.
      </div>
    </div>
    <div v-if="jsonOutput" class="mt-4">
      <h3 class="font-semibold">Preview:</h3>
      <pre class="bg-gray-100 p-2 rounded">{{ jsonOutput }}</pre>
    </div>
    <div v-if="jsonError" class="mt-2 text-sm text-red-600 text-center">
      Validation failed: {{ jsonError }}
    </div>
    <footer class="mt-8 text-center text-sm text-gray-600">
      <a
        href="https://github.com/rbcollins123/meticulos-power-profile/blob/main/LICENSE"
        class="text-blue-600 hover:underline"
        target="_blank"
        rel="noopener"
      >
        View project license
      </a>
    </footer>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from "vue";
import { validateProfile } from "../utils/profileValidator.js";

const canvasWidth = ref(600);
const canvasHeight = ref(320);
const canvasAspectRatio = 320 / 600;
const minCanvasWidth = 320;
const minCanvasHeight = 200;
const margin = 60;
const pistonMin = 0;
const pistonMax = 100;
const pressureMin = 0;
const pressureMax = 18;
const meticulousPistonDiameterMm = 53;
const pistonStrokeMm = 74;
const pressureLimitVariableKey = "pressure_Pressure Limit";
const preinfusionPressureVariableKey = "pressure_Preinfusion Pressure";
const preinfusionDurationVariableKey = "time_Preinfusion Max Duration";
const preinfusionWeightVariableKey = "weight_Preinfusion Max Weight";

const defaultCurvePoints = [
  { pos: 0, pressure: 9 },
  { pos: 20, pressure: 7.5 },
  { pos: 40, pressure: 6 },
  { pos: 60, pressure: 4.5 },
  { pos: 80, pressure: 3 },
  { pos: 100, pressure: 0 }
];
const curvePoints = ref(defaultCurvePoints.map(point => ({ ...point })));
let dragIndex = -1;

function getAllowedRange(index, pressureValue = curvePoints.value[index]?.pressure ?? 0, points = curvePoints.value) {
  let minPos = pistonMin;
  let maxPos = pistonMax;

  const prev = points[index - 1];
  if (prev) {
    if (pressureValue >= 0) {
      minPos = Math.max(minPos, prev.pos);
    } else {
      maxPos = Math.min(maxPos, prev.pos);
    }
  }

  const next = points[index + 1];
  if (next) {
    if (next.pressure >= 0) {
      maxPos = Math.min(maxPos, next.pos);
    } else {
      minPos = Math.max(minPos, next.pos);
    }
  }

  if (minPos > maxPos) {
    const midpoint = (minPos + maxPos) / 2;
    minPos = midpoint;
    maxPos = midpoint;
  }

  return { minPos, maxPos };
}

const distanceResolutionMm = ref(2);
const maxPressure = ref(9.5);
const positionMode = ref("relative");
const translationMode = ref("off");
const sourceDiameterMm = ref(meticulousPistonDiameterMm);
const preinfusionEnabled = ref(false);
const preinfusionPressure = ref(2.0);
const preinfusionTime = ref(10);
const preinfusionWeight = ref(5);

const curveCanvas = ref(null);
const jsonOutput = ref("");
const jsonError = ref(null);
const canvasContainer = ref(null);
const profileStateCookie = "meticulous-pressure-profile-state";
const profileStageCount = computed(() => {
  if (curvePoints.value.length === 0) return 0;
  if (curvePoints.value.length === 1) return 1;
  const resolution = Math.max(0.1, Number(distanceResolutionMm.value) || 0.1);
  let total = 0;
  for (let i = 1; i < curvePoints.value.length; i++) {
    const prev = curvePoints.value[i - 1];
    const next = curvePoints.value[i];
    const segmentMm = Math.abs(next.pos - prev.pos) / 100 * pistonStrokeMm;
    const steps = Math.max(1, Math.ceil(segmentMm / resolution));
    total += steps;
  }
  return total + 1;
});

// --- Editing state for a point ---
const selectedIdx = ref(null);
const editPos = ref(0);
const editPressure = ref(0);

const translationRatio = computed(() => {
  if (translationMode.value !== "on") return 1;
  const sourceDiameter = sanitizeDiameter(sourceDiameterMm.value);
  const sourceArea = areaFromDiameterMm(sourceDiameter);
  const targetArea = areaFromDiameterMm(meticulousPistonDiameterMm);
  if (!Number.isFinite(sourceArea) || !Number.isFinite(targetArea) || targetArea === 0) return 1;
  return sourceArea / targetArea;
});

function sanitizeDiameter(value) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed) || parsed <= 0) return meticulousPistonDiameterMm;
  return parsed;
}

function areaFromDiameterMm(diameterMm) {
  const radiusMeters = diameterMm / 1000 / 2;
  return Math.PI * radiusMeters * radiusMeters;
}

function translatePressure(pressureValue) {
  return pressureValue * translationRatio.value;
}

function formatPressure(pressureValue) {
  return (Math.round(pressureValue * 10) / 10).toFixed(1);
}

function onCanvasClick(e) {
  const { x: mx, y: my } = getCanvasCoordinates(e);
  const idx = curvePoints.value.findIndex(
    (pt) =>
      Math.abs(posToX(pt.pos) - mx) < 12 && Math.abs(pressureToY(pt.pressure) - my) < 12
  );
  if (idx !== -1) {
    selectedIdx.value = idx;
    editPos.value = curvePoints.value[idx].pos;
    editPressure.value = curvePoints.value[idx].pressure;
  } else {
    selectedIdx.value = null;
  }
}

function commitEdit(field) {
  if (selectedIdx.value === null) return;
  let newPos = Math.max(pistonMin, Math.min(pistonMax, editPos.value));
  let newPressure = Math.max(pressureMin, Math.min(pressureMax, editPressure.value));
  const { minPos, maxPos } = getAllowedRange(selectedIdx.value, newPressure);
  newPos = Math.max(minPos, Math.min(maxPos, newPos));
  curvePoints.value[selectedIdx.value] = { pos: newPos, pressure: newPressure };
  editPos.value = newPos;
  editPressure.value = newPressure;
}

watch(selectedIdx, idx => {
  if (idx !== null) {
    editPos.value = curvePoints.value[idx].pos;
    editPressure.value = curvePoints.value[idx].pressure;
  }
});

// Utility: Manhattan/step lines between array of points [{pos, pressure}]
function drawStepLine(ctx, points, color, width = 3, alpha = 1.0, dash = []) {
  if (points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.setLineDash(dash);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  let x0 = posToX(points[0].pos);
  let y0 = pressureToY(points[0].pressure);
  ctx.moveTo(x0, y0);
  for (let i = 1; i < points.length; i++) {
    let x1 = posToX(points[i].pos);
    let y1 = pressureToY(points[i].pressure);
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
  return (
    margin
    + ((pos - pistonMin) / (pistonMax - pistonMin)) * (canvasWidth.value - 2 * margin)
  );
}
function pressureToY(pressure) {
  return (
    canvasHeight.value
    - margin
    - ((pressure - pressureMin) / (pressureMax - pressureMin)) * (canvasHeight.value - 2 * margin)
  );
}
function xToPos(x) {
  return Math.round(
    ((x - margin) / (canvasWidth.value - 2 * margin)) * (pistonMax - pistonMin) + pistonMin
  );
}
function yToPressure(y) {
  return (
    ((canvasHeight.value - margin - y) / (canvasHeight.value - 2 * margin)) * (pressureMax - pressureMin) + pressureMin
  );
}

function redraw() {
  const ctx = curveCanvas.value.getContext("2d");
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);

  // Draw axes
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, margin);
  ctx.lineTo(margin, canvasHeight.value - margin);
  ctx.lineTo(canvasWidth.value - margin, canvasHeight.value - margin);
  ctx.stroke();

  // Draw X-axis ticks (every 1% and 10%)
  for (let i = 0; i <= 100; i++) {
    const x = posToX(i);
    ctx.beginPath();
    if (i % 10 === 0) {
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 2;
      ctx.moveTo(x, canvasHeight.value - margin);
      ctx.lineTo(x, canvasHeight.value - margin + 14);
      ctx.stroke();

      ctx.fillStyle = "#333";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(i.toString(), x, canvasHeight.value - margin + 28);
    } else {
      ctx.strokeStyle = "#bbb";
      ctx.lineWidth = 1;
      ctx.moveTo(x, canvasHeight.value - margin);
      ctx.lineTo(x, canvasHeight.value - margin + 7);
      ctx.stroke();
    }
  }

  // Draw Y-axis ticks (every 1 and 2 for major)
  for (let i = pressureMin; i <= pressureMax; i += 1) {
    const y = pressureToY(i);
    ctx.beginPath();
    if (i % 2 === 0) {
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
    } else {
      ctx.strokeStyle = "#bbb";
      ctx.lineWidth = 1;
      ctx.moveTo(margin - 10, y);
      ctx.lineTo(margin, y);
      ctx.stroke();
    }
  }

  // Draw y=0 horizontal reference line
  const yZero = pressureToY(0);
  ctx.beginPath();
  ctx.moveTo(margin, yZero);
  ctx.lineTo(canvasWidth.value - margin, yZero);
  ctx.strokeStyle = "#d0d0d0";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Interpolated points and step lines ---
  const allInterpPoints = buildInterpolatedPoints();
  drawStepLine(ctx, allInterpPoints, "#bbb", 2, 0.8);

  // Draw grey dots for interpolated stages
  allInterpPoints.forEach((point, index) => {
    if (index === 0 || index === allInterpPoints.length - 1) return;
    const x = posToX(point.pos);
    const y = pressureToY(point.pressure);
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = "#bbb";
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1.0;
  });

  drawStepLine(ctx, curvePoints.value, "#2a2", 3);

  curvePoints.value.forEach((pt, idx) => {
    const x = posToX(pt.pos);
    const y = pressureToY(pt.pressure);

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
      `(${Math.round(pt.pos)}, ${formatPressure(pt.pressure)} bar)`,
      x + 12,
      y - 10
    );
  });

  ctx.fillStyle = "#222";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "Piston Position (% of travel)",
    canvasWidth.value / 2,
    canvasHeight.value - 4 + 24
  );
  ctx.save();
  ctx.translate(-36, canvasHeight.value / 2 + 40);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText("Pressure (bar)", 0, 0);
  ctx.restore();
}

watch([curvePoints, distanceResolutionMm], () => nextTick().then(redraw), { deep: true });
watch([canvasWidth, canvasHeight], () => nextTick().then(redraw));
watch([
  curvePoints,
  distanceResolutionMm,
  maxPressure,
  positionMode,
  translationMode,
  sourceDiameterMm,
  preinfusionEnabled,
  preinfusionPressure,
  preinfusionTime,
  preinfusionWeight
], () => {
  saveProfileState();
}, { deep: true });
watch([
  curvePoints,
  distanceResolutionMm,
  maxPressure,
  positionMode,
  translationMode,
  sourceDiameterMm,
  preinfusionEnabled,
  preinfusionPressure,
  preinfusionTime,
  preinfusionWeight
], () => {
  refreshPreviewIfVisible();
}, { deep: true });

function updateCanvasSize() {
  if (!canvasContainer.value) return;
  const rect = canvasContainer.value.getBoundingClientRect();
  const nextWidth = Math.max(minCanvasWidth, Math.floor(rect.width));
  const nextHeight = Math.max(minCanvasHeight, Math.floor(nextWidth * canvasAspectRatio));
  if (nextWidth !== canvasWidth.value || nextHeight !== canvasHeight.value) {
    canvasWidth.value = nextWidth;
    canvasHeight.value = nextHeight;
  }
}

let resizeObserver;
onMounted(() => {
  loadProfileState();
  updateCanvasSize();
  resizeObserver = new ResizeObserver(() => {
    updateCanvasSize();
  });
  if (canvasContainer.value) {
    resizeObserver.observe(canvasContainer.value);
  }
  nextTick().then(redraw);
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

function getPointAtCursor(e) {
  const { x: mx, y: my } = getCanvasCoordinates(e);
  return curvePoints.value.findIndex(
    (pt) =>
      Math.abs(posToX(pt.pos) - mx) < 12 && Math.abs(pressureToY(pt.pressure) - my) < 12
  );
}

function getCanvasCoordinates(e) {
  const rect = curveCanvas.value.getBoundingClientRect();
  const scaleX = rect.width ? canvasWidth.value / rect.width : 1;
  const scaleY = rect.height ? canvasHeight.value / rect.height : 1;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function addPointAtCursor(e) {
  const { x: mx, y: my } = getCanvasCoordinates(e);
  let pos = Math.round(xToPos(mx));
  let pressure = Math.round(yToPressure(my) * 10) / 10;
  pos = Math.max(pistonMin, Math.min(pistonMax, pos));
  pressure = Math.max(pressureMin, Math.min(pressureMax, pressure));
  if (curvePoints.value.some(pt => pt.pos === pos && pt.pressure === pressure)) return;
  let insertIdx = curvePoints.value.length;
  if (curvePoints.value.length > 0) {
    let closestIdx = 0;
    let closestDist = Infinity;
    curvePoints.value.forEach((pt, idx) => {
      const dist = Math.abs(pt.pos - pos) + Math.abs(pt.pressure - pressure) * 0.01;
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });
    insertIdx = pos >= curvePoints.value[closestIdx].pos ? closestIdx + 1 : closestIdx;
  }
  const tempPoints = [...curvePoints.value];
  tempPoints.splice(insertIdx, 0, { pos, pressure });
  const { minPos, maxPos } = getAllowedRange(insertIdx, pressure, tempPoints);
  pos = Math.max(minPos, Math.min(maxPos, pos));
  tempPoints[insertIdx] = { pos, pressure };
  curvePoints.value.splice(0, curvePoints.value.length, ...tempPoints);
}

function removePointAtCursor(e) {
  const { x: mx, y: my } = getCanvasCoordinates(e);
  const idx = curvePoints.value.findIndex(
    (pt) =>
      Math.abs(posToX(pt.pos) - mx) < 12 && Math.abs(pressureToY(pt.pressure) - my) < 12
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
  let { x, y } = getCanvasCoordinates(e);
  x = Math.max(margin, Math.min(canvasWidth.value - margin, x));
  y = Math.max(margin, Math.min(canvasHeight.value - margin, y));
  const rawPos = Math.max(0, Math.min(100, xToPos(x)));
  const pressure = Math.max(pressureMin, Math.min(pressureMax, Math.round(yToPressure(y) * 10) / 10));
  const { minPos, maxPos } = getAllowedRange(dragIndex, pressure);
  const pos = Math.max(minPos, Math.min(maxPos, rawPos));
  curvePoints.value[dragIndex] = { pos, pressure };
  if (selectedIdx.value === dragIndex) {
    editPos.value = pos;
    editPressure.value = pressure;
  }
}

function endDrag() {
  dragIndex = -1;
}

function addPoint() {
  let maxGap = 0, insertIdx = 1;
  for (let i = 1; i < curvePoints.value.length; i++) {
    const gap = Math.abs(curvePoints.value[i].pos - curvePoints.value[i-1].pos);
    if (gap > maxGap) {
      maxGap = gap;
      insertIdx = i;
    }
  }
  const prev = curvePoints.value[insertIdx - 1];
  const next = curvePoints.value[insertIdx];
  const newPos = Math.round((prev.pos + next.pos) / 2);
  const newPressure = Math.round(((prev.pressure + next.pressure) / 2) * 10) / 10;
  const tempPoints = [...curvePoints.value];
  tempPoints.splice(insertIdx, 0, { pos: newPos, pressure: newPressure });
  const { minPos, maxPos } = getAllowedRange(insertIdx, newPressure, tempPoints);
  const clampedPos = Math.max(minPos, Math.min(maxPos, newPos));
  tempPoints[insertIdx] = { pos: clampedPos, pressure: newPressure };
  curvePoints.value.splice(0, curvePoints.value.length, ...tempPoints);
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

function pressureToForce(pressureValue) {
  const area = areaFromDiameterMm(meticulousPistonDiameterMm);
  const pressurePascals = pressureValue * 100000;
  return pressurePascals * area;
}

function buildInterpolatedPoints() {
  if (curvePoints.value.length === 0) return [];
  const resolution = Math.max(0.1, Number(distanceResolutionMm.value) || 0.1);
  const points = [];
  for (let i = 1; i < curvePoints.value.length; i++) {
    const prev = curvePoints.value[i - 1];
    const next = curvePoints.value[i];
    const segmentMm = Math.abs(next.pos - prev.pos) / 100 * pistonStrokeMm;
    const steps = Math.max(1, Math.ceil(segmentMm / resolution));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const pos = prev.pos + (next.pos - prev.pos) * t;
      const pressure = prev.pressure + (next.pressure - prev.pressure) * t;
      points.push({ pos, pressure });
    }
  }
  points.push(curvePoints.value[curvePoints.value.length - 1]);
  return points;
}

function variableReference(key) {
  return `$${key}`;
}

function exportJSON() {
  const stages = [];
  const variables = [
    {
      name: "Pressure Limit",
      key: pressureLimitVariableKey,
      type: "pressure",
      value: Number.isFinite(maxPressure.value) ? maxPressure.value : 10
    }
  ];
  if (preinfusionEnabled.value) {
    const targetPressure = Math.max(0, Math.min(pressureMax, preinfusionPressure.value));
    const targetDuration = Math.max(0, Number(preinfusionTime.value) || 0);
    const targetWeight = Math.max(0, Number(preinfusionWeight.value) || 0);
    variables.push(
      {
        name: "Preinfusion Pressure",
        key: preinfusionPressureVariableKey,
        type: "pressure",
        value: targetPressure
      },
      {
        name: "Preinfusion Max Duration",
        key: preinfusionDurationVariableKey,
        type: "time",
        value: targetDuration
      },
      {
        name: "Preinfusion Max Weight",
        key: preinfusionWeightVariableKey,
        type: "weight",
        value: targetWeight
      }
    );
    stages.push({
      name: `Preinfusion ${formatPressure(targetPressure)} bar`,
      type: "pressure",
      dynamics: {
        points: [[0, variableReference(preinfusionPressureVariableKey)]],
        over: "time",
        interpolation: "curve"
      },
      exit_triggers: [
        {
          type: "time",
          value: variableReference(preinfusionDurationVariableKey)
        },
        {
          type: "weight",
          value: variableReference(preinfusionWeightVariableKey)
        }
      ],
      key: `pressure_preinfusion_${stages.length + 1}`
    });
  }
  const interpolatedPoints = buildInterpolatedPoints();
  for (let i = 1; i < interpolatedPoints.length; i++) {
    const prev = interpolatedPoints[i - 1];
    const next = interpolatedPoints[i];
    const pos1 = Math.round(next.pos);
    const translatedPressure = translatePressure(prev.pressure);
    const force0 = pressureToForce(translatedPressure);
    const powerValue = forceToPower(force0);
    const pressureValue = formatPressure(translatedPressure);

    stages.push({
      name: `${pressureValue} bar`,
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
          relative: positionMode.value === "relative"
        }
      ],
      limits: [
        {
          type: "pressure",
          value: variableReference(pressureLimitVariableKey)
        }
      ],
      key: `power_${pressureValue}_${stages.length + 1}`
    });
  }
  const uuid = generateUUIDv4();
  const author_id = generateUUIDv4();
  const profile = {
    name: "DrawnPressureProfile",
    author: "YourName",
    author_id: author_id,
    id: uuid,
    temperature: 90,
    final_weight: 40,
    variables,
    stages
  };
  const { valid, errors } = validateProfile(profile);
  if (!valid) {
    jsonError.value = formatValidationErrors(errors);
    jsonOutput.value = "";
    return false;
  }
  jsonError.value = null;
  jsonOutput.value = JSON.stringify(profile, null, 2);
  return true;
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
  if (!exportJSON()) return;
  const blob = new Blob([jsonOutput.value], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "profile.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function viewJSON() {
  exportJSON();
}

function refreshPreviewIfVisible() {
  if (jsonOutput.value || jsonError.value) {
    exportJSON();
  }
}

function formatValidationErrors(errors) {
  if (!errors || errors.length === 0) {
    return "Unknown schema validation error.";
  }
  return errors
    .map(error => `${error.instancePath || "/"} ${error.message}`)
    .join("; ");
}

function resetGraph() {
  curvePoints.value.splice(
    0,
    curvePoints.value.length,
    ...defaultCurvePoints.map(point => ({ ...point }))
  );
  selectedIdx.value = null;
}

function saveProfileState() {
  if (typeof document === "undefined") return;
  const payload = {
    curvePoints: curvePoints.value,
    distanceResolutionMm: distanceResolutionMm.value,
    maxPressure: maxPressure.value,
    positionMode: positionMode.value,
    translationMode: translationMode.value,
    sourceDiameterMm: sourceDiameterMm.value,
    preinfusionEnabled: preinfusionEnabled.value,
    preinfusionPressure: preinfusionPressure.value,
    preinfusionTime: preinfusionTime.value,
    preinfusionWeight: preinfusionWeight.value
  };
  const serialized = encodeURIComponent(JSON.stringify(payload));
  const maxAge = 60 * 60 * 24 * 30;
  document.cookie = `${profileStateCookie}=${serialized}; max-age=${maxAge}; path=/; samesite=lax`;
}

function loadProfileState() {
  if (typeof document === "undefined") return;
  const cookieEntry = document.cookie
    .split("; ")
    .find(entry => entry.startsWith(`${profileStateCookie}=`));
  if (!cookieEntry) return;
  const value = cookieEntry.slice(profileStateCookie.length + 1);
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    if (Array.isArray(parsed.curvePoints) && parsed.curvePoints.length >= 2) {
      const sanitizedPoints = parsed.curvePoints
        .filter(point => Number.isFinite(point.pos) && Number.isFinite(point.pressure))
        .map(point => ({
          pos: Math.max(pistonMin, Math.min(pistonMax, Math.round(point.pos))),
          pressure: Math.max(pressureMin, Math.min(pressureMax, point.pressure))
        }));
      if (sanitizedPoints.length >= 2) {
        curvePoints.value.splice(0, curvePoints.value.length, ...sanitizedPoints);
      }
    }
    if (Number.isFinite(parsed.distanceResolutionMm)) {
      distanceResolutionMm.value = Math.max(0.1, parsed.distanceResolutionMm);
    }
    if (Number.isFinite(parsed.maxPressure)) {
      maxPressure.value = parsed.maxPressure;
    }
    if (parsed.positionMode === "relative" || parsed.positionMode === "absolute") {
      positionMode.value = parsed.positionMode;
    }
    if (parsed.translationMode === "on" || parsed.translationMode === "off") {
      translationMode.value = parsed.translationMode;
    }
    if (Number.isFinite(parsed.sourceDiameterMm)) {
      sourceDiameterMm.value = sanitizeDiameter(parsed.sourceDiameterMm);
    }
    if (typeof parsed.preinfusionEnabled === "boolean") {
      preinfusionEnabled.value = parsed.preinfusionEnabled;
    }
    if (Number.isFinite(parsed.preinfusionPressure)) {
      preinfusionPressure.value = Math.max(0, Math.min(pressureMax, parsed.preinfusionPressure));
    }
    if (Number.isFinite(parsed.preinfusionTime)) {
      preinfusionTime.value = Math.max(0, parsed.preinfusionTime);
    }
    if (Number.isFinite(parsed.preinfusionWeight)) {
      preinfusionWeight.value = Math.max(0, parsed.preinfusionWeight);
    }
  } catch (error) {
    console.warn("Failed to load profile state from cookie.", error);
  }
}
</script>

<style scoped>
.curve-canvas {
  width: 100%;
  height: auto;
}
</style>
