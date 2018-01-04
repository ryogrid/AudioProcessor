"use strict"

var NOISE = require("./noise");
require("./demo");
require("./ffmap");
var fs = require('fs');

var Module = null;

function initializeNoiseSuppressionModule() {
  if (Module) {
    return;
  }
  Module = {
    noExitRuntime: true,
    noInitialRun: true,
    preInit: [],
    preRun: [],
    postRun: [function () {
      console.log(`Loaded Javascript Module OK`);
    }],
    memoryInitializerPrefixURL: "bin/",
    arguments: ['input.ivf', 'output.raw']
  };
  NOISE.NoiseModule(Module);
  Module.st = Module._rnnoise_create();
  Module.ptr = Module._malloc(480 * 4);
}

function zeroPadding(num_str,length){
    return ('0000000000' + num_str).slice(-length);
}

initializeNoiseSuppressionModule();
suppressNoise = true;

var frame_num = 2646000;
var bufferSize = frame_num * 4;
var all_buffersize = bufferSize + 44;

var headerBuf = new Buffer(44);
var data_buf = new Buffer(frame_num * 4);

var inputBuffer = new Float32Array(frame_num);
inputBuffer.fill(0);
var outputBuffer = new Float32Array(frame_num);
outputBuffer.fill(0);

var sample_str = fs.readFileSync('../sample60.txt',"ascii");
var splited = sample_str.split(",");
for(var i=0;i<frame_num;i++){
  inputBuffer[i] = parseFloat(splited[i]);
}

denoise_main(inputBuffer, outputBuffer);

var result_str = "";
for(var i=0;i<outputBuffer.length;i++){
  if(i==0){
    result_str = String(outputBuffer[i]) + "," + String(outputBuffer[i]);
  }else{
    result_str = result_str + "," + String(outputBuffer[i]) + "," + String(outputBuffer[i]);
  }
}

var wstream = fs.createWriteStream('./samples60_denoised.txt');
wstream.write(result_str, (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
});

var suppressNoise = true;

function denoise_main(input, output) {
    var out_buf = new Float32Array(frame_num);
    var frameBuffer = new Float32Array(480);

    var rest = frame_num;
    var input_counter  = 0;
    var outbuf_counter = 0;
    while (rest >= 480) {
	     for (var i = 0; i < 480; i++) {
	    //            frameBuffer[i] = input.shift();
	       frameBuffer[i] = input[input_counter];
	       input_counter += 1;
	     }
	// Process Frame
	     if (suppressNoise) {
            removeNoise(frameBuffer);
	     }
	     for (var i = 0; i < 480; i++) {
            out_buf[outbuf_counter] = frameBuffer[i];
	          outbuf_counter += 1;
	     }
	     rest -= 480;
    }
    // Flush output buffer.
    for (var i = 0; i < frame_num - rest; i++) {
	     output[i] = out_buf[i];
    }
}

function removeNoise(buffer) {
    var ptr = Module.ptr;
    var st = Module.st;
    for (var i = 0; i < 480; i++) {
      Module.HEAPF32[(ptr >> 2) + i] = buffer[i] * 32768;
    }
    Module._rnnoise_process_frame(st, ptr, ptr);
    for (var i = 0; i < 480; i++) {
      buffer[i] = Module.HEAPF32[(ptr >> 2) + i] / 32768;
    }
}
