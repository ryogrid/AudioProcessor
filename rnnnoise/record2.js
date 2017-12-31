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

//var bufferSize = 2646000 - 44;
var frame_num = 2646000;
var bufferSize = frame_num * 8;
var all_buffersize = bufferSize + 44;
var inputBuffer = new Float32Array(frame_num);
inputBuffer.fill(0);
var outputBuffer = new Float32Array(frame_num);
outputBuffer.fill(0);

var headerBuf = new Buffer(44);
var data_buf = new Buffer(frame_num * 8);

var tmpBuffer = fs.readFileSync('./asakai32.wav');
console.log("file bytes:" + tmpBuffer.length.toString());
var dataview;
var frame_idx = 0;
var buf_offset = 0;
for(var i = 0; i < all_buffersize; i++){
    if(i<=43){
	headerBuf[i] = tmpBuffer[i];
    }else{
	data_buf[i-44] = tmpBuffer[i];
	if(frame_idx < frame_num){
	    buf_offset = 8 * frame_idx;
//	    console.log(buf_offset);
      //var b1 = zeroPadding(tmpBuffer[44+buf_offset].toString(2),8);
      //var b2 = zeroPadding(tmpBuffer[44+buf_offset+1].toString(2),8);
      //var b3 = zeroPadding(tmpBuffer[44+buf_offset+2].toString(2),8);
      //var b4 = zeroPadding(tmpBuffer[44+buf_offset+3].toString(2),8);
      //console.log(b4 + b3 + b2 + b1); //little endian
      //console.log(b1 + b2 + b3 + b4);
	    inputBuffer[frame_idx] = dataview.getFloat32(buf_offset, true);
      if(inputBuffer[frame_idx] != 0){
        console.log(inputBuffer[frame_idx]);
      }
      frame_idx += 1;
	}
    }
    if(i==43){
	var dv_buf = new ArrayBuffer(bufferSize);
	for(var j=0;j<bufferSize;j++){
	    dv_buf[j] = tmpBuffer[43+j];
      //console.log(dv_buf[j]);
	}
	dataview = new DataView(dv_buf);
    }
}

denoise_main(inputBuffer, outputBuffer);

var write_buf = new Float32Array(outputBuffer.length*2);
for(var i=0;i<outputBuffer.length;i++){
  write_buf[i*2] = outputBuffer[i];
  write_buf[i*2+1] = outputBuffer[i];
}

// var write_bbuf = new Buffer(frame_num*8);
// for(var i=0;i<frame_num*8;i+=4){
//     write_bbuf[i] = write_buf.buffer[i+3];
//     write_bbuf[i+1] = write_buf.buffer[i+2];
//     write_bbuf[i+2] = write_buf.buffer[i+1];
//     write_bbuf[i+3] = write_buf.buffer[i];
// }


var wstream = fs.createWriteStream('./asakai32_transform.wav');
wstream.write(headerBuf, (err) => {
    if (err) throw err;
    console.log('The file has been saved!');

    //wstream.write(write_bbuf);
    wstream.write(new Buffer(write_buf.buffer));
    //wstream.write(data_buf);
});

var suppressNoise = true;

function denoise_main(input, output) {
    var out_buf = new Float32Array(bufferSize);
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
	//console.log(rest);
    }
    // Flush output buffer.
    for (var i = 0; i < frame_num - rest; i++) {
//	output[i] = out_buf.shift();
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
