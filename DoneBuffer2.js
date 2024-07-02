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
const decoderIp = document.getElementById('output-address').value;
const decoderPort = parseInt(document.getElementById('input-port').value, 10);

document.getElementById('buffer2-execute-minus').addEventListener('click', minusBufferTime);
document.getElementById('buffer2-execute').addEventListener('click', updateBufferTime);
document.getElementById('buffer2-main-execute').addEventListener('click', handleBuffer2Execute);
document.getElementById('buffer2-repetition-switch').addEventListener('change', updateRepetitionBuffer);
document.getElementById('rptUp').addEventListener('click', increaseRepetitionBufferTime);
document.getElementById('rptDown').addEventListener('click', decreaseRepetitionBufferTime);

function increaseRepetitionBufferTime() {
  const repetitionInput = document.getElementById('buffer2-repetition');
  let repetitionTime = parseInt(repetitionInput.value, 10);

  if (isNaN(repetitionTime)) {
    repetitionTime = 0;
  }

  repetitionTime += 1; // Increment by 1

  if (repetitionTime > 30) {
    repetitionTime = 30; // Ensure it doesn't exceed 30
  }

  repetitionInput.value = repetitionTime;
  repetitionBufferTime = repetitionTime; // Update the internal variable
  console.log(`Repetition Buffer Time increased to ${repetitionBufferTime}`);
}

function decreaseRepetitionBufferTime() {
  const repetitionInput = document.getElementById('buffer2-repetition');
  let repetitionTime = parseInt(repetitionInput.value, 10);

  if (isNaN(repetitionTime)) {
    repetitionTime = 0;
  }

  repetitionTime -= 1; // Decrement by 1

  if (repetitionTime < 1) {
    repetitionTime = 1; // Ensure it doesn't go below 1
  }

  repetitionInput.value = repetitionTime;
  repetitionBufferTime = repetitionTime; // Update the internal variable
  console.log(`Repetition Buffer Time decreased to ${repetitionBufferTime}`);
}




function minusBufferTime() {
  if (bufferTime > 0) {
    bufferTime -= 100;
    console.log(`Buffer decreased to ${bufferTime}`);
    document.getElementById('buffer2-times').value = bufferTime;
  } else {
    console.log('Buffer time cannot be less than 0');
  }
}

function updateBufferTime() {
  if (bufferTime <2000){
    bufferTime += 100;
    console.log(`Buffer increased to ${bufferTime}`);
    document.getElementById('buffer2-times').value = bufferTime;
  } else {
    console.log('Buffer time cannot be greater than 2000')
  }

}

function updateRepetitionBuffer() {
  enableRepetitionBuffer = document.getElementById('buffer2-repetition-switch').checked;
  if (enableRepetitionBuffer) {
    waitingTime = repetitionBufferTime * 1000; // Convert seconds to milliseconds
  } else {
    waitingTime = 0;
  }
  console.log(`Repetition Buffer Enabled: ${enableRepetitionBuffer}, Waiting Time: ${waitingTime}ms`);
}

function handleBuffer2Execute() {
  // Retrieve and update bufferTime and repetitionBufferTime values from HTML input elements
  bufferTime = parseInt(document.getElementById('buffer2-times').value, 10);
  repetitionBufferTime = parseInt(document.getElementById('buffer2-repetition').value, 10);
  enableRepetitionBuffer = document.getElementById('buffer2-repetition-switch').checked;

  // Update waitingTime based on enableRepetitionBuffer
  if (enableRepetitionBuffer) {
    waitingTime = repetitionBufferTime * 1000; // Convert seconds to milliseconds
  }

  // If server is already initialized, just update the bufferTime
  if (server) {
    console.log(`Updated Buffer Time: ${bufferTime}ms`);
    return;
  }

  // Initialize server and start listening for packets
  server = dgram.createSocket('udp4');

  console.log(`Configured Decoder IP: ${decoderIp}, Port: ${decoderPort}, Buffer Time: ${bufferTime}ms, Repetition Buffer Time: ${repetitionBufferTime}s`);

  function startBuffering(packet) {
    // If bufferTime is 0 and enableRepetitionBuffer is disabled, forward packets directly
    if (bufferTime === 0 && !enableRepetitionBuffer) {
      console.log("Switch to forward directly....");
      server.send(packet, decoderPort, decoderIp, (err) => {
        if (err) {
          console.error(`Error forwarding packet to decoder: ${err.message}`);
        }
      });
      return; // Exit the function since we're not buffering
    }

    // Buffer the received packet
    if (packet) {
      packetBuffer.push(packet);
    }
    console.log("Done Buffering stage")
    // If bufferTimeout is not set, set it to send packets after bufferTime
    if (!bufferTimeout) {
      bufferTimeout = setTimeout(() => {
        // Log the buffered packets to the console
        console.log(`Buffered packets before sending to decoder:`, packetBuffer);

        // Send all buffered packets to the decoder
        console.log("Sending buffer packets")
        packetBuffer.forEach(packet => {
          server.send(packet, decoderPort, decoderIp, (err) => {
            if (err) {
              console.error(`Error sending packet to decoder: ${err.message}`);
            }
          });
        });
        console.log("Done sending buffer packets");

        // Clear the buffer
        packetBuffer = [];
        bufferTimeout = null;

        // If enableRepetitionBuffer is true, start the waiting period
        if (enableRepetitionBuffer) {
          isWaiting = true;
          waitTimeout = setTimeout(() => {
            isWaiting = false;
            waitTimeout = null;
            startBuffering(); // Resume buffering
          }, waitingTime);
        } else {
          // Resume buffering immediately if repetition buffer is not enabled
          startBuffering();
        }
      }, bufferTime);
    }
  }

  server.on('message', (msg, rinfo) => {
    // console.log(`Received ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);

    if (isWaiting) {
      // During waiting period, forward packets directly to decoder
      console.log("Waiting stage...")
      server.send(msg, decoderPort, decoderIp, (err) => {
        if (err) {
          console.error(`Error forwarding packet to decoder: ${err.message}`);
        }
      });
    } else {
      // Start the buffering process if not already started
      startBuffering(msg);
    }
  });

  server.on('listening', () => {
    const address = server.address();
    console.log(`Server listening on ${address.address}:${address.port}`);
  });

  // Bind the server to a port to listen for packets from the encoder
  server.bind(decoderPort);
}

// Clean up function to clear timeouts and close server properly
function cleanup() {
  if (bufferTimeout) {
    clearTimeout(bufferTimeout);
    bufferTimeout = null;
  }
  if (waitTimeout) {
    clearTimeout(waitTimeout);
    waitTimeout = null;
  }
  if (server) {
    server.close();
    console.log('Server closed');
  }
}

// Clean up on window unload
window.addEventListener('beforeunload', cleanup);
