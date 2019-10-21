var Router = require('router');
var fs = require('fs');
var path = require('path');
var redirect = require('connect-redirection')
var router = Router();
var middleware = require('./middleware');
var jwt = require('jsonwebtoken');
var url = require('url');
var qs = require('querystring');
var multiparty = require('multiparty');
var conf = require('./conf');

/**
 * api
 */
module.exports = function (argv) {
    router.use(redirect()).use(function (req, res, next) {
        if (!middleware(req, res, next)) {
            return;
        }
        res.setHeader("Access-Control-Allow-Origin", "*");
        var auth = req.headers.authorization;
        if (auth && jwt.verify(auth.split('Bearer ')[1], conf.token.secret)) {
            //If token exists, use token authentication first
        } else {
            let obj = req.session.login;
            if (!obj && req.url !== '/login' && !req.url.includes('/api/v1')) {
                res.redirect('/login');
                return;
            }
        }

        next();
    })

    /**
     * The login page
     */
    router.get('/login', function (req, res) {
        fs.readFile(path.join(__dirname, '../public', 'login.html'), { encoding: "utf-8" }, function (err, msg) {
            if (!err) {
                res.end(msg);
            }
        });
    })

    /**
     * login api
     */
    router.post('/login', function (req, res) {
        var obj = req.body;
        let result = { status: 200 };
        if (obj && obj.password === conf.password) {
            req.session.login = 1;
            result.data = jwt.sign({}, conf.token.secret, { expiresIn: conf.token.time });
        } else {
            req.session.login = 0;
            result.err = 'password is err';
        }
        res.end(JSON.stringify(result));
    })

    /**
     * Gets files and folders in the directory
     */
    router.get('/api/v1/path', function (req, res) {
        var arg = url.parse(req.url).query;
        var path = qs.parse(arg)['q'] || '';
        try {
            var arr = fs.readdirSync(argv.dir + path);
            var dirs = arr.filter((ele) => { return ele.isDirectory() });
            var files = arr.filter((ele) => { return !ele.isDirectory() });
            res.end(JSON.stringify({
                status: 200,
                data: [dirs, files],
            }));
        } catch (error) {
            res.end(JSON.stringify({
                status: 200,
                data: 'no such file or directory',
            }));
        }
    })

    /**
     * upload files
     */
    router.post('/api/v1/path', function (req, res) {
        var arg = url.parse(req.url).query;
        var path = qs.parse(arg)['q'] || '';
        var form = new multiparty.Form();
        form.encoding = 'utf-8';
        let uploadPath = argv.dir + path;
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        form.uploadDir = uploadPath;
        // form.maxFilesSize = 2 * 1024 * 1024;
        // form.maxFields = 1000;  
        form.parse(req, function (err, fields, files) {
            for (const key in files) {
                if (files.hasOwnProperty(key)) {
                    const file = files[key][0];
                    fs.renameSync(file.path, uploadPath + '/' + file.originalFilename);
                }
            }
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({
                status: 200,
                data: 'ok'
            }));
        });
    })

    return router;
};
