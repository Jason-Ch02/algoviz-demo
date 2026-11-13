
#include <algorithm>
#include <tuple>
#include <cstdlib>
#include <queue>
#include <vector>
#include <functional>
#include <emscripten.h>

using namespace std;

// 算法编号
// 1 = DFS
// 2 = Bidirectional BFS
// 3 = Dijkstra
// 4 = A*

struct PathResult {
    vector<int> orderStart;
    vector<int> orderEnd;
    vector<int> path;
};

// 将一维索引转换为行列坐标
int rowOf(int index, int cols) {
    return index / cols;
}

int colOf(int index, int cols) {
    return index % cols;
}

// 检查一个位置是否合法、是否为墙
bool isWalkable(
    int r,
    int c,
    int rows,
    int cols,
    const unsigned char* blocked
) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) {
        return false;
    }

    return blocked[r * cols + c] == 0;
}

// 获取邻居，顺序与原 JS 保持一致：上、下、左、右
vector<int> getNeighbors(
    int index,
    int rows,
    int cols,
    const unsigned char* blocked
) {
    int r = rowOf(index, cols);
    int c = colOf(index, cols);

    const int dr[] = { -1, 1, 0, 0 };
    const int dc[] = { 0, 0, -1, 1 };

    vector<int> result;

    for (int i = 0; i < 4; i++) {
        int nr = r + dr[i];
        int nc = c + dc[i];

        if (isWalkable(nr, nc, rows, cols, blocked)) {
            result.push_back(nr * cols + nc);
        }
    }

    return result;
}

// 根据 parent 数组还原路径
vector<int> reconstructPath(
    const vector<int>& parent,
    int start,
    int end
) {
    vector<int> path;

    if (start == end) {
        path.push_back(start);
        return path;
    }

    if (parent[end] == -1) {
        return path;
    }

    int current = end;

    while (current != -1) {
        path.push_back(current);

        if (current == start) {
            break;
        }

        current = parent[current];
    }

    if (path.back() != start) {
        return {};
    }

    reverse(path.begin(), path.end());
    return path;
}

// DFS
PathResult runDFS(
    int rows,
    int cols,
    const unsigned char* blocked,
    int start,
    int end
) {
    int total = rows * cols;

    PathResult result;

    vector<bool> visited(total, false);
    vector<int> parent(total, -1);
    vector<int> stack;

    visited[start] = true;
    stack.push_back(start);

    while (!stack.empty()) {
        int current = stack.back();
        stack.pop_back();

        if (current == end) {
            break;
        }

        vector<int> neighbors =
            getNeighbors(current, rows, cols, blocked);

        // 反向压栈，使弹出顺序仍为上、下、左、右
        for (int i = static_cast<int>(neighbors.size()) - 1; i >= 0; i--) {
            int next = neighbors[i];

            if (visited[next]) {
                continue;
            }

            visited[next] = true;
            parent[next] = current;
            stack.push_back(next);

            if (next != end) {
                result.orderStart.push_back(next);
            }
        }
    }

    result.path = reconstructPath(parent, start, end);
    return result;
}

// 双向 BFS
PathResult runBidirectionalBFS(
    int rows,
    int cols,
    const unsigned char* blocked,
    int start,
    int end
) {
    int total = rows * cols;

    PathResult result;

    if (start == end) {
        result.path.push_back(start);
        return result;
    }

    vector<int> parentStart(total, -1);
    vector<int> parentEnd(total, -1);

    vector<int> distStart(total, -1);
    vector<int> distEnd(total, -1);

    queue<int> queueStart;
    queue<int> queueEnd;

    distStart[start] = 0;
    distEnd[end] = 0;

    queueStart.push(start);
    queueEnd.push(end);

    int meet = -1;

    // 每次扩展一整层，交替扩展起点侧和终点侧
    auto expandLayer = [&](queue<int>& q,
                           vector<int>& ownDist,
                           vector<int>& otherDist,
                           vector<int>& ownParent,
                           vector<int>& ownOrder) -> bool {
        int layerSize = static_cast<int>(q.size());
        int bestMeet = -1;
        int bestDistance = total + 1;

        for (int i = 0; i < layerSize; i++) {
            int current = q.front();
            q.pop();

            if (otherDist[current] != -1) {
                int distance = ownDist[current] + otherDist[current];

                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMeet = current;
                }
            }

            vector<int> neighbors =
                getNeighbors(current, rows, cols, blocked);

            for (int next : neighbors) {
                if (ownDist[next] != -1) {
                    continue;
                }

                ownDist[next] = ownDist[current] + 1;
                ownParent[next] = current;
                q.push(next);

                if (next != start && next != end) {
                    ownOrder.push_back(next);
                }

                if (otherDist[next] != -1) {
                    int distance = ownDist[next] + otherDist[next];

                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestMeet = next;
                    }
                }
            }
        }

        if (bestMeet != -1) {
            meet = bestMeet;
            return true;
        }

        return false;
    };

    while (!queueStart.empty() && !queueEnd.empty()) {
        if (expandLayer(
            queueStart,
            distStart,
            distEnd,
            parentStart,
            result.orderStart
        )) {
            break;
        }

        if (expandLayer(
            queueEnd,
            distEnd,
            distStart,
            parentEnd,
            result.orderEnd
        )) {
            break;
        }
    }

    if (meet == -1) {
        return result;
    }

    // 起点到交汇点
    vector<int> firstHalf;
    int current = meet;

    while (current != -1) {
        firstHalf.push_back(current);

        if (current == start) {
            break;
        }

        current = parentStart[current];
    }

    if (firstHalf.back() != start) {
        return result;
    }

    reverse(firstHalf.begin(), firstHalf.end());

    // 交汇点到终点
    vector<int> secondHalf;
    current = meet;

    while (current != end) {
        current = parentEnd[current];

        if (current == -1) {
            return result;
        }

        secondHalf.push_back(current);
    }

    result.path = firstHalf;

    // 不重复添加交汇点
    result.path.insert(
        result.path.end(),
        secondHalf.begin(),
        secondHalf.end()
    );

    return result;
}

