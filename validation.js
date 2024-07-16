

 // Validation functions
 function isValidIPAddress(ipAddress) {
    const ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
    return ipRegex.test(ipAddress);
  }
  
  function isValidPort(port) {
    const portNumber = parseInt(port, 10);
    return !isNaN(portNumber) && portNumber >= 1 && portNumber <= 65535;
  }
  
  
  function isValidPacketLoss(packetLoss) {
    const lossPercentage = parseInt(packetLoss, 10);
    return !isNaN(lossPercentage) && lossPercentage >= 1 && lossPercentage <= 99;
  }
  
  // Event listeners for validation,
  document.getElementById('input-port').addEventListener('blur', function() {
    const portInput = this.value.trim();
    const portError = document.getElementById('input-port-error');
    if (!isValidPort(portInput)) {
        portError.textContent = 'Port must be between 1 and 65535';
        enableDisableAddition1Button();
    } else {
        portError.textContent = '';
    }
  });
  
  document.getElementById('output-address').addEventListener('blur', function() {
    const ipAddressInput = this.value.trim();
    const ipAddressError = document.getElementById('output-address-error');
    if (!isValidIPAddress(ipAddressInput)) {
        ipAddressError.textContent = 'Invalid IP address';
    } else {
        ipAddressError.textContent = '';
    }
  });
  
  document.getElementById('input-packet-loss').addEventListener('blur', function() {
    const packetLossInput = this.value.trim();
    const packetLossError = document.getElementById('input-packet-loss-error');
    if (!isValidPacketLoss(packetLossInput)) {
        packetLossError.textContent = 'Packet loss must be between 1 and 99%';
    } else {
        packetLossError.textContent = '';
    }
  });
  
  // Buffer 1 validation
  document.getElementById('buffer1-packets').addEventListener('blur', function() {
    const packetsInput = this.value.trim();
    const packetsError = document.getElementById('buffer1-packets-error');
    if (packetsInput === '' || packetsInput <= 0 || packetsInput > 1000) {
        packetsError.textContent = 'Value must be between 1 and 1000';
    } else {
        packetsError.textContent = '';
    }
  });
  
  // Buffer 2 validation
//   document.getElementById('buffer2-times').addEventListener('blur', function() {
//     const timesInput = this.value.trim();
//     const timesError = document.getElementById('buffer2-times-error');
//     if (timesInput === '' || timesInput < 100 || timesInput > 2000) {
//         //timesError.textContent = 'Value must be between 100 and 2000';
//     } else {
//         //timesError.textContent = '';
//     }
//   });
  
  
  document.getElementById('packet-loss-switch').addEventListener('change', function() {
    const packetLossInput = document.getElementById('input-packet-loss');
    const packetLossError = document.getElementById('input-packet-loss-error');
    let isInteracted = false; // Track if user has interacted with the input
  
    if (this.checked) {
        packetLossInput.disabled = false;
        packetLossInput.setAttribute('required', true); // Enable required attribute
    } else {
        packetLossInput.disabled = true;
        packetLossInput.removeAttribute('required'); // Remove required attribute
        packetLossInput.value = ''; // Clear the input value
        packetLossError.textContent = ''; // Clear any existing error messages
        isInteracted = false; // Reset interaction flag
    }
  
    packetLossInput.addEventListener('input', function() {
        isInteracted = true; // User has interacted with the input
        validatePacketLoss(); // Validate on input change
    });
  
    // Validate on blur only if user has interacted with the input
    packetLossInput.addEventListener('blur', function() {
        if (isInteracted) {
            validatePacketLoss();
        }
    });
  });
  
  function validatePacketLoss() {
    const packetLossInput = document.getElementById('input-packet-loss');
    const packetLossError = document.getElementById('input-packet-loss-error');
    const packetLossValue = packetLossInput.value;
  
    if (packetLossValue === '') {
        packetLossError.textContent = 'Packet loss value is required';
        return false;
    }
  
    const isValid = /^\d+$/.test(packetLossValue) && parseInt(packetLossValue) >= 1 && parseInt(packetLossValue) <= 99;
  
    if (!isValid) {
        packetLossError.textContent = 'Packet loss must be between 1 and 99';
    } else {
        packetLossError.textContent = '';
    }
  
    return isValid;
  }
  //___________________________________________
  // Buffer 1 checkbox change event listener
  // Buffer 1 checkbox change event listener
