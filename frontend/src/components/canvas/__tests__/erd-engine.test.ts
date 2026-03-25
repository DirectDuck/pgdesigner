import { describe, it, expect } from 'vitest'
import {
  computeEdgePath,
  buildAdjacency,
  findClusters,
  fixOverlaps,
  gridPlaceCluster,
  layoutClusterSugiyama,
  placeClusterBoxes,
  type Rect,
} from '../erd-engine'

// --- computeEdgePath ---

describe('computeEdgePath', () => {
  const size = { width: 200, height: 100 }

  it('returns path between two separate boxes', () => {
    const result = computeEdgePath({ x: 0, y: 0 }, size, { x: 400, y: 0 }, size, false)
    expect(result).not.toBeNull()
    expect(result!.path).toMatch(/^M /)
    // M + 3 L segments = 4 parts
    expect(result!.path.split(' L ')).toHaveLength(4)
  })

  it('returns loop path for self-ref', () => {
    const result = computeEdgePath({ x: 0, y: 0 }, size, { x: 0, y: 0 }, size, true)
    expect(result).not.toBeNull()
    expect(result!.path).toMatch(/^M /)
    // M + 3 L segments = 4 parts
    expect(result!.path.split(' L ')).toHaveLength(4)
  })

  it('label position is between boxes', () => {
    const result = computeEdgePath({ x: 0, y: 0 }, size, { x: 500, y: 0 }, size, false)
    expect(result).not.toBeNull()
    // Label X should be roughly between the two boxes
    expect(result!.labelX).toBeGreaterThan(100)
    expect(result!.labelX).toBeLessThan(500)
  })

  it('vertical boxes produce valid path', () => {
    const result = computeEdgePath({ x: 0, y: 0 }, size, { x: 0, y: 300 }, size, false)
    expect(result).not.toBeNull()
    expect(result!.path).toMatch(/^M /)
  })
})

// --- buildAdjacency ---

describe('buildAdjacency', () => {
  it('builds bidirectional adjacency', () => {
    const adj = buildAdjacency(['a', 'b', 'c'], [{ from: 'a', to: 'b' }], new Set())
    expect(adj['a']!.has('b')).toBe(true)
    expect(adj['b']!.has('a')).toBe(true)
    expect(adj['c']!.size).toBe(0)
  })

  it('excludes self-refs', () => {
    const adj = buildAdjacency(['a'], [{ from: 'a', to: 'a' }], new Set())
    expect(adj['a']!.size).toBe(0)
  })

  it('excludes hub tables', () => {
    const adj = buildAdjacency(['a', 'b', 'hub'], [{ from: 'a', to: 'hub' }, { from: 'b', to: 'hub' }], new Set(['hub']))
    expect(adj['a']!.size).toBe(0)
    expect(adj['b']!.size).toBe(0)
  })

  it('handles empty inputs', () => {
    const adj = buildAdjacency([], [], new Set())
    expect(Object.keys(adj)).toHaveLength(0)
  })
})

// --- findClusters ---

describe('findClusters', () => {
  it('connected graph is one cluster', () => {
    const adj = buildAdjacency(['a', 'b', 'c'], [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }], new Set())
    const clusters = findClusters(['a', 'b', 'c'], adj, new Set())
    expect(clusters).toHaveLength(1)
    expect(clusters[0]).toHaveLength(3)
  })

  it('disconnected nodes become separate clusters', () => {
    const adj = buildAdjacency(['a', 'b', 'c'], [], new Set())
    const clusters = findClusters(['a', 'b', 'c'], adj, new Set())
    expect(clusters).toHaveLength(3)
  })

  it('two components become two clusters', () => {
    const adj = buildAdjacency(
      ['a', 'b', 'c', 'd'],
      [{ from: 'a', to: 'b' }, { from: 'c', to: 'd' }],
      new Set(),
    )
    const clusters = findClusters(['a', 'b', 'c', 'd'], adj, new Set())
    expect(clusters).toHaveLength(2)
    expect(clusters[0]).toHaveLength(2)
    expect(clusters[1]).toHaveLength(2)
  })

  it('hub tables form separate cluster', () => {
    const adj = buildAdjacency(['a', 'b', 'hub'], [{ from: 'a', to: 'b' }], new Set(['hub']))
    const clusters = findClusters(['a', 'b', 'hub'], adj, new Set(['hub']))
    // 2 clusters: {a,b} and {hub}
    expect(clusters).toHaveLength(2)
    expect(clusters.some(c => c.includes('hub'))).toBe(true)
  })

  it('sorted largest first', () => {
    const adj = buildAdjacency(
      ['a', 'b', 'c', 'd', 'e'],
      [{ from: 'a', to: 'b' }, { from: 'a', to: 'c' }],
      new Set(),
    )
    const clusters = findClusters(['a', 'b', 'c', 'd', 'e'], adj, new Set())
    expect(clusters[0]!.length).toBeGreaterThanOrEqual(clusters[clusters.length - 1]!.length)
  })
})

// --- fixOverlaps ---

