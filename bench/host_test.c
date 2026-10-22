/* host_test.c - native check that the C implementations match the golden vectors / exact SiLU.
 * Build: gcc -O2 -DVARIANT=3 host_test.c -lm -o host_test   (variant 3 or 4 or 1)
 * Reads ../golden/f4_vectors.hex when VARIANT=3 and demands 0 mismatches.
 * For VARIANT 4 (table) and 1 (expf) it reports max/mean error vs exact SiLU over the grid instead. */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include "silu_kernels.h"
int main(void) {
#if VARIANT == 3
    FILE *f = fopen("../golden/f4_vectors.hex", "r");
    if (!f) { perror("vectors"); return 2; }
    unsigned a, b; long n = 0, bad = 0;
    while (fscanf(f, "%x %x", &a, &b) == 2) {
        int q = (short)a, exp = (short)b, got = SILU(q);
        if (got != exp) { if (bad < 5) printf("mismatch q=%d got=%d exp=%d\n", q, got, exp); bad++; }
        n++;
    }
    printf("%ld inputs, %ld mismatches\n", n, bad);
    return bad != 0;
#else
    double maxe = 0, sum = 0; long n = 0;
    for (int q = -4096; q <= 4095; q++) {
        double x = q / 1024.0, ex = x / (1 + exp(-x));
        double e = fabs(SILU(q) / 1024.0 - ex); if (e > maxe) maxe = e; sum += e; n++;
    }
    printf("variant %d: max error %.5f, mean error %.5f over %ld inputs in [-4,4)\n", VARIANT, maxe, sum / n, n);
    return 0;
#endif
}
