
const { runSort } = require("./wasm-bridge.js");

// Algorithm names and their C++ IDs.
const algorithms = {
    bubble: 0,
    selection: 1,
    insertion: 2,
    quick: 3,
    merge: 4
};

// Original test array.
const original = [64, 25, 12, 22, 11, 90, 5];

// Expected sorted array.
const expected = original.slice().sort((a, b) => a - b);

// Replay the animation steps on a copy of the array.
function replaySteps(values, steps) {
    const a = values.slice();

    for (const step of steps) {
        if (step.t === "swap") {
            [a[step.i], a[step.j]] = [
                a[step.j],
                a[step.i]
            ];
        } else if (step.t === "set") {
            a[step.i] = step.v;
        }
    }

    return a;
}

async function main() {
    for (const [name, code] of Object.entries(algorithms)) {
        console.log(`\n========== ${name.toUpperCase()} ==========`);

        const steps = await runSort(code, original);

        // Replay all returned steps.
        const result = replaySteps(original, steps);

        // Check whether the result is correct.
        const passed =
            JSON.stringify(result) === JSON.stringify(expected);

        // Count different animation operations.
        const comparisons = steps.filter(
            step => step.t === "compare"
        ).length;

        const swaps = steps.filter(
            step => step.t === "swap"
        ).length;

        const sets = steps.filter(
            step => step.t === "set"
        ).length;

        const sorted = steps.filter(
            step => step.t === "sorted"
        ).length;

        console.log("Original:", original);
        console.log("Result:  ", result);
        console.log("Expected:", expected);

        console.log("Steps:", steps.length);
        console.log("Comparisons:", comparisons);
        console.log("Swaps:", swaps);
        console.log("Sets:", sets);
        console.log("Sorted markers:", sorted);

        console.log(
            passed ? "PASS" : "FAIL"
        );
    }
}

main().catch(error => {
    console.error("Test failed:", error);
    process.exitCode = 1;
});
