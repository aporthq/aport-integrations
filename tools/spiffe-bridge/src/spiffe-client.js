const fs = require('fs');
const net = require('net');

class SpiffeClient {
  constructor(socketPath) {
    this.socketPath = socketPath;
  }

  async fetchX509SVID() {
    return new Promise((resolve, reject) => {
      const sock = net.connect(this.socketPath, () => {
        sock.write('GET /x509svid HTTP/1.1\r\nHost: spiffe://localhost\r\n\r\n');
      });
      let data = '';
      sock.on('data', chunk => data += chunk);
      sock.on('end', () => {
        try {
          // Parse PEM certificate to extract SPIFFE ID
          const pemMatch = data.match(/-----BEGIN CERTIFICATE-----(.*?)-----END CERTIFICATE-----/s);
          if (pemMatch) {
            const spiffeIdMatch = data.match(/spiffe:\/\/([^\s"]+)/);
            resolve({
              svid: pemMatch[0],
              spiffeId: spiffeIdMatch ? spiffeIdMatch[1] : null,
              trustDomain: spiffeIdMatch ? spiffeIdMatch[1].split('/')[2] : null,
              workloadId: spiffeIdMatch ? spiffeIdMatch[1].split('/').pop() : null,
            });
          } else {
            reject(new Error('No X509-SVID found in response'));
          }
        } catch (e) { reject(e); }
      });
      sock.on('error', reject);
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });
  }
}
module.exports = SpiffeClient;
