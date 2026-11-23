module BR(
	input [4:0]AR1,
	input [4:0]AR2,
	input [4:0]AW,
	input [31:0]Dw,
	input we,
	output [31:0]DR1,
	output [31:0]DR2
);

reg [31:0]mem[0:31];
integer i;

assign DR1 = mem[AR1];
assign DR2 = mem[AR2];

always @*
begin
	if(we)
	begin
		mem[AW] = Dw;
	end
end


initial begin
	for(i=0;i<32;i=i+1) mem[i] = 32'd0;
	$readmemb("datos.txt",mem);
end

endmodule
