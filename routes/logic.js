const { Router } = require('express');
const { main } = require('../bin/logic');
const { createContextLogger } = require('../components/logger/appLogger');

const router = Router();
const logger = createContextLogger('routes');

router.get('/run', (req, res) => {
  logger.info('Manual integration requested', {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return main(req, res);
});

module.exports = router;
