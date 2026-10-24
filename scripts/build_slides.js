// Builds results/slides/SiLU_class_presentation.pptx.  Run from the repo root: node scripts/build_slides.js
const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Ayush Krishna, Vrinda Pandey, Tanvee Chintala, Chandni Srivastava, Eswar Sesha Sai";
pres.title = "Multiplier-Less SiLU Custom Instruction for RISC-V";
const NAVY="14213D", BLUE="2A78D6", ORANGE="EB6834", GREEN="1BAF7A", PINK="E87BA4", INK="1F2937", MUTED="5B6577", TINT="EEF2F8", LINE="D5DCE8";
const FIG="results/figures/ieee/";
const DIM={fig1:[1035,825],fig2:[2148,780],fig3:[2148,810],fig4:[2148,780],fig5:[1035,690],fig6:[2148,780],fig7:[2148,780]};
const FILE={fig1:"fig1_cycles_per_activation",fig2:"fig2_latency_sweep",fig3:"fig3_time_vs_clock",fig4:"fig4_amdahl_yolov8n",fig5:"fig5_yolo_activation_inputs",fig6:"fig6_branch_sorted_vs_shuffled",fig7:"fig7_cache_sweep"};

pres.defineSlideMaster({ title:"CONTENT", background:{color:"FFFFFF"},
  slideNumber:{x:9.2,y:5.2,w:0.5,h:0.3,fontFace:"Calibri",fontSize:10,color:MUTED},
  objects:[{placeholder:{options:{name:"title",type:"title",x:0.5,y:0.3,w:9,h:0.8,fontFace:"Cambria",fontSize:26,bold:true,color:NAVY,valign:"middle",align:"left",margin:0},text:""}}]});
function slide(title, notes){ const s=pres.addSlide({masterName:"CONTENT"}); s.addText(title,{placeholder:"title"}); if(notes) s.addNotes(notes); return s; }
const T=(s,t,o)=>s.addText(t,Object.assign({isTextBox:true,fontFace:"Calibri",fontSize:14,color:INK,margin:0,valign:"top"},o));
const card=(s,x,y,w,h,name)=>s.addShape(pres.shapes.RECTANGLE,{x,y,w,h,fill:{color:TINT},line:{color:TINT},objectName:name||"card"});
function stat(s,x,y,w,big,label,color,sz,h){
  h=h||1.3; card(s,x,y,w,h,"stat card");
  T(s,big,{x:x+0.15,y:y+0.1,w:w-0.3,h:0.6,fontSize:sz||30,bold:true,color:color||BLUE,fontFace:"Cambria"});
  T(s,label,{x:x+0.15,y:y+0.72,w:w-0.3,h:h-0.75,fontSize:12,color:MUTED});
}
function fig(s,id,x,y,w,alt){ const [pw,ph]=DIM[id]; const h=w*ph/pw; s.addImage({path:FIG+FILE[id]+".png",x,y,w,h,altText:alt||id}); return h; }
const H={bold:true,color:"FFFFFF",fill:{color:NAVY},fontFace:"Calibri",fontSize:13,valign:"middle"};
const C=(t,o)=>({text:t,options:Object.assign({fontFace:"Calibri",fontSize:13,color:INK,valign:"middle"},o||{})});
function table(s,head,rows,x,y,w,colW,rowH,aligns){
  const hdr=head.map((t,i)=>({text:t,options:Object.assign({},H,{align:(aligns&&aligns[i])||"left"})}));
  const body=rows.map(r=>r.map((t,i)=>C(t,{align:(aligns&&aligns[i])||"left"})));
  s.addTable([hdr].concat(body),{x,y,w,colW,rowH,border:{type:"solid",color:LINE,pt:0.75}});
}

// 1 title
{ const s=pres.addSlide(); s.background={color:NAVY};
  T(s,"Hardware–Software Co-Design of a Multiplier-Less SiLU Custom Instruction for RISC-V",{x:0.7,y:1.0,w:8.6,h:1.9,fontFace:"Cambria",fontSize:34,bold:true,color:"FFFFFF"});
  T(s,"In-order vs out-of-order in gem5, with YOLOv8n as the workload",{x:0.7,y:3.1,w:8.6,h:0.5,fontSize:20,color:"BFD4F2"});
  T(s,"Ayush Krishna · Vrinda Pandey · Tanvee Chintala · Chandni Srivastava · Eswar Sesha Sai\nSchool of Electronics Engineering, Vellore Institute of Technology",{x:0.7,y:4.3,w:8.6,h:0.7,fontSize:14,color:"BFD4F2"}); }