// Dijkstra 和 A* 共用的优先队列搜索
PathResult runWeightedSearch(
    int algorithm,
    int rows,
    int cols,
    const unsigned char* blocked,
    int start,
    int end
) {
    int total = rows * cols;

    PathResult result;

    const int INF = 1e9;

    vector<int> distance(total, INF);
    vector<int> parent(total, -1);
    vector<bool> visited(total, false);

    // 优先队列节点：估价、实际距离、插入顺序、位置
    using Node = tuple<int, int, int, int>;

    priority_queue<
        Node,
        vector<Node>,
        greater<Node>
    > open;

    int sequence = 0;

    auto heuristic = [&](int index) {
        int r1 = rowOf(index, cols);
        int c1 = colOf(index, cols);
        int r2 = rowOf(end, cols);
        int c2 = colOf(end, cols);

        return abs(r1 - r2) + abs(c1 - c2);
    };

    distance[start] = 0;

    int initialPriority =
        algorithm == 4 ? heuristic(start) : 0;

    open.push({ initialPriority, 0, sequence++, start });

    while (!open.empty()) {
        auto [priority, currentDistance, order, current] = open.top();
        open.pop();

        if (visited[current]) {
            continue;
        }

        visited[current] = true;

        if (current == end) {
            break;
        }

        if (current != start) {
            result.orderStart.push_back(current);
        }

        vector<int> neighbors =
            getNeighbors(current, rows, cols, blocked);

        for (int next : neighbors) {
            if (visited[next]) {
                continue;
            }

            int newDistance = currentDistance + 1;

            if (newDistance < distance[next]) {
                distance[next] = newDistance;
                parent[next] = current;

                int estimate = newDistance;

                if (algorithm == 4) {
                    estimate += heuristic(next);
                }

                open.push({
                    estimate,
                    newDistance,
                    sequence++,
                    next
                });
            }
        }
    }

    result.path = reconstructPath(parent, start, end);
    return result;
}

// 统一导出接口
extern "C" {

EMSCRIPTEN_KEEPALIVE
int* runPathfinding(
    int algorithm,
    int rows,
    int cols,
    const unsigned char* blocked,
    int startIndex,
    int endIndex
) {
    if (
        rows <= 0 ||
        cols <= 0 ||
        blocked == nullptr
    ) {
        return nullptr;
    }

    long long totalLong =
        static_cast<long long>(rows) * cols;

    if (totalLong > 10000000) {
        return nullptr;
    }

    int total = static_cast<int>(totalLong);

    if (
        startIndex < 0 ||
        startIndex >= total ||
        endIndex < 0 ||
        endIndex >= total
    ) {
        return nullptr;
    }

    if (
        blocked[startIndex] != 0 ||
        blocked[endIndex] != 0
    ) {
        return nullptr;
    }

    PathResult result;

    if (algorithm == 1) {
        result = runDFS(
            rows, cols, blocked, startIndex, endIndex
        );
    }
    else if (algorithm == 2) {
        result = runBidirectionalBFS(
            rows, cols, blocked, startIndex, endIndex
        );
    }
    else if (algorithm == 3 || algorithm == 4) {
        result = runWeightedSearch(
            algorithm, rows, cols, blocked, startIndex, endIndex
        );
    }
    else {
        return nullptr;
    }

    int orderStartLength =
        static_cast<int>(result.orderStart.size());

    int orderEndLength =
        static_cast<int>(result.orderEnd.size());

    int pathLength =
        static_cast<int>(result.path.size());

    int outputLength =
        3 + orderStartLength + orderEndLength + pathLength;

    int* output = static_cast<int*>(
        malloc(outputLength * sizeof(int))
    );

    if (output == nullptr) {
        return nullptr;
    }

    int cursor = 0;

    output[cursor++] = orderStartLength;
    output[cursor++] = orderEndLength;
    output[cursor++] = pathLength;

    for (int value : result.orderStart) {
        output[cursor++] = value;
    }

    for (int value : result.orderEnd) {
        output[cursor++] = value;
    }

    for (int value : result.path) {
        output[cursor++] = value;
    }

    return output;
}

}
