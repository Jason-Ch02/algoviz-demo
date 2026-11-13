const bfsModuleFactory =
    typeof module !== "undefined" && module.exports
        ? require("./wasm/bfs.js")
        : globalThis.createBFSModule;
let bfsModulePromise = null;

async function getBFSModule() {
    if (!bfsModulePromise) {
        bfsModulePromise = bfsModuleFactory();
    }

    return await bfsModulePromise;
}

async function runBFS(rows, cols, walls, start, end) {
    const Module = await getBFSModule();
    const totalCells = rows * cols;
    const blocked = new Uint8Array(totalCells);
    for (const wall of walls) {
        const [r, c] = wall.split(",").map(Number);
        blocked[r * cols + c] = 1;
    }
    const startIndex = start.r * cols + start.c;
    const endIndex = end.r * cols + end.c;
    const blockedPtr = Module._malloc(blocked.length);

    if (!blockedPtr) {
        throw new Error("WASM memory allocation failed");
    }

    let resultPtr = 0;

    try {
        Module.HEAPU8.set(blocked, blockedPtr);
        resultPtr = Module.ccall(
            "runBFS",
            "number",
            ["number", "number", "number", "number", "number"],
            [rows, cols, blockedPtr, startIndex, endIndex]
        );

        if (!resultPtr) {
            throw new Error("C++ BFS returned a null pointer");
        }
        const base = resultPtr / 4;
        const orderLength = Module.HEAP32[base];
        const pathLength = Module.HEAP32[base + 1];
        const orderIndices = Module.HEAP32.slice(
            base + 2,
            base + 2 + orderLength
        );
        const pathIndices = Module.HEAP32.slice(
            base + 2 + orderLength,
            base + 2 + orderLength + pathLength
        );
        const toKeys = indices =>
            Array.from(indices, index =>
                `${Math.floor(index / cols)},${index % cols}`
            );
        return {
            order: toKeys(orderIndices),
            path: toKeys(pathIndices)
        };

    } finally {
        if (resultPtr) {
            Module._free(resultPtr);
        }

        Module._free(blockedPtr);
    }
}

const pathfindingModuleFactory =
    typeof module !== "undefined" && module.exports
        ? require("./wasm/pathfinding.js")
        : globalThis.createPathfindingModule;

let pathfindingModulePromise = null;

async function getPathfindingModule() {
    if (!pathfindingModulePromise) {
        pathfindingModulePromise = pathfindingModuleFactory();
    }

    return await pathfindingModulePromise;
}


async function runPathfinding(
    algorithm,
    rows,
    cols,
    walls,
    start,
    end
) {
    const Module = await getPathfindingModule();

    const totalCells = rows * cols;
    const blocked = new Uint8Array(totalCells);

    for (const wall of walls) {
        const [r, c] = wall.split(",").map(Number);
        blocked[r * cols + c] = 1;
    }

    const startIndex = start.r * cols + start.c;
    const endIndex = end.r * cols + end.c;

    const blockedPtr = Module._malloc(blocked.length);

    if (!blockedPtr) {
        throw new Error("WASM memory allocation failed");
    }

    let resultPtr = 0;

    try {
        Module.HEAPU8.set(blocked, blockedPtr);

        resultPtr = Module.ccall(
            "runPathfinding",
            "number",
            [
                "number",
                "number",
                "number",
                "number",
                "number",
                "number"
            ],
            [
                algorithm,
                rows,
                cols,
                blockedPtr,
                startIndex,
                endIndex
            ]
        );

        if (!resultPtr) {
            throw new Error("C++ Pathfinding returned a null pointer");
        }

        const base = resultPtr / 4;

        const orderStartLength = Module.HEAP32[base];
        const orderEndLength = Module.HEAP32[base + 1];
        const pathLength = Module.HEAP32[base + 2];

        const orderStartIndices = Module.HEAP32.slice(
            base + 3,
            base + 3 + orderStartLength
        );

        const orderEndIndices = Module.HEAP32.slice(
            base + 3 + orderStartLength,
            base + 3 + orderStartLength + orderEndLength
        );

        const pathIndices = Module.HEAP32.slice(
            base + 3 + orderStartLength + orderEndLength,
            base + 3 + orderStartLength + orderEndLength + pathLength
        );

        const toKeys = indices =>
            Array.from(indices, index =>
                `${Math.floor(index / cols)},${index % cols}`
            );

        return {
            order: toKeys(orderStartIndices),
            orderStart: toKeys(orderStartIndices),
            orderEnd: toKeys(orderEndIndices),
            path: toKeys(pathIndices)
        };

    } finally {
        if (resultPtr) {
            Module._free(resultPtr);
        }

        Module._free(blockedPtr);
    }
}

const sortingModuleFactory =
    typeof module !== "undefined" && module.exports
        ? require("./wasm/sorting.js")
        : globalThis.createSortingModule;

let sortingModulePromise = null;

async function getSortingModule() {
    if (!sortingModulePromise) {
        sortingModulePromise = sortingModuleFactory();
    }
    return await sortingModulePromise;
}

async function runSort(algorithm, values) {
    const Module = await getSortingModule();
    // Convert JavaScript array into Int32Array.
    const input = new Int32Array(values);
    // Allocate WASM memory for the input array.
    const inputPtr = Module._malloc(
        Math.max(1, input.length * 4)
    );
    if (!inputPtr) {
        throw new Error("WASM memory allocation failed");
    }
    let resultPtr = 0;
    try {
        // Copy input data into WASM memory.
        Module.HEAP32.set(input, inputPtr / 4);
        // Call C++ runSort().
        resultPtr = Module.ccall(
            "runSort",
            "number",
            ["number", "number", "number"],
            [algorithm, input.length, inputPtr]
        );
        if (!resultPtr) {
            throw new Error("C++ sorting returned a null pointer");
        }
        // Read the returned animation steps.
        const base = resultPtr / 4;
        const stepCount = Module.HEAP32[base];
        const steps = [];
        const stepTypes = [
            "compare",
            "swap",
            "set",
            "sorted"
        ];
        for (let i = 0; i < stepCount; i++) {
            const offset = base + 1 + i * 4;
            const type = Module.HEAP32[offset];
            const index = Module.HEAP32[offset + 1];
            const otherIndex = Module.HEAP32[offset + 2];
            const value = Module.HEAP32[offset + 3];
            steps.push({
                t: stepTypes[type],
                i: index,
                j: otherIndex,
                v: value
            });
        }
        return steps;
    } finally {
        if (resultPtr) {
            Module._free(resultPtr);
        }
        Module._free(inputPtr);
    }
}
if (typeof window !== "undefined") {
    window.wasmBridge = {
        runBFS,
        runPathfinding,
        runSort
    };
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        runBFS,
        runPathfinding,
        runSort
    };
}