// 2 problem
{ const s=slide("The problem: SiLU is expensive on a simple core","SiLU(x)=x*sigmoid(x), the activation of YOLOv8. A core with no hardware exponential computes it through the C library expf: about 114 instructions per activation in our measurements. YOLOv8n at 640x640 needs 4.37 billion MACs and 13.9 million SiLU evaluations per image, i.e. about 315 MACs per activation. The question of the project is stated at the bottom.");
  T(s,[{text:"SiLU(x) = x · σ(x) = x / (1 + e⁻ˣ)",options:{bold:true,fontSize:20,color:BLUE,breakLine:true}},
       {text:"Needs an exponential and a division. Without a hardware exponential, software calls the C library: about 114 instructions per activation.",options:{fontSize:15,breakLine:true}},
       {text:" ",options:{fontSize:8,breakLine:true}},
       {text:"Idea: replace it by a six-segment, shift-and-add approximation (Spagnolo et al., ISVLSI 2025) and make it one RISC-V instruction.",options:{fontSize:15}}],{x:0.5,y:1.3,w:4.6,h:2.6});
  stat(s,5.5,1.3,1.9,"4.37 G","MACs per 640×640 image (YOLOv8n)");
  stat(s,7.6,1.3,1.9,"13.9 M","SiLU evaluations per image",ORANGE);
  stat(s,5.5,2.75,4.0,"315","multiply-accumulates per activation: the activation is a small share of the network",GREEN,30,1.25);
  card(s,0.5,4.2,9,0.85,"question box");
  T(s,[{text:"Question: ",options:{bold:true,color:NAVY}},{text:"how much faster does a one-instruction SiLU make real work, on in-order and out-of-order cores, and what limits the gain?"}],{x:0.7,y:4.3,w:8.6,h:0.65,fontSize:15,valign:"middle"}); }

// 3 approximation
{ const s=slide("The approximation: six segments, no multiplier","Q6.10 fixed point: 16 bits, 10 fractional bits, 1.0 = 1024. Constants 384 (0.375) and 38 (0.0375 truncated). Every divide is a shift. The circuit must give an answer for every 16-bit input, so we verified all 65,536 patterns, not only [-4,4]; the tails (0 and x) are part of the function. The speed benchmarks use only [-4,4); the real model sends 8.8% of its activations outside that range.");
  card(s,0.5,1.25,4.9,2.55,"equation panel");
  const lines=["x ≤ −4:        0","−4 < x ≤ −1:   −x/16 − 0.375","−1 < x ≤ 0:    x/4 − 0.037","0 < x ≤ 1:     3x/4 − 0.037","1 < x ≤ 4:     x + x/16 − 0.375","x > 4:         x"];
  T(s,lines.map((l,i)=>({text:l,options:{breakLine:i<5}})),{x:0.7,y:1.4,w:4.6,h:1.9,fontFace:"Courier New",fontSize:14,paraSpaceAfter:5});
  T(s,"Q6.10 fixed point (1.0 = 1024). Divisions are arithmetic shifts.",{x:0.7,y:3.35,w:4.6,h:0.4,fontSize:12,color:MUTED});
  stat(s,5.7,1.25,1.8,"0.028","mean abs. error on (−4, 4)");
  stat(s,7.7,1.25,1.8,"0.072","max error, at the edges",ORANGE);
  stat(s,5.7,2.65,1.8,"191","logic elements, 0 multipliers",GREEN);
  stat(s,7.7,2.65,1.8,"8.06 ns","data delay (Quartus)");
  T(s,[{text:"Verified on all 65,536 possible 16-bit inputs",options:{bold:true,color:NAVY,breakLine:true}},
       {text:"including the tails (x ≤ −4 → 0, x > 4 → x). RTL (Icarus), C, PyTorch and the instruction inside gem5 all match the golden model: 0 mismatches.",options:{}}],{x:0.5,y:4.0,w:9,h:1.0,fontSize:14}); }

// 4 flow
{ const s=slide("Synthesis delay to gem5 latency, by script","A hand-typed '1 cycle' in gem5 would disconnect synthesis from simulation. run_gem5.py computes latency from the Quartus delay and the simulated clock. Multi-cycle: ceil(d/T). Pipelined: smallest N with d/N + 0.3 ns <= T (0.3 ns register overhead is an assumption). 296 gem5 runs in total.");
  const steps=[["RTL","silu.v, combinational"],["Quartus","8.058 ns, 191 LEs"],["run_gem5.py","latency from delay and clock"],["gem5","custom op class + own unit"]];
  steps.forEach((st,i)=>{ const x=0.5+i*2.35; s.addShape(pres.shapes.RECTANGLE,{x,y:1.4,w:2.0,h:1.2,fill:{color:i==2?BLUE:TINT},line:{color:i==2?BLUE:TINT},objectName:"flow box "+(i+1)});
    T(s,st[0],{x:x+0.1,y:1.52,w:1.8,h:0.4,fontSize:18,bold:true,color:i==2?"FFFFFF":NAVY,align:"center"});
    T(s,st[1],{x:x+0.1,y:1.97,w:1.8,h:0.55,fontSize:12,color:i==2?"FFFFFF":MUTED,align:"center"});
    if(i<3) T(s,"→",{x:x+2.0,y:1.75,w:0.35,h:0.5,fontSize:24,color:MUTED,align:"center"}); });
  table(s,["Core clock","100 MHz","200 MHz","500 MHz","1 GHz"],
    [["Period","10 ns","5 ns","2 ns","1 ns"],["Multi-cycle latency  ⌈8.058 / T⌉","1","2","5","9"],["Pipelined stages  N","1","2","5","12"]],
    0.5,2.85,9,[3.4,1.4,1.4,1.4,1.4],0.36,["left","center","center","center","center"]);
  T(s,"Instruction: custom-0 opcode 0x0B, R-type, rd = f4(rs1), 16-bit Q6.10. It has its own operation class and functional unit, so latency and issue rate are set independently of other instructions. Cores: gem5 MinorCPU (in-order) and O3CPU (out-of-order), same binaries.",{x:0.5,y:4.55,w:9,h:0.7,fontSize:12,color:MUTED}); }

