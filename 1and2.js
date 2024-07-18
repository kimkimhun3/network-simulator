const dgram = require('dgram');
const os = require('os');
let server = null;
let buffer1Server = null;
let bufferTimeout = null;
let waitTimeout = null;
let isWaiting = false;
let bufferTime = 0;
let numPackets = 0;
let packetBuffer = [];
let waitingTime = 0;
let waitingTime1 = 0;
let repetitionBufferTime = 0;
let repetitionBufferTime1 = 0;
let enableRepetitionBuffer = false;
let enableRepetitionBuffer1 = false;
let decoderIp;
let decoderPort;
let packetLossPercentage = 0;
let enablePacketLoss = false;
let totalPacketsReceived = 0;
let packetsDropped = 0;
let buffer1PacketCount = 0;
let buffer1PacketBuffer = [];
let isWaiting1 = false;
let bufferTimeout1 = null;
let waitTimeout1 = null;
let isBuffering = numPackets !== 0 && enableRepetitionBuffer1;

document.getElementById('buffer1-main-execute').addEventListener('click', handleBuffer1Execute);
document.getElementById('buffer2-main-execute').addEventListener('click', handleBuffer2Execute);
document.getElementById('packet-loss-switch').addEventListener('change', handlePacketLossSwitch);
document.getElementById('input-packet-loss').addEventListener('input', handlePacketLossInput);
document.getElementById('buffer1-check').addEventListener('change', handleBuffer1Check);
document.getElementById('buffer2-check').addEventListener('change', handleBuffer2Check);

function handleBuffer1Check(){
  const checkbox = document.getElementById('buffer1-check');
  if (checkbox.checked) {
    console.log('B1 Switched!');
    document.getElementById('buffer2-check').disabled = true;
  } else {
    document.getElementById('buffer2-check').disabled = false;
    // Stop the server if it is running
    if (buffer1Server) {
      buffer1Server.close();
      buffer1Server = null;
      console.log('B1 Server stopped.');
    }
  }
}
function handleBuffer2Check() {
  const checkbox = document.getElementById('buffer2-check');
  
  if (checkbox.checked) {
    console.log('B2 Switched!');
    // Perform Buffer 2 function or related inputs
    //handleBuffer2Execute();
    document.getElementById('buffer1-check').disabled = true;
  } else {
    document.getElementById('buffer1-check').disabled = false;
    // Stop the server if it is running
    if (server) {
      server.close();
      server = null;
      console.log('B2 Server stopped.');
    }
  }
}
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

// _________________________________________________________________________________________________________________ 

function handleBuffer1Execute() {
  numPackets = parseInt(document.getElementById('buffer1-packets').value, 10);
  repetitionBufferTime1 = parseInt(document.getElementById('buffer1-repetition').value, 10);
  enableRepetitionBuffer1 = document.getElementById('buffer1-repetition-switch').checked;
  decoderIp = document.getElementById('output-address').value;
  decoderPort = parseInt(document.getElementById('input-port').value, 10);

  console.log(`Configured Decoder IP: ${decoderIp}, Port: ${decoderPort}, Packet Buffer: ${numPackets} packets, Repetition Buffer Time: ${repetitionBufferTime1}s`);
  if (enableRepetitionBuffer1) {
    waitingTime1 = repetitionBufferTime1 * 1000; // Convert seconds to milliseconds
  } else {
    waitingTime1 = 0;
    
  }

  if ((numPackets === 0 && !enableRepetitionBuffer1) || (numPackets === 0 && (enableRepetitionBuffer1 && repetitionBufferTime1 === 0))) {
    // Case 1: Forward packets directly to decoder
    console.log("Forwarding packets directly to decoder.");
    if (!buffer1Server) {
      initializeBuffer1Server();
    }
  } else if (numPackets > 0 && (!enableRepetitionBuffer1 || repetitionBufferTime1 === 0)) {
    // Case 2: One-time buffering and then forward
    console.log(`Buffering packets for ${numPackets} packets, then forwarding.`);
    performBuffer1SingleBuffering();
  } else if (numPackets > 0 && enableRepetitionBuffer1) {
    // Case 3: Repetitive buffering and waiting
    console.log(`Repetitive buffering and waiting.`);
    startBuffer1BufferingCycle();
  }
}

function performBuffer1SingleBuffering() {
  console.log("1 Time buffering start....");
  // Initialize server if not already initialized
  if (!buffer1Server) {
    initializeBuffer1Server();
  }
}

