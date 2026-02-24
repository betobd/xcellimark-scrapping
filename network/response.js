

exports.success = (req, res, message, status) => {
    const statusCode = status || 200;
    const resMessage = message || {}

    res.json({
        error: false,
        status: statusCode,
        data: resMessage
    })
}


exports.error = (req, res, message, status) => {
    const statusCode = status || 500;
    const resMessage = message || 'Internal Server Error'

    res.json({
        error: true,
        status: statusCode,
        message: resMessage
    })
}