// 5 pipelining model
{ const s=slide("How the unit is pipelined: multi-cycle vs pipelined","Pipelining is a model in gem5: opLat = N cycles for both; the pipelined unit has issueLat 1 (O3: pipelined=True) so it accepts one operation per cycle; the multi-cycle unit has issueLat = N (pipelined=False), i.e. it is busy for the whole latency. N is the smallest number of equal logic slices such that d/N + 0.3 ns fits in the clock period (e.g. 1 GHz: 8.058/12 + 0.3 = 0.97 ns <= 1 ns; N=11 gives 1.03 ns). We did NOT re-synthesise a pipelined RTL in Quartus: that is future work, and the 0.3 ns overhead and equal slicing are assumptions.");
  const x0=1.0, cw=0.42;
  T(s,"Multi-cycle (5 cycles): busy until done",{x:0.5,y:1.2,w:5,h:0.3,fontSize:14,bold:true,color:NAVY});
  s.addShape(pres.shapes.RECTANGLE,{x:x0,y:1.6,w:cw*5-0.03,h:0.3,fill:{color:BLUE},line:{color:BLUE},objectName:"op A"});
  s.addShape(pres.shapes.RECTANGLE,{x:x0+cw*5,y:1.6,w:cw*5-0.03,h:0.3,fill:{color:"7FA8E6"},line:{color:"7FA8E6"},objectName:"op B"});
  T(s,"op 1",{x:x0,y:1.95,w:2,h:0.25,fontSize:12,color:MUTED}); T(s,"op 2 waits for op 1",{x:x0+cw*5,y:1.95,w:2.3,h:0.25,fontSize:12,color:MUTED});
  T(s,"Pipelined (5 stages): one new operation every cycle",{x:0.5,y:2.5,w:6,h:0.3,fontSize:14,bold:true,color:NAVY});
  const cols=[BLUE,"4F8FE0","7FA8E6","A9C5EE"];
  for(let i=0;i<4;i++) for(let st=0;st<5;st++)
    s.addShape(pres.shapes.RECTANGLE,{x:x0+(i+st)*cw,y:2.9+i*0.3,w:cw-0.03,h:0.26,fill:{color:cols[i]},line:{color:cols[i]},objectName:"stage"});
  T(s,"op 1..4 overlap; result latency still 5 cycles",{x:x0,y:4.15,w:5,h:0.3,fontSize:12,color:MUTED});
  card(s,6.4,1.2,3.1,2.7,"explain panel");
  T(s,[{text:"In gem5",options:{bold:true,color:NAVY,breakLine:true}},
       {text:"Both: latency N (opLat).",options:{breakLine:true}},
       {text:"Pipelined: issue interval 1.",options:{breakLine:true}},
       {text:"Multi-cycle: issue interval N.",options:{breakLine:true}},
       {text:" ",options:{fontSize:6,breakLine:true}},
       {text:"Stages N",options:{bold:true,color:NAVY,breakLine:true}},
       {text:"fewest with d/N + 0.3 ns ≤ T.",options:{breakLine:true}},
       {text:"1 GHz: 8.058/12 + 0.3 = 0.97 ns.",options:{}}],{x:6.55,y:1.3,w:2.8,h:3.1,fontSize:13,paraSpaceAfter:3});
  T(s,"Pipelining is modelled, not built: a pipelined RTL was not re-synthesised. The 0.3 ns per-stage overhead is an assumption.",{x:0.5,y:4.65,w:9,h:0.5,fontSize:13,color:ORANGE,bold:true}); }

