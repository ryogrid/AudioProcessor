"use strict"

var NOISE = require("./noise");
require("./demo");
require("./ffmap");
var fs = require('fs');
//var wav = require('wav');
var Transform = require('stream').Transform;
var util = require('util');


var MIN_DB_LEVEL = -110;
var MAX_DB_LEVEL = -40;

var DB_LEVEL_RANGE = MAX_DB_LEVEL - MIN_DB_LEVEL;
var HEAT_COLORS = [];
function generateHeatColors() {
  function color(value) {
    var h = (1 - value) * 240;
    return "hsl(" + h + ", 100%, 50%)";
  }
  for (var i = 0; i < 256; i++) {
    HEAT_COLORS.push(color(i / 256));
  }
}
//generateHeatColors();
function clamp(v, a, b) {
  if (v < a) v = a;
  if (v > b) v = b;
  return v;
}
var DarkTheme = {
  // backgroundColor: "#212121"
  backgroundColor: "#000000"
};
var LightTheme = {
  backgroundColor: "#F5F5F5"
};

var __extends = this && this.__extends || function() {
  var extendStatics = Object.setPrototypeOf || {
    __proto__: []
  } instanceof Array && function(d, b) {
    d.__proto__ = b;
  } || function(d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
  };
  return function(d, b) {
    extendStatics(d, b);
    function __() {
      this.constructor = d;
    }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
}();

var CanvasView = function() {
  function CanvasView(canvas, width, height) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.theme = DarkTheme;
    this.reset();
  }
  CanvasView.prototype.reset = function() {
    this.ratio = window.devicePixelRatio || 1;
    this.canvas.width = this.width * this.ratio;
    this.canvas.height = this.height * this.ratio;
    this.canvas.style.width = this.width + "px";
    this.canvas.style.height = this.height + "px";
    this.ctx = this.canvas.getContext("2d");
  };
  // CanvasView.prototype.start = function() {
  //   var self = this;
  //   function tick() {
  //     self.update();
  //     self.render();
  //     requestAnimationFrame(tick);
  //   }
  //   requestAnimationFrame(tick);
  // };
  CanvasView.prototype.tick = function() {
    this.update();
    this.render();
  };
  CanvasView.prototype.update = function() {};
  CanvasView.prototype.render = function() {};
  return CanvasView;
}();
var FrequencyBins = function() {
  function FrequencyBins(analyzerNode, skip) {
    if (skip === void 0) {
      skip = 2;
    }
    this.analyzerNode = analyzerNode;
    this.skip = skip;
    var binCount = this.analyzerNode.frequencyBinCount;
    this.temp = new Float32Array(binCount);
    this.bins = new Float32Array(binCount - skip);
  }
  FrequencyBins.prototype.update = function() {
    this.analyzerNode.getFloatFrequencyData(this.temp);
    this.bins.set(this.temp.subarray(this.skip));
  };
  return FrequencyBins;
}();
var AnalyzerNodeView = function(_super) {
  __extends(AnalyzerNodeView, _super);
  function AnalyzerNodeView(analyzerNode, canvas, width, height) {
    var _this = _super.call(this, canvas, width, height) || this;
    _this.isRecording = false;
    _this.frequency = new FrequencyBins(analyzerNode);
    return _this;
  }
  return AnalyzerNodeView;
}(CanvasView);
var SpectogramAnalyzerNodeView = function(_super) {
  __extends(SpectogramAnalyzerNodeView, _super);
  function SpectogramAnalyzerNodeView(analyzerNode, canvas, width, height) {
    var _this = _super.call(this, analyzerNode, canvas, width, height) || this;
    _this.binWidth = 1;
    _this.binHPadding = 0;
    _this.binTotalWidth = _this.binWidth + _this.binHPadding;
    _this.tickHeight = 2;
    _this.tickVPadding = 0;
    _this.tickTotalHeight = _this.tickHeight + _this.tickVPadding;
    _this.reset();
    // _this.start();
    return _this;
  }
  SpectogramAnalyzerNodeView.prototype.reset = function() {
    _super.prototype.reset.call(this);
    // this.tmpCanvas = document.createElement("canvas");
    // this.tmpCanvas.width = this.canvas.width;
    // this.tmpCanvas.height = this.canvas.height;
    // this.tmpCtx = this.tmpCanvas.getContext("2d");
  };
  SpectogramAnalyzerNodeView.prototype.update = function() {
    this.frequency.update();
  };
  SpectogramAnalyzerNodeView.prototype.render = function() {
    var ctx = this.ctx;
    this.tmpCtx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.save();
    ctx.scale(this.ratio, this.ratio);
    ctx.fillStyle = this.theme.backgroundColor;
    ctx.fillRect(0, 0, this.width, this.height);
    var maxBinCount = this.width / this.binTotalWidth | 0;
    var binCount = Math.min(maxBinCount, this.frequency.bins.length);
    for (var i = 0; i < binCount / 2 | 0; i++) {
      var value = clamp((this.frequency.bins[i] - MIN_DB_LEVEL) / DB_LEVEL_RANGE, 0, 0.995);
      ctx.globalAlpha = 1;
      ctx.fillStyle = FF_MAP[value * FF_MAP.length | 0];
      ctx.fillRect(this.width - this.binTotalWidth, (binCount/4-i-1) * this.tickTotalHeight, this.binWidth, this.tickHeight);
    }
    ctx.restore();
    ctx.translate(-this.binTotalWidth, 0);
    // ctx.drawImage(this.tmpCanvas, 0, 0);
    ctx.restore();
  };
  return SpectogramAnalyzerNodeView;
}(AnalyzerNodeView);




