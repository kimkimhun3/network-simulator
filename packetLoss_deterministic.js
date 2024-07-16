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
let dropCounter = 0;
let dropInterval = 0;

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
  bufferTime = parseInt(document.getElementById('buffer2-times').value, 10);
  repetitionBufferTime = parseInt(document.getElementById('buffer2-repetition').value, 10);
  enableRepetitionBuffer = document.getElementById('buffer2-repetition-switch').checked;
  decoderIp = document.getElementById('output-address').value;
  decoderPort = parseInt(document.getElementById('input-port').value, 10);

  if (enableRepetitionBuffer) {
    waitingTime = repetitionBufferTime * 1000;
  } else {
    waitingTime = 0;
  }

  if ((bufferTime === 0 && !enableRepetitionBuffer) || (bufferTime === 0 && (enableRepetitionBuffer && repetitionBufferTime === 0))) {
    console.log("Forwarding packets directly to decoder.");
    if (!server) {
      initializeServer();
    }
  } else if (bufferTime > 0 && (!enableRepetitionBuffer || repetitionBufferTime === 0)) {
    console.log(`Buffering packets for ${bufferTime}ms, then forwarding.`);
    performSingleBuffering();
  } else if (bufferTime > 0 && enableRepetitionBuffer) {
    console.log(`Repetitive buffering and waiting.`);
    startBufferingCycle();
  }
}

function handlePacketLossSwitch() {
  enablePacketLoss = document.getElementById('packet-loss-switch').checked;
  document.getElementById('input-packet-loss').disabled = !enablePacketLoss;
  document.getElementById('switch-text').textContent = enablePacketLoss ? 'ON' : 'OFF';

  if (!enablePacketLoss) {
    packetLossPercentage = 0;
    dropCounter = 0;
  }
}

function handlePacketLossInput() {
  const inputElement = document.getElementById('input-packet-loss');
  const inputValue = inputElement.value.trim();

  if (inputValue === '') {
    setPacketLoss(0);
  } else {
    const percentage = parseInt(inputValue, 10);
    setPacketLoss(percentage);
  }
}

function setPacketLoss(percentage) {
  if (percentage >= 0 && percentage <= 99) {
    packetLossPercentage = percentage;
    dropInterval = Math.round(100 / packetLossPercentage);
    dropCounter = 0;
    console.log(`Packet loss percentage set to ${percentage}%. Dropping every ${dropInterval} packets.`);
  } else {
    console.error('Invalid packet loss percentage. Please enter a value between 1 and 99.');
  }
}

function shouldDropPacket() {
  if (!enablePacketLoss || packetLossPercentage === 0) return false;

  dropCounter++;
  if (dropCounter >= dropInterval) {
    dropCounter = 0;
    return true;
  }
  return false;
}

function performSingleBuffering() {
  if (!server) {
    initializeServer();
  }

  bufferTimeout = setTimeout(() => {
    sendBufferedPackets();
    bufferTime = 0;
    document.getElementById('buffer2-times').value = bufferTime;
    console.log("Buffering complete. Forwarding packets directly to decoder.");
  }, bufferTime);
}

function startBufferingCycle() {
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
  const BUFFER_SIZE = 64 * 1024 * 1024;

  server.on('message', (msg, rinfo) => {
    totalPacketsReceived++;

    if (shouldDropPacket()) {
      packetsDropped++;
      console.log(`Packet dropped (${packetsDropped} total drops).`);
      return;
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