// 6 benchmark
{ const s=slide("The benchmark: five variants of one loop","Each pass does acc += SILU(data[i] + salt) for 1,024 inputs. salt is a volatile zero so the compiler cannot precompute. 'loop only' replaces SILU by the identity: it measures the load, add, accumulate, increment and branch overhead (5 instructions). The table variant is the usual software alternative to computing exp: 257 precomputed SiLU values at spacing 1/32 over [-4,4] (514 bytes), two loads, a multiply and an interpolation, plus tail checks. Inputs are 1,024 values evenly spaced over [-4,4) in Q6.10 (raw -4096..4095), stored in a 2 KB array; one untimed warm-up pass, then 20 timed passes = 20,480 activations. Sorted order by default, shuffled with a fixed xorshift in E4.");
  table(s,["Variant","What each iteration does","Instr. / act."],
   [["loop only","load, add, accumulate, i++, branch (identity 'activation')","5.0"],
    ["float expf","x / (1 + expf(−x)) through the C library","114.4"],
    ["integer f4","six compare-and-shift segments in plain C","12.8"],
    ["table","257-entry table (514 B): 2 loads, 1 multiply, interpolate","21.0"],
    ["custom insn","one silu instruction (rd = f4(rs1))","6.0"]],
   0.5,1.2,9,[1.7,5.9,1.4],0.42,["left","left","center"]);
  card(s,0.5,4.1,9,1.05,"setup box");
  T(s,[{text:"Setup: ",options:{bold:true,color:NAVY}},{text:"1,024 inputs evenly spaced over [−4, 4) (the range where the six segments are active), 2 KB array. One untimed warm-up pass, then 20 timed passes = 20,480 activations; cycles per activation = total cycles / 20,480. Identical source and flags for every variant (−O2, loops aligned to 64 B). Inputs sorted by default, shuffled in E4."}],{x:0.7,y:4.17,w:8.6,h:0.9,fontSize:12}); }

// 7 E1
{ const s=slide("Result: the instruction removes about 13 instructions","Cycles per activation at 100 MHz, unit latency 1, sorted inputs. 24.1x and 35.9x over expf; 2.35x and 3.72x over integer f4; 3.0x and 4.9x over the table. The out-of-order result is front-end limited at about one iteration per cycle. In-order CPI of the instruction (1.17) is higher than the table's (1.00) yet it is 3x faster: it removes instructions.");
  const h=fig(s,"fig1",0.4,1.2,4.3,"Cycles per activation, five variants, two cores");
  table(s,["Variant","In-order","Out-of-order"],[["loop only","6.03","1.98"],["float expf","169.8","36.8"],["integer f4","16.56","3.82"],["table","21.03","5.02"],["custom insn","7.04","1.03"]],4.95,1.25,4.6,[1.9,1.3,1.4],0.4,["left","center","center"]);
  stat(s,4.95,3.8,1.45,"24× / 36×","vs expf (in-order / O3)",BLUE,14,1.2);
  stat(s,6.5,3.8,1.45,"2.4× / 3.7×","vs integer f4",ORANGE,14,1.2);
  stat(s,8.05,3.8,1.45,"3.0× / 4.9×","vs table",GREEN,14,1.2);
  T(s,"Cycles per activation, 100 MHz, latency 1, sorted inputs.",{x:0.5,y:4.75,w:4.2,h:0.4,fontSize:12,color:MUTED}); }

// 8 E2b latency
{ const s=slide("Latency sweep: pipelined vs multi-cycle unit","1 GHz core, only the custom-instruction loop, latency 1 to 16. In-order: flat to latency 4, then +1 cycle per cycle of latency, identical for pipelined and multi-cycle. O3 pipelined: 1.03 cycles at every latency. O3 multi-cycle: cycles per activation equal the latency.");
  const h=fig(s,"fig2",0.5,1.2,9,"Cycles per activation vs unit latency");
  T(s,[{text:"In-order: ",options:{bold:true,color:NAVY}},{text:"flat to latency 4, then +1 cycle per cycle of latency, same for both unit styles.   "},
       {text:"Out-of-order: ",options:{bold:true,color:NAVY}},{text:"a pipelined unit hides every latency up to 16 (1.03); a multi-cycle unit costs exactly its latency per activation."}],{x:0.5,y:1.2+h+0.1,w:9,h:0.9,fontSize:14}); }

