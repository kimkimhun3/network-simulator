// //require variable



//   const buffer1Check = document.getElementById('buffer1-check');
//   const buffer1Packets = document.getElementById('buffer1-packets');
//   const buffer1Execute = document.getElementById('buffer1-execute');
//   const buffer1Repetition = document.getElementById('buffer1-repetition');
//   const buffer1RepetitionSwitch = document.getElementById('buffer1-repetition-switch');
//   const buffer1RepetitionSwitchText = document.getElementById('buffer1-repetition-switch-text');
//   const buffer1PacketsError = document.getElementById('buffer1-packets-error');

//   const buffer2Check = document.getElementById('buffer2-check');
//   const buffer2Times = document.getElementById('buffer2-times');
//   const buffer2Execute = document.getElementById('buffer2-execute');
//   const buffer2Repetition = document.getElementById('buffer2-repetition');
//   const buffer2RepetitionSwitch = document.getElementById('buffer2-repetition-switch');
//   const buffer2RepetitionSwitchText = document.getElementById('buffer2-repetition-switch-text');
//   const buffer2TimesError = document.getElementById('buffer2-times-error');

//   const portInput = document.getElementById('input-port');
//   const ipAddressInput = document.getElementById('output-address');
//   const portError = document.getElementById('port-error');
//   const ipAddressError = document.getElementById('ip-address-error');
//   const inputPacketloss = document.getElementById('input-packet-loss');


//   //Start getting value
//   const portValue = portInput.value;
//   const ipAddress = ipAddressInput.value;
//   const packetLoss = inputPacketloss.value;

// //   //Buffer 1
// //   const buffer1 = buffer1Packets.value;
// //   const repetitionBuffer1 = buffer1Repetition.value;

// //   //Buffer 2
// //   const buffer2 = buffer2Times.value;
// //   const repetitionBuffer2 = buffer2Repetition.value;

// // udpHandler.js
// const dgram = require('dgram');
// const udpSocket = dgram.createSocket('udp4');

// // Addition1 button click handler
// function handleBuffer1Execute() {
//     const buffer1 = buffer1Packets.value;
//     const repetitionBuffer1 = buffer1Repetition.value;
//     console.log("Buffer 1 executed", portValue, ipAddress, buffer1, repetitionBuffer1 );
// }


// // Addition2 button click handler
// function handleBuffer2Execute() {
//     const buffer2 = buffer2Times.value;
//     const repetitionBuffer2 = buffer2Repetition.value;
//     console.log("Buffer 2 executed", portValue, ipAddress, buffer2, repetitionBuffer2 );
// }




// Ensure Node.js integration is enabled in your Electron app's renderer process
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
document.getElementById('buffer2-execute').addEventListener('click', handleBuffer2Execute);

function handleBuffer2Execute() {
    decoderIp = document.getElementById('output-address').value;
    decoderPort = document.getElementById('input-port').value;
    bufferTime = document.getElementById('buffer2-times').value;
    repetitionBufferTime = document.getElementById('buffer2-repetition').value;
    enableRepetitionBuffer = document.getElementById('buffer2-repetition-switch').checked;

    console.log(decoderIp, decoderPort, bufferTime, repetitionBufferTime );
    console.log(enableRepetitionBuffer);
    if (!decoderIp || !decoderPort || !bufferTime) {
      alert('Please fill in all required fields.');
      return;
    }

    console.log(`Configured Decoder IP: ${decoderIp}, Port: ${decoderPort}, Buffer Time: ${bufferTime}ms, Repetition Buffer Time: ${repetitionBufferTime}s`);
    processing = true;
    console.log(`Processing: ${processing}`);
    
    receiver.on('message', async (msg, rinfo) => {
      console.log(`Received ${msg} from ${rinfo.address}:${rinfo.port}`);
  
      if (enableRepetitionBuffer) {
        console.log(`Applying repetition buffer time delay: ${repetitionBufferTime}s`);
        await new Promise(resolve => setTimeout(resolve, repetitionBufferTime * 1000));
      }
  
      console.log(`Applying buffer time delay: ${bufferTime}ms`);
      await new Promise(resolve => setTimeout(resolve, bufferTime));
  
      sender.send(msg, decoderPort, decoderIp, (err) => {
        if (err) {
          console.error('Error sending packet to Decoder:', err);
        } else {
          console.log(`Forwarded packet to ${decoderIp}:${decoderPort}`);
        }
      });
    });
  
    receiver.bind(decoderPort); // Listening on port 5004, where Encoder sends packets


}



//Stop Process
document.getElementById('stop').addEventListener('click', () => {
  processing = false;
  receiver.close();
  sender.close()
  console.log('Stopped processing packets.');
});




//if we don't bind the port, it will not receive or send the packet
