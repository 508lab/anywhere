var jwt = require('jsonwebtoken');
var conf = require('./conf');

function setErrRes(result, error) {
    if (error.message === 'invalid signature') {
        result.code = 401;
        result.err = error.message;
    } else if (error.message === `Cannot read property 'split' of undefined`) {
        result.code = 401;
        result.data = 'no token detected in http header "Authorization"';
    } else {
        result.err = error.message;
    }
}

/**
 * middleware
 */
module.exports = function (req, res, next) {
    let tag = true;
    let result = {
        code: 200,
    };
    var auth = req.headers.authorization;

    /**
     * External interface verification
     */
    if (req.url.includes('/api/v1')) {
        try {
            var authorization = auth.split('Bearer ')[1]
            jwt.verify(authorization, conf.token.secret);
            tag = true;
        } catch (error) {
            tag = false;
            setErrRes(result, error);
            res.end(JSON.stringify(result));
        }
    }
    return tag;
};