function startBuffer1BufferingCycle() {
  console.log("Starting Buffer 1 buffering cycle...");

  // Ensure the UDP server is initialized
  if (!buffer1Server) {
    initializeBuffer1Server();
  }

  // function performBuffering() {
  //   if (!enableRepetitionBuffer1) {
  //     numPackets = 0;
  //     document.getElementById('buffer1-packets').value = numPackets;
  //     console.log("Repetition buffer disabled, setting numPackets to 0 and stopping buffering.");
  //   }

  //   // // Check if buffer is full and send packets to the decoder
  //   // if (buffer1PacketBuffer.length >= numPackets) {
  //   //   sendBuffer1PacketsToDecoder();

  //   //   if (enableRepetitionBuffer1 && waitingTime1 > 0) {
  //   //     isWaiting1 = true;
  //   //     console.log(`Waiting for ${waitingTime1 / 1000} seconds before next buffering cycle.`);
  //   //     setTimeout(() => {
  //   //       isWaiting1 = false;
  //   //       performBuffering(); // Continue buffering and sending packets
  //   //     }, waitingTime1);
  //   //   } else {
  //   //     console.log("Repetition buffer is not enabled or waiting time is 0. Stopping cycle.");
  //   //   }
  //   // } else {
  //   //   // Continue buffering packets
  //   //   //console.log("Buffering more packets...");
  //   //   //setTimeout(performBuffering, 100); // Check the buffer periodically
  //   // }
  // }

  // // Initial call to start the buffering and sending cycle
  // performBuffering();
}


function sendBuffer1PacketsToDecoder() {
  console.log(`Sending buffered packets to decoder, buffer size: ${buffer1PacketBuffer.length}`);
  buffer1PacketBuffer.forEach(packet => {
    buffer1Server.send(packet, decoderPort, decoderIp, (err) => {
      if (err) {
        console.error(`Error sending packet to decoder: ${err.message}`);
      }
    });
  });
  buffer1PacketBuffer = []; // Clear the buffer after sending
}

function initializeBuffer1Server() {
  buffer1Server = dgram.createSocket('udp4');
  const BUFFER_SIZE = 64 * 1024 * 1024; // 64 MB

  buffer1Server.on('message', (msg, rinfo) => {
    if (shouldDropPacket()) {
      packetsDropped++;
      console.log(`Packet loss (${packetsDropped}`);
      return; // Drop the packet
    }
    if (isWaiting1) {
      //console.log("Forwarding packet directly to decoder while waiting.");
      buffer1Server.send(msg, decoderPort, decoderIp, (err) => {
        if (err) {
          console.error(`Error forwarding packet to decoder: ${err.message}`);
        }
      });
    } else if (numPackets > 0) {
      //console.log("Buffering packet.");
      buffer1PacketBuffer.push(msg);
      
      if (buffer1PacketBuffer.length >= numPackets) {
        if (!enableRepetitionBuffer1){
          sendBuffer1Packets();
        }

        if (enableRepetitionBuffer1 && waitingTime1 > 0) {
          sendBuffer1PacketsToDecoder();
          isWaiting1 = true;
          console.log(`Waiting for ${waitingTime1 / 1000} seconds`);
          setTimeout(() => {
            isWaiting1 = false;
            if (!enableRepetitionBuffer1) {
              numPackets = 0;
              document.getElementById('buffer1-packets').value = numPackets;
              console.log("Repetition buffer disabled, setting numPackets to 0 and stopping buffering.");
            }// Continue buffering and sending packets
          }, waitingTime1);
        }
      }
    } else {
      //console.log("Forwarding packet directly to decoder.");
      buffer1Server.send(msg, decoderPort, decoderIp, (err) => {
        if (err) {
          console.error(`Error forwarding packet to decoder: ${err.message}`);
        }
      });
    }
  });

  buffer1Server.on('listening', () => {
    const address = buffer1Server.address();
    console.log(`Buffer 1 server listening on ${address.address}:${address.port}`);
    
    buffer1Server.setRecvBufferSize(BUFFER_SIZE);
    buffer1Server.setSendBufferSize(BUFFER_SIZE);
  });

  buffer1Server.bind(decoderPort, localIP);
}

function sendBuffer1Packets() {
  console.log(`Length buffer1PacketBuffer: ${buffer1PacketBuffer.length} length`);
  buffer1PacketBuffer.forEach(packet => {
    buffer1Server.send(packet, decoderPort, decoderIp, (err) => {
      if (err) {
        console.error(`Error sending packet to decoder: ${err.message}`);
      }
    });
  });
  buffer1PacketBuffer = [];
  numPackets = 0;
  document.getElementById('buffer1-packets').value = numPackets;
  console.log("Back to Forwarding directly")
}

//---------------------------------------------------------

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
  console.log("OOOOOOOOOOOOOOOOOOOOOOOOOOOOO")
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
      console.log(`Packet loss (${packetsDropped}`);
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

//This is algorithm used random approach.
