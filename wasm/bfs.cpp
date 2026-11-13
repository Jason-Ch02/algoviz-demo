
#include <algorithm>
#include <cstdlib>
#include <queue>
#include <vector>
#include <emscripten.h>

extern "C" {

EMSCRIPTEN_KEEPALIVE
int* runBFS(
    int rows,
    int cols,
    const unsigned char* blocked,
    int startIndex,
    int endIndex
) {
    if (rows <= 0 || cols <= 0 || blocked == nullptr) {
        return nullptr;
    }

    const int totalCells = rows * cols;

    if (startIndex < 0 || startIndex >= totalCells ||
        endIndex < 0 || endIndex >= totalCells) {
        return nullptr;
    }

    if (blocked[startIndex] || blocked[endIndex]) {
        return nullptr;
    }

    std::vector<unsigned char> visited(totalCells, 0);
    std::vector<int> parent(totalCells, -1);
    std::vector<int> order;

    std::queue<int> frontier;

    visited[startIndex] = 1;
    frontier.push(startIndex);

    bool found = false;

    const int dr[4] = {-1, 1, 0, 0};
    const int dc[4] = {0, 0, -1, 1};

    while (!frontier.empty()) {
        int current = frontier.front();
        frontier.pop();

        if (current != startIndex && current != endIndex) {
            order.push_back(current);
        }

        if (current == endIndex) {
            found = true;
            break;
        }

        int r = current / cols;
        int c = current % cols;

        for (int direction = 0; direction < 4; ++direction) {
            int nr = r + dr[direction];
            int nc = c + dc[direction];

            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
                continue;
            }

            int nextIndex = nr * cols + nc;

            if (blocked[nextIndex] || visited[nextIndex]) {
                continue;
            }

            visited[nextIndex] = 1;
            parent[nextIndex] = current;
            frontier.push(nextIndex);
        }
    }

    std::vector<int> path;

    if (found) {
        int current = endIndex;

        while (current != -1) {
            path.push_back(current);

            if (current == startIndex) {
                break;
            }

            current = parent[current];
        }

        if (path.back() == startIndex) {
            std::reverse(path.begin(), path.end());
        } else {
            path.clear();
        }
    }

    const int resultSize =
        2 + static_cast<int>(order.size()) +
        static_cast<int>(path.size());

    int* result = static_cast<int*>(
        std::malloc(resultSize * sizeof(int))
    );

    if (result == nullptr) {
        return nullptr;
    }

    result[0] = static_cast<int>(order.size());
    result[1] = static_cast<int>(path.size());

    int offset = 2;

    for (int index : order) {
        result[offset++] = index;
    }

    for (int index : path) {
        result[offset++] = index;
    }

    return result;
}

}
