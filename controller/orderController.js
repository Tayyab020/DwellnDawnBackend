const Order = require('../models/Order');

// Create a new order
exports.createOrder = async (req, res) => {
    try {
      console.log("Creating order", req.body);
    const order = new Order(req.body);
    await order.save();
    res.status(201).json({ message: "Order created successfully", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create order" });
  }
};

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
     .populate({
        path: 'itemId',
        populate: {
          path: 'author', // This populates the author field inside itemId
          model: 'User'   // Use your actual User model name if different
        }
      })
      .populate('orderedBy');
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch all orders" });
  }
};

// Get all orders placed by a specific user
exports.getOrdersByUserId = async (req, res) => {
  const { userId } = req.params;
  console.log("getOrdersByUserId called", userId);
  try {
    const orders = await Order.find({ orderedBy: userId })
      .populate({
        path: 'itemId',
        populate: {
          path: 'author', // This populates the author field inside itemId
          model: 'User'   // Use your actual User model name if different
        }
      })
      .populate('orderedBy');

    res.status(200).json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Failed to fetch orders by user" });
  }
};


// Get all orders for blogs created by a specific author
exports.getOrdersByAuthorId = async (req, res) => {
  console.log("getOrdersByAuthorId called");
  const { authorId } = req.params;

  try {
    const orders = await Order.find()
      .populate({
        path: 'itemId',
        model: 'Blog', // or 'Item' or whatever model your item is
        match: { author: authorId },
        populate: {
          path: 'author',
          model: 'User' // optional: populate the item's author as well
        }
      })
      .populate('orderedBy');

    // Filter only orders where itemId matched the authorId
    const filteredOrders = orders.filter(order => order.itemId !== null);

    res.status(200).json(filteredOrders);
  } catch (err) {
    console.error("Error in getOrdersByAuthorId:", err);
    res.status(500).json({ message: "Failed to fetch orders by author" });
  }
};

// Update Order Status
exports.updateOrderStatus = async (req, res) => {
  try {
    console.log("Updating order status", req.body);
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    return res.status(200).json({
      message: '✅ Order status updated successfully.',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};


// Get a single order by order ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('itemId')
      .populate('orderedBy');

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json(order);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch order" });
  }
};
