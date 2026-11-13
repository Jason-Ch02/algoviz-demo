
const { runPathfinding } = require("./wasm-bridge.js");

async function main() {
    const rows = 5;
    const cols = 5;

    const walls = new Set([
        "1,1",
        "1,2",
        "1,3",
        "3,1",
        "3,2"
    ]);

    const start = { r: 0, c: 0 };
    const end = { r: 4, c: 4 };

    const algorithms = {
        DFS: 1,
        "Bidirectional BFS": 2,
        Dijkstra: 3,
        "A*": 4
    };

    for (const [name, code] of Object.entries(algorithms)) {
        const result = await runPathfinding(
            code,
            rows,
            cols,
            walls,
            start,
            end
        );

        console.log(`\n${name}`);
        console.log("Order:", result.order);
        console.log("Order End:", result.orderEnd);
        console.log("Path:", result.path);
    }
}

main().catch(console.error);
