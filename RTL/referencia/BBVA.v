module BBVA(
	input [19:0]instruccion,
	output [31:0]DD
);


wire [3:0]sel;
wire we;
wire [4:0]AW;
wire [4:0]AR2;
wire [4:0]AR1;

assign sel = instruccion[19:16];
assign we = instruccion[15];
assign AW = instruccion[14:10];
assign AR2 = instruccion[9:5];
assign AR1 = instruccion[4:0];


wire [31:0]DR1;
wire [31:0]DR2;
wire ZF;

//instancias
BR br1 (.AR1(AR1),.AR2(AR2),.AW(AW),.Dw(DD),.we(we),.DR1(DR1),.DR2(DR2));

MIPSALU alu1 (.ALUctl(sel),.A(DR1),.B(DR2),.ALUOut(DD),.Zero(ZF));

endmodule
