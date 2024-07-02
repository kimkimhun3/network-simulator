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

document.getElementById('buffer2-execute').addEventListener('click', updateBufferTime);
document.getElementById('buffer2-main-execute').addEventListener('click', handleBuffer2Execute)

function updateBufferTime(){
  bufferTime += 100;
  console.log(`Buffer increase to ${bufferTime}`)
  document.getElementById('buffer2-times').value = bufferTime;
}


function handleBuffer2Execute() {
  // Retrieve and update bufferTime and repetitionBufferTime values from HTML input elements
  bufferTime = parseInt(document.getElementById('buffer2-times').value, 10);
  repetitionBufferTime = parseInt(document.getElementById('buffer2-repetition').value, 10);
  enableRepetitionBuffer = document.getElementById('buffer2-repetition-switch').checked;

  // Increase bufferTime by 100ms
  // bufferTime += 100;
  // console.log(`Buffer increase to ${bufferTime}`)
  
  // // Update the HTML input element to reflect the new bufferTime
  // document.getElementById('buffer2-times').value = bufferTime;
  
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
    // If bufferTime is 0 or less and enableRepetitionBuffer is disabled, do not buffer or send packets
    if (bufferTime <= 0 && !enableRepetitionBuffer) {
      console.log('Buffering is disabled, no packets sent to decoder');
      return;
    }

    // Buffer the received packet (issue: this only happens when startBuffering() is called)
    if (packet) {
      packetBuffer.push(packet);
    }

    // If bufferTimeout is not set, set it to send packets after bufferTime
    if (!bufferTimeout) {
      bufferTimeout = setTimeout(() => {
        // Log the buffered packets to the console
        //console.log(`Buffered packets before sending to decoder:`, packetBuffer);

        // Send all buffered packets to the decoder
        packetBuffer.forEach(packet => {
          server.send(packet, decoderPort, decoderIp, (err) => {
            if (err) {
              console.error(`Error sending packet to decoder: ${err.message}`);
            } else {
              //console.log(`Send buffer packets to decoder at ${decoderIp}:${decoderPort}`);
            }
          });
        });

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
      server.send(msg, decoderPort, decoderIp, (err) => {
        if (err) {
          console.error(`Error forwarding packet to decoder: ${err.message}`);
        } else {
          //console.log(`Packet directly forwarded to decoder at ${decoderIp}:${decoderPort}`);
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
