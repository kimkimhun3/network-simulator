const dgram = require('dgram');
document.getElementById('buffer2-execute').addEventListener('click', handleBuffer2Execute);


let waitingTime;

function handleBuffer2Execute() {
  // Retrieve configuration from HTML input elements
  const decoderIp = document.getElementById('output-address').value;
  const decoderPort = parseInt(document.getElementById('input-port').value, 10);
  const bufferTime = parseInt(document.getElementById('buffer2-times').value, 10);
  const repetitionBufferTime = parseInt(document.getElementById('buffer2-repetition').value, 10);
  const enableRepetitionBuffer = document.getElementById('buffer2-repetition-switch').checked;
  document.getElementById('buffer2-execute').disabled = true;


  if (!decoderIp || isNaN(decoderPort) || isNaN(bufferTime) || isNaN(repetitionBufferTime)) {
    console.error('Invalid configuration input');
    return;
  }

   // Update waitingTime based on enableRepetitionBuffer
   if (enableRepetitionBuffer) {
    waitingTime = repetitionBufferTime * 1000; // Convert seconds to milliseconds
  }
  

  console.log(`Configured Decoder IP: ${decoderIp}, Port: ${decoderPort}, Buffer Time: ${bufferTime}ms, Repetition Buffer Time: ${repetitionBufferTime}s`);

  const server = dgram.createSocket('udp4');
  let packetBuffer = [];
  let bufferTimeout = null;
  let waitTimeout = null;
  let isWaiting = false;

  function startBuffering() {
    // If waitTimeout is not set, set it to send packets after bufferTime
    if (!bufferTimeout) {
      bufferTimeout = setTimeout(() => {
      // Log the buffered packets to the console
      //console.log(`Buffered packets before sending to decoder:`, packetBuffer);
        // Send all buffered packets to the decoder
        packetBuffer.forEach(packet => {
          server.send(packet, decoderPort, decoderIp, (err) => {
            if (err) {
              //console.error(`Error sending packet to decoder: ${err.message}`);
            } else {
              //console.log(`Send buffer packets to decoder at ${decoderIp}:${decoderPort}`);
            }
          });
        });

        // Clear the buffer
        packetBuffer = [];
        bufferTimeout = null;

        // Wait for the specified waiting time before allowing new packets to be buffered
        if (waitingTime) {
          waitTimeout = setTimeout(() => {
            waitTimeout = null;
            isWaiting = false; // End waiting period
            startBuffering(); // Resume buffering
          }, waitingTime);
          
          // Set isWaiting to true to indicate waiting period
          isWaiting = true;
        } else {
          // No waiting time defined yet, do not set isWaiting
          startBuffering(); // Resume buffering immediately
        }
      }, isWaiting ? 0 : bufferTime); // Immediate processing if in waiting state
    }
  }

  server.on('message', (msg, rinfo) => {
    //console.log(`Received ${msg.length} bytes from ${rinfo.address}:${rinfo.port}`);

    if (isWaiting) {
      // During waiting period, forward packets directly to decoder
      server.send(msg, decoderPort, decoderIp, (err) => {
        if (err) {
          //console.error(`Error forwarding packet to decoder: ${err.message}`);
        } else {
          //console.log(`Packet directly forwarded to decoder at ${decoderIp}:${decoderPort}`);
        }
      });
    } else {
      // // Store the received packet in the buffer
      // packetBuffer.push(msg);

      // // Start the buffering process if not already started
      // startBuffering();
      if (bufferTime > 0) {
        // Store the received packet in the buffer
        packetBuffer.push(msg);
  
        // Start the buffering process
        startBuffering();
      } else {
        //console.log('Buffering disabled (bufferTime <= 0)');
      }
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
  server.close();
  console.log('Server closed');
}





// Clean up on window unload
// window.addEventListener('beforeunload', () => {
//   stopProcessing();
//   receiver.close();
//   sender.close();
// });

//All of my condition is that, chcek and chcek
