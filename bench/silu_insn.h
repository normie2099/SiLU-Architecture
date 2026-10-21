/* silu_insn.h - assembler macro for the custom SiLU instruction.
 *
 * !! MUST MATCH YOUR gem5 decoder.isa AND YOUR RTL !!
 * Fill in the three numbers below from the decoder you already wrote. Then run
 *   make -C bench check-insn
 * to confirm the encoded word disassembles to the opcode/funct you intended.
 * Default below is only a placeholder: custom-0 (0x0b) is used by some cores for their own
 * instructions, so check your core's manual before using it.
 */
#ifndef SILU_INSN_H
#define SILU_INSN_H

#ifndef SILU_OPCODE
#error "Set SILU_OPCODE (e.g. 0x0b for custom-0, 0x2b custom-1, 0x5b custom-2, 0x7b custom-3), SILU_FUNCT3 and SILU_FUNCT7 to match decoder.isa"
#endif

/* R-type: rd = SILU(rs1); rs2 = x0. */
#define SILU_INSN(x) ({                                                       \
    int _r;                                                                   \
    __asm__ volatile (".insn r %1, %2, %3, %0, %4, x0"                        \
                      : "=r"(_r)                                              \
                      : "i"(SILU_OPCODE), "i"(SILU_FUNCT3), "i"(SILU_FUNCT7), \
                        "r"(x));                                              \
    _r; })

#endif