// 9 hazards
{ const s=slide("Which hazard is which: the evidence","Data hazard (RAW): the add that accumulates needs the SiLU result. In-order cannot move past it, so each extra cycle of latency beyond what the pipeline hides is one stall cycle: slope exactly 1 in the latency sweep. Structural hazard: two SiLU operations want the same unit. We changed only the issue interval (pipelined vs multi-cycle) with identical latency and code; out-of-order cycles per activation jumped from 1.03 to the latency (5.0 at 5, 9.0 at 9, 16.0 at 16). In-order shows no structural hazard because the next SiLU cannot issue before the previous result was consumed, by which time the unit is free. Control hazard: branch mispredictions, next slide. Inference is from controlled cycle counts, not from a pipeline trace.");
  const colw=2.85, xs=[0.5,3.575,6.65];
  const cards=[["Data hazard (RAW)",BLUE,["The accumulate needs the SiLU result.","In-order core waits: cycles stay flat to latency 4, then +1 per extra cycle (slope 1).","Pipelining the unit does not help: a dependence is not a resource conflict."]],
   ["Structural hazard",ORANGE,["Two SiLU operations need the same unit.","Same latency, same code, only the issue interval differs: O3 goes 1.03 → latency (5.0 at 5, 9.0 at 9).","Pipelined unit removes it."]],
   ["Control hazard",GREEN,["A wrong branch guess flushes work.","Software f4 on shuffled data: 0.41 mispredicts per activation, +3.4 (in-order) / +5.4 (O3) cycles.","Instruction and table have no data-dependent branch."]]];
  cards.forEach((c,i)=>{ card(s,xs[i],1.25,colw,3.3,"hazard card");
    T(s,c[0],{x:xs[i]+0.15,y:1.35,w:colw-0.3,h:0.4,fontSize:17,bold:true,color:c[1]});
    T(s,c[2].map((t,j)=>({text:t,options:{bullet:true,breakLine:j<c[2].length-1}})),{x:xs[i]+0.15,y:1.85,w:colw-0.3,h:2.6,fontSize:13,paraSpaceAfter:6}); });
  T(s,"Conclusions come from controlled cycle counts (one variable changed at a time), not from a pipeline trace.",{x:0.5,y:4.7,w:9,h:0.3,fontSize:12,color:MUTED}); }

// 10 E2 clock
{ const s=slide("Faster clock means more cycles of latency","Wall-clock time per activation. At 1 GHz in-order: 1.1x (12-stage pipelined) to 1.4x (9-cycle multi-cycle) over integer f4. O3 pipelined keeps its full advantage; O3 multi-cycle at 500 MHz is 0.76x of integer f4 and at 1 GHz 0.42x. Clocks above about 123 MHz extrapolate an FPGA slow-corner delay.");
  const h=fig(s,"fig3",0.5,1.2,9,"Wall-clock time per activation vs clock");
  T(s,[{text:"1 GHz, in-order: ",options:{bold:true,color:NAVY}},{text:"only 1.1× (12-stage pipelined) to 1.4× (9-cycle) faster than integer f4.   "},
       {text:"Out-of-order: ",options:{bold:true,color:NAVY}},{text:"pipelined keeps its full advantage; an unpipelined unit is 0.76× (500 MHz) and 0.42× (1 GHz) of integer f4. Clocks above ≈123 MHz extrapolate an FPGA delay."}],{x:0.5,y:1.2+h+0.1,w:9,h:0.9,fontSize:13}); }

// 11 branch
{ const s=slide("Branch prediction: sorted inputs flatter the software","Software f4 is a compare chain. Sorted inputs are perfectly predictable. Shuffled (fixed xorshift): 0.41 mispredicts per activation, +3.4 cycles in-order (16.6 to 20.0) and +5.4 out-of-order (3.8 to 9.2). Against shuffled data the instruction is 2.8x (in-order) and 9.0x (O3) faster than integer f4. expf adds 0.44 mispredicts per activation.");
  const h=fig(s,"fig6",0.5,1.2,9,"Sorted vs shuffled inputs");
  T(s,[{text:"Shuffled inputs: ",options:{bold:true,color:NAVY}},{text:"software f4 mispredicts 0.41 branches per activation (+3.4 cycles in-order, +5.4 out-of-order: 3.8 → 9.2). Table and instruction have no data-dependent branch. "},
       {text:"Instruction vs integer f4, shuffled: 2.8× in-order, 9.0× out-of-order.",options:{bold:true}}],{x:0.5,y:1.2+h+0.1,w:9,h:0.9,fontSize:13}); }

// 12 cache
{ const s=slide("Cache pressure: table vs instruction","L1 data cache swept 512 B to 64 kB at 500 MHz, shuffled inputs, no L2. Working set: 2 KB inputs plus 0.5 KB table for the table variant. The table loses 35% in-order and 21% out-of-order at 512 B; at 1 kB or more it loses 3% or less. The instruction needs no table: 8.0 to 8.5 and 1.0 to 1.5.");
  const h=fig(s,"fig7",0.5,1.2,9,"Cycles per activation vs L1D size");
  T(s,[{text:"512 B L1D: ",options:{bold:true,color:NAVY}},{text:"table 21.0 → 28.5 cycles in-order (+35%), 5.0 → 6.1 out-of-order (+21%); instruction 8.0 → 8.5 and 1.0 → 1.5. From 1 kB up the table loses ≤ 3%, so at 514 bytes the instruction's win over the table is mostly instruction count, not cache."}],{x:0.5,y:1.2+h+0.1,w:9,h:0.9,fontSize:13}); }

