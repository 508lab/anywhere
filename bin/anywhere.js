const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const connect = require('connect');
const bodyParser = require('body-parser');
const conf = require('./conf');
const serveStatic = require('serve-static');
const cookieSession = require('cookie-session');
const serveIndex = require('serve-index');
const fallback = require('connect-history-api-fallback');
const proxy = require('http-proxy-middleware');
const debug = require('debug');
debug.enable('anywhere');
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const argv = require("minimist")(process.argv.slice(2), {
  alias: {
    'silent': 's',
    'port': 'p',
    'hostname': 'h',
    'dir': 'd',
    'proxy': 'x',
    'log': 'l',
    'fallback': 'f'
  },
  string: ['port', 'hostname', 'fallback'],
  boolean: ['silent', 'log'],
  'default': {
    'port': 8000,
    'dir': process.cwd()
  }
});
const api = require('./api')(argv);


if (argv.help) {
  console.log("Usage:");
  console.log("node anywhere.js--help // print help information");
  console.log("node anywhere.js // 8000 as default port, current folder as root");
  console.log("node anywhere.js 8888 // 8888 as port");
  console.log("node anywhere.js-p 8989 // 8989 as port");
  console.log("node anywhere.js-s // don't open browser");
  console.log("node anywhere.js-h localhost // localhost as hostname");
  console.log("node anywhere.js-d /home // /home as root");
  console.log("node anywhere.js-l // print log");
  console.log("node anywhere.js-f // Enable history fallback");
  console.log("node anywhere.js--proxy http://localhost:7000/api // Support shorthand URL, webpack.config.js or customize config file");
  process.exit(0);
}

const openURL = function (url) {
  switch (process.platform) {
    case "darwin":
      exec('open ' + url);
      break;
    case "win32":
      exec('start ' + url);
      break;
    default:
      spawn('xdg-open', [url]);
    // I use `spawn` since `exec` fails on my machine (Linux i386).
    // I heard that `exec` has memory limitation of buffer size of 512k.
    // http://stackoverflow.com/a/16099450/222893
    // But I am not sure if this memory limit causes the failure of `exec`.
    // `xdg-open` is specified in freedesktop standard, so it should work on
    // Linux, *BSD, solaris, etc.
  }
};

/**
 * Get ip(v4) address
 * @return {String} the ipv4 address or 'localhost'
 */
const getIPAddress = function () {
  let ifaces = os.networkInterfaces();
  let ip = '';
  for (let dev in ifaces) {
    ifaces[dev].forEach(function (details) {
      if (ip === '' && details.family === 'IPv4' && !details.internal) {
        ip = details.address;
        return;
      }
    });
  }
  return ip || "127.0.0.1";
};

const log = debug('anywhere');
let app = connect();

app.use(bodyParser.urlencoded({extended: false}));

app.use(cookieSession(conf.session));

app.use(api);


if (argv.fallback !== undefined) {
  console.log('Enable html5 history mode.');
  app.use(fallback({
    index: argv.fallback || '/index.html'
  }));
}

app.use(serveStatic(argv.dir, { 'index': ['index.html'] }));

const defaultTemplate = path.join(__dirname, '../public', 'directory.html');
app.use(serveIndex(argv.dir, { 'icons': 'https://508laboratory.github.io/favicon.png', template: defaultTemplate }));

// anywhere --proxy webpack.config.js
// anywhere --proxy proxy.config.js
// anywhere --proxy http://localhost:7000/api
if (argv.proxy) {
  try {
    // if url
    let url = new URL(argv.proxy);
    app.use(proxy(url.toString(), { changeOrigin: true }));
  } catch (e) {
    // if config file
    let config = require(path.resolve(argv.dir, argv.proxy));
    // support webpack-dev-server proxy options
    try {
      config = config.devServer.proxy;
    } catch (e) {
      if (argv.log) {
        log(e);
      }
    }
    let contexts = Object.keys(config);
    contexts.forEach(context => {
      let options = config[context];
      app.use(proxy(context, options));
    });
  }
}

// anywhere 8888
// anywhere -p 8989
// anywhere 8888 -s // silent
// anywhere -h localhost
// anywhere -d /home
let port = parseInt(argv._[0] || argv.port, 10);
let secure = port + 1;

let hostname = argv.hostname || getIPAddress();



http.createServer(app).listen(port, function () {
  port = (port != 80 ? ':' + port : '');
  let url = "http://" + hostname + port + '/';
  console.log("Running at " + url);
  if (!argv.silent) {
    openURL(url);
  }
});

let isOpenHttps = false;

/**
 * Whether open https
 */
if (isOpenHttps) {
  let options = {
    key: fs.readFileSync(path.join(__dirname, '../keys', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../keys', 'cert.pem'))
  };

  https.createServer(options, app).listen(secure, function () {
    secure = (secure != 80 ? ':' + secure : '');
    let url = "https://" + hostname + secure + '/';
    console.log("Also running at " + url);
  });
}



