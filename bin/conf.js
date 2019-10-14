/**
 * Global configuration
 */
module.exports = {
    password: '123456',
    token: {
        secret: '123456',
        time: '48h'
    },
    /**
     * session conf 
     */
    session: {
        name: 'session',
        keys: ['123456'],
        maxAge: 24 * 60 * 60 * 1000
    }
}