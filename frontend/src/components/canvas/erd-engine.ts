/**
 * ERD layout algorithms and edge geometry.
 * Pure functions — no Vue/Vue Flow dependencies.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface Rect {
  id: string
  x: number
  y: number
  w: number
  h: number
}

export interface EdgePath {
  path: string
  labelX: number
  labelY: number
}

export interface EdgeItem {
  name: string
  from: string
  to: string
  path: string
  labelX: number
  labelY: number
  gray: boolean
}

interface NodeSize {
  width: number
  height: number
}

// ── Edge geometry ────────────────────────────────────────────────────

const STUB = 14

function edgePoint(box: { x: number; y: number; w: number; h: number; cx: number; cy: number }, cos: number, sin: number) {
  const hw = box.w / 2, hh = box.h / 2
  const t = Math.abs(cos) * hh > Math.abs(sin) * hw ? hw / Math.abs(cos) : hh / Math.abs(sin)
  return { x: box.cx + cos * t, y: box.cy + sin * t }
}

function stubDir(pt: { x: number; y: number }, box: { x: number; y: number; w: number; h: number }) {
  const eps = 2
  if (Math.abs(pt.x - box.x) < eps) return { x: pt.x - STUB, y: pt.y }
  if (Math.abs(pt.x - (box.x + box.w)) < eps) return { x: pt.x + STUB, y: pt.y }
  if (Math.abs(pt.y - box.y) < eps) return { x: pt.x, y: pt.y - STUB }
  return { x: pt.x, y: pt.y + STUB }
}

function makeBox(x: number, y: number, w: number, h: number) {
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 }
}

export function computeEdgePath(
  srcPos: { x: number; y: number }, srcSize: NodeSize,
  tgtPos: { x: number; y: number }, tgtSize: NodeSize,
  isSelfRef: boolean,
): EdgePath | null {
  const srcBox = makeBox(srcPos.x, srcPos.y, srcSize.width, srcSize.height)
  const tgtBox = makeBox(tgtPos.x, tgtPos.y, tgtSize.width, tgtSize.height)

  if (isSelfRef) {
    const loopSize = 30
    const x0 = srcBox.x + srcBox.w, y0 = srcBox.y + 20, y1 = y0 + loopSize * 2
    return {
      path: `M ${x0} ${y0} L ${x0 + loopSize} ${y0} L ${x0 + loopSize} ${y1} L ${x0} ${y1}`,
      labelX: x0 + loopSize + 4,
      labelY: (y0 + y1) / 2,
    }
  }

  const angle = Math.atan2(tgtBox.cy - srcBox.cy, tgtBox.cx - srcBox.cx)
  const cos = Math.cos(angle), sin = Math.sin(angle)

  const from = edgePoint(srcBox, cos, sin)
  const to = edgePoint(tgtBox, Math.cos(angle + Math.PI), Math.sin(angle + Math.PI))
  const fromStub = stubDir(from, srcBox)
  const toStub = stubDir(to, tgtBox)

  return {
    path: `M ${from.x} ${from.y} L ${fromStub.x} ${fromStub.y} L ${toStub.x} ${toStub.y} L ${to.x} ${to.y}`,
    labelX: (fromStub.x + toStub.x) / 2,
    labelY: (fromStub.y + toStub.y) / 2,
  }
}

// ── Graph utilities ──────────────────────────────────────────────────

export interface AdjList { [id: string]: Set<string> }

export function buildAdjacency(
  nodeIds: string[],
  refs: { from: string; to: string }[],
  hubTables: Set<string>,
): AdjList {
  const adj: AdjList = {}
  for (const id of nodeIds) adj[id] = new Set()
  for (const r of refs) {
    if (r.from === r.to || hubTables.has(r.to) || hubTables.has(r.from)) continue
    adj[r.from]?.add(r.to)
    adj[r.to]?.add(r.from)
  }
  return adj
}

export function findClusters(
  nodeIds: string[],
  adj: AdjList,
  hubTables: Set<string>,
): string[][] {
  const visited = new Set<string>()
  const clusters: string[][] = []
  for (const id of nodeIds) {
    if (visited.has(id) || hubTables.has(id)) continue
    const cluster: string[] = []
    const queue = [id]
    while (queue.length) {
      const cur = queue.shift()!
      if (visited.has(cur)) continue
      visited.add(cur)
      cluster.push(cur)
      for (const nb of (adj[cur] || [])) {
        if (!visited.has(nb)) queue.push(nb)
      }
    }
    clusters.push(cluster)
  }
  // Hub tables as standalone cluster
  const hubNodes = nodeIds.filter(id => hubTables.has(id))
  if (hubNodes.length) clusters.push(hubNodes)
  // Largest first
  clusters.sort((a, b) => b.length - a.length)
  return clusters
}

// ── Fix Overlaps ─────────────────────────────────────────────────────

export function fixOverlaps(rects: Rect[], padX = 50, padY = 40, gridSize = 20): Rect[] {
  const result = rects.map(r => ({ ...r }))

  for (let pass = 0; pass < 100; pass++) {
    let moved = false
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i]!, b = result[j]!
        const ox = (a.x + a.w + padX) - b.x, oy = (a.y + a.h + padY) - b.y
        const oxr = (b.x + b.w + padX) - a.x, oyr = (b.y + b.h + padY) - a.y
        if (ox > 0 && oxr > 0 && oy > 0 && oyr > 0) {
          const px = Math.min(ox, oxr), py = Math.min(oy, oyr)
          if (py < px) {
            const s = py / 2 + 1
            if (a.y <= b.y) { a.y -= s; b.y += s } else { a.y += s; b.y -= s }
          } else {
            const s = px / 2 + 1
            if (a.x <= b.x) { a.x -= s; b.x += s } else { a.x += s; b.x -= s }
          }
          moved = true
        }
      }
    }
    if (!moved) break
  }

  // Normalize: shift to positive + snap to grid
  let minX = Infinity, minY = Infinity
  for (const r of result) { minX = Math.min(minX, r.x); minY = Math.min(minY, r.y) }
  for (const r of result) {
    r.x = Math.max(gridSize, Math.round((r.x - minX + padX) / gridSize) * gridSize)
    r.y = Math.max(gridSize, Math.round((r.y - minY + padY) / gridSize) * gridSize)
  }

  return result
}

// ── Grid placement for cluster ───────────────────────────────────────

export function gridPlaceCluster(
  cluster: string[],
  adj: AdjList,
  sizes: Map<string, NodeSize>,
  padX: number,
  padY: number,
): { targets: Record<string, { x: number; y: number }>; w: number; h: number } {
  const targets: Record<string, { x: number; y: number }> = {}
  if (!cluster.length) return { targets, w: 0, h: 0 }

  const getSize = (id: string) => sizes.get(id) ?? { width: 200, height: 100 }

  if (cluster.length === 1) {
    targets[cluster[0]!] = { x: 0, y: 0 }
    const s = getSize(cluster[0]!)
    return { targets, w: s.width + padX, h: s.height + padY }
  }

  const clusterSet = new Set(cluster)
  const cols = Math.max(2, Math.round(Math.sqrt(cluster.length)))
  const rows = Math.ceil(cluster.length / cols)

  let avgW = 0, avgH = 0
  for (const name of cluster) {
    const s = getSize(name)
    avgW += s.width; avgH += s.height
  }
  avgW = avgW / cluster.length + padX
  avgH = avgH / cluster.length + padY

  const grid: (string | null)[][] = Array.from({ length: rows + 2 }, () => Array(cols + 2).fill(null))
  const cellOf: Record<string, [number, number]> = {}

  // BFS order from most-connected node
  let startNode = cluster[0]!, maxDeg = 0
  for (const name of cluster) {
    const deg = [...(adj[name] || [])].filter(n => clusterSet.has(n)).length
    if (deg > maxDeg) { maxDeg = deg; startNode = name }
  }

  const bfsQueue = [startNode]
  const visited = new Set<string>()
  const placement: string[] = []
  while (bfsQueue.length) {
    const cur = bfsQueue.shift()!
    if (visited.has(cur)) continue
    visited.add(cur); placement.push(cur)
    const neighbors = [...(adj[cur] || [])].filter(n => clusterSet.has(n) && !visited.has(n))
    neighbors.sort((a, b) => {
      const da = [...(adj[a] || [])].filter(n => clusterSet.has(n)).length
      const db = [...(adj[b] || [])].filter(n => clusterSet.has(n)).length
      return db - da
    })
    bfsQueue.push(...neighbors)
  }
  for (const name of cluster) if (!visited.has(name)) placement.push(name)

  const centerR = Math.floor(rows / 2), centerC = Math.floor(cols / 2)
  grid[centerR]![centerC] = placement[0]!
  cellOf[placement[0]!] = [centerR, centerC]

  for (let i = 1; i < placement.length; i++) {
    const name = placement[i]!
    const neighbors = [...(adj[name] || [])].filter(n => clusterSet.has(n) && cellOf[n])

    let targetR: number, targetC: number
    if (neighbors.length > 0) {
      let sumR = 0, sumC = 0
      for (const nb of neighbors) { sumR += cellOf[nb]![0]; sumC += cellOf[nb]![1] }
      targetR = Math.round(sumR / neighbors.length)
      targetC = Math.round(sumC / neighbors.length)
    } else {
      targetR = centerR; targetC = centerC
    }

    let bestR = -1, bestC = -1, bestDist = Infinity
    for (let dr = -(rows + 1); dr <= rows + 1; dr++) {
      for (let dc = -(cols + 1); dc <= cols + 1; dc++) {
        const r = targetR + dr, c = targetC + dc
        if (r < 0 || c < 0 || r >= grid.length || c >= grid[0]!.length) continue
        if (grid[r]![c] !== null) continue
        const dist = dr * dr + dc * dc
        if (dist < bestDist) { bestDist = dist; bestR = r; bestC = c }
      }
    }
    if (bestR >= 0) {
      grid[bestR]![bestC] = name
      cellOf[name] = [bestR, bestC]
    }
  }

  let maxX = 0, maxY = 0
  for (const name of cluster) {
    const cell = cellOf[name]
    if (!cell) continue
    const s = getSize(name)
    targets[name] = { x: cell[1] * avgW, y: cell[0] * avgH }
    maxX = Math.max(maxX, cell[1] * avgW + s.width + padX)
    maxY = Math.max(maxY, cell[0] * avgH + s.height + padY)
  }

  return { targets, w: maxX, h: maxY }
}

// ── Sugiyama layout for cluster ──────────────────────────────────────

export function layoutClusterSugiyama(
  cluster: string[],
  refs: { from: string; to: string }[],
  hubTables: Set<string>,
  sizes: Map<string, NodeSize>,
  padX: number,
  padY: number,
): Record<string, { x: number; y: number }> {
  const clusterSet = new Set(cluster)
  const outgoing: Record<string, string[]> = {}
  const incoming: Record<string, string[]> = {}
  for (const name of cluster) { outgoing[name] = []; incoming[name] = [] }
  for (const r of refs) {
    if (r.from === r.to || !clusterSet.has(r.from) || !clusterSet.has(r.to) || hubTables.has(r.to)) continue
    outgoing[r.from]?.push(r.to); incoming[r.to]?.push(r.from)
  }

  const getSize = (id: string) => sizes.get(id) ?? { width: 200, height: 100 }

  // Layer assignment via longest path
  const layerOf: Record<string, number> = {}
  const longestPath = (name: string, vis: Set<string>): number => {
    if (layerOf[name] !== undefined) return layerOf[name]!
    if (vis.has(name)) return 0
    vis.add(name)
    let mc = -1
    for (const t of (outgoing[name] || [])) mc = Math.max(mc, longestPath(t, vis))
    layerOf[name] = mc + 1
    return layerOf[name]!
  }
  for (const name of cluster) longestPath(name, new Set())

  const layerGroups: Record<number, string[]> = {}
  for (const name of cluster) {
    const l = layerOf[name] ?? 0
    if (!layerGroups[l]) layerGroups[l] = []
    layerGroups[l]!.push(name)
  }
  const layerKeys = Object.keys(layerGroups).map(Number).sort((a, b) => a - b)

  // Barycenter ordering
  const posXL: Record<string, number> = {}
  for (const lk of layerKeys) (layerGroups[lk] || []).forEach((n: string, i: number) => { posXL[n] = i })
  for (let iter = 0; iter < 10; iter++) {
    for (let li = 1; li < layerKeys.length; li++) {
      const group = layerGroups[layerKeys[li]!] || []
      const bary: Record<string, number> = {}
      for (const name of group) {
        const nb = [...(outgoing[name] || []), ...(incoming[name] || [])].filter(n => (layerOf[n] ?? 0) < layerKeys[li]!)
        bary[name] = nb.length > 0 ? nb.reduce((s, n) => s + (posXL[n] ?? 0), 0) / nb.length : (posXL[name] ?? 0)
      }
      group.sort((a: string, b: string) => (bary[a] ?? 0) - (bary[b] ?? 0))
      group.forEach((n: string, i: number) => { posXL[n] = i })
    }
  }

  // Coordinate assignment
  const targets: Record<string, { x: number; y: number }> = {}
  let curY = padY, maxLayerW = 0
  for (const lk of layerKeys) {
    let w = 0
    for (const name of (layerGroups[lk] || [])) w += getSize(name).width + padX
    maxLayerW = Math.max(maxLayerW, w)
  }
  for (const lk of layerKeys) {
    const group = layerGroups[lk] || []
    let layerW = 0
    for (const name of group) layerW += getSize(name).width + padX
    let curX = Math.max(0, (maxLayerW - layerW) / 2)
    let maxH = 0
    for (const name of group) {
      const s = getSize(name)
      targets[name] = { x: curX, y: curY }
      curX += s.width + padX
      maxH = Math.max(maxH, s.height)
    }
    curY += maxH + padY
  }

  return targets
}

// ── Place clusters in rows ───────────────────────────────────────────

export function placeClusterBoxes(
  boxes: { w: number; h: number; names: string[] }[],
  targets: Record<string, { x: number; y: number }>,
  clusterGap: number,
  gridSize: number,
) {
  const totalArea = boxes.reduce((s, c) => s + c.w * c.h, 0)
  const targetWidth = Math.max(2000, Math.sqrt(totalArea) * 1.3)
  let rowX = 0, rowY = 0, rowMaxH = 0

  for (const box of boxes) {
    if (rowX > 0 && rowX + box.w > targetWidth) {
      rowX = 0; rowY += rowMaxH + clusterGap; rowMaxH = 0
    }
    for (const name of box.names) {
      const t = targets[name]
      if (t) {
        t.x = Math.round((t.x + rowX) / gridSize) * gridSize
        t.y = Math.round((t.y + rowY) / gridSize) * gridSize
      }
    }
    rowX += box.w + clusterGap
    rowMaxH = Math.max(rowMaxH, box.h)
  }
}
