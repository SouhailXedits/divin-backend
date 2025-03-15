import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import { Server } from 'socket.io';

// Import routes
import userRoutes from './routes/userRoutes';
import accountRoutes from './routes/accountRoutes';
import planRoutes from './routes/planRoutes';
import walletRoutes from './routes/walletRoutes';
import referralRoutes from './routes/referralRoutes';
import pnlRoutes from './routes/pnlRoutes';
import staffRoutes from './routes/staffRoutes';

// Import error handler
import { errorHandler } from './middleware/errorHandler';

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ],
    methods: ['GET', 'POST']
  }
});

// Initialize admin user if not exists
async function initializeAdminUser() {
  try {
    let admin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    });

    if (!admin) {
      admin = await prisma.user.create({
        data: {
          uniqueId: 'admin',
          username: 'Admin',
          email: 'admin@divinalgo.com',
          role: 'ADMIN',
          status: 'ACTIVE'
        }
      });
      console.log('Admin user created successfully');
    }
    
    return admin;
  } catch (error) {
    console.error('Error initializing admin user:', error);
    throw error;
  }
}

// Function to calculate and emit real-time data updates
async function emitRealTimeData() {
  try {
    // Calculate total divine algo share
    const pnlData = await prisma.pnL.findMany({
      where: {
        totalPnL: {
          gt: 0
        }
      },
      select: {
        divineAlgoShare: true
      }
    });
    
    const totalDivineAlgoShare = pnlData.reduce((total, entry) => {
      return total + (entry.divineAlgoShare || 0);
    }, 0);
    
    // Calculate total wallet balance
    const wallets = await prisma.wallet.findMany({
      where: {
        archivedAt: null
      },
      select: {
        balance: true
      }
    });
    
    const totalWalletBalance = wallets.reduce((total, wallet) => {
      return total + wallet.balance;
    }, 0);
    
    // Emit the calculated values
    io.emit('divineAlgoShareUpdate', { total: totalDivineAlgoShare });
    io.emit('walletBalanceUpdate', { total: totalWalletBalance });
    
    console.log('Emitted real-time data updates');
  } catch (error) {
    console.error('Error calculating real-time data:', error);
  }
}

// Initialize admin user when server starts
let adminUser: { id: string } | null = null;
initializeAdminUser().then(admin => {
  adminUser = admin;
}).catch(console.error);

// Socket.io connection handler
io.on('connection', (socket: any) => {
  console.log('A client connected');
  
  // Send initial real-time data
  emitRealTimeData();
  
  socket.on('disconnect', () => {
    console.log('A client disconnected');
  });
});

// Set up a periodic update every 30 seconds
setInterval(emitRealTimeData, 30000);

// Middleware
app.use(cors());
app.use(express.json());

// Chat endpoints
app.get('/api/chat/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    if (customerId === 'all') {
      // Admin access - get all chats
      const chats = await prisma.chat.findMany({
        include: {
          messages: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 50,
          },
          customer: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
      return res.json(chats);
    }

    // Single customer chat
    const chat = await prisma.chat.findFirst({
      where: { customerId },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,
        },
        customer: true,
      },
    });
    res.json(chat);
  } catch (error) {
    console.error('Error fetching customer chat:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { customerId } = req.body;
    
    // First verify the customer exists
    const customerExists = await prisma.user.findUnique({
      where: { id: customerId }
    });

    if (!customerExists) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Then create the chat
    const chat = await prisma.chat.create({
      data: {
        customerId: customerId,
        lastMessage: null,
        unreadCount: 0,
      }
    });

    res.json(chat);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

app.post('/api/chat/message', async (req, res) => {
  try {
    const { chatId, senderId, content } = req.body;
    
    if (!chatId || !senderId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If senderId is 'admin', use the actual admin user ID
    const actualSenderId = senderId === 'admin' ? adminUser?.id : senderId;
    if (!actualSenderId) {
      return res.status(400).json({ error: 'Invalid sender ID' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create the message
      const message = await tx.message.create({
        data: {
          chatId,
          senderId: actualSenderId,
          content,
          read: false
        },
        include: {
          sender: true
        }
      });

      // Update the chat
      const updatedChat = await tx.chat.update({
        where: { id: chatId },
        data: {
          lastMessage: content,
          unreadCount: {
            increment: 1,
          }
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 50,
            include: {
              sender: true
            }
          }
        }
      });

      return updatedChat;
    });

    res.json(result);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.post('/api/chat/:chatId/read', async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const result = await prisma.$transaction(async (tx) => {
      // First, update all messages in this chat to read
      await tx.message.updateMany({
        where: {
          chatId: chatId
        },
        data: {
          read: true
        }
      });

      // Then, reset the unread count on the chat
      const updatedChat = await tx.chat.update({
        where: { id: chatId },
        data: {
          unreadCount: 0
        },
        include: {
          messages: {
            orderBy: {
              createdAt: 'desc'
            },
            take: 50
          }
        }
      });

      return updatedChat;
    });

    res.json(result);
  } catch (error) {
    console.error('Error marking chat as read:', error);
    res.status(500).json({ error: 'Failed to mark chat as read' });
  }
});

app.delete('/api/chat/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    
    await prisma.$transaction(async (tx) => {
      // First delete all messages in the chat
      await tx.message.deleteMany({
        where: { chatId }
      });

      // Then delete the chat itself
      await tx.chat.delete({
        where: { id: chatId }
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// Modify routes to emit socket events on relevant changes
// For example, when a new transaction is created or wallet balance updated
app.use('/api/wallets', (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(body) {
    // Check if this is a POST or PUT request for a transaction
    if ((req.method === 'POST' || req.method === 'PUT') && 
        (req.url.includes('/transaction') || req.url.includes('/balance'))) {
      
      // Emit updates after successful operation
      emitRealTimeData();
      
      // If this is a new transaction, emit that specific transaction
      if (req.method === 'POST' && req.url.includes('/transaction') && body) {
        try {
          const parsedBody = JSON.parse(body);
          io.emit('newTransaction', parsedBody);
        } catch (e) {
          console.error('Error parsing transaction response:', e);
        }
      }
    }
    
    return originalSend.call(this, body);
  };
  
  next();
});

// Apply similar middleware to PnL route to emit updates when new PnL data is added
app.use('/api/pnl', (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(body) {
    // If this is a POST or PUT request, emit updates
    if (req.method === 'POST' || req.method === 'PUT') {
      emitRealTimeData();
    }
    
    return originalSend.call(this, body);
  };
  
  next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/pnl', pnlRoutes);
app.use('/api/staff', staffRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server (use 'server' instead of 'app')
server.listen(port, () => {
  console.log(`Server running with Socket.io at http://localhost:${port}`);
}); 