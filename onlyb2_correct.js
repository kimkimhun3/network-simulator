let server = null;
let packetBuffer = [];
let waitingTime = 0;
let repetitionBufferTime = 0;
let enableRepetitionBuffer = false;
let decoderIp;
let decoderPort;
let isBuffering = false;

function handleBuffer2Execute() {
    bufferTime = parseInt(document.getElementById('buffer2-times').value, 10);
    repetitionBufferTime = parseInt(document.getElementById('buffer2-repetition').value, 10);
    enableRepetitionBuffer = document.getElementById('buffer2-repetition-switch').checked;
    decoderIp = document.getElementById('output-address').value;
    decoderPort = parseInt(document.getElementById('input-port').value, 10);

    waitingTime = enableRepetitionBuffer ? (repetitionBufferTime * 1000) + 1000 : 0;    
    if ((bufferTime === 0 && !enableRepetitionBuffer) || (bufferTime === 0 && enableRepetitionBuffer && repetitionBufferTime === 0)) {
      // Case 1: Forward packets directly to decoder
      console.log("Forwarding packets directly to decoder.");
      if (!server) {
        initializeServer();
      }
      // Ensure input event listener is removed
      removeBufferTimeInputListener();
    } else if (bufferTime > 0 && (!enableRepetitionBuffer || repetitionBufferTime === 0)) {
      // Case 2: One-time buffering and then forward
      console.log(`Buffering packets for ${bufferTime}ms, then forwarding.`);
      performSingleBuffering();
      // Ensure input event listener is removed
      removeBufferTimeInputListener();
    } else if (bufferTime > 0 && enableRepetitionBuffer) {
      // Case 3: Repetitive buffering and waiting
      console.log(`Repetitive buffering and waiting.`);
      if (!isBufferingCycleRunning){
        startBufferingCycle();
        // Add input event listener only for Case 3
        addBufferTimeInputListener();
      } else {
        console.log("Buffering cycle is already running.");
      }
  
    }
  }
  

function performSingleBuffering() {
// Initialize server if not already initialized
if (!server) {
    initializeServer();
}
bufferTimeout = setTimeout(() => {
    sendBufferedPackets();
    bufferTime = 0; 
    document.getElementById('buffer2-times').value = bufferTime;
    console.log("Buffering complete. Forwarding packets directly to decoder.");
    removeBufferTimeInputListener();
}, bufferTime);
}

function startBufferingCycle() {
if (!server) {
    initializeServer();
}
isBufferingCycleRunning = true;
function performBuffering() {
    sendBufferedPackets();
    if (enableRepetitionBuffer && waitingTime > 0) {
    isWaiting = true;
    waitTimeout = setTimeout(() => {
        isWaiting = false;
        waitTimeout = null;
        bufferTimeout = setTimeout(performBuffering, bufferTime);
    }, waitingTime);
    }  else {
    isBufferingCycleRunning = false; // Reset the flag when the buffering cycle is complete
    }
}
    bufferTimeout = setTimeout(performBuffering, bufferTime);
}
function sendBufferedPackets() {
const totalPackets = packetBuffer.length;
console.log(`Buffered packet ${totalPackets}`);
packetBuffer.forEach(packet => {
    server.send(packet, decoderPort, decoderIp, (err) => {
    if (err) {
        console.error(`Error sending packet to decoder: ${err.message}`);
    }
    });
});
console.log(`Sent ${totalPackets}`);
packetBuffer = [];
}



function initializeServer() {
server = dgram.createSocket('udp4');
const BUFFER_SIZE = 64 * 1024 * 1024; // 64 MB

server.on('message', (msg, rinfo) => {
    if (isWaiting) {
    server.send(msg, decoderPort, decoderIp, (err) => {
        if (err) {
        console.error(`Error forwarding packet to decoder: ${err.message}`);
        }
    });
    } else if (bufferTime > 0) {
    packetBuffer.push(msg);
    } else {
    server.send(msg, decoderPort, decoderIp, (err) => {
        if (err) {
        console.error(`Error forwarding packet to decoder: ${err.message}`);
        }
    });
    }
});

server.on('listening', () => {
    const address = server.address();
    console.log(`Server listening on ${address.address}:${address.port}`);
    
    server.setRecvBufferSize(BUFFER_SIZE);
    server.setSendBufferSize(BUFFER_SIZE);
});

server.bind(decoderPort, localIP);
}




// Add input event listener to buffer2-times
function addBufferTimeInputListener() {
    if (!inputEventListenerActive) {
      document.getElementById('buffer2-times').addEventListener('input', updateBufferTime);
      inputEventListenerActive = true;
    }
  }
  
  // Remove input event listener from buffer2-times
  function removeBufferTimeInputListener() {
    if (inputEventListenerActive) {
      document.getElementById('buffer2-times').removeEventListener('input', updateBufferTime);
      inputEventListenerActive = false;
    }
  }
  
  // Update bufferTime on input change
  function updateBufferTime(event) {
    bufferTime = parseInt(event.target.value, 10);
    if (isNaN(bufferTime)) {
      bufferTime = 0;
    }
    // Ensure that the updated bufferTime is applied immediately
    if (isBuffering && bufferTimeout) {
      clearTimeout(bufferTimeout);
      bufferTimeout = setTimeout(() => {
        startBufferingCycle();
      }, bufferTime);
    }
  }