// 13 alignment
{ const s=slide("Code placement noise sets the resolution of the study","The same source compiled with loop alignments 64, default, 8, 16 and 32 bytes. Small loops are front-end sensitive in gem5. The out-of-order instruction loop moves between 1.03 and 4.02 cycles, integer f4 between 3.82 and 5.69. Inside the conv layer the extra cost of an activation varies by more than 10 cycles. Headline numbers use 64 B alignment; the network estimate uses medians over five alignments.");
  table(s,["Variant","In-order","Out-of-order"],
   [["float expf","169.8 – 169.8","36.6 – 36.9"],["integer f4","16.6 – 18.1","3.8 – 5.7"],["table","20.0 – 21.0","5.0 – 6.0"],["custom insn","7.0 – 9.0","1.0 – 4.0"]],
   0.5,1.3,5.2,[1.8,1.7,1.7],0.5,["left","center","center"]);
  T(s,"Cycles per activation, minimum – maximum over five loop alignments, 100 MHz.",{x:0.5,y:3.95,w:5.2,h:0.5,fontSize:12,color:MUTED});
  card(s,6.0,1.3,3.5,2.6,"noise panel");
  T(s,[{text:"What it means",options:{bold:true,color:NAVY,breakLine:true}},
       {text:"Differences of ±1–3 cycles per activation between the cheap variants are not conclusions.",options:{bullet:true,breakLine:true}},
       {text:"Only expf is cleanly separated inside the conv layer.",options:{bullet:true,breakLine:true}},
       {text:"Headline: 64 B alignment. Network estimate: median of 5 alignments.",options:{bullet:true}}],{x:6.15,y:1.4,w:3.2,h:2.4,fontSize:13,paraSpaceAfter:6}); }

// 14 proxy
{ const s=slide("From one conv layer to a whole network (the proxy)","Network time = MACs x cycles-per-MAC + activations x cycles-per-activation. MAC and activation counts come from the real YOLOv8n (hooks on the 64 convolutions and 57 SiLU modules): 4.37 G and 13.9 M. Cycles per MAC come from the conv benchmark (8->8 channels, 3x3, 16x16 output, 147,456 MACs, int16 Q6.10, int32 accumulate, scalar C, no SIMD), median of five alignments: 5.67 in-order and 1.15 out-of-order at 500 MHz. Cycles per activation come from the shuffled activation loop with the loop-only baseline subtracted: expf 169 / 40, integer f4 14 / 7, custom 2.0 / 0.0. Worked example, in-order: MAC time 4.37e9 x 5.67 = 24.8e9 cycles; expf activation time 13.9e6 x 169.4 = 2.36e9 cycles; share = 8.7%. Cross-check: the proxy layer has only 72 MACs per activation (8 channels x 9) versus 315 in the network, which is why the layer itself shows 23% / 49% activation share with expf. We only use the layer for cycles per MAC, never its ratio. Direction of bias: real layers are larger, spill the L1, so cycles per MAC are higher and the activation share is lower: the scalar estimate is if anything optimistic for the instruction. Naive loops: optimised or SIMD code is covered by the factor k.");
  card(s,0.5,1.2,4.4,3.9,"method panel");
  T(s,[{text:"What is estimated",options:{bold:true,color:NAVY,breakLine:true}},
       {text:"time = 4.37 G MACs × c_MAC + 13.9 M activations × c_act",options:{fontFace:"Courier New",fontSize:12,breakLine:true}},
       {text:" ",options:{fontSize:5,breakLine:true}},
       {text:"Counts: measured on the real YOLOv8n.",options:{bullet:true,breakLine:true}},
       {text:"c_MAC: conv benchmark, 5.67 in-order / 1.15 O3 cycles per MAC (median of 5 alignments).",options:{bullet:true,breakLine:true}},
       {text:"c_act: shuffled loop minus loop-only: expf 169 / 40, f4 14 / 7, custom 2 / 0.",options:{bullet:true,breakLine:true}},
       {text:"Example (in-order): 24.8 G cycles MACs vs 2.36 G cycles expf → 8.7% share.",options:{bullet:true}}],{x:0.65,y:1.3,w:4.1,h:3.7,fontSize:13,paraSpaceAfter:4});
  T(s,[{text:"Why it is a fair proxy",options:{bold:true,color:NAVY,breakLine:true}},
       {text:"Every YOLOv8n layer is a convolution; a scalar core does the same load-load-multiply-add per MAC whatever the layer size.",options:{bullet:true,breakLine:true}},
       {text:"Layer uses the same data types (int16 Q6.10, int32 accumulate) and the same compiler flags.",options:{bullet:true,breakLine:true}},
       {text:"We take only cycles per MAC from it; the 72 MACs per activation of this layer (vs 315 in the network) is never used.",options:{bullet:true,breakLine:true}},
       {text:" ",options:{fontSize:5,breakLine:true}},
       {text:"Where it is optimistic",options:{bold:true,color:ORANGE,breakLine:true}},
       {text:"Small layer fits in L1; real layers spill, so c_MAC is higher and the activation share lower.",options:{bullet:true,breakLine:true}},
       {text:"Naive loops, no tiling or SIMD; faster MACs are covered by the factor k.",options:{bullet:true,breakLine:true}},
       {text:"1×1 and depthwise convs not modelled.",options:{bullet:true}}],{x:5.2,y:1.2,w:4.3,h:3.9,fontSize:12,paraSpaceAfter:3}); }

