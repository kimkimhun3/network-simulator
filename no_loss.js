const dgram = require('dgram');
const os = require('os');

// Configuration parameters
const BUFFER_SIZE = 64 * 1024 * 1024; // 64 MB
const decoderIp = document.getElementById('output-address').value;
const decoderPort = parseInt(document.getElementById('input-port').value, 10);

let server = null;
let packetBuffer = [];
let bufferTime = 0;
let enableRepetitionBuffer = false;
let isWaiting = false;
let waitingTime = 0;
let repetitionBufferTime = 0;

document.getElementById('buffer2-main-execute').addEventListener('click', handleBuffer2Execute);

function handleBuffer2Execute() {
  // Retrieve and update bufferTime and repetitionBufferTime values from HTML input elements
  bufferTime = parseInt(document.getElementById('buffer2-times').value, 10);
  repetitionBufferTime = parseInt(document.getElementById('buffer2-repetition').value, 10);
  enableRepetitionBuffer = document.getElementById('buffer2-repetition-switch').checked;

  // Update waitingTime based on enableRepetitionBuffer
  if (enableRepetitionBuffer) {
    waitingTime = repetitionBufferTime * 1000; // Convert seconds to milliseconds
  }

  if (server) {
    console.log(`Updated Buffer Time: ${bufferTime}ms`);
    startBufferingStage();
    return;
  }

  // Initialize server and start listening for packets
  server = dgram.createSocket('udp4');
  server.on('message', handleIncomingPacket);
  server.on('listening', onListening);

  server.bind(decoderPort, () => {
    server.setRecvBufferSize(BUFFER_SIZE);
    server.setSendBufferSize(BUFFER_SIZE);
  });
}

function handleIncomingPacket(msg, rinfo) {
  if (isWaiting) {
    // Forward packets directly to decoder during waiting period
    server.send(msg, decoderPort, decoderIp, (err) => {
      if (err) {
        console.error(`Error forwarding packet to decoder: ${err.message}`);
      }
    });
  } else if (bufferTime > 0) {
    // Buffer packets if buffering is enabled
    packetBuffer.push(msg);
  } else {
    // Forward packets directly to decoder
    server.send(msg, decoderPort, decoderIp, (err) => {
      if (err) {
        console.error(`Error forwarding packet to decoder: ${err.message}`);
      }
    });
  }
}

function onListening() {
  const address = server.address();
  console.log(`Server listening on ${address.address}:${address.port}`);
}

function startBufferingStage() {
  if (bufferTime > 0) {
    console.log(`Starting buffering stage for ${bufferTime}ms`);
    setTimeout(() => {
      console.log("Sending buffered packets");
      packetBuffer.forEach(packet => {
        server.send(packet, decoderPort, decoderIp, (err) => {
          if (err) {
            console.error(`Error sending packet to decoder: ${err.message}`);
          }
        });
      });

      packetBuffer = [];
      bufferTime = 0; // Reset bufferTime to ensure only one-time buffering
      document.getElementById('buffer2-times').value = bufferTime;

      if (enableRepetitionBuffer) {
        isWaiting = true;
        setTimeout(() => {
          isWaiting = false;
          console.log("Waiting stage done. Resuming normal operation.");
        }, waitingTime);
      }
    }, bufferTime);
  }
}
