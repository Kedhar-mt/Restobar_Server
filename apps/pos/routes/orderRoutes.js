// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Order routes
router.get('/', orderController.getAllOrders);

// Other order routes...

module.exports = router;