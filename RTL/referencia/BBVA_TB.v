`timescale 1ns/1ps
module BBVA_TB;
reg [19:0]instruccion;
wire [31:0]DD;

BBVA bbva1 (.instruccion(instruccion),.DD(DD));

initial begin
	$dumpfile("dump.vcd");
	$dumpvars(0, BBVA_TB);

	// ADD, we=1: R9 = R2 + R3 = 120 + 55 = 175
	instruccion = 20'b0010_1_01001_00011_00010;
	#10 $display("%b | DD=%0d", instruccion, DD);

	$display("R9=%0d", bbva1.br1.mem[9]);
	$stop;
end

endmodule
