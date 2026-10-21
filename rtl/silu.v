 `timescale 1ns/1ps

module silu (
    input  wire signed [15:0] x_in,   // Q6.10
    output reg  signed [15:0] y_out   // Q6.10
);

    // ---------------------------------------------------------
    // Q6.10 constants
    // ---------------------------------------------------------
    localparam signed [15:0] Q_4_0    = 16'sd4096; //  4.0
    localparam signed [15:0] Q_1_0    = 16'sd1024; //  1.0
    localparam signed [15:0] Q_0_375  = 16'sd384;  //  0.375
    localparam signed [15:0] Q_0_0375 = 16'sd38;   // ~0.0375

    // ---------------------------------------------------------
    // Range selection
    //
    // 0 : x <= -4
    // 1 : -4 < x <= -1
    // 2 : -1 < x <=  0
    // 3 :  0 < x <=  1
    // 4 :  1 < x <=  4
    // 5 : x > 4
    // ---------------------------------------------------------
    reg [2:0] rsel;

    // ---------------------------------------------------------
    // Shift operations
    // Q6.10 remains Q6.10 because division is by powers of 2
    // ---------------------------------------------------------
    wire signed [15:0] x_div_2;
    wire signed [15:0] x_div_4;
    wire signed [15:0] x_div_16;

    assign x_div_2  = x_in >>> 1;
    assign x_div_4  = x_in >>> 2;
    assign x_div_16 = x_in >>> 4;

    // ---------------------------------------------------------
    // Shared computational paths
    // ---------------------------------------------------------
    reg signed [17:0] top_path;
    reg signed [17:0] bottom_path;

    // ---------------------------------------------------------
    // Final intermediate result
    // ---------------------------------------------------------
    reg signed [17:0] result_ext;

    always @(*) begin

        // =====================================================
        // 1. Range comparator
        // =====================================================
        if (x_in <= -Q_4_0)
            rsel = 3'd0;
        else if (x_in <= -Q_1_0)
            rsel = 3'd1;
        else if (x_in <= 16'sd0)
            rsel = 3'd2;
        else if (x_in <= Q_1_0)
            rsel = 3'd3;
        else if (x_in <= Q_4_0)
            rsel = 3'd4;
        else
            rsel = 3'd5;


        // =====================================================
        // 2. TOP SHARED PATH
        //
        // Negative:
        //      -x/16 - 0.375
        //
        // Positive:
        //      x + x/16 - 0.375
        //
        // The sign of x selects the required branch.
        // =====================================================
        if (x_in[15] == 1'b1)
            top_path = -x_div_16 - Q_0_375;
        else
            top_path = x_in + x_div_16 - Q_0_375;


        // =====================================================
        // 3. BOTTOM SHARED PATH
        //
        // Negative:
        //      x/4 - 0.0375
        //
        // Positive:
        //      x/2 + x/4 - 0.0375
        // =====================================================
        if (x_in[15] == 1'b1)
            bottom_path = x_div_4 - Q_0_0375;
        else
            bottom_path = x_div_2 + x_div_4 - Q_0_0375;


        // =====================================================
        // 4. Final range selection
        // =====================================================
        case (rsel)

            // x <= -4
            3'd0:
                result_ext = 18'sd0;

            // -4 < x <= -1
            3'd1:
                result_ext = top_path;

            // -1 < x <= 0
            3'd2:
                result_ext = bottom_path;

            // 0 < x <= 1
            3'd3:
                result_ext = bottom_path;

            // 1 < x <= 4
            3'd4:
                result_ext = top_path;

            // x > 4
            3'd5:
                result_ext = x_in;

            default:
                result_ext = 18'sd0;

        endcase


        // =====================================================
        // 5. Saturation
        // =====================================================
        if (result_ext > 18'sd32767)
            y_out = 16'sh7FFF;
        else if (result_ext < -18'sd32768)
            y_out = 16'sh8000;
        else
            y_out = result_ext[15:0];

    end

endmodule