var microphoneIsWiredUp = false;
var microphoneAccessIsNotAllowed = undefined;
var uploadMicrophoneData = false;
var suppressNoise = false;
var addNoise = false;
var mediaStream = null;
var animation = null;

var Module = null;
function stopMicrophone() {
  if (!microphoneIsWiredUp) {
    return;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => {
      track.stop();
    });
  }
  if (animation) {
    cancelAnimationFrame(animation);
  }
  microphoneIsWiredUp = false;
}

function getMicrophoneAccess() {
  if (microphoneIsWiredUp) {
    return;
  }
  var audioContext;
  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
  } catch (e) {
    alert('Web Audio API is not supported in this browser.');
  }

  // Check if there is microphone input.
  navigator.getUserMedia = navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia ||
                           navigator.msGetUserMedia;
  if (!navigator.getUserMedia) {
    alert("getUserMedia() is not supported in your browser.");
    return;
  }
  var inputBuffer = [];
  var outputBuffer = [];
  var bufferSize = 16384;
  var sampleRate = audioContext.sampleRate;
  var processingNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
  var noiseNode = audioContext.createScriptProcessor(bufferSize, 1, 1);

  noiseNode.onaudioprocess = function (e) {
    var input = e.inputBuffer.getChannelData(0);
    var output = e.outputBuffer.getChannelData(0);
    for (var i = 0; i < input.length; i++) {
      if (addNoise) {
        output[i] = input[i] + (Math.random() / 100);
      } else {
        output[i] = input[i];
      }
    }
  };

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

  processingNode.onaudioprocess = function (e) {
    var input = e.inputBuffer.getChannelData(0);
    var output = e.outputBuffer.getChannelData(0);

    // Drain input buffer.
    for (var i = 0; i < bufferSize; i++) {
      inputBuffer.push(input[i]);
    }

    // if (uploadMicrophoneData) {
    //   while (inputBuffer.length >= sampleRate) {
    //     var buffer = [];
    //     for (var i = 0; i < sampleRate; i++) {
    //       buffer.push(inputBuffer.shift())
    //     }
    //     postData(convertFloat32ToInt16(buffer).buffer);
    //     console.log("Posting ...");
    //   }
    //   for (var i = 0; i < bufferSize; i++) {
    //     output[i] = 0;
    //   }
    //   return;
    // }

    while (inputBuffer.length >= 480) {
      for (var i = 0; i < 480; i++) {
        frameBuffer[i] = inputBuffer.shift();
      }
      // Process Frame
      if (suppressNoise) {
        removeNoise(frameBuffer);
      }
      for (var i = 0; i < 480; i++) {
        outputBuffer.push(frameBuffer[i]);
      }
    }
    // Not enough data, exit early, etherwise the AnalyserNode returns NaNs.
    // if (outputBuffer.length < bufferSize) {
    //   return;
    // }
    // Flush output buffer.
    for (var i = 0; i < bufferSize; i++) {
      output[i] = outputBuffer.shift();
    }
  }

  // Get access to the microphone and start pumping data through the graph.
  navigator.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    }
  }, function (stream) {
    mediaStream = stream;
    var microphone = audioContext.createMediaStreamSource(stream);
    var sourceAnalyserNode = audioContext.createAnalyser();
    var destinationAnalyserNode = audioContext.createAnalyser();
    sourceAnalyserNode.smoothingTimeConstant = 0;
    destinationAnalyserNode.smoothingTimeConstant = 0;

    sourceAnalyserNode.fftSize = 1024;
    destinationAnalyserNode.fftSize = 1024;

    microphone.connect(noiseNode);
    noiseNode.connect(sourceAnalyserNode);
    sourceAnalyserNode.connect(processingNode);
    processingNode.connect(destinationAnalyserNode);

    destinationAnalyserNode.connect(audioContext.destination);
    microphoneIsWiredUp = true;

    var sourceView = new SpectogramAnalyzerNodeView(sourceAnalyserNode, document.getElementById("source_spectrogram"), 876, 256);
    var destinationView = new SpectogramAnalyzerNodeView(destinationAnalyserNode, document.getElementById("destination_spectrogram"), 876, 256);
    function tick() {
      sourceView.tick();
      destinationView.tick();
      animation = requestAnimationFrame(tick);
    }
    animation = requestAnimationFrame(tick);

  }, function (e) {
    if (e.name === "PermissionDeniedError") {
      microphoneAccessIsNotAllowed = true;
      alert("You'll need to provied access to your microphone for this web page to work.");
    }
  });
}

