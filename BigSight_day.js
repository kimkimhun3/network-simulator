const dgram = require('dgram');
let server = null;
let bufferTimeout = null;
let waitTimeout = null;
let isWaiting = false;
let bufferTime = 0;
let packetBuffer = [];
let waitingTime = 0;
let repetitionBufferTime = 0;
let enableRepetitionBuffer = false;
let decoderIp;
let decoderPort;

document.getElementById('buffer2-main-execute').addEventListener('click', handleBuffer2Execute);

function handleBuffer2Execute() {
  // Retrieve and update bufferTime and repetitionBufferTime values from HTML input elements
  bufferTime = parseInt(document.getElementById('buffer2-times').value, 10);
  repetitionBufferTime = parseInt(document.getElementById('buffer2-repetition').value, 10);
  enableRepetitionBuffer = document.getElementById('buffer2-repetition-switch').checked;
  decoderIp = document.getElementById('output-address').value;
  decoderPort = parseInt(document.getElementById('input-port').value, 10);

  // Update waitingTime based on enableRepetitionBuffer
  if (enableRepetitionBuffer) {
    waitingTime = repetitionBufferTime * 1000; // Convert seconds to milliseconds
  } else {
    waitingTime = 0;
  }

  if (bufferTime === 0 && !enableRepetitionBuffer) {
    // Case 1: Forward packets directly to decoder
    console.log("Forwarding packets directly to decoder.");
    if (!server) {
      initializeServer();
    }
  } else if (bufferTime > 0 && !enableRepetitionBuffer) {
    // Case 2: One-time buffering and then forward
    console.log(`Buffering packets for ${bufferTime}ms, then forwarding.`);
    performSingleBuffering();
  } else if (bufferTime > 0 && enableRepetitionBuffer) {
    // Case 3: Repetitive buffering and waiting
    console.log(`Repetitive buffering and waiting.`);
    startBufferingCycle();
  }
}

function performSingleBuffering() {
  // Initialize server if not already initialized
  if (!server) {
    initializeServer();
  }

  bufferTimeout = setTimeout(() => {
    sendBufferedPackets();
    bufferTime = 0; // Reset bufferTime after one-time buffering
    document.getElementById('buffer2-times').value = bufferTime;
    console.log("Buffering complete. Forwarding packets directly to decoder.");
  }, bufferTime);
}

function startBufferingCycle() {
  // Initialize server if not already initialized
  if (!server) {
    initializeServer();
  }

  function performBuffering() {
    sendBufferedPackets();

    if (enableRepetitionBuffer && waitingTime > 0) {
      isWaiting = true;
      waitTimeout = setTimeout(() => {
        isWaiting = false;
        waitTimeout = null;
        bufferTimeout = setTimeout(performBuffering, bufferTime);
      }, waitingTime);
    }
  }

  bufferTimeout = setTimeout(performBuffering, bufferTime);
}

function sendBufferedPackets() {
  const startTime = Date.now();
  console.log(`Start Time: ${startTime}`);
  const totalSize = packetBuffer.reduce((sum, packet) => sum + packet.length, 0);
  console.log(`Total size of packetBuffer: ${totalSize} bytes`);

  packetBuffer.forEach(packet => {
    server.send(packet, decoderPort, decoderIp, (err) => {
      if (err) {
        console.error(`Error sending packet to decoder: ${err.message}`);
      }
    });
  });

  const endTime = Date.now();
  console.log(`End Time: ${endTime}`)
  const totalDuration = endTime - startTime;
  console.log(`Total time to send all packets: ${totalDuration}ms`);

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
      // Forward packets directly to decoder
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

  server.bind(decoderPort);
}
