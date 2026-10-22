// Exhaustive testbench: drives all 65,536 16-bit inputs through silu.v and writes "xxxx yyyy" (hex) lines.
// Check with: python3 golden/f4_golden.py --compare results/raw/rtl_out.hex
`timescale 1ns/1ps
module silu_tb;
  reg  signed [15:0] x;
  wire signed [15:0] y;
  integer i, fd;
  silu dut (.x_in(x), .y_out(y));
  initial begin
    fd = $fopen("rtl_out.hex", "w");
    for (i = 0; i < 65536; i = i + 1) begin
      x = i[15:0]; #1;
      $fwrite(fd, "%04x %04x\n", x, y);
    end
    $fclose(fd);
    $finish;
  end
endmodule
