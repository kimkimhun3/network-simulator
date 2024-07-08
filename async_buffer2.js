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
  const BUFFER_SIZE = 64 * 1024 * 1024; // 64 MB
  console.log(`Configured Decoder IP: ${decoderIp}, Port: ${decoderPort}, Buffer Time: ${bufferTime}ms, Repetition Buffer Time: ${repetitionBufferTime}s`);

  server.on('message', (msg, rinfo) => {
    if (isWaiting) {
      server.send(msg, decoderPort, decoderIp, (err) => {
        if (err) {
          console.error(`Error forwarding packet to decoder: ${err.message}`);
        }
      });
    } else if (bufferTime > 0) {
      packetBuffer.push(msg);
      //console.log(`Buffer packet size: ${packetBuffer.length}`);
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

// function startBufferingStage() {
//   if (bufferTime > 0) {
//     bufferTimeout = setTimeout(() => {
//       packetBuffer.forEach(packet => {
//         server.send(packet, decoderPort, decoderIp, (err) => {
//           if (err) {
//             console.error(`Error sending packet to decoder: ${err.message}`);
//           }
//         });
//       });

//       // for (const packet of packetBuffer) {
//       //   server.send(packet, decoderPort, decoderIp, (err) => {
//       //     if (err) {
//       //       console.error(`Error sending packet: ${err.message}`);
//       //     }
//       //   });
//       // }

//       // Clear the buffer
//       packetBuffer = [];
//       bufferTimeout = null;

//       if (enableRepetitionBuffer && waitingTime > 0) {
//         isWaiting = true;
//         waitTimeout = setTimeout(() => {
//           isWaiting = false;
//           waitTimeout = null;

//           // Start second buffering stage
//           if (bufferTime > 0) {
//             bufferTimeout = setTimeout(() => {
//               packetBuffer.forEach(packet => {
//                 server.send(packet, decoderPort, decoderIp, (err) => {
//                   if (err) {
//                     console.error(`Error sending packet to decoder: ${err.message}`);
//                   }
//                 });
//               });

//               // Clear the buffer
//               packetBuffer = [];
//               bufferTimeout = null;
//               bufferTime = 0; // Reset bufferTime to ensure only one-time buffering
//               repetitionBufferTime = 0;
//               document.getElementById('buffer2-times').value = bufferTime;
//               document.getElementById('buffer2-repetition').value = repetitionBufferTime;
//               enableRepetitionBuffer.checked = false;
//             }, bufferTime);
//           }
//         }, waitingTime);
//       } else {
//         // If there's no waiting stage or waiting time is 0, stop here
//         bufferTime = 0; // Reset bufferTime to ensure only one-time buffering
//         document.getElementById('buffer2-times').value = bufferTime;
//       }
//     }, bufferTime);
//   }
// }



async function startBufferingStage() {
  if (bufferTime > 0) {
    bufferTimeout = setTimeout(async () => {
      // Using for...of loop to iterate asynchronously
      for (const packet of packetBuffer) {
        try {
          await new Promise((resolve, reject) => {
            server.send(packet, decoderPort, decoderIp, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });
        } catch (err) {
          console.error(`Error sending packet to decoder: ${err.message}`);
        }
      }

      // Clear the buffer
      packetBuffer = [];
      bufferTimeout = null;

      if (enableRepetitionBuffer && waitingTime > 0) {
        isWaiting = true;
        waitTimeout = setTimeout(() => {
          isWaiting = false;
          waitTimeout = null;

          // Start second buffering stage
          if (bufferTime > 0) {
            bufferTimeout = setTimeout(async () => {
              // Use async/await in the nested buffering stage similarly
              for (const packet of packetBuffer) {
                try {
                  await new Promise((resolve, reject) => {
                    server.send(packet, decoderPort, decoderIp, (err) => {
                      if (err) {
                        reject(err);
                      } else {
                        resolve();
                      }
                    });
                  });
                } catch (err) {
                  console.error(`Error sending packet to decoder: ${err.message}`);
                }
              }

              // Clear the buffer
              packetBuffer = [];
              bufferTimeout = null;
              bufferTime = 0; // Reset bufferTime to ensure only one-time buffering
              repetitionBufferTime = 0;
              document.getElementById('buffer2-times').value = bufferTime;
              document.getElementById('buffer2-repetition').value = repetitionBufferTime;
              enableRepetitionBuffer.checked = false;
            }, bufferTime);
          }
        }, waitingTime);
      } else {
        // If there's no waiting stage or waiting time is 0, stop here
        bufferTime = 0; // Reset bufferTime to ensure only one-time buffering
        document.getElementById('buffer2-times').value = bufferTime;
      }
    }, bufferTime);
  }
}