document.getElementById('buffer1-check').addEventListener('change', function() {
    const buffer1PacketsInput = document.getElementById('buffer1-packets');
    const buffer1RepetitionInput = document.getElementById('buffer1-repetition');
    const buffer1PacketsError = document.getElementById('buffer1-packets-error');
    const buffer1RepetitionError = document.getElementById('buffer1-repetition-error');
    let isInteractedPackets = false; // Track if user has interacted with packets input
    let isInteractedRepetition = false; // Track if user has interacted with repetition input

    if (this.checked) {
        // Enable Buffer 1 inputs
        buffer1PacketsInput.disabled = false;
        buffer1PacketsInput.setAttribute('required', true); // Enable required attribute for packets input

        // Enable repetition buffer 1 switch and input if checked
        document.getElementById('buffer1-repetition-switch').disabled = false;

    } else {
        // Disable Buffer 1 inputs
        document.getElementById('buffer1-execute').disabled = true;
        buffer1PacketsInput.disabled = true;
        buffer1PacketsInput.removeAttribute('required'); // Remove required attribute
        buffer1PacketsInput.value = ''; // Clear input value
        buffer1PacketsError.textContent = ''; // Clear error message

        // Disable repetition buffer 1 switch and input
        document.getElementById('buffer1-repetition-switch').disabled = true;
        document.getElementById('buffer1-repetition').disabled = true;
        buffer1RepetitionError.textContent = ''; // Clear error message

        // Reset interaction flags
        isInteractedPackets = false;
        isInteractedRepetition = false;
    }

    // Event listener for packets input change
    buffer1PacketsInput.addEventListener('input', function() {
        isInteractedPackets = true; // User has interacted with packets input
        validateBuffer1Packets(); // Validate packets input on input change
        enableDisableAddition1Button(); // Check and enable/disable Addition1 button
    });

    // Event listener for repetition input change
    document.getElementById('buffer1-repetition').addEventListener('input', function() {
        isInteractedRepetition = true; // User has interacted with repetition input
        validateBuffer1Repetition(); // Validate repetition input on input change
        enableDisableAddition1Button(); // Check and enable/disable Addition1 button
    });

    // Event listener for repetition switch change
    document.getElementById('buffer1-repetition-switch').addEventListener('change', function() {
        if (this.checked) {
            document.getElementById('buffer1-repetition').disabled = false;
            validateBuffer1Repetition(); // Validate repetition input on switch on
            enableDisableAddition1Button(); // Check and enable/disable Addition1 button
        } else {
            document.getElementById('buffer1-repetition').disabled = true;
            buffer1RepetitionError.textContent = ''; // Clear error message
            enableDisableAddition1Button(); // Check and enable/disable Addition1 button
        }
    });

    // Validate Buffer 1 packets input function
    function validateBuffer1Packets() {
        const packetsValue = buffer1PacketsInput.value;
        if (isInteractedPackets && (packetsValue === '' || packetsValue <= 0 || packetsValue > 1000)) {
            buffer1PacketsError.textContent = 'Value must be between 1 and 1000';
            return false;
        } else {
            buffer1PacketsError.textContent = '';
            return true;
        }
    }

    // Validate Buffer 1 repetition input function
    function validateBuffer1Repetition() {
        const repetitionValue = document.getElementById('buffer1-repetition').value;
        if (isInteractedRepetition && (repetitionValue === '' || repetitionValue <= 0 || repetitionValue > 30)) {
            buffer1RepetitionError.textContent = 'Value must be between 1 and 30';
            return false;
        } else {
            buffer1RepetitionError.textContent = '';
            return true;
        }
    }

    // Enable/disable Addition1 button based on validation
    function enableDisableAddition1Button() {
        const isValid = validateBuffer1Packets() && (isInteractedRepetition ? validateBuffer1Repetition() : true);
        document.getElementById('buffer1-execute').disabled = !isValid;
    }
});

// const buffer2TimesInput = document.getElementById('buffer2-times');



