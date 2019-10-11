var os = require('os');
var fs = require('fs');
var path = require('path');
var http = require('http');
var https = require('https');
const { URL } = require('url');

var connect = require('connect');
var redirect = require('connect-redirection')
var serveStatic = require('serve-static');
var cookieSession = require('cookie-session');
var serveIndex = require('serve-index');
var fallback = require('connect-history-api-fallback');
var proxy = require('http-proxy-middleware');
var debug = require('debug');
debug.enable('anywhere');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var argv = require("minimist")(process.argv.slice(2), {
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

var openURL = function (url) {
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
var getIPAddress = function () {
  var ifaces = os.networkInterfaces();
  var ip = '';
  for (var dev in ifaces) {
    ifaces[dev].forEach(function (details) {
      if (ip === '' && details.family === 'IPv4' && !details.internal) {
        ip = details.address;
        return;
      }
    });
  }
  return ip || "127.0.0.1";
};

var log = debug('anywhere');

var app = connect();


app.use(cookieSession({
  name: 'session',
  keys: ['schizobulia']
}))

app.use('/login', function (req, res) {
  fs.readFile(path.join(__dirname, '../public', 'login.html'), { encoding: "utf-8" }, function (err, msg) {
    if (!err) {
      res.end(msg);
    }
  });
})

app.use('/l', function (req, res) {
  var obj = createObjByurl(req.url);
  if (obj && obj.password === '123456') {
    req.session.login = 1;
    res.end('1');
  } else {
    req.session.login = 0;
    res.end('0');
  }
})

app.use(redirect()).use(function (req, res, next) {
  let obj = req.session.login;
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (!obj) {
    res.redirect('/login');
    return;
  }
  if (argv.log) {
    log(req.method + ' ' + req.url);
  }
  next();  
});
if (argv.fallback !== undefined) {
  console.log('Enable html5 history mode.');
  app.use(fallback({
    index: argv.fallback || '/index.html'
  }));
}

/**
 * 根据url中参数生成对象
 * @param {*} url 
 */
function createObjByurl(url) {
  url = url.slice(2, url.length);
  var arr = url.split('&');
  var obj = {};
  arr.map((e) => {
    var element = e.split('=');
    obj[element[0]] = element[1];
  });
  return obj;
}






app.use(serveStatic(argv.dir, { 'index': ['index.html'] }));

var defaultTemplate = path.join(__dirname, '../public', 'directory.html');
app.use(serveIndex(argv.dir, { 'icons': 'https://508laboratory.github.io/favicon.png', template: defaultTemplate }));

// anywhere --proxy webpack.config.js
// anywhere --proxy proxy.config.js
// anywhere --proxy http://localhost:7000/api
if (argv.proxy) {
  try {
    // if url
    var url = new URL(argv.proxy);
    app.use(proxy(url.toString(), { changeOrigin: true }));
  } catch (e) {
    // if config file
    var config = require(path.resolve(argv.dir, argv.proxy));
    // support webpack-dev-server proxy options
    try {
      config = config.devServer.proxy;
    } catch (e) {
      if (argv.log) {
        log(e);
      }
    }
    var contexts = Object.keys(config);
    contexts.forEach(context => {
      var options = config[context];
      app.use(proxy(context, options));
    });
  }
}

// anywhere 8888
// anywhere -p 8989
// anywhere 8888 -s // silent
// anywhere -h localhost
// anywhere -d /home
var port = parseInt(argv._[0] || argv.port, 10);
var secure = port + 1;

var hostname = argv.hostname || getIPAddress();



http.createServer(app).listen(port, function () {
  // 忽略80端口
  port = (port != 80 ? ':' + port : '');
  var url = "http://" + hostname + port + '/';
  console.log("Running at " + url);
  if (!argv.silent) {
    openURL(url);
  }
});

var isOpenHttps = false;

/**
 * 是否开启https
 */
if (isOpenHttps) {
  var options = {
    key: fs.readFileSync(path.join(__dirname, '../keys', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../keys', 'cert.pem'))
  };

  https.createServer(options, app).listen(secure, function () {
    secure = (secure != 80 ? ':' + secure : '');
    var url = "https://" + hostname + secure + '/';
    console.log("Also running at " + url);
  });
}