describe('fixOverlaps', () => {
  it('separates overlapping rectangles', () => {
    const rects: Rect[] = [
      { id: 'a', x: 0, y: 0, w: 200, h: 100 },
      { id: 'b', x: 50, y: 50, w: 200, h: 100 },
    ]
    const result = fixOverlaps(rects)
    // After fix, bounding boxes should not overlap (with default padding)
    const a = result.find(r => r.id === 'a')!
    const b = result.find(r => r.id === 'b')!
    const xOverlap = a.x + a.w + 50 > b.x && b.x + b.w + 50 > a.x
    const yOverlap = a.y + a.h + 40 > b.y && b.y + b.h + 40 > a.y
    expect(xOverlap && yOverlap).toBe(false)
  })

  it('non-overlapping rects stay separated', () => {
    const rects: Rect[] = [
      { id: 'a', x: 0, y: 0, w: 100, h: 100 },
      { id: 'b', x: 500, y: 500, w: 100, h: 100 },
    ]
    const result = fixOverlaps(rects)
    expect(result).toHaveLength(2)
  })

  it('coordinates are snapped to grid', () => {
    const rects: Rect[] = [{ id: 'a', x: 13, y: 17, w: 100, h: 100 }]
    const result = fixOverlaps(rects, 50, 40, 20)
    expect(result[0]!.x % 20).toBe(0)
    expect(result[0]!.y % 20).toBe(0)
  })

  it('coordinates are non-negative', () => {
    const rects: Rect[] = [
      { id: 'a', x: -100, y: -200, w: 50, h: 50 },
    ]
    const result = fixOverlaps(rects)
    expect(result[0]!.x).toBeGreaterThanOrEqual(0)
    expect(result[0]!.y).toBeGreaterThanOrEqual(0)
  })
})

// --- gridPlaceCluster ---

describe('gridPlaceCluster', () => {
  const sizes = new Map([['a', { width: 200, height: 100 }]])

  it('single node at origin', () => {
    const { targets } = gridPlaceCluster(['a'], {}, sizes, 50, 40)
    expect(targets['a']).toEqual({ x: 0, y: 0 })
  })

  it('empty cluster returns empty', () => {
    const { targets, w, h } = gridPlaceCluster([], {}, sizes, 50, 40)
    expect(Object.keys(targets)).toHaveLength(0)
    expect(w).toBe(0)
    expect(h).toBe(0)
  })

  it('multiple nodes get distinct positions', () => {
    const s = new Map([
      ['a', { width: 200, height: 100 }],
      ['b', { width: 200, height: 100 }],
      ['c', { width: 200, height: 100 }],
    ])
    const adj = buildAdjacency(['a', 'b', 'c'], [{ from: 'a', to: 'b' }], new Set())
    const { targets } = gridPlaceCluster(['a', 'b', 'c'], adj, s, 50, 40)

    const positions = Object.values(targets)
    expect(positions).toHaveLength(3)
    // All positions should be distinct
    const unique = new Set(positions.map(p => `${p.x},${p.y}`))
    expect(unique.size).toBe(3)
  })
})

// --- layoutClusterSugiyama ---

describe('layoutClusterSugiyama', () => {
  const sizes = new Map([
    ['a', { width: 200, height: 100 }],
    ['b', { width: 200, height: 100 }],
    ['c', { width: 200, height: 100 }],
  ])

  it('single node', () => {
    const targets = layoutClusterSugiyama(['a'], [], new Set(), sizes, 50, 40)
    expect(targets['a']).toBeDefined()
  })

  it('chain a→b→c produces layers', () => {
    const refs = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }]
    const targets = layoutClusterSugiyama(['a', 'b', 'c'], refs, new Set(), sizes, 50, 40)
    // Each node should have a position
    expect(Object.keys(targets)).toHaveLength(3)
    // Different Y positions (different layers)
    const ys = new Set(Object.values(targets).map(t => t.y))
    expect(ys.size).toBeGreaterThanOrEqual(2)
  })

  it('all positions are non-negative', () => {
    const refs = [{ from: 'a', to: 'b' }]
    const targets = layoutClusterSugiyama(['a', 'b'], refs, new Set(), sizes, 50, 40)
    for (const t of Object.values(targets)) {
      expect(t.x).toBeGreaterThanOrEqual(0)
      expect(t.y).toBeGreaterThanOrEqual(0)
    }
  })
})

// --- placeClusterBoxes ---

describe('placeClusterBoxes', () => {
  it('offsets clusters in row', () => {
    const targets: Record<string, { x: number; y: number }> = {
      a: { x: 0, y: 0 },
      b: { x: 0, y: 0 },
    }
    const boxes = [
      { w: 300, h: 200, names: ['a'] },
      { w: 300, h: 200, names: ['b'] },
    ]
    placeClusterBoxes(boxes, targets, 50, 20)
    // Second cluster should be offset from first
    expect(targets['b']!.x).toBeGreaterThan(targets['a']!.x)
  })

  it('coordinates are grid-snapped', () => {
    const targets: Record<string, { x: number; y: number }> = {
      a: { x: 13, y: 17 },
    }
    placeClusterBoxes([{ w: 200, h: 100, names: ['a'] }], targets, 50, 20)
    expect(targets['a']!.x % 20).toBe(0)
    expect(targets['a']!.y % 20).toBe(0)
  })
})
