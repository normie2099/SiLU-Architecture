const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Ayush Krishna";
pres.title = "Multiplier-Less SiLU Custom Instruction for RISC-V";
const NAVY="14213D", BLUE="2A78D6", ORANGE="EB6834", GREEN="1BAF7A", INK="1F2937", MUTED="5B6577", TINT="EEF2F8";
const FIG="results/figures/";
pres.defineSlideMaster({ title:"CONTENT", background:{color:"FFFFFF"},
  slideNumber:{x:9.2,y:5.2,w:0.5,h:0.3,fontFace:"Calibri",fontSize:10,color:MUTED},
  objects:[{placeholder:{options:{name:"title",type:"title",x:0.5,y:0.3,w:9,h:0.8,fontFace:"Cambria",fontSize:26,bold:true,color:NAVY,valign:"middle",align:"left",margin:0},text:""}}]});
function slide(title, notes){ const s=pres.addSlide({masterName:"CONTENT"}); s.addText(title,{placeholder:"title"}); if(notes) s.addNotes(notes); return s; }
const T=(s,t,o)=>s.addText(t,Object.assign({isTextBox:true,fontFace:"Calibri",fontSize:16,color:INK,margin:0,valign:"top"},o));
function stat(s,x,y,w,big,label,color,sz){
  s.addShape(pres.shapes.RECTANGLE,{x,y,w,h:1.35,fill:{color:TINT},line:{color:TINT},objectName:"stat card"});
  T(s,big,{x:x+0.15,y:y+0.12,w:w-0.3,h:0.7,fontSize:sz||32,bold:true,color:color||BLUE,fontFace:"Cambria"});
  T(s,label,{x:x+0.15,y:y+0.82,w:w-0.3,h:0.5,fontSize:12,color:MUTED});
}

// 1 title
{ const s=pres.addSlide(); s.background={color:NAVY};
  T(s,"Hardware–Software Co-Design of a Multiplier-Less SiLU Custom Instruction for RISC-V",{x:0.7,y:1.1,w:8.6,h:1.9,fontFace:"Cambria",fontSize:34,bold:true,color:"FFFFFF"});
  T(s,"In-order vs out-of-order in gem5, with YOLOv8n as the workload",{x:0.7,y:3.1,w:8.6,h:0.5,fontSize:20,color:"BFD4F2"});
  T(s,"Ayush Krishna · B.Tech Electronics & VLSI, VIT Vellore · BAEVD202 Computer Architecture",{x:0.7,y:4.5,w:8.6,h:0.4,fontSize:14,color:"BFD4F2"});
  s.addNotes("One-line pitch: does a SiLU instruction actually pay off once you measure it with the iron law and Amdahl's law?"); }

// 2 question
{ const s=slide("Does the instruction actually pay off?","SiLU = x*sigmoid(x), used in YOLOv8. No hardware exp on a simple core, so software uses a library call. The question is architectural, not circuit-level.");
  T(s,[{text:"SiLU(x) = x · σ(x)",options:{bold:true,fontSize:24,color:BLUE,breakLine:true}},{text:"Needs an exponential and a division. On a simple RISC-V core that is a library call: about 114 instructions.",options:{fontSize:16}}],{x:0.5,y:1.3,w:4.3,h:1.8});
  T(s,[{text:"The question",options:{bold:true,fontSize:20,color:NAVY,breakLine:true}},{text:"Not “is the circuit small?” but: how do instruction count, CPI and clock change on in-order and out-of-order cores, and how much of a real network does it touch?",options:{fontSize:16}}],{x:0.5,y:3.2,w:4.3,h:1.8});
  const items=[["Iron law","T = IC × CPI × clock"],["Amdahl's law","bounded by the activation share"],["Hazards","latency and pipelining"],["Branch prediction","software f4 is a compare chain"]];
  items.forEach((it,i)=>{ const y=1.3+i*0.95; s.addShape(pres.shapes.RECTANGLE,{x:5.4,y,w:4.1,h:0.8,fill:{color:TINT},line:{color:TINT},objectName:"concept card"});
    T(s,it[0],{x:5.6,y:y+0.1,w:3.8,h:0.3,fontSize:16,bold:true,color:BLUE}); T(s,it[1],{x:5.6,y:y+0.43,w:3.8,h:0.3,fontSize:13,color:MUTED}); }); }

