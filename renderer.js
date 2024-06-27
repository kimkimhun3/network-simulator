const { ipcRenderer } = require('electron');
const dgram = require('dgram'); // Require 'dgram' module properly
const receiver = dgram.createSocket('udp4');
const sender = dgram.createSocket('udp4');

let decoderIp = '';
let decoderPort = 0;
let bufferTime = 0;
let repetitionBufferTime = 0;
let enableRepetitionBuffer = false;
let processing = false;


// Function to handle execution when the execute button is clicked
// document.getElementById('buffer2-execute').addEventListener('click', handleBuffer2Execute);
document.getElementById('buffer2-repetition-switch').addEventListener('change', function() {
  if (this.checked) {
      handleBuffer2Execute();
  } else {
      // Handle stopping execution if needed
      // For example, you might want to add logic to stop ongoing processes
      console.log('Execution stopped for Buffer 2');
  }
});


function handleBuffer2Execute() {
    decoderIp = document.getElementById('output-address').value;
    decoderPort = document.getElementById('input-port').value;
    bufferTime = document.getElementById('buffer2-times').value;
    repetitionBufferTime = document.getElementById('buffer2-repetition').value;
    enableRepetitionBuffer = document.getElementById('buffer2-repetition-switch').checked;

    console.log(decoderIp, decoderPort, bufferTime, repetitionBufferTime );
    console.log(enableRepetitionBuffer);
    console.log(`Configured Decoder IP: ${decoderIp}, Port: ${decoderPort}, Buffer Time: ${bufferTime}ms, Repetition Buffer Time: ${repetitionBufferTime}s`);
    processing = true;
    console.log(`Processing: ${processing}`);
    
    receiver.on('message', async (msg, rinfo) => {
      console.log(`Received ${msg} from ${rinfo.address}:${rinfo.port}`);
      sender.send(msg, decoderPort, decoderIp, (err) => {
        if (err) {
          console.error('Error sending packet to Decoder:', err);
        } else {
          console.log(`Forwarded packet to ${decoderIp}:${decoderPort}`);
        }
      });
    });
  
    receiver.bind(decoderPort); // Listening on the specified port, where Encoder sends packets
}

