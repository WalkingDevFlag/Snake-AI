// astar.js - A* Pathfinding Module (No changes needed)
function nodeToString(node) { return `${node.x},${node.y}`; }
function stringToNode(str) { const parts = str.split(','); return { x: parseInt(parts[0]), y: parseInt(parts[1]) }; }
function heuristic(nodeA, nodeB) { return Math.abs(nodeA.x - nodeB.x) + Math.abs(nodeA.y - nodeB.y); }
export function findPathAStar(startNode, goalNode, snakeBodyForCollision, gridWidth, gridHeight) {
    const openSet = new Map(); const closedSet = new Set();
    const cameFrom = new Map(); const gScore = new Map();
    const startKey = nodeToString(startNode); gScore.set(startKey, 0);
    const startFScore = heuristic(startNode, goalNode); openSet.set(startKey, { node: startNode, f: startFScore });
    const obstacles = new Set(snakeBodyForCollision.slice(1).map(segment => nodeToString(segment)));
    while (openSet.size > 0) {
        let currentKey = null; let lowestF = Infinity;
        for (const [key, data] of openSet) { if (data.f < lowestF) { lowestF = data.f; currentKey = key; } }
        if (!currentKey) break; const currentData = openSet.get(currentKey); const currentNode = currentData.node;
        if (currentNode.x === goalNode.x && currentNode.y === goalNode.y) {
            const path = []; let tempKey = currentKey;
            while (cameFrom.has(tempKey)) { path.push(stringToNode(tempKey)); tempKey = cameFrom.get(tempKey); }
            return path.reverse();
        } openSet.delete(currentKey); closedSet.add(currentKey);
        const neighbors = [ { x: currentNode.x + 1, y: currentNode.y }, { x: currentNode.x - 1, y: currentNode.y }, { x: currentNode.x, y: currentNode.y + 1 }, { x: currentNode.x, y: currentNode.y - 1 } ];
        for (const neighbor of neighbors) {
            const neighborKey = nodeToString(neighbor);
            if (neighbor.x < 0 || neighbor.x >= gridWidth || neighbor.y < 0 || neighbor.y >= gridHeight) continue;
            if (obstacles.has(neighborKey)) continue; if (closedSet.has(neighborKey)) continue;
            const currentGScoreVal = gScore.get(currentKey) ?? Infinity; const tentativeGScore = currentGScoreVal + 1;
            const neighborGScore = gScore.get(neighborKey) ?? Infinity;
            if (tentativeGScore < neighborGScore) {
                cameFrom.set(neighborKey, currentKey); gScore.set(neighborKey, tentativeGScore);
                const fScore = tentativeGScore + heuristic(neighbor, goalNode); openSet.set(neighborKey, { node: neighbor, f: fScore });
            }
        }
    } return [];
}