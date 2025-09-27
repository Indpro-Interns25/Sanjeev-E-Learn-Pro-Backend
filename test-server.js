const http = require('http');

const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  
  if (req.url === '/test') {
    res.end(JSON.stringify({ message: 'Simple server working!' }));
  } else if (req.url === '/api/auth/register') {
    res.end(JSON.stringify({ message: 'Register endpoint found!' }));
  } else {
    res.end(JSON.stringify({ message: 'Server is running', url: req.url }));
  }
});

const PORT = 3002;

server.listen(PORT, 'localhost', () => {
  console.log(`Simple server running on http://localhost:${PORT}`);
  console.log(`Test: http://localhost:${PORT}/test`);
  
  const address = server.address();
  console.log(`Server listening on: ${JSON.stringify(address)}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});