// 15 swap method
{ const s=slide("Swapping the approximation into YOLOv8n","Ultralytics YOLOv8n with the pretrained yolov8n.pt weights, evaluated on COCO128 (128 images, 929 instances), batch 8, CPU, float32. Only the activation is emulated in Q6.10 fixed point; everything else stays float, so the test isolates the activation. Every nn.SiLU module is replaced by our module, and Ultralytics' shared Conv.default_act is handled too. Checks: 57 modules replaced, 0 SiLU left, 969 activation calls = 57 modules x 17 forward passes (16 batches plus a warm-up). Shared global counters are needed because Ultralytics deep-copies the model inside val(). Caution: COCO128 comes from train2017, which the pretrained weights have seen, so absolute mAP is optimistic; only the differences between activations matter.");
  const steps=[["1","Load yolov8n.pt","pretrained YOLOv8n, 640×640 input"],["2","Replace every SiLU","57 modules, 0 left, 969 calls = 57 × 17 passes"],["3","Emulate Q6.10","round to 16-bit fixed point, apply f4 exactly as the hardware does"],["4","Validate","COCO128: 128 images, 929 instances; mAP50 and mAP50–95"]];
  steps.forEach((st,i)=>{ const y=1.2+i*0.82; card(s,0.5,y,5.4,0.72,"step"); 
    s.addShape(pres.shapes.OVAL,{x:0.6,y:y+0.14,w:0.44,h:0.44,fill:{color:BLUE},line:{color:BLUE},objectName:"step number"});
    T(s,st[0],{x:0.6,y:y+0.14,w:0.44,h:0.44,fontSize:14,bold:true,color:"FFFFFF",align:"center",valign:"middle"});
    T(s,st[1],{x:1.2,y:y+0.06,w:4.6,h:0.3,fontSize:14,bold:true,color:NAVY});
    T(s,st[2],{x:1.2,y:y+0.37,w:4.6,h:0.3,fontSize:12,color:MUTED}); });
  T(s,[{text:"Five variants compared",options:{bold:true,color:NAVY,breakLine:true}},
       {text:"exact SiLU (reference)",options:{bullet:true,breakLine:true}},
       {text:"exact SiLU with Q6.10 rounding (isolates quantisation)",options:{bullet:true,breakLine:true}},
       {text:"f4, strict 16-bit (clips beyond ±32)",options:{bullet:true,breakLine:true}},
       {text:"f4, exact tails (|x| > 4 passes x or 0)",options:{bullet:true,breakLine:true}},
       {text:"257-entry table",options:{bullet:true}}],{x:6.2,y:1.2,w:3.3,h:2.5,fontSize:13,paraSpaceAfter:3});
  T(s,"COCO128 is from train2017, which the pretrained weights have seen: absolute mAP is optimistic, so only the differences between activations are meaningful.",{x:0.5,y:4.55,w:9,h:0.6,fontSize:13,color:ORANGE,bold:true}); }

// 16 accuracy
{ const s=slide("Accuracy: the approximation costs about 0.0015 mAP","mAP50-95 on COCO128: exact 0.4439; exact with Q6.10 rounding 0.4374; f4 strict 0.4359; f4 exact tails 0.4359; table 0.4373. Most of the loss is fixed-point rounding itself (-0.0066); f4 adds about 0.0015, below the noise of 128 images. 8.8% of activation inputs are outside [-4,4], so the tails are exercised in a real model.");
  table(s,["Activation","mAP50","mAP50–95","Δ"],
   [["exact SiLU","0.6024","0.4439","—"],["exact, Q6.10 rounding","0.5924","0.4374","−0.0066"],["f4 (16-bit strict)","0.5991","0.4359","−0.0081"],["f4 (exact tails)","0.6007","0.4359","−0.0080"],["257-entry table","0.5958","0.4373","−0.0066"]],
   0.5,1.2,5.3,[2.1,1.0,1.1,1.1],0.42,["left","center","center","center"]);
  fig(s,"fig5",6.0,1.2,3.5,"Distribution of YOLOv8n activation inputs");
  T(s,"Input distribution: 8.8% of values fall outside [−4, 4].",{x:6.0,y:3.55,w:3.5,h:0.5,fontSize:12,color:MUTED});
  T(s,[{text:"Most of the drop is Q6.10 rounding itself; f4 adds only about 0.0015 mAP50–95, below the noise of a 128-image set. ",options:{}},
       {text:"Not proven on the full COCO validation set.",options:{bold:true}}],{x:0.5,y:4.0,w:5.3,h:1.1,fontSize:14}); }

