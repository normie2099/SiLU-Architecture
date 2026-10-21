/* silu_kernels.h - the SiLU implementations compared in the project.
 * All take and return Q6.10 raw values (int, 16-bit range) so every version computes the same thing.
 * Select the one under test with -DVARIANT=<n>:
 *   1 EXPF_SOFT   float expf, built for an ISA WITHOUT the F extension (soft-float)   [convert in/out]
 *   2 EXPF_HARD   float expf, built for an ISA WITH F (hardware FPU)
 *   3 F4_INT      f4 in plain integer C (shifts, adds, compares)
 *   4 TABLE       257-entry table + linear interpolation, fixed point
 *   5 CUSTOM      the custom instruction (see silu_insn.h)
 * Variants 1 and 2 are the same C code; the difference is the -march flag at build time.
 */
#ifndef SILU_KERNELS_H
#define SILU_KERNELS_H
#include <math.h>
#include "silu_table.h"

#define C1 384
#define C2 38

static inline int silu_expf(int q) {
    float x = (float)q * (1.0f / 1024.0f);
    float y = x / (1.0f + expf(-x));
    return (int)lrintf(y * 1024.0f);
}

static inline int silu_f4_int(int q) {
    int s1 = q >> 1, s2 = q >> 2, s4 = q >> 4;       /* arithmetic shifts (GCC) */
    if (q <= -4096) return 0;
    if (q <= -1024) return -s4 - C1;
    if (q <= 0)     return s2 - C2;
    if (q <= 1024)  return s1 + s2 - C2;
    if (q <= 4096)  return q + s4 - C1;
    return q;
}

static inline int silu_table(int q) {
    if (q > 4096) return q;                           /* x > 4  -> x   (outside the table) */
    if (q < -4096) return 0;                          /* x < -4 -> 0 */
    if (q == 4096) return silu_tab[256];              /* last table point, no neighbour to interpolate */
    int p = q + 4096, i = p >> 5, f = p & 31;
    int a = silu_tab[i], b = silu_tab[i + 1];
    return a + (((b - a) * f) >> 5);
}

#if VARIANT == 5
#include "silu_insn.h"
static inline int silu_custom(int q) { return SILU_INSN(q); }
#endif

#if VARIANT == 1 || VARIANT == 2
#define SILU(q) silu_expf(q)
#elif VARIANT == 3
#define SILU(q) silu_f4_int(q)
#elif VARIANT == 4
#define SILU(q) silu_table(q)
#elif VARIANT == 5
#define SILU(q) silu_custom(q)
#else
#error "define VARIANT=1..5"
#endif
#endif