function convertFloat32ToInt16(buffer) {
  var l = buffer.length;
  var buf = new Int16Array(l);
  while (l--) {
    buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
  }
  return buf;
}

var uploadedPackets = 0;
function postData(arrayBuffer) {
  var streamingStatus = document.getElementById("streaming_status");
  var fd = new FormData();
  fd.append("author", "Fake Name");
  fd.append("attachment1", new Blob([arrayBuffer]));
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "https://demo.xiph.org/upload");
  xhr.onload = function (event) {
    uploadedPackets++;
    streamingStatus.innerText = "Donated " + uploadedPackets + " seconds of noise (of 60).";
    if (uploadedPackets >= 60) {
      stopStreaming();
      stopMicrophone();
    }
  };
  xhr.send(fd);
}

function stopStreaming() {
  return;
  var streamingButton = document.getElementById("streaming_button");
  var streamingStatusIcon = document.getElementById("streaming_status_icon");
  var streamingStatus = document.getElementById("streaming_status");
  streamingStatusIcon.style.visibility = "hidden";
  uploadMicrophoneData = false;
  streamingButton.innerText = "Start donating a minute of noise!";
  uploadedPackets = 0;
  streamingStatus.innerText = "";
}

function startStreaming() {
  var streamingButton = document.getElementById("streaming_button");
  var streamingStatusIcon = document.getElementById("streaming_status_icon");
  streamingStatusIcon.style.visibility = "visible";
  uploadMicrophoneData = true;
  streamingButton.innerText = "Stop donating my noise!";
}

function toggleStreaming() {
  getMicrophoneAccess();
  if (uploadMicrophoneData) {
    stopStreaming();
  } else {
    startStreaming();
  }
}

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

function toggleNoise() {
  addNoise = !addNoise;
}

var selectedLiveNoiseSuppression = null;
function liveNoiseSuppression(type, item) {
  if (selectedLiveNoiseSuppression) selectedLiveNoiseSuppression.classList.remove("selected");
  selectedLiveNoiseSuppression = item;
  item.classList.add("selected");
  if (type == 0) {
    stopMicrophone();
    return;
  }
  getMicrophoneAccess();
  initializeNoiseSuppressionModule();
  stopStreaming();
  if (type == 1) {
    suppressNoise = false;
  } else if (type == 2) {
    suppressNoise = true;
  }
}

var selectedLiveNoise = null;
function liveNoise(type, item) {
  addNoise = !!type;
  if (selectedLiveNoise) selectedLiveNoise.classList.remove("selected");
  selectedLiveNoise = item;
  item.classList.add("selected");
}

/////////////////////////////////////////////////////////////////////

// function inherits(ctor, superCtor) {
//     ctor.super_ = superCtor;
//     ctor.prototype = Object.create(superCtor.prototype, {
// 	constructor: {
// 	    value: ctor,
// 	    enumerable: false,
// 	    writable: true,
// 	    configurable: true
// 	}
//     });
// };

function Wave() {
    this.channel = null;
    Transform.call(this);
}

util.inherits(Wave, Transform);