// Buffer 2 checkbox change event listener
document.getElementById('buffer2-check').addEventListener('change', function() {
    const buffer2TimesInput = document.getElementById('buffer2-times');
    const buffer2RepetitionInput = document.getElementById('buffer2-repetition');
    const buffer2TimesError = document.getElementById('buffer2-times-error');
    const buffer2RepetitionError = document.getElementById('buffer2-repetition-error');
    const bufferTime = parseInt(document.getElementById('buffer2-times').value, 10);
    let isInteractedTimes = false; // Track if user has interacted with times input
    let isInteractedRepetition = false; // Track if user has interacted with repetition input

    if (this.checked) {
        // Enable Buffer 2 inputs
        buffer2TimesInput.disabled = false;
        buffer2TimesInput.setAttribute('required', true); // Enable required attribute for times input

        // Enable repetition buffer 2 switch and input if checked
        document.getElementById('buffer2-repetition-switch').disabled = false;
        document.getElementById('buffer2-repetition').disabled = false;
        //document.getElementById('buffer2-execute').disabled = false;
        document.getElementById('buffer2-main-execute').disabled = false;
        //document.getElementById('buffer2-execute-minus').disabled = false;
        // if (bufferTime > 0){
        //     document.getElementById('buffer2-execute-minus').disabled = false;
        // }else{
        //     document.getElementById('buffer2-execute-minus').disabled = true;
        // }
        
        //document.getElementById('buffer2-execute-minus').disabled = false;

    } else {
        // Disable Buffer 2 inputs
        //document.getElementById('buffer2-execute').disabled = true;
        document.getElementById('buffer2-repetition').disabled = true;
        document.getElementById('buffer2-main-execute').disabled = true;
        //document.getElementById('buffer2-execute-minus').disabled = true;
        buffer2TimesInput.disabled = true;
        buffer2TimesInput.removeAttribute('required'); // Remove required attribute
        //buffer2TimesInput.value = ''; // Clear input value
       // buffer2TimesError.textContent = ''; // Clear error message

        // Disable repetition buffer 2 switch and input
        document.getElementById('buffer2-repetition-switch').disabled = true;
        //document.getElementById('buffer2-repetition').disabled = true;
        //buffer2RepetitionError.textContent = ''; // Clear error message

        // Reset interaction flags
        isInteractedTimes = false;
        isInteractedRepetition = false;
    }

    // Event listener for times input change
    buffer2TimesInput.addEventListener('input', function() {
        isInteractedTimes = true; // User has interacted with times input
        //validateBuffer2Times(); // Validate times input on input change
        //enableDisableAddition2Button(); // Check and enable/disable Addition2 button
    });

    // Event listener for repetition input change
    document.getElementById('buffer2-repetition').addEventListener('input', function() {
        isInteractedRepetition = true; // User has interacted with repetition input
        validateBuffer2Repetition(); // Validate repetition input on input change
        //enableDisableAddition2Button(); // Check and enable/disable Addition2 button
    });

    // Event listener for repetition switch change
    document.getElementById('buffer2-repetition-switch').addEventListener('change', function() {
        if (this.checked) {
            document.getElementById('buffer2-repetition').disabled = false;
            document.getElementById('buffer2-repetition-switch-text').value = "ON";
            validateBuffer2Repetition(); // Validate repetition input on switch on
            //enableDisableAddition2Button(); // Check and enable/disable Addition2 button
        } else {
            document.getElementById('buffer2-repetition').disabled = true;
            document.getElementById('buffer2-repetition-switch-text').value = "OFF";
            //buffer2RepetitionError.textContent = ''; // Clear error message
            //enableDisableAddition2Button(); // Check and enable/disable Addition2 button
        }
    });

    // Validate Buffer 2 times input function
    // function validateBuffer2Times() {
    //     const timesValue = buffer2TimesInput.value;
    //     if (isInteractedTimes && (timesValue === '' || timesValue > 2000)) {
    //         buffer2TimesError.textContent = 'Value must be between 100 and 2000';
    //         return false;
    //     } else {
    //         //buffer2TimesError.textContent = '';
    //         return true;
    //     }
    // }

    // Validate Buffer 2 repetition input function
    function validateBuffer2Repetition() {
        const repetitionValue = document.getElementById('buffer2-repetition').value;
        if (isInteractedRepetition && (repetitionValue === '' || repetitionValue <= 0 || repetitionValue > 30)) {
            //buffer2RepetitionError.textContent = 'Value must be between 1 and 30';
            return false;
        } else {
            //buffer2RepetitionError.textContent = '';
            return true;
        }
    }

    // Enable/disable Addition2 button based on validation
    // function enableDisableAddition2Button() {
    //     const isValid = validateBuffer2Times() && (isInteractedRepetition ? validateBuffer2Repetition() : true);
    //     //document.getElementById('buffer2-execute').disabled = !isValid;
    // }
});




