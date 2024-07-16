const dgram = require('dgram');
const os = require('os');
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
let packetLossPercentage = 0;
let enablePacketLoss = false;
let totalPacketsReceived = 0;
let packetsDropped = 0;

document.getElementById('buffer2-main-execute').addEventListener('click', handleBuffer2Execute);
document.getElementById('packet-loss-switch').addEventListener('change', handlePacketLossSwitch);
document.getElementById('input-packet-loss').addEventListener('input', handlePacketLossInput);

function getLocalIP() {
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    const addresses = networkInterfaces[interfaceName];
    for (const addressInfo of addresses) {
      if (addressInfo.family === 'IPv4' && !addressInfo.internal) {
        return addressInfo.address;
      }
    }
  }
  return null;
}

const localIP = getLocalIP();

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

  if ((bufferTime === 0 && !enableRepetitionBuffer) || (bufferTime === 0 && (enableRepetitionBuffer && repetitionBufferTime === 0 ))) {
    // Case 1: Forward packets directly to decoder
    console.log("Forwarding packets directly to decoder.");
    if (!server) {
      initializeServer();
    }
  } else if (bufferTime > 0 && (!enableRepetitionBuffer || repetitionBufferTime === 0)) {
    // Case 2: One-time buffering and then forward
    console.log(`Buffering packets for ${bufferTime}ms, then forwarding.`);
    performSingleBuffering();
  } else if (bufferTime > 0 && enableRepetitionBuffer) {
    // Case 3: Repetitive buffering and waiting
    console.log(`Repetitive buffering and waiting.`);
    startBufferingCycle();
  }
}

function handlePacketLossSwitch() {
  enablePacketLoss = document.getElementById('packet-loss-switch').checked;
  document.getElementById('input-packet-loss').disabled = !enablePacketLoss;
  document.getElementById('switch-text').textContent = enablePacketLoss ? 'ON' : 'OFF';

  if (!enablePacketLoss) {
    packetLossPercentage = 0; // Reset packet loss percentage when the switch is turned off
  }
}

function handlePacketLossInput() {
  const inputElement = document.getElementById('input-packet-loss');
  const inputValue = inputElement.value.trim(); // Trim to remove leading/trailing whitespace

  if (inputValue === '') {
    setPacketLoss(0); // Reset packet loss percentage to 0 when input is empty
  } else {
    const percentage = parseInt(inputValue, 10);
    setPacketLoss(percentage);
  }
}

// Function to set the packet loss percentage
function setPacketLoss(percentage) {
  if (percentage >= 0 && percentage <= 99) {
    packetLossPercentage = percentage;
    enablePacketLoss = percentage > 0; // Enable packet loss if percentage is greater than 0
    console.log(`Packet loss percentage set to ${percentage}%.`);
  } else {
    console.error('Invalid packet loss percentage. Please enter a value between 1 and 99.');
  }
}

// function shouldDropPacket() {
//   if (!enablePacketLoss) return false;
//   const randomValue = Math.random() * 100;
//   return randomValue < packetLossPercentage;
// }
function shouldDropPacket() {
  if (!enablePacketLoss) return false;

  // Ensure a uniform distribution of packet drops based on the percentage
  const dropThreshold = packetLossPercentage / 100.0;
  const randomValue = Math.random();

  return randomValue < dropThreshold;
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
  console.log(`End Time: ${endTime}`);
  const totalDuration = endTime - startTime;
  console.log(`Total time to send all packets: ${totalDuration}ms`);

  packetBuffer = [];
}

function initializeServer() {
  server = dgram.createSocket('udp4');
  const BUFFER_SIZE = 64 * 1024 * 1024; // 64 MB

  server.on('message', (msg, rinfo) => {
    //totalPacketsReceived++;

    if (shouldDropPacket()) {
      packetsDropped++;
      console.log(`Packet dropped (${packetsDropped} total drops).`);
      return; // Drop the packet
    }

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

  server.bind(decoderPort, localIP);
}
