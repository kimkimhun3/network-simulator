#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <winsock2.h>
#include <windows.h>
#include <time.h>

#pragma comment(lib, "ws2_32.lib")

#define RECEIVER_PORT 5004         // Port where we will receive packets
#define DECODER_IP "192.168.25.89" // IP of the Decoder
#define DECODER_PORT 5004          // Port of the Decoder
#define BUFFER_SIZE 65535          // Max size of a single UDP packet
#define MAX_PACKETS 100000         // Maximum number of packets to buffer
#define START_BUFFERING_TIME 3000  // 3 seconds for normal operation
#define BUFFERING_DURATION 500      // 0.5 seconds for buffering

typedef struct {
    char *data;
    int size;
} Packet;

int main() {
    WSADATA wsaData;
    SOCKET receiverSocket, senderSocket;
    struct sockaddr_in receiverAddr, decoderAddr;
    Packet packetBuffer[MAX_PACKETS];
    int bufferIndex = 0;
    int buffering = 0;
    int result;
    clock_t startTime = clock();  // Track the start time for the initial normal operation

    // Initialize Winsock
    result = WSAStartup(MAKEWORD(2, 2), &wsaData);
    if (result != 0) {
        printf("WSAStartup failed: %d\n", result);
        return 1;
    }

    // Create receiver socket
    receiverSocket = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (receiverSocket == INVALID_SOCKET) {
        printf("socket() failed: %d\n", WSAGetLastError());
        WSACleanup();
        return 1;
    }

    // Setup receiver address structure
    memset(&receiverAddr, 0, sizeof(receiverAddr));
    receiverAddr.sin_family = AF_INET;
    receiverAddr.sin_port = htons(RECEIVER_PORT);
    receiverAddr.sin_addr.s_addr = INADDR_ANY;

    // Bind the receiver socket
    result = bind(receiverSocket, (struct sockaddr *)&receiverAddr, sizeof(receiverAddr));
    if (result == SOCKET_ERROR) {
        printf("bind() failed: %d\n", WSAGetLastError());
        closesocket(receiverSocket);
        WSACleanup();
        return 1;
    }

    // Create sender socket
    senderSocket = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
    if (senderSocket == INVALID_SOCKET) {
        printf("socket() failed: %d\n", WSAGetLastError());
        closesocket(receiverSocket);
        WSACleanup();
        return 1;
    }

    // Setup decoder address structure
    memset(&decoderAddr, 0, sizeof(decoderAddr));
    decoderAddr.sin_family = AF_INET;
    decoderAddr.sin_port = htons(DECODER_PORT);
    decoderAddr.sin_addr.s_addr = inet_addr(DECODER_IP);

    printf("Server started. Receiver listening on port %d\n", RECEIVER_PORT);

    // Main loop to receive and forward packets
    while (1) {
        struct sockaddr_in senderAddr;
        int senderAddrSize = sizeof(senderAddr);
        char buffer[BUFFER_SIZE];
        int recvLen = recvfrom(receiverSocket, buffer, BUFFER_SIZE, 0, (struct sockaddr *)&senderAddr, &senderAddrSize);

        if (recvLen == SOCKET_ERROR) {
            printf("recvfrom() failed: %d\n", WSAGetLastError());
            continue;
        }

        if (!buffering) {
            // Forward packets directly to the decoder during normal operation
            result = sendto(senderSocket, buffer, recvLen, 0, (struct sockaddr *)&decoderAddr, sizeof(decoderAddr));
            if (result == SOCKET_ERROR) {
                printf("sendto() failed: %d\n", WSAGetLastError());
            }

            // Check if it's time to start buffering
            if (clock() - startTime >= START_BUFFERING_TIME * CLOCKS_PER_SEC / 1000) {
                printf("Starting buffering period\n");
                buffering = 1;  // Switch to buffering mode
                bufferIndex = 0; // Reset buffer index
                startTime = clock(); // Reset start time for buffering duration
            }
        } else {
            // Buffer the incoming packets
            if (bufferIndex < MAX_PACKETS) {
                packetBuffer[bufferIndex].data = malloc(recvLen);
                if (packetBuffer[bufferIndex].data == NULL) {
                    printf("malloc() failed\n");
                    continue;
                }
                memcpy(packetBuffer[bufferIndex].data, buffer, recvLen);
                packetBuffer[bufferIndex].size = recvLen;
                bufferIndex++;
            } else {
                printf("Buffer overflow, discarding packet\n");
            }

            // Check if buffering duration is over
            if (clock() - startTime >= BUFFERING_DURATION * CLOCKS_PER_SEC / 1000) {
                // Measure the time taken to do buffering
                clock_t endBufferingTime = clock();
                double bufferingDuration = (double)(endBufferingTime - startTime) / CLOCKS_PER_SEC;
                printf("Time taken to buffer packets: %.2f ms\n", bufferingDuration  * 1000);

                printf("Sending buffered packets\n");

                // Start measuring time to send buffered packets
                clock_t sendStartTime = clock();
                
                // Send buffered packets
                for (int i = 0; i < bufferIndex; i++) {
                    result = sendto(senderSocket, packetBuffer[i].data, packetBuffer[i].size, 0, (struct sockaddr *)&decoderAddr, sizeof(decoderAddr));
                    if (result == SOCKET_ERROR) {
                        printf("sendto() failed: %d\n", WSAGetLastError());
                    }
                    free(packetBuffer[i].data);
                }

                // Measure the time taken to send buffered packets
                clock_t sendEndTime = clock();
                double sendDuration = (double)(sendEndTime - sendStartTime) / CLOCKS_PER_SEC;
                printf("Time taken to send buffered packets: %.2f ms\n", sendDuration * 1000);

                // Clear the buffer
                bufferIndex = 0;

                // Switch back to normal operation
                buffering = 0;
                startTime = clock();  // Reset start time for the next normal operation period
                printf("Switched to normal operation\n");
            }
        }
    }

    // Cleanup
    closesocket(receiverSocket);
    closesocket(senderSocket);
    WSACleanup();
    return 0;
}
