
const { runBFS } = require("./wasm-bridge.js");

async function main() {
    const rows = 3;
    const cols = 3;

    // 创建一个 3×3 的测试地图
    const walls = new Set(["1,1"]);

    // 设置起点和终点
    const start = { r: 0, c: 0 };
    const end = { r: 2, c: 2 };

    // 调用 C++ BFS
    const result = await runBFS(
        rows,
        cols,
        walls,
        start,
        end
    );

    console.log("BFS order:", result.order);
    console.log("BFS path:", result.path);
}

main().catch(console.error);