Wave.prototype._transform = function(chunk, encoding, callback) {
    var format = chunk[0].toString() + chunk[1].toString() + chunk[2].toString() + chunk[3].toString();
    if(chunk.readUInt16LE(22) == 1){
	this.channel = 'mono';
    }else{
	this.channel = 'stereo';
    }
    this.size = chunk.readUInt16LE(32);


    if(format == 'RIFF'){
	this.channel = channel;
	this.blockSize = size;
	for(var i = 44; i<chunk.length; i++){
	    this.push(chunk[i]);
	}
    }else{
	this.push(chunk);
    }

    //console.log(chunk.length);
    callback();
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
//var bufferSize = 16384;

//var sampleRate = audioContext.sampleRate;

//var ifs = fs.createReadStream('../asakai32.wav');

// var headerBuf = new ArrayBuffer(44);
// var data_buf = new ArrayBuffer(frame_num * 8);
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

// for(var i = 0; i < bufferSize; i++){
//     inputBuffer[i] = Math.random() * (1 + 1 - (-1) ) + (-1);
// }

//var reader = new wav.Reader();
//var ofs = fs.createWriteStream('./asakai60_transform.wav');

//change channnel num to 1 (kore yaru to oto ga nobiru)
//headerBuf[22] = 1;
//headerBuf[23] = 0;

//var dv_header = new DataView(headerBuf);
//dv_header.setUint16(22, 1, true);
//headerBuf = new Buffer(dv_header.buffer);

denoise_main(inputBuffer, outputBuffer);

var write_buf = new Float32Array(outputBuffer.length*2);
for(var i=0;i<outputBuffer.length;i++){
  write_buf[i*2] = outputBuffer[i];
  write_buf[i*2+1] = outputBuffer[i];
}

// var av = new ArrayBuffer(outputBuffer.length * 4);
// var dv = new DataView(av);
// for(var i=0; i<frame_num;i++){
//     dv.setFloat32(i * 4, outputBuffer[i], true);
// }

// var hoge = new ArrayBuffer(1);
// hoge[0] = 1;
// fs.writeFileSync('./asakai32_transform.wav', hoge);



// fs.writeFile('./asakai32_transform.wav', headerBuf, (err) => {
//     if (err) throw err;
//     console.log('The file has been saved!');
// });
// //    fs.writeFile('./asakai32_transform.wav', outputBuffer, (err) => {
// fs.writeFile('./asakai32_transform.wav', data_buf, (err) => {
//     if (err) throw err;
//     console.log('The file has been saved!');
// });

// var wstream = fs.createWriteStream('./asakai32_transform.wav');
// wstream.write(headerBuf, (err) => {
//     if (err) throw err;
//     console.log('The file has been saved!');

//     wstream.write(data_buf);
// });

var wstream = fs.createWriteStream('./asakai32_transform.wav');
wstream.write(headerBuf, (err) => {
    if (err) throw err;
    console.log('The file has been saved!');

    wstream.write(new Buffer(write_buf.buffer));
    //wstream.write(data_buf);
});

//wstream.write(tmpBuffer);
//console.log(tmpBuffer.constructor);


//console.log("len:" + dv.buffer.length.toString());
//console.log("outputBuffer.buffer.length:" + outputBuffer.buffer.length.toString());


// var wav = new Wave();

// function read_handler(d){
//     var ary = [];
//     for(var i = 0; i < d.length/wav.blockSize; i++){
// 	ary.push(d.readUInt16LE(wav.blockSize * i));
//     }
// //    console.log(ary);
// }


// ifs.pipe(wav);
// wav.on('data', read_handler);


// // the "format" event gets emitted at the end of the WAVE header
// reader.on('format', function (format) {
//     //var output = new Speaker(format);
//     var chunk;
//     while (null !== (chunk = reader.read(8))) {
// 	ofs.write(chunk);
//     }
// });



// reader.on('data', function(data) {
//     ofs.write(data);
// });

// ifs.pipe(reader);

function denoise_main(input, output) {
    // var input = e.inputBuffer.getChannelData(0);
    // var output = e.outputBuffer.getChannelData(0);

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

// Disable demo when changing tabs.

// var hidden, visibilityChange;
// if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
//   hidden = "hidden";
//   visibilityChange = "visibilitychange";
// } else if (typeof document.msHidden !== "undefined") {
//   hidden = "msHidden";
//   visibilityChange = "msvisibilitychange";
// } else if (typeof document.webkitHidden !== "undefined") {
//   hidden = "webkitHidden";
//   visibilityChange = "webkitvisibilitychange";
// }
// function handleVisibilityChange() {
//   if (document[hidden]) {
//     liveNoiseSuppression(0, document.getElementById("default_live_noise_suppression"));
//   }
// }
// // Warn if the browser doesn't support addEventListener or the Page Visibility API
// if (typeof document.addEventListener !== "undefined" && typeof document[hidden] !== "undefined") {
//   // Handle page visibility change
//   document.addEventListener(visibilityChange, handleVisibilityChange, false);
// }
