#include <stdio.h>
#include <stdint.h>

int main() {
    // 11 Test Vectors (Q6.10 format)
    // Replace these arrays with your exact Icarus Verilog testbench values
    int16_t inputs[11]   = {-4096, -2048, -1024, -512, 0, 512, 1024, 2048, 4096, 5120, -5120};
    int16_t expected[11] = {0, -256, -320, -166, -38, 346, 730, 1792, 3968, 5120, 0};

    int errors = 0;

    printf("Starting Stage 1 Hardware-Software Parity Check...\n");

    for (int i = 0; i < 11; i++) {
        int16_t x = inputs[i];
        int16_t y_out;

        // Trigger the custom RISC-V instruction
        asm volatile (
            ".insn r 0x0B, 0, 0, %0, %1, x0"
            : "=r" (y_out)  
            : "r" (x)    
        );

        if (y_out != expected[i]) {
            printf("FAIL Vector %d: Input %d -> Expected %d, but Hardware returned %d\n", 
                   i, x, expected[i], y_out);
            errors++;
        } else {
            printf("PASS Vector %d: Input %d -> Hardware returned %d\n", i, x, y_out);
        }
    }

    if (errors == 0) {
        printf("\nSUCCESS: gem5 silicon matches Verilog testbench exactly.\n");
    } else {
        printf("\nFAILED: %d vectors mismatched.\n", errors);
    }

    return 0;
}