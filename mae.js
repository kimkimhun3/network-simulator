
let server = null;
let client = null;
let buffer1Server = null;
let buffer1Client = null;
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
let isBuffering = false;
let isBufferingCycleRunning = false;
let isBuffering1CycleRunning = false;


document.getElementById('buffer1-main-execute').addEventListener('click', handleBuffer1Execute);
document.getElementById('buffer2-main-execute').addEventListener('click', handleBuffer2Execute);
document.getElementById('packet-loss-switch').addEventListener('change', handlePacketLossSwitch);
document.getElementById('input-packet-loss').addEventListener('input', handlePacketLossInput);



let inputEventListenerActive1 = false;
//Real time waitingTime
document.getElementById('buffer1-repetition').addEventListener('input', updateRepetitionBufferTime);
function updateRepetitionBufferTime (event) {
  repetitionBufferTime1 = parseInt(event.target.value, 10);
  if (isNaN(repetitionBufferTime1)) repetitionBufferTime1 = 0;
  waitingTime1 = enableRepetitionBuffer1 ? (repetitionBufferTime1 * 1000) + 1000 : 0;
};

function handleBuffer1Execute() {
  numPackets = parseInt(document.getElementById('buffer1-packets').value, 10);
  repetitionBufferTime1 = parseInt(document.getElementById('buffer1-repetition').value, 10);
  enableRepetitionBuffer1 = document.getElementById('buffer1-repetition-switch').checked;
  decoderIp = document.getElementById('output-address').value;
  decoderPort = parseInt(document.getElementById('input-port').value, 10);
  waitingTime1 = enableRepetitionBuffer1 ? (repetitionBufferTime1 * 1000) + 1000 : 0;

  if ((numPackets === 0 && !enableRepetitionBuffer1) || (numPackets === 0 && (enableRepetitionBuffer1 && repetitionBufferTime1 === 0))) {
    // Case 1: Forward packets directly to decoder
    console.log("Forwarding packets directly to decoder.");
    if (!buffer1Server || !buffer1Client) {
      initializeBuffer1Server();
    }
    removeBufferPacketInputListener();
  } else if (numPackets > 0 && (!enableRepetitionBuffer1 || repetitionBufferTime1 === 0)) {
    // Case 2: One-time buffering and then forward
    console.log(`Buffering packets for ${numPackets} packets, then forwarding.`);
    performBuffer1SingleBuffering();
    removeBufferPacketInputListener();
  } else if (numPackets > 0 && enableRepetitionBuffer1) {
    // Case 3: Repetitive buffering and waiting
    console.log(`Repetitive buffering and waiting.`);
    if (!isBuffering1CycleRunning){
      startBuffer1BufferingCycle();
      addBufferPacketInputListener();
    } else {
      console.log("Buffering1 cycle is already running.")
    }
    
  }
}
function performBuffer1SingleBuffering() {
  console.log("1 Time buffering start....");
  // Initialize server if not already initialized
  if (!buffer1Server || !buffer1Client) {
    initializeBuffer1Server();
  }
}