// 3 approximation
{ const s=slide("The approximation: six segments, no multiplier","Spagnolo, Perri, Corsonello, ISVLSI 2025. Q6.10 fixed point, constants 384 and 38. Max error and mean error over (-4,4).");
  s.addShape(pres.shapes.RECTANGLE,{x:0.5,y:1.3,w:5.0,h:3.5,fill:{color:TINT},line:{color:TINT},objectName:"equation panel"});
  const lines=["x ≤ −4:        0","−4 < x ≤ −1:   −x/16 − 0.375","−1 < x ≤ 0:    x/4 − 0.037","0 < x ≤ 1:     3x/4 − 0.037","1 < x ≤ 4:     x + x/16 − 0.375","x > 4:         x"];
  T(s,lines.map((l,i)=>({text:l,options:{breakLine:i<5}})),{x:0.75,y:1.5,w:4.6,h:2.4,fontFace:"Courier New",fontSize:15,color:INK,paraSpaceAfter:6});
  T(s,"Divisions are arithmetic shifts. No multiplier, no table, no memory.",{x:0.75,y:4.0,w:4.5,h:0.7,fontSize:14,color:MUTED});
  stat(s,5.9,1.3,1.75,"0.028","mean abs. error on (−4,4)");
  stat(s,7.75,1.3,1.75,"0.072","max error at the edges",ORANGE);
  stat(s,5.9,2.85,1.75,"191","logic elements, 0 multipliers",GREEN);
  stat(s,7.75,2.85,1.75,"8.06 ns","data delay (Quartus)",BLUE,26);
  T(s,"Checked on all 65,536 inputs: RTL, C, PyTorch and the gem5 instruction agree with the golden model, 0 mismatches.",{x:5.9,y:4.4,w:3.6,h:0.7,fontSize:13,color:MUTED}); }

// 4 flow
{ const s=slide("Synthesis delay to gem5 latency, by script","The professor's objection: hand-typing '1 cycle' into gem5. Now run_gem5.py computes latency from the Quartus delay and the clock. Multi-cycle: ceil(d/T). Pipelined: smallest N with d/N + 0.3 ns <= T (0.3 ns is an assumption).");
  const steps=[["RTL","silu.v, combinational"],["Quartus","8.058 ns, 191 LEs"],["run_gem5.py","latency = ceil(d / T)"],["gem5","custom op class + own FU"]];
  steps.forEach((st,i)=>{ const x=0.5+i*2.35; s.addShape(pres.shapes.RECTANGLE,{x,y:1.5,w:2.0,h:1.2,fill:{color:i==2?BLUE:TINT},line:{color:i==2?BLUE:TINT},objectName:"flow box "+(i+1)});
    T(s,st[0],{x:x+0.1,y:1.62,w:1.8,h:0.4,fontSize:18,bold:true,color:i==2?"FFFFFF":NAVY,align:"center"});
    T(s,st[1],{x:x+0.1,y:2.07,w:1.8,h:0.55,fontSize:12,color:i==2?"FFFFFF":MUTED,align:"center"});
    if(i<3) T(s,"→",{x:x+2.0,y:1.85,w:0.35,h:0.5,fontSize:24,color:MUTED,align:"center"}); });
  T(s,[{text:"Latency at each clock (8.058 ns delay)",options:{bold:true,fontSize:16,color:NAVY,breakLine:true}},
    {text:"100 MHz → 1 cycle    200 MHz → 2    500 MHz → 5",options:{fontSize:15,breakLine:true}},
    {text:"1 GHz → 12 stages (pipelined) or 9 cycles (multi-cycle)",options:{fontSize:15}}],{x:0.5,y:3.1,w:5.2,h:1.5,paraSpaceAfter:6});
  T(s,[{text:"Custom-0 opcode 0x0B, rd = f4(rs1). Same binaries run on MinorCPU (in-order) and O3CPU (out-of-order). 296 gem5 runs.",options:{fontSize:14,color:MUTED}}],{x:6.1,y:3.1,w:3.4,h:1.5}); }

