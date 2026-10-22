#include <stdio.h>
#include <stdint.h>
#include <math.h>
#include <inttypes.h>

static inline uint64_t read_cycles() {
    uint64_t cycles;
    asm volatile ("rdcycle %0" : "=r" (cycles));
    return cycles;
}

int main() {
    int iterations = 1000;
    
    // Volatile forces the compiler to read these values dynamically at runtime
    volatile int16_t inputs[1000];
    for (int i = 0; i < iterations; i++) {
        // Generates a sweep of test values from -5000 to +4990
        inputs[i] = (i - 500) * 10; 
    }
    
    printf("Starting A/B Performance Benchmark (%d iterations)...\n", iterations);

    // ==========================================
    // TEST A: SOFTWARE BASELINE (Forced Runtime Math)
    // ==========================================
    uint64_t start_sw = read_cycles();
    for (int i = 0; i < iterations; i++) {
        float x_f = inputs[i] / 1024.0f;
        float y_f = x_f / (1.0f + expf(-x_f));
        volatile int16_t sw_result = (int16_t)(y_f * 1024.0f); 
    }
    uint64_t end_sw = read_cycles();
    uint64_t sw_cycles = end_sw - start_sw;

    // ==========================================
    // TEST B: HARDWARE CUSTOM INSTRUCTION
    // ==========================================
    uint64_t start_hw = read_cycles();
    for (int i = 0; i < iterations; i++) {
        volatile int16_t hw_result;
        int16_t current_val = inputs[i];
        asm volatile (
            ".insn r 0x0B, 0, 0, %0, %1, x0"
            : "=r" (hw_result)  
            : "r" (current_val)    
        );
    }
    uint64_t end_hw = read_cycles();
    uint64_t hw_cycles = end_hw - start_hw;

    // ==========================================
    printf("Software Math Cycles : %" PRIu64 "\n", sw_cycles);
    printf("Hardware Inst Cycles : %" PRIu64 "\n", hw_cycles);
    
    if (hw_cycles > 0) {
        printf("SPEEDUP MULTIPLIER   : %.2fx\n", (double)sw_cycles / hw_cycles);
    }

    return 0;
}