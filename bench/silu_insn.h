/* silu_insn.h - assembler macro for the custom SiLU instruction (R-type, rd = SiLU(rs1), rs2 = x0).
 * Encoding must match gem5/silu_instruction.patch: opcode 0x0B (custom-0), funct3 0, funct7 0.
 */
#ifndef SILU_INSN_H
#define SILU_INSN_H

#ifndef SILU_OPCODE
#define SILU_OPCODE 0x0b
#endif
#ifndef SILU_FUNCT3
#define SILU_FUNCT3 0
#endif
#ifndef SILU_FUNCT7
#define SILU_FUNCT7 0
#endif

#define SILU_INSN(x) ({                                                       \
    int _r;                                                                   \
    __asm__ volatile (".insn r %1, %2, %3, %0, %4, x0"                        \
                      : "=r"(_r)                                              \
                      : "i"(SILU_OPCODE), "i"(SILU_FUNCT3), "i"(SILU_FUNCT7), \
                        "r"(x));                                              \
    _r; })

#endif
