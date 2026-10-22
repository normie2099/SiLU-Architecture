/* conv_main.c - one convolution layer followed by the activation, for the Amdahl's-law experiment.
 *
 * 3x3 convolution, 8 input channels -> 8 output channels, 16x16 output, Q6.10 int16 data, int32 accumulate,
 * scalar code (no SIMD). Same -DVARIANT as bench_main.c; VARIANT 0 = convolution only (identity activation).
 * Activation share of a layer = (cycles(v) - cycles(0)) / cycles(v).
 * Data come from a fixed LCG so every variant sees identical inputs and weights.
 */
#include <stdint.h>
#include <stdio.h>
#if VARIANT == 0
#define SILU(q) (q)
#else
#include "silu_kernels.h"
#endif

#define CI 8
#define CO 8
#define OH 16
#define OW 16
#define IH (OH + 2)
#define IW (OW + 2)

static int16_t in[CI][IH][IW], w[CO][CI][3][3];

#ifdef __riscv
static inline uint64_t rdcycle(void)   { uint64_t v; __asm__ volatile("csrr %0, cycle"   : "=r"(v)); return v; }
static inline uint64_t rdinstret(void) { uint64_t v; __asm__ volatile("csrr %0, instret" : "=r"(v)); return v; }
#define M5OP(func) do { register long a0 __asm__("a0") = 0; register long a1 __asm__("a1") = 0; \
    __asm__ volatile(".insn r 0x7b, 0, %2, x0, x0, x0" : : "r"(a0), "r"(a1), "i"(func) : "memory"); } while (0)
#else
static inline uint64_t rdcycle(void)   { return 0; }
static inline uint64_t rdinstret(void) { return 0; }
#define M5OP(func) do { } while (0)
#endif
#define M5_RESET_STATS 0x40
#define M5_DUMP_STATS  0x41

static uint32_t lcg = 12345;
static int rnd(void) { lcg = lcg * 1664525u + 1013904223u; return (int)(lcg >> 16); }

static int layer(void) {
    int check = 0;
    for (int co = 0; co < CO; co++)
        for (int y = 0; y < OH; y++)
            for (int x = 0; x < OW; x++) {
                int32_t acc = 0;
                for (int ci = 0; ci < CI; ci++)
                    for (int ky = 0; ky < 3; ky++)
                        for (int kx = 0; kx < 3; kx++)
                            acc += (int32_t)in[ci][y + ky][x + kx] * w[co][ci][ky][kx];
                int q = acc >> 10;
                if (q > 32767) q = 32767;
                if (q < -32768) q = -32768;
                check += SILU(q);
            }
    return check;
}

int main(void) {
    for (int c = 0; c < CI; c++) for (int y = 0; y < IH; y++) for (int x = 0; x < IW; x++)
        in[c][y][x] = (int16_t)((rnd() & 2047) - 1024);                 /* -1 .. +1 */
    for (int o = 0; o < CO; o++) for (int c = 0; c < CI; c++) for (int a = 0; a < 3; a++) for (int b = 0; b < 3; b++)
        w[o][c][a][b] = (int16_t)((rnd() & 255) - 128);                 /* about +-0.125 */
    int check = layer();                                                /* warm-up */
    M5OP(M5_RESET_STATS);
    uint64_t c0 = rdcycle(), i0 = rdinstret();
    check += layer();
    uint64_t c1 = rdcycle(), i1 = rdinstret();
    M5OP(M5_DUMP_STATS);
    printf("variant=%d inputs=%d reps=1 macs=%d checksum=%d cycles=%llu instret=%llu\n", VARIANT, CO * OH * OW,
           CO * OH * OW * CI * 9, check, (unsigned long long)(c1 - c0), (unsigned long long)(i1 - i0));
    return 0;
}
