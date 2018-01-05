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
var bufferSize = frame_num * 4;
var all_buffersize = bufferSize + 44;
var inputBuffer = new Float32Array(frame_num);
inputBuffer.fill(0);
var outputBuffer = new Float32Array(frame_num);
outputBuffer.fill(0);

var headerBuf = new Buffer(44);
var data_buf = new Buffer(frame_num * 4);

var tmpBuffer = fs.readFileSync('./asakai60.wav');

var dv_buf = new ArrayBuffer(bufferSize);

// for(var i=0;i<tmpBuffer.length;i++){
//   tmpBuffer[i] = 255 - tmpBuffer.charCodeAt(i);
// }
console.log("file bytes:" + tmpBuffer.length.toString());
var dataview;
var frame_idx = 0;
var buf_offset = 0;
for(var i = 0; i < all_buffersize; i++){
    if(i<=43){
	     headerBuf[i] = tmpBuffer[i];
    }else{
 	     data_buf[i-44] = tmpBuffer[i];
// 	     if(frame_idx < frame_num){
// 	        buf_offset = 4 * frame_idx;
// //	    console.log(buf_offset);
//       //var b1 = zeroPadding(tmpBuffer[44+buf_offset].toString(2),8);
//       //var b2 = zeroPadding(tmpBuffer[44+buf_offset+1].toString(2),8);
//       //var b3 = zeroPadding(tmpBuffer[44+buf_offset+2].toString(2),8);
//       //var b4 = zeroPadding(tmpBuffer[44+buf_offset+3].toString(2),8);
//       //console.log(b4 + b3 + b2 + b1); //little endian
//       //console.log(b1 + b2 + b3 + b4);
//                                   //dataview.getFloat32(buf_offset, true);
//          var val = dataview.getInt16(buf_offset, true) * 1.0;
//          console.log(val);
// 	       inputBuffer[frame_idx] = val;
//          if(inputBuffer[frame_idx] != 0.0){
//             console.log(inputBuffer[frame_idx]);
//          }
//          frame_idx += 1;
//       }
    }
    if(i==43){
	     for(var j=0;j<bufferSize;j++){
	        dv_buf[j] = tmpBuffer[44+j];
          //console.log(dv_buf[j]);
	     }
	     dataview = new DataView(dv_buf);
    }
}

var floatOffset = 0;
//var floatScale = 1 << (16 - 1);
var floatScale = 32768;
for(var i=0;i<frame_num;i++){
  var val = 0;
  for(var b=0;b<2;b++){
    var v = data_buf[i*4+b];
    if (b < 2-1){
      v &= 0xFF;
    }
    val += v << (b * 8);
  }
  inputBuffer[i] = floatOffset + val / floatScale;
  console.log(inputBuffer[i]);
}

  // if(val > 9223372036854775807){
  //   var diff = val - 9223372036854775807;
  //   val = -9223372036854775807 + diff;
  // }


  //inputBuffer[i] = val;
  // if(val != 0.0){
  //   console.log(inputBuffer[i]);
  // }


  // if(inputBuffer[i] != 0){
  //   console.log(inputBuffer[i]);
  // }



denoise_main(inputBuffer, outputBuffer);

// for(var i=0;i<bufferSize;i+=4){
//   console.log(i.toString() + ":" + i);
//   var b1 = zeroPadding(outputBuffer.buffer[i].toString(2),8);
//   var b2 = zeroPadding(outputBuffer.buffer[i+1].toString(2),8);
//   var b3 = zeroPadding(outputBuffer.buffer[i+2].toString(2),8);
//   var b4 = zeroPadding(outputBuffer.buffer[i+3].toString(2),8);
//   console.log(b4 + b3 + b2 + b1); //little endian
// }

// var write_buf = new Float32Array(outputBuffer.length*2);
// for(var i=0;i<outputBuffer.length;i++){
//   write_buf[i*2] = outputBuffer[i];
//   write_buf[i*2+1] = outputBuffer[i];
// }

//9007199254740991 //Number.MAX_SAFE_INTEGER
floatScale = 32767; //9223372036854775807L >> (64 - 12)
var write_buf = new Buffer(frame_num*2);
for(var i=0;i<outputBuffer.length;i++){
  var gen = Math.round(floatScale * outputBuffer[i]);
  //var gen = Math.round(floatScale * outputBuffer[i]);
  //console.log(outputBuffer[i]);
  //console.log(gen);
  for (var b=0;b<2;b++){
			write_buf[i*2+b] = gen & 0xFF;
			gen >>= 8;
	}
}
var write_buf2 = new Buffer(frame_num*4);
var buf_pointer = 0;
for(var i=0;i<write_buf.length;i+=2){
  write_buf2[buf_pointer] = write_buf[i];
  write_buf2[buf_pointer+1] = write_buf[i+1];
  write_buf2[buf_pointer+2] = write_buf[i];
  write_buf2[buf_pointer+3] = write_buf[i+1];
  buf_pointer+=4;
}

// var write_buf = new Float32Array(inputBuffer.length*2);
// for(var i=0;i<inputBuffer.length;i++){
//   write_buf[i*2] = inputBuffer[i];
//   write_buf[i*2+1] = inputBuffer[i];
// }

// var write_bbuf = new Buffer(frame_num*8);
// for(var i=0;i<frame_num*8;i+=4){
//     write_bbuf[i] = write_buf.buffer[i+3];
//     write_bbuf[i+1] = write_buf.buffer[i+2];
//     write_bbuf[i+2] = write_buf.buffer[i+1];
//     write_bbuf[i+3] = write_buf.buffer[i];
// }


var wstream = fs.createWriteStream('./asakai60_transform.wav');
wstream.write(headerBuf, (err) => {
    if (err) throw err;
    console.log('The file has been saved!');

    //wstream.write(write_bbuf);
    //wstream.write(new Buffer(write_buf.buffer));
    //wstream.write(data_buf);
    wstream.write(write_buf2);
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
	//console.log(rest);
    }
    // Flush output buffer.
    for (var i = 0; i < frame_num - rest; i++) {
//	output[i] = out_buf.shift();
       //console.log(i.toString() + ":" + output[i].toString());
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