function startBuffer1BufferingCycle() {
  console.log("Starting Buffer 1 buffering cycle...");

  // Ensure the UDP server is initialized
  if (!buffer1Server || !buffer1Client) {
    initializeBuffer1Server();
  }

  isBuffering1CycleRunning = true;
  // Buffering cycle logic
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
  buffer1Client = dgram.createSocket('udp4');
  const BUFFER_SIZE = 64 * 1024 * 1024; // 64 MB

  buffer1Client.on('message', (msg, rinfo) => {
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
      const startTime = Date.now();
      buffer1PacketBuffer.push(msg);
      
      if (buffer1PacketBuffer.length >= numPackets) {
        const endTime = Date.now();
        console.log(`End Time: ${endTime}`);
        const totalDuration = endTime - startTime;
        console.log(`Total time to send all packets: ${totalDuration}ms`);
        if (!enableRepetitionBuffer1){
          sendBuffer1Packets();
        }

        if (enableRepetitionBuffer1 && waitingTime1 > 0) {
          isBuffering1CycleRunning = true;
          sendBuffer1PacketsToDecoder();
          isWaiting1 = true;
          console.log(`Waiting for ${waitingTime1 / 1000} seconds`);
          waitTimeout1 = setTimeout(() => {
            isWaiting1 = false;
            waitTimeout1 = null;
            if (!enableRepetitionBuffer1) {
              numPackets = 0;
              document.getElementById('buffer1-packets').value = numPackets;
              console.log("Repetition buffer disabled, setting numPackets to 0 and stopping buffering.");
            }// Continue buffering and sending packets
          }, waitingTime1);
        } else {
          isBuffering1CycleRunning = false;
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

  buffer1Client.on('listening', () => {
    const address = buffer1Client.address();
    console.log(`Buffer1 Client listening on ${address.address}:${address.port}`);
    
    buffer1Client.setRecvBufferSize(BUFFER_SIZE);
    buffer1Client.setSendBufferSize(BUFFER_SIZE);
  });

  buffer1Server.on('listening', () => {
    const address = buffer1Server.address();
    console.log(`Buffer1 Server listening on ${address.address}:${address.port}`);
    
    buffer1Server.setRecvBufferSize(BUFFER_SIZE);
    buffer1Server.setSendBufferSize(BUFFER_SIZE);
  });

  // Bind client to a wildcard port to receive packets from any source
  buffer1Client.bind(decoderPort, localIP);

  // Bind server to local port for sending packets to decoder
  buffer1Server.bind(0, localIP);
}

function sendBuffer1Packets() {
  console.log(`Length Buffer 1: ${buffer1PacketBuffer.length} length`);
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
}

function addBufferPacketInputListener() {
  if (!inputEventListenerActive1) {
    document.getElementById('buffer1-packets').addEventListener('input', updateBufferPacket);
    inputEventListenerActive1 = true;
  }
}

function removeBufferPacketInputListener() {
  if (inputEventListenerActive1) {
    document.getElementById('buffer1-packets').removeEventListener('input', updateBufferPacket);
    inputEventListenerActive1 = false;
  }
}

function updateBufferPacket(event) {
  numPackets = parseInt(event.target.value, 10);
  if (isNaN(numPackets)) {
    numPackets = 0;
  }

  if (isBuffering1CycleRunning && bufferTimeout1) {
    clearTimeout(bufferTimeout1);
    bufferTimeout1 = setTimeout(() => {
      if (enableRepetitionBuffer1) {
        startBuffer1BufferingCycle();
      } else {
        performBuffer1SingleBuffering();
      }
    }, numPackets);
  }
}




let isRepetitiveBuffering = false;

//Real time waitingTime
document.getElementById('buffer2-repetition').addEventListener('input', (event) => {
  repetitionBufferTime = parseInt(event.target.value, 10);
  if (isNaN(repetitionBufferTime)) repetitionBufferTime = 0;
  waitingTime = enableRepetitionBuffer ? (repetitionBufferTime * 1000) + 1000 : 0;
});


// Flag to track if the input event listener is active
let inputEventListenerActive = false;
function handleBuffer2Execute() {
  bufferTime = parseInt(document.getElementById('buffer2-times').value, 10);
  repetitionBufferTime = parseInt(document.getElementById('buffer2-repetition').value, 10);
  enableRepetitionBuffer = document.getElementById('buffer2-repetition-switch').checked;
  decoderIp = document.getElementById('output-address').value;
  decoderPort = parseInt(document.getElementById('input-port').value, 10);

  // Update waitingTime based on enableRepetitionBuffer
  // if (enableRepetitionBuffer) {
  //     waitingTime = (repetitionBufferTime * 1000) + 1000; // Convert seconds to milliseconds
 
  // } else {
  //   waitingTime = 0;
  // }
  waitingTime = enableRepetitionBuffer ? (repetitionBufferTime * 1000) + 1000 : 0;
  //isRepetitiveBuffering = bufferTime > 0 && enableRepetitionBuffer;

  if ((bufferTime === 0 && !enableRepetitionBuffer) || (bufferTime === 0 && enableRepetitionBuffer && repetitionBufferTime === 0)) {
    // Case 1: Forward packets directly to decoder
    console.log("Forwarding packets directly to decoder.");
    if (!server || !client) {
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



let sendCompleteFlag = false;
function performSingleBuffering() {
  // Initialize server if not already initialized
  if (!server || !client) {
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
  if (!server || !client) {
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
// function sendBufferedPackets() {
//   const totalPackets = packetBuffer.length;
//   console.log(`Buffered packet ${totalPackets}`);
//   packetBuffer.forEach(packet => {
//     server.send(packet, decoderPort, decoderIp, (err) => {
//       if (err) {
//         console.error(`Error sending packet to decoder: ${err.message}`);
//       }
//     });
//   });
//   console.log(`Sent ${totalPackets}`);
//   packetBuffer = [];
// }

function sendBufferedPackets() {
  const totalPackets = packetBuffer.length;
  console.log(`Buffered packet ${totalPackets}`);
  
  // Function to send a packet with retries
  function sendPacketWithRetry(packet, retriesLeft, callback) {
    server.send(packet, decoderPort, decoderIp, (err) => {
      if (err) {
        if (retriesLeft > 0) {
          console.warn(`Error sending packet to decoder: ${err.message}. Retries left: ${retriesLeft}`);
          // Retry after a short delay
          setTimeout(() => {
            sendPacketWithRetry(packet, retriesLeft - 1, callback);
          }, 100); // Adjust the delay as needed
        } else {
          console.error(`Failed to send packet to decoder after multiple attempts: ${err.message}`);
          callback(err); // Final callback with error
        }
      } else {
        callback(null); // Successful send
      }
    });
  }

  let packetsSent = 0;
  let errorsEncountered = 0;
  
  packetBuffer.forEach(packet => {
    sendPacketWithRetry(packet, 3, (err) => { // Retry up to 3 times
      if (err) {
        errorsEncountered++;
      } else {
        packetsSent++;
      }

      // Check if all packets have been processed
      if (packetsSent + errorsEncountered === totalPackets) {
        console.log(`Sent ${packetsSent} packets with ${errorsEncountered} errors.`);
        // Clear the buffer only after processing all packets
        packetBuffer = [];
      }
    });
  });
}




function initializeServer() {
    server = dgram.createSocket('udp4');
    client = dgram.createSocket('udp4');
    const BUFFER_SIZE = 64 * 1024 * 1024; // 64 MB
  
    client.on('message', (msg, rinfo) => {
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
        server.send(msg, decoderPort, decoderIp, (err) => {
          if (err) {
            console.error(`Error forwarding packet to decoder: ${err.message}`);
          }
        });
      }
    });
  
    client.on('listening', () => {
      const address = client.address();
      console.log(`Client listening on ${address.address}:${address.port}`);
      
      client.setRecvBufferSize(BUFFER_SIZE);
      client.setSendBufferSize(BUFFER_SIZE);
    });
  
    server.on('listening', () => {
      const address = server.address();
      console.log(`Server listening on ${address.address}:${address.port}`);
      
      server.setRecvBufferSize(BUFFER_SIZE);
      server.setSendBufferSize(BUFFER_SIZE);
    });
  
    // Bind client to a wildcard port to receive packets from any source
    client.bind(decoderPort, localIP);
  
    // Bind server to local port for sending packets to decoder
    server.bind(0, localIP);
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
    enablePacketLoss = percentage > 0;
    console.log(`Packet loss percentage set to ${percentage}%.`);
  } else {
    console.error('Invalid packet loss percentage. Please enter a value between 1 and 99.');
  }
}

function shouldDropPacket() {
  if (!enablePacketLoss) return false;
  const dropThreshold = packetLossPercentage / 100.0;
  const randomValue = Math.random();
  return randomValue < dropThreshold;
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