// 17 amdahl fig
{ const s=slide("Whole-network speedup vs MAC acceleration","k divides the MAC time (SIMD or accelerator). Activation share with expf on a scalar core: 8.7% in-order, 9.9% out-of-order. Whole-network speedup of the instruction over expf: 1.09x / 1.11x at k=1, 2.48x / 2.75x at k=16, 6.6x / 8.0x at k=64. Over integer f4: 1.01x / 1.02x at k=1, 1.10x / 1.32x at k=16, 1.4x / 2.28x at k=64. Estimate from the proxy, not a gem5 run of YOLOv8n.");
  const h=fig(s,"fig4",0.5,1.2,9,"Whole-network speedup vs MAC acceleration");
  T(s,[{text:"On a scalar core: ",options:{bold:true,color:NAVY}},{text:"about 1.1× over expf and 1.01–1.02× over integer f4.   "},
       {text:"With 16× faster MACs: ",options:{bold:true,color:NAVY}},{text:"2.5–2.7× over expf, 1.1–1.3× over integer f4. The instruction pays off once the MAC part is accelerated."}],{x:0.5,y:1.2+h+0.1,w:9,h:0.9,fontSize:14}); }

// 18 amdahl table
{ const s=slide("Whole-network estimate in numbers","Estimate from measured cycles per MAC (conv layer) and per activation (shuffled loop), scaled by the real MAC and activation counts of YOLOv8n. Not a gem5 simulation of the network.");
  table(s,["MAC speed-up k","Activation share with expf (IO / O3)","Speedup vs expf (IO / O3)","Speedup vs integer f4 (IO / O3)"],
   [["1 (scalar core)","8.7% / 9.9%","1.09× / 1.11×","1.01× / 1.02×"],["4","27.5% / 30.4%","1.37× / 1.44×","1.03× / 1.08×"],["16","60.3% / 63.6%","2.48× / 2.75×","1.10× / 1.32×"],["64","85.9% / 87.5%","6.60× / 8.00×","1.40× / 2.28×"]],
   0.5,1.2,9,[1.8,2.6,2.3,2.3],0.5,["left","center","center","center"]);
  card(s,0.5,4.15,9,1.0,"caveat box");
  T(s,[{text:"Inputs: ",options:{bold:true,color:NAVY}},{text:"4.37 G MACs and 13.9 M activations per image; 5.67 (in-order) / 1.15 (O3) cycles per MAC; per-activation cycles from the shuffled loop at 500 MHz. IO = in-order, O3 = out-of-order. This is an estimate, not a simulation of the whole network."}],{x:0.7,y:4.22,w:8.6,h:0.85,fontSize:12}); }

// 19 conclusions
{ const s=pres.addSlide(); s.background={color:NAVY}; s.addNotes("Close with the honest limits and future work: a GPU (Vortex) comparison and a pipelined RTL.");
  T(s,"Conclusions and limits",{x:0.7,y:0.4,w:8.6,h:0.7,fontFace:"Cambria",fontSize:32,bold:true,color:"FFFFFF"});
  T(s,[{text:"24–36× over expf on the loop; 2.4–3.7× over integer C",options:{bullet:true,breakLine:true}},
       {text:"≈1.1× whole network on a scalar core; 2.5–2.7× if MACs are 16× faster",options:{bullet:true,breakLine:true}},
       {text:"Pipelining is required: an unpipelined 5-cycle unit is slower than integer C",options:{bullet:true,breakLine:true}},
       {text:"Latency is derived from the synthesis delay by script, not typed by hand",options:{bullet:true,breakLine:true}},
       {text:"Accuracy cost beyond Q6.10 rounding ≈ 0.0015 mAP50–95 (128 images)",options:{bullet:true}}],{x:0.7,y:1.2,w:8.6,h:2.3,fontSize:17,color:"FFFFFF",paraSpaceAfter:7});
  T(s,[{text:"Limits: ",options:{bold:true,color:"BFD4F2"}},{text:"one loop and one scalar conv layer; whole-network figure is an estimate; ±1–3 cycle placement noise; pipelining is modelled (not re-synthesised); FPGA slow-corner delay and an assumed 0.3 ns per stage; COCO128 only. Future work: pipelined RTL, GPU (Vortex) comparison.",options:{color:"BFD4F2"}}],{x:0.7,y:3.65,w:8.6,h:1.3,fontSize:14}); }

pres.writeFile({fileName:"results/slides/SiLU_class_presentation.pptx"}).then(()=>console.log("ok"));
