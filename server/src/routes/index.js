const express = require('express');
const healthRoutes = require('./healthRoutes');

const router = express.Router();

// Public: mounted before authenticate is added in S-02.
router.use('/health', healthRoutes);

module.exports = router;
