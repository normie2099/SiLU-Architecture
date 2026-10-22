/* exhaustive_main.c - run the custom instruction on ALL 65,536 16-bit inputs inside gem5 and print "xxxx yyyy"
 * (hex input, hex output) per line, the same format as the RTL testbench. Compare with
 *   python3 golden/f4_golden.py --compare <the lines>
 * Build with -DVARIANT=5 (custom instruction); -DVARIANT=3 gives the integer C version for comparison. */
#include <stdint.h>
#include <stdio.h>
#include "silu_kernels.h"
int main(void) {
    for (int q = -32768; q <= 32767; q++) {
        int y = SILU(q);
        printf("%04x %04x\n", (unsigned)(uint16_t)q, (unsigned)(uint16_t)(int16_t)y);
    }
    printf("variant=%d inputs=65536 reps=1 checksum=0 cycles=0 instret=0\n", VARIANT);
    return 0;
}
