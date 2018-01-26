'use strict';

const router = require('express').Router();

router.use('/webhook/:webhook_id', require('./webhook'));

module.exports = router;