// 5 iron law
{ const s=slide("Iron law: the loop is 24–36× faster than expf","Table: one loop of 1024 inputs in [-4,4), 20 passes, 100 MHz, latency 1. The 10.8x headline was a loop number vs the weakest baseline. Only 2.4x/3.7x vs integer f4.");
  s.addImage({path:FIG+"fig1_cycles_per_activation.png",x:0.5,y:1.25,w:5.2,h:2.76,altText:"Cycles per activation for five variants on two cores"});
  stat(s,6.0,1.25,1.75,"24×","vs expf, in-order");
  stat(s,7.75,1.25,1.75,"36×","vs expf, out-of-order",GREEN);
  stat(s,6.0,2.75,1.75,"2.4×","vs integer f4, in-order",ORANGE);
  stat(s,7.75,2.75,1.75,"3.7×","vs integer f4, out-of-order",ORANGE);
  T(s,"6 instructions per activation (5 are loop overhead) vs 12.8 for integer f4 and 114 for expf. Out-of-order reaches 1.03 cycles: the front end is the limit. CPI alone misleads: in-order CPI rises vs the table (1.17 vs 1.00) yet it is 3× faster.",{x:0.5,y:4.2,w:9,h:0.9,fontSize:14,color:MUTED}); }

// 6 latency
{ const s=slide("Hazards: pipeline the unit for out-of-order","In-order: flat to latency 4 then one-for-one. OoO pipelined hides 16 cycles, unpipelined exposes all of it: structural hazard.");
  s.addImage({path:FIG+"fig2_latency_sweep.png",x:0.5,y:1.2,w:9,h:3.51,altText:"Cycles per activation vs unit latency"});
  T(s,"Out-of-order: pipelined hides every latency to 16 cycles (1.03). Unpipelined 5-cycle unit at 500 MHz is 0.76× the speed of integer f4.",{x:0.5,y:4.75,w:8.6,h:0.5,fontSize:14,color:MUTED}); }

// 7 clock
{ const s=slide("Faster clock means more cycles of latency","At 1 GHz in-order: 1.1x (12-stage) to 1.4x (9-cycle multi-cycle) vs integer f4. Above 123 MHz the FPGA delay is extrapolated.");
  s.addImage({path:FIG+"fig3_time_vs_clock.png",x:0.5,y:1.2,w:9,h:3.73,altText:"Wall-clock time per activation vs clock"});
  T(s,"Clocks above about 123 MHz extrapolate an FPGA slow-corner delay: illustrative.",{x:0.5,y:4.95,w:8.6,h:0.3,fontSize:12,color:MUTED}); }

// 8 branch
{ const s=slide("Branch prediction flatters sorted inputs","Software f4 is a compare chain. Sorted inputs are perfectly predictable. Shuffled: 0.41 mispredicts per activation, +3.4 cycles in-order, +5.4 OoO.");
  s.addImage({path:FIG+"fig6_branch_sorted_vs_shuffled.png",x:0.5,y:1.2,w:5.9,h:2.3,altText:"Sorted vs shuffled inputs"});
  stat(s,6.7,1.2,1.4,"0.41","mispredicts per activation (f4)",ORANGE,28);
  stat(s,8.2,1.2,1.3,"9.0×","instruction vs f4, OoO, shuffled",GREEN,28);
  T(s,"The table and the instruction have no data-dependent branch. With shuffled data the OoO core takes 9.2 cycles for software f4 and 1.03 for the instruction: much of the gap is removed mispredictions, not just fewer instructions.",{x:0.5,y:3.8,w:9,h:1.2,fontSize:15,color:INK}); }

// 9 alignment + cache
{ const s=slide("Controls: code placement and cache pressure","Alignment: OoO custom loop 1.0 to 4.0 cycles by alignment. Cache: table 21.0 -> 28.5 in-order at 512 B; fine at 1 kB+.");
  s.addImage({path:FIG+"fig7_cache_sweep.png",x:0.5,y:1.2,w:5.9,h:2.3,altText:"Cycles per activation vs L1D size"});
  stat(s,6.7,1.2,2.8,"1–4 cycles","OoO instruction loop swings with code alignment alone",ORANGE);
  T(s,[{text:"Placement noise",options:{bold:true,color:NAVY,breakLine:true}},{text:"Differences of ±1–3 cycles between cheap variants are not conclusions. Only expf is cleanly separated in the conv layer.",options:{breakLine:true}},
       {text:"Cache",options:{bold:true,color:NAVY,breakLine:true}},{text:"Shrinking L1D to 512 B costs the table 35% in-order, 21% OoO; ≥1 kB costs ≤3%. The win over the table is mainly instruction count.",options:{}}],{x:0.5,y:3.7,w:9,h:1.5,fontSize:14,paraSpaceAfter:4}); }

