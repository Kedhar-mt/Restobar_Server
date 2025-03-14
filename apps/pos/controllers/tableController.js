const Table = require('../models/Table');
const Order = require('../models/Order');

// Get all tables with their order information
exports.getAllTables = async (req, res) => {
  try {
    const tables = await Table.find().sort({ tableNumber: 1 });

    const tablesWithOrderInfo = await Promise.all(
      tables.map(async (table) => {
        const latestOrder = await Order.findOne({
          tableId: table._id,
          status: 'pending'
        }).sort({ createdAt: -1 });

        return {
          _id: table._id,
          name: table.name,
          tableNumber: table.tableNumber,
          hasOrders: !!latestOrder,
          createdAt: table.createdAt,
          updatedAt: table.updatedAt
        };
      })
    );

    res.json(tablesWithOrderInfo);
  } catch (err) {
    console.error('Error getting tables:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new table
exports.createTable = async (req, res) => {
  try {
    const { name, tableNumber } = req.body;

    if (!name || !tableNumber) {
      return res.status(400).json({ message: 'Table name and number are required' });
    }

    const existingTable = await Table.findOne({ tableNumber });
    if (existingTable) {
      return res.status(400).json({ message: 'Table number already exists' });
    }

    const newTable = new Table({ name, tableNumber, hasOrders: false });
    const savedTable = await newTable.save();

    res.status(201).json(savedTable);
  } catch (err) {
    console.error('Error creating table:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a table
exports.updateTable = async (req, res) => {
  try {
    const { name, tableNumber } = req.body;

    if (!name && !tableNumber) {
      return res.status(400).json({ message: 'At least name or table number must be provided' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (tableNumber) {
      // Check if another table already has this number
      const existingTable = await Table.findOne({ 
        tableNumber, 
        _id: { $ne: req.params.id } // Exclude the current table
      });
      
      if (existingTable) {
        return res.status(400).json({ message: 'Table number already exists' });
      }
      
      updateData.tableNumber = tableNumber;
    }

    const updatedTable = await Table.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedTable) return res.status(404).json({ message: 'Table not found' });

    const currentOrder = await Order.findOne({
      tableId: updatedTable._id,
      status: 'pending'
    }).sort({ createdAt: -1 });

    res.json({
      _id: updatedTable._id,
      name: updatedTable.name,
      tableNumber: updatedTable.tableNumber,
      hasOrders: !!currentOrder,
      orders: currentOrder ? currentOrder.items : [],
      createdAt: updatedTable.createdAt,
      updatedAt: updatedTable.updatedAt
    });
  } catch (err) {
    console.error('Error updating table:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a table and its orders
exports.deleteTable = async (req, res) => {
  try {
    await Order.deleteMany({ tableId: req.params.id });

    const deletedTable = await Table.findByIdAndDelete(req.params.id);
    if (!deletedTable) return res.status(404).json({ message: 'Table not found' });

    res.json({ message: 'Table and all associated orders deleted successfully' });
  } catch (err) {
    console.error('Error deleting table:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Place an order for a table
exports.placeOrder = async (req, res) => {
  try {
    const { orders, waiterId } = req.body;
    console.log('Order request body:', req.body);

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ message: 'Orders must be a non-empty array' });
    }

    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ message: 'Table not found' });

    // Validate waiter ID if provided
    if (waiterId) {
      const waiter = await require('../models/Waiter').findById(waiterId);
      if (!waiter) {
        return res.status(404).json({ message: 'Waiter not found' });
      }
    }

    const validatedItems = orders.map(item => ({
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity) || 1,
      categoryName: item.categoryName || 'Uncategorized',
      itemId: item.itemId || null
    }));

    const total = validatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    let existingOrder = await Order.findOne({ tableId: table._id, status: 'pending' });

    if (existingOrder) {
      existingOrder.items = validatedItems;
      existingOrder.total = total;
      
      // Update waiter assignment if provided
      if (waiterId) {
        existingOrder.waiterId = waiterId;
      }
      
      await existingOrder.save();
    } else {
      // Create new order with waiter if provided
      const orderData = { 
        tableId: table._id, 
        items: validatedItems, 
        total, 
        status: 'pending' 
      };
      
      if (waiterId) {
        orderData.waiterId = waiterId;
      }
      
      existingOrder = new Order(orderData);
      await existingOrder.save();
    }

    table.hasOrders = true;
    await table.save();

    // Populate waiter information if available
    if (existingOrder.waiterId) {
      await existingOrder.populate('waiterId');
    }

    res.json({
      _id: table._id,
      name: table.name,
      tableNumber: table.tableNumber,
      hasOrders: true,
      orders: existingOrder.items,
      waiter: existingOrder.waiterId ? {
        _id: existingOrder.waiterId._id,
        name: existingOrder.waiterId.name,
        phoneNumber: existingOrder.waiterId.phoneNumber
      } : null,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt
    });
  } catch (err) {
    console.error('Error placing order:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Modified getTableById to include waiter info
exports.getTableById = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ message: 'Table not found' });

    const currentOrder = await Order.findOne({
      tableId: table._id,
      status: 'pending'
    }).sort({ createdAt: -1 }).populate('waiterId');

    let waiterInfo = null;
    if (currentOrder && currentOrder.waiterId) {
      waiterInfo = {
        _id: currentOrder.waiterId._id,
        name: currentOrder.waiterId.name,
        phoneNumber: currentOrder.waiterId.phoneNumber
      };
    }

    res.json({
      _id: table._id,
      name: table.name,
      tableNumber: table.tableNumber,
      hasOrders: !!currentOrder,
      orders: currentOrder ? currentOrder.items : [],
      waiter: waiterInfo,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt
    });
  } catch (err) {
    console.error('Error getting table:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Clear orders for a table
exports.clearOrders = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ message: 'Table not found' });

    await Order.updateMany({ tableId: table._id, status: 'pending' }, { status: 'completed' });

    table.hasOrders = false;
    await table.save();

    res.json({
      _id: table._id,
      name: table.name,
      tableNumber: table.tableNumber,
      hasOrders: false,
      orders: [],
      createdAt: table.createdAt,
      updatedAt: table.updatedAt
    });
  } catch (err) {
    console.error('Error clearing orders:', err);
    res.status(500).json({ message: 'Server error' });
  }
};