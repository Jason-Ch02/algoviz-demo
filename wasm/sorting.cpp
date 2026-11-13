
#include <vector>
#include <cstdlib>
#include <functional>
#include <emscripten.h>

using namespace std;
const int COMPARE = 0;
const int SWAP = 1;
const int SET = 2;
const int SORTED = 3;
void addStep(vector<int>& steps, int type, int i, int j = 0, int value = 0) {
    steps.push_back(type);
    steps.push_back(i);
    steps.push_back(j);
    steps.push_back(value);
}

void bubbleSort(vector<int>& a, vector<int>& steps) {
    int n = a.size();

    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            addStep(steps, COMPARE, j, j + 1);

            if (a[j] > a[j + 1]) {
                addStep(steps, SWAP, j, j + 1);
                swap(a[j], a[j + 1]);
            }
        }
        addStep(steps, SORTED, n - 1 - i);
    }
    if (n > 0) {
        addStep(steps, SORTED, 0);
    }
}

void selectionSort(vector<int>& a, vector<int>& steps) {
    int n = a.size();
    for (int i = 0; i < n; i++) {
        int m = i;
        for (int j = i + 1; j < n; j++) {
            addStep(steps, COMPARE, m, j);
            if (a[j] < a[m]) {
                m = j;
            }
        }
        if (m != i) {
            addStep(steps, SWAP, i, m);
            swap(a[i], a[m]);
        }
        addStep(steps, SORTED, i);
    }
}

void insertionSort(vector<int>& a, vector<int>& steps) {
    int n = a.size();

    if (n > 0) {
        addStep(steps, SORTED, 0);
    }

    for (int i = 1; i < n; i++) {
        int j = i;

        while (j > 0) {
            addStep(steps, COMPARE, j - 1, j);

            if (a[j - 1] > a[j]) {
                addStep(steps, SWAP, j - 1, j);
                swap(a[j - 1], a[j]);
                j--;
            } else {
                break;
            }
        }
    }

    for (int i = 0; i < n; i++) {
        addStep(steps, SORTED, i);
    }
}

void quickSort(vector<int>& a, vector<int>& steps) {
    int n = a.size();

    function<void(int, int)> qs = [&](int lo, int hi) {
        if (lo > hi) return;
        if (lo == hi) {
            addStep(steps, SORTED, lo);
            return;
        }
        int pivot = a[hi];
        int i = lo;
        for (int j = lo; j < hi; j++) {
            addStep(steps, COMPARE, j, hi);
            if (a[j] < pivot) {
                if (i != j) {
                    addStep(steps, SWAP, i, j);
                    swap(a[i], a[j]);
                }
                i++;
            }
        }
        addStep(steps, SWAP, i, hi);
        swap(a[i], a[hi]);
        addStep(steps, SORTED, i);
        qs(lo, i - 1);
        qs(i + 1, hi);
    };
    qs(0, n - 1);
}

void mergeSort(vector<int>& a, vector<int>& steps) {
    int n = a.size();
    vector<int> tmp = a;
    function<void(int, int)> ms = [&](int lo, int hi) {
        if (hi - lo < 1) return;
        int mid = (lo + hi) / 2;
        ms(lo, mid);
        ms(mid + 1, hi);
        int i = lo;
        int j = mid + 1;
        int k = lo;
        while (i <= mid && j <= hi) {
            addStep(steps, COMPARE, i, j);
            if (a[i] <= a[j]) {
                tmp[k++] = a[i++];
            } else {
                tmp[k++] = a[j++];
            }
        }
        while (i <= mid) {
            tmp[k++] = a[i++];
        }
        while (j <= hi) {
            tmp[k++] = a[j++];
        }
        for (int x = lo; x <= hi; x++) {
            addStep(steps, SET, x, 0, tmp[x]);
            a[x] = tmp[x];
        }
    };
    ms(0, n - 1);
    for (int i = 0; i < n; i++) {
        addStep(steps, SORTED, i);
    }
}
extern "C" {
EMSCRIPTEN_KEEPALIVE
int* runSort(int algorithm, int length, const int* values) {
    if (length < 0 || (length > 0 && values == nullptr)) {
        return nullptr;
    }
    vector<int> a(values, values + length);
    vector<int> steps;
    switch (algorithm) {
        case 0:
            bubbleSort(a, steps);
            break;
        case 1:
            selectionSort(a, steps);
            break;
        case 2:
            insertionSort(a, steps);
            break;
        case 3:
            quickSort(a, steps);
            break;
        case 4:
            mergeSort(a, steps);
            break;
        default:
            return nullptr;
    }
    int resultLength = 1 + steps.size();
    int* result = static_cast<int*>(
        malloc(resultLength * sizeof(int))
    );
    if (result == nullptr) return nullptr;
    result[0] = steps.size() / 4;
    for (int i = 0; i < steps.size(); i++) {
        result[i + 1] = steps[i];
    }
    return result;
}
}
