/* bench_main.c - the timed benchmark for the gem5 experiments.
 *
 * One program, one loop body, five variants (-DVARIANT=n):
 *   0 EMPTY   same loop, no activation (measures the loop + load + accumulate overhead)
 *   1 EXPF    float expf (hardware FPU, -mabi=lp64d)         3 F4_INT   integer C f4
 *   4 TABLE   257-entry table + interpolation                5 CUSTOM   the custom instruction
 * Inputs: bench/inputs.h = 1,024 values uniform over [-4, 4) in Q6.10, sorted or (-DSHUFFLE=1) shuffled.
 * The loop is run REPS times; one untimed pass first warms caches and the branch predictor.
 * Only the timed region is between m5 reset_stats and dump_stats, so gem5's stats.txt (last block)
 * covers exactly the loop. The same numbers are also read with rdcycle/rdinstret and printed.
 * A running checksum is printed so the compiler cannot delete the work and runs can be compared.
 */
#include <stdint.h>
#include <stdio.h>
#include "inputs.h"
#if VARIANT == 0
#define SILU(q) (q)
#else
#include "silu_kernels.h"
#endif

#ifndef REPS
#define REPS 20
#endif

#ifdef __riscv
static inline uint64_t rdcycle(void)   { uint64_t v; __asm__ volatile("csrr %0, cycle"   : "=r"(v)); return v; }
static inline uint64_t rdinstret(void) { uint64_t v; __asm__ volatile("csrr %0, instret" : "=r"(v)); return v; }
/* gem5 magic instructions (opcode 0x7b, funct7 = op); a0 = a1 = 0 means "now, once" */
#define M5OP(func) do { register long a0 __asm__("a0") = 0; register long a1 __asm__("a1") = 0; \
    __asm__ volatile(".insn r 0x7b, 0, %2, x0, x0, x0" : : "r"(a0), "r"(a1), "i"(func) : "memory"); } while (0)
#else   /* native build, only used to check the checksums */
static inline uint64_t rdcycle(void)   { return 0; }
static inline uint64_t rdinstret(void) { return 0; }
#define M5OP(func) do { } while (0)
#endif
#define M5_RESET_STATS 0x40
#define M5_DUMP_STATS  0x41

static volatile int salt;   /* opaque zero: stops the compiler from hoisting the repeated work */

/* The inputs are copied to RAM first. With -DSHUFFLE=1 they are put in a fixed pseudo-random order (untimed),
 * so branchy code sees data-dependent branches like a real layer; otherwise they stay sorted (very predictable). */
static short data[N_INPUTS];

static void prepare(void) {
    for (int i = 0; i < N_INPUTS; i++) data[i] = silu_in[i];
#if defined(SHUFFLE) && SHUFFLE
    unsigned r = 2463534242u;
    for (int i = N_INPUTS - 1; i > 0; i--) {
        r ^= r << 13; r ^= r >> 17; r ^= r << 5;           /* xorshift32 */
        int j = r % (i + 1); short t = data[i]; data[i] = data[j]; data[j] = t;
    }
#endif
}

static int pass(void) {
    int acc = 0, s = salt;
    for (int i = 0; i < N_INPUTS; i++) acc += SILU(data[i] + s);
    return acc;
}

int main(void) {
    prepare();
    int check = pass();                         /* warm-up, untimed */
    M5OP(M5_RESET_STATS);
    uint64_t c0 = rdcycle(), i0 = rdinstret();
    for (int r = 0; r < REPS; r++) check += pass();
    uint64_t c1 = rdcycle(), i1 = rdinstret();
    M5OP(M5_DUMP_STATS);
    printf("variant=%d inputs=%d reps=%d checksum=%d cycles=%llu instret=%llu\n",
           VARIANT, N_INPUTS, REPS, check, (unsigned long long)(c1 - c0), (unsigned long long)(i1 - i0));
    return 0;
}