// 10 yolo accuracy
{ const s=slide("In YOLOv8n: accuracy cost is within noise","57/57 SiLU modules replaced, 969 calls confirmed. COCO128, 128 images: relative comparison only, not a published mAP. 8.8% of inputs outside [-4,4].");
  const hdr={bold:true,color:"FFFFFF",fill:{color:NAVY},fontFace:"Calibri",fontSize:14};
  const row=(a,b,c,d,o)=>[a,b,c,d].map((t,i)=>({text:t,options:Object.assign({fontFace:"Calibri",fontSize:14,color:INK,align:i?"right":"left"},o||{})}));
  s.addTable([[ "Activation","mAP50","mAP50–95","Δ" ].map(t=>({text:t,options:hdr})),
    row("exact SiLU","0.6024","0.4439","—"),row("exact, Q6.10 rounding","0.5924","0.4374","−0.0066"),
    row("f4 (strict 16-bit)","0.5991","0.4359","−0.0081",{bold:true}),row("257-entry table","0.5958","0.4373","−0.0066")],
    {x:0.5,y:1.3,w:5.4,colW:[2.3,1,1.1,1],rowH:0.5,border:{type:"solid",color:"D5DCE8",pt:0.75}});
  s.addImage({path:FIG+"fig5_yolo_activation_inputs.png",x:6.1,y:1.3,w:3.4,h:1.65,altText:"Distribution of activation inputs"});
  T(s,"Most of the drop is Q6.10 rounding itself. f4 adds about 0.0015 mAP50–95, below the noise of 128 images.",{x:0.5,y:4.0,w:5.4,h:0.9,fontSize:14,color:MUTED});
  T(s,"8.8% of real activation inputs fall outside [−4,4], so the tails matter in a real model.",{x:6.1,y:3.15,w:3.4,h:1.2,fontSize:14,color:MUTED}); }

// 11 amdahl
{ const s=slide("Amdahl: small on scalar cores, large with fast MACs","YOLOv8n 4.37 GMAC, 13.9 M SiLU elements, 315 MACs per activation. Cycles/MAC from conv layer, cycles/activation from shuffled loop at 500 MHz. Estimate, not a simulation of YOLOv8n.");
  s.addImage({path:FIG+"fig4_amdahl_yolov8n.png",x:0.5,y:1.2,w:5.9,h:2.3,altText:"Whole-network speedup vs MAC acceleration"});
  stat(s,6.7,1.2,1.4,"1.1×","vs expf, scalar core",BLUE,28);
  stat(s,8.2,1.2,1.3,"1.01×","vs integer f4",ORANGE,26);
  stat(s,6.7,2.75,2.8,"2.5–2.7×","vs expf if MACs are 16× faster",GREEN);
  T(s,"The instruction matters when the multiply-accumulate part is accelerated, not on a scalar core.",{x:0.5,y:3.8,w:5.9,h:1.2,fontSize:18,bold:true,color:NAVY}); }

// 12 conclusions
{ const s=pres.addSlide(); s.background={color:NAVY}; s.addNotes("Close with honest limits and future work (GPU/Vortex comparison).");
  T(s,"Conclusions",{x:0.7,y:0.4,w:8.6,h:0.7,fontFace:"Cambria",fontSize:34,bold:true,color:"FFFFFF"});
  T(s,[{text:"24–36× on the loop vs expf, but 2.4–3.7× vs integer C",options:{bullet:true,breakLine:true}},
       {text:"~1.1× whole network on a scalar core; 2.5–2.7× if MACs are 16× faster",options:{bullet:true,breakLine:true}},
       {text:"Must be pipelined for out-of-order; unpipelined it is slower than integer C",options:{bullet:true,breakLine:true}},
       {text:"Latency is derived from synthesis by script, not typed by hand",options:{bullet:true,breakLine:true}},
       {text:"Accuracy cost beyond Q6.10 rounding ≈ 0.0015 mAP50–95 (128 images)",options:{bullet:true}}],{x:0.7,y:1.3,w:8.6,h:2.4,fontSize:18,color:"FFFFFF",paraSpaceAfter:8});
  T(s,[{text:"Limits: ",options:{bold:true,color:"BFD4F2"}},{text:"one loop and one scalar conv layer; ±1–3 cycle placement noise; FPGA slow-corner delay; 0.3 ns/stage assumed. Future work: GPU (Vortex) comparison.",options:{color:"BFD4F2"}}],{x:0.7,y:4.0,w:8.6,h:1.0,fontSize:14});
  T(s,"github.com/normie2099/SiLU-Architecture",{x:0.7,y:4.95,w:8.6,h:0.3,fontSize:12,color:"BFD4F2"}); }

pres.writeFile({fileName:"results/slides/SiLU_class_presentation.pptx"}).then(()=>console.log("ok"));
