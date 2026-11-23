`timescale 1ns/1ps
module BR_TB;
reg [4:0]AR1;
reg [4:0]AR2;
reg [4:0]AW;
reg [31:0]Dw;
reg we;
wire [31:0]DR1;
wire [31:0]DR2;

BR br1 (.AR1(AR1),.AR2(AR2),.AW(AW),.Dw(Dw),.we(we),.DR1(DR1),.DR2(DR2));

initial begin
	$dumpfile("dump.vcd");
	$dumpvars(0, BR_TB);

	
	we=0; AW=0; Dw=0; AR1=2; AR2=3;
	#10 $display("AR1=%0d AR2=%0d | DR1=%0d DR2=%0d", AR1, AR2, DR1, DR2);

	
	AW=9; Dw=175; we=1;
	#10 we=0;
	#10 $display("escribe %0d en registro %0d", Dw, AW);

	
	AR1=9; AR2=0;
	#10 $display("AR1=%0d AR2=%0d | DR1=%0d DR2=%0d", AR1, AR2, DR1, DR2);

	$stop;
end

endmodule
