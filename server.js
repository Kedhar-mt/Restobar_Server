const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const tableRoutes = require('./apps/pos/routes/tableRoutes');
const categoryRoutes = require("./apps/pos/routes/categoryRoutes");
const analyticsRoutes = require("./apps/pos/routes/analyticsRoutes");
const restaurantRoutes = require("./apps/pos/routes/restaurantRoutes");
const waiterRoutes = require("./apps/pos/routes/waiterRoutes");
const tagRoutes = require("./apps/pos/routes/tagRoutes");
const printerRoutes = require("./apps/pos/routes/printerRoutes");
const orderRoutes = require("./apps/pos/routes/orderRoutes");
const vendorIvmRoutes = require("./apps/inventory/routes/vendorIvmRoutes");
const purchaseOrderIvmRoutes = require("./apps/inventory/routes/purchaseOrderIvmRoutes");
const tagIvmRoutes = require("./apps/inventory/routes/tagIvmRoutes");
const categoryIvmRoutes = require("./apps/inventory/routes/categoryIvmRoutes");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB
connectDB();

// POS API Routes
app.use("/api/tables", tableRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use('/api/waiters', waiterRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api', printerRoutes);
app.use('/api/orders',orderRoutes);

// Inventory API Routes
app.use('/api-ivm/categories', categoryIvmRoutes);
app.use('/api-ivm/tags', tagIvmRoutes);
app.use('/api-ivm/vendors', vendorIvmRoutes);
app.use('/api-ivm/purchaseorders', purchaseOrderIvmRoutes);



// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
