// Minimal long-running "game server": listens on the port given after -port.
const idx = process.argv.indexOf('-port');
const port = Number(process.argv[idx + 1]);
require('http')
  .createServer((req, res) => {
    if (req.url === '/logs') return res.end('line one\nline two\n');
    res.statusCode = 404;
    res.end();
  })
  .listen(port);
console.log('fake server listening on ' + port);
