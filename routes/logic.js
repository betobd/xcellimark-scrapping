const { Router } = require('express');
const { main } = require('../bin/logic');

const router = Router();

router.get('/run', main)

module.exports = router;