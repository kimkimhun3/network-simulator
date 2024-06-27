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
  
    receiver.bind(decoderPort); // Listening on port 5004, where Encoder sends packets


}