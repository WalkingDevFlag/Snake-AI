const AStar = (function() {

    function BinaryHeap(scoreFunction) {
        this.content = [];
        this.scoreFunction = scoreFunction;
    }

    BinaryHeap.prototype = {
        push: function(element) {
            this.content.push(element);
            this.sinkDown(this.content.length - 1);
        },
        pop: function() {
            const result = this.content[0];
            const end = this.content.pop();
            if (this.content.length > 0) {
                this.content[0] = end;
                this.bubbleUp(0);
            }
            return result;
        },
        remove: function(node) {
            const i = this.content.indexOf(node);
            if (i === -1) return; 

            const endNodeValue = this.content.pop(); 
            if (node === endNodeValue && i === this.content.length) { // Node was last and now removed
                return;
            }
            // If it wasn't the last element or if list is now empty
            if (this.content.length === 0 && i === 0 && node !== endNodeValue) {
                 //This condition is tricky. If pop made list empty, and node was not endNodeValue,
                 //it means node was the only element and it was removed.
                 //However, the check `i === -1` should catch if node wasn't found.
                 //If `node === endNodeValue` and list became empty, it was the one.
                 //This should mostly be covered by the `node === endNodeValue` check if it was the one popped.
            } else if (this.content.length > i) { // Ensure index i is still valid
                this.content[i] = endNodeValue;
                if (this.scoreFunction(endNodeValue) < this.scoreFunction(node)) {
                    this.sinkDown(i);
                } else {
                    this.bubbleUp(i);
                }
            }
        },
        size: function() {
            return this.content.length;
        },
        rescoreElement: function(node) {
            this.sinkDown(this.content.indexOf(node));
        },
        sinkDown: function(n) { 
            const element = this.content[n];
            if (element === undefined) return; // Guard against undefined element
            const elementScore = this.scoreFunction(element); 

            while (n > 0) {
                const parentN = ((n + 1) >> 1) - 1;
                const parent = this.content[parentN];
                if (elementScore < this.scoreFunction(parent)) {
                    this.content[parentN] = element;
                    this.content[n] = parent;
                    n = parentN;
                } else {
                    break;
                }
            }
        },
        bubbleUp: function(n) { 
            const length = this.content.length;
            const element = this.content[n];
            if (element === undefined) return; // Guard
            const elemScore = this.scoreFunction(element);

            while (true) {
                const child2N = (n + 1) << 1;
                const child1N = child2N - 1;
                let swapIndex = null;
                let child1Score; // To store child1's score for comparison with child2

                if (child1N < length) {
                    const child1 = this.content[child1N];
                    child1Score = this.scoreFunction(child1);
                    if (child1Score < elemScore) {
                        swapIndex = child1N;
                    }
                }

                if (child2N < length) {
                    const child2 = this.content[child2N];
                    const child2Score = this.scoreFunction(child2);
                    if (child2Score < (swapIndex === null ? elemScore : child1Score)) { // Compare with child1Score if child1 was a candidate
                        swapIndex = child2N;
                    }
                }

                if (swapIndex !== null) {
                    this.content[n] = this.content[swapIndex];
                    this.content[swapIndex] = element;
                    n = swapIndex;
                } else {
                    break;
                }
            }
        }
    };

    function GridNode(x, y, weight) {
        this.x = x;
        this.y = y;
        this.weight = weight;

        this.f = 0;
        this.g = 0;
        this.h = 0;
        this.visited = false;
        this.closed = false;
        this.parent = null;
    }

    GridNode.prototype.toString = function() {
        return "[" + this.x + " " + this.y + "]";
    };

    GridNode.prototype.getCost = function(fromNeighbor) {
        return this.weight;
    };

    GridNode.prototype.isWall = function() {
        return this.weight === 0;
    };

    function Graph(gridIn, options, numCols, numRows) {
        options = options || {};
        this.nodes = [];
        this.diagonal = !!options.diagonal;
        this.grid = [];

        this.blocksX = numCols; 
        this.blocksY = numRows; 

        for (let c = 0; c < this.blocksX; c++) {
            this.grid[c] = [];
            for (let r = 0; r < this.blocksY; r++) {
                let weight = (gridIn && gridIn[c] && gridIn[c][r] !== undefined) ? gridIn[c][r] : 1;
                let node = new GridNode(c, r, weight);
                this.grid[c][r] = node;
                this.nodes.push(node);
            }
        }
        this.init();
    }

    Graph.prototype.init = function() {
        this.dirtyNodes = [];
        for (let i = 0; i < this.nodes.length; i++) {
            astar.cleanNode(this.nodes[i]);
        }
    };

    Graph.prototype.cleanDirty = function() {
        for (let i = 0; i < this.dirtyNodes.length; i++) {
            astar.cleanNode(this.dirtyNodes[i]);
        }
        this.dirtyNodes = [];
    };

    Graph.prototype.markDirty = function(node) {
        this.dirtyNodes.push(node);
    };

    Graph.prototype.neighbors = function(node) {
        const ret = [];
        const x = node.x;
        const y = node.y;

        if (x > 0 && this.grid[x - 1] && this.grid[x - 1][y]) ret.push(this.grid[x - 1][y]);
        if (x < this.blocksX - 1 && this.grid[x + 1] && this.grid[x + 1][y]) ret.push(this.grid[x + 1][y]);
        if (y > 0 && this.grid[x] && this.grid[x][y - 1]) ret.push(this.grid[x][y - 1]);
        if (y < this.blocksY - 1 && this.grid[x] && this.grid[x][y + 1]) ret.push(this.grid[x][y + 1]);

        if (this.diagonal) {
            if (x > 0 && y > 0 && this.grid[x - 1] && this.grid[x - 1][y - 1]) ret.push(this.grid[x - 1][y - 1]);
            if (x < this.blocksX - 1 && y > 0 && this.grid[x + 1] && this.grid[x + 1][y - 1]) ret.push(this.grid[x + 1][y - 1]);
            if (x > 0 && y < this.blocksY - 1 && this.grid[x - 1] && this.grid[x - 1][y + 1]) ret.push(this.grid[x - 1][y + 1]);
            if (x < this.blocksX - 1 && y < this.blocksY - 1 && this.grid[x + 1] && this.grid[x + 1][y + 1]) ret.push(this.grid[x + 1][y + 1]);
        }
        return ret;
    };

    const astar = {
        init: function(graph) {
            for (let i = 0; i < graph.nodes.length; i++) {
                astar.cleanNode(graph.nodes[i]);
            }
        },
        cleanNode: function(node) {
            node.f = 0;
            node.g = 0;
            node.h = 0;
            node.visited = false;
            node.closed = false;
            node.parent = null;
        },
        search: function(graph, start, end, options) {
            graph.cleanDirty();
            options = options || {};
            const heuristic = options.heuristic || astar.heuristics.manhattan;
            const closest = options.closest || false;

            // Priority 3: Robustness for start/end nodes
            if (!start) {
                // console.warn("A* Search: Start node is null or undefined.");
                return [];
            }
            if (!end) {
                // console.warn("A* Search: End node is null or undefined.");
                return [];
            }
            if (start.isWall()) {
                // console.warn("A* Search: Start node is a wall.");
                return []; // Cannot start from a wall
            }
            if (end.isWall() && !closest) {
                // console.warn("A* Search: End node is a wall and 'closest' is not enabled.");
                return []; // Cannot path to a wall unless 'closest' is allowed
            }


            const openHeap = new BinaryHeap(function(node) { return node.f; });
            let closestNode = start; // For 'closest' option

            start.h = heuristic(start, end);
            start.g = 0; // Cost from start to start is 0
            start.f = start.h; // f = g + h
            graph.markDirty(start);
            openHeap.push(start);

            while (openHeap.size() > 0) {
                const currentNode = openHeap.pop();

                if (currentNode === end) {
                    return pathTo(currentNode);
                }

                currentNode.closed = true;

                const neighbors = graph.neighbors(currentNode);
                for (let i = 0, il = neighbors.length; i < il; ++i) {
                    const neighbor = neighbors[i];

                    if (neighbor.closed || neighbor.isWall()) {
                        continue;
                    }

                    const gScore = currentNode.g + neighbor.getCost(currentNode); // Cost to reach neighbor from start
                    const beenVisited = neighbor.visited;

                    if (!beenVisited || gScore < neighbor.g) {
                        neighbor.visited = true;
                        neighbor.parent = currentNode;
                        neighbor.h = neighbor.h || heuristic(neighbor, end); // Calculate h if not already set
                        neighbor.g = gScore;
                        neighbor.f = neighbor.g + neighbor.h;
                        graph.markDirty(neighbor);

                        if (closest) {
                            if (neighbor.h < closestNode.h || (neighbor.h === closestNode.h && neighbor.g < closestNode.g)) {
                                closestNode = neighbor;
                            }
                        }

                        if (!beenVisited) {
                            openHeap.push(neighbor);
                        } else {
                            // Node was already in open list, re-score it (heapify)
                            openHeap.rescoreElement(neighbor);
                        }
                    }
                }
            }

            if (closest && closestNode !== start) { // Ensure closestNode is actually different and a path was found to it
                 let path = pathTo(closestNode);
                 if (path.length > 0 || closestNode === start) return path; // Return path to closest if valid
            }
            return []; // No path found
        },
        heuristics: {
            manhattan: function(pos0, pos1) {
                const d1 = Math.abs(pos1.x - pos0.x);
                const d2 = Math.abs(pos1.y - pos0.y);
                return d1 + d2;
            },
            diagonal: function(pos0, pos1) {
                const D = 1;
                const D2 = Math.sqrt(2);
                const d1 = Math.abs(pos1.x - pos0.x);
                const d2 = Math.abs(pos1.y - pos0.y);
                return (D * (d1 + d2)) + ((D2 - (2 * D)) * Math.min(d1, d2));
            }
        }
    };

    function pathTo(node) {
        let curr = node;
        const path = [];
        while (curr.parent) {
            path.unshift(curr);
            curr = curr.parent;
        }
        return path;
    }

    return {
        Graph: Graph,
        astar: astar,
        GridNode: GridNode
    };

})();