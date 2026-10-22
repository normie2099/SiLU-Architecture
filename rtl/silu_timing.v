`timescale 1ns/1ps

module silu_timing (
    input wire clk,
    input wire signed [15:0] x_in,
    output reg signed [15:0] y_out
);

    reg signed [15:0] x_reg;
    wire signed [15:0] y_silu;

    silu DUT (
        .x_in (x_reg),
        .y_out (y_silu)
    );

    always @(posedge clk) begin
        x_reg <= x_in;
        y_out <= y_silu;
    end

endmodule