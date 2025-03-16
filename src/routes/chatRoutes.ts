import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';

// Initialize router
const router = Router();

// These will be injected from index.ts
let prisma: PrismaClient;
let io: Server;
let adminUser: { id: string } | null = null;
let serverStats: any;

// Initialize the router with necessary dependencies
export const initChatRoutes = (
  prismaInstance: PrismaClient, 
  ioInstance: Server, 
  adminUserInstance: { id: string } | null,
  serverStatsInstance: any
) => {
  prisma = prismaInstance;
  io = ioInstance;
  adminUser = adminUserInstance;
  serverStats = serverStatsInstance;
  return router;
};

// Get customer chat
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    if (customerId === "all") {
      // Admin access - get all chats
      const chats = await prisma.chat.findMany({
        include: {
          messages: {
            orderBy: {
              createdAt: "desc",
            },
            take: 50,
          },
          customer: true,
        },
        orderBy: {
          updatedAt: "desc",
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
            createdAt: "desc",
          },
          take: 50,
        },
        customer: true,
      },
    });
    res.json(chat);
  } catch (error) {
    console.error("Error fetching customer chat:", error);
    serverStats.errors++;
    res.status(500).json({ error: "Failed to fetch chat" });
  }
});

// Create a new chat
router.post('/', async (req, res) => {
  try {
    const { customerId } = req.body;

    // First verify the customer exists
    const customerExists = await prisma.user.findUnique({
      where: { id: customerId },
    });

    if (!customerExists) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Then create the chat
    const chat = await prisma.chat.create({
      data: {
        customerId: customerId,
        lastMessage: null,
        unreadCount: 0,
      },
    });

    res.json(chat);
  } catch (error) {
    console.error("Error creating chat:", error);
    serverStats.errors++;
    res.status(500).json({ error: "Failed to create chat" });
  }
});

// Send a message
router.post('/message', async (req, res) => {
  try {
    const { chatId, senderId, content } = req.body;

    if (!chatId || !senderId || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // If senderId is 'admin', use the actual admin user ID
    const actualSenderId = senderId === "admin" ? adminUser?.id : senderId;
    if (!actualSenderId) {
      return res.status(400).json({ error: "Invalid sender ID" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create the message
      const message = await tx.message.create({
        data: {
          chatId,
          senderId: actualSenderId,
          content,
          read: false,
        },
        include: {
          sender: true,
        },
      });

      // Update the chat
      const updatedChat = await tx.chat.update({
        where: { id: chatId },
        data: {
          lastMessage: content,
          unreadCount: {
            increment: 1,
          },
        },
        include: {
          messages: {
            orderBy: {
              createdAt: "desc",
            },
            take: 50,
            include: {
              sender: true,
            },
          },
        },
      });

      return updatedChat;
    });

    // Notify connected clients about new message
    io.emit("newChatMessage", {
      chatId,
      message: {
        content,
        sender: senderId === "admin" ? "Admin" : senderId,
        timestamp: new Date().toISOString(),
      },
    });
    serverStats.messagesSent++;

    res.json(result);
  } catch (error) {
    console.error("Error sending message:", error);
    serverStats.errors++;
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Mark chat as read
router.post('/:chatId/read', async (req, res) => {
  try {
    const { chatId } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      // First, update all messages in this chat to read
      await tx.message.updateMany({
        where: {
          chatId: chatId,
        },
        data: {
          read: true,
        },
      });

      // Then, reset the unread count on the chat
      const updatedChat = await tx.chat.update({
        where: { id: chatId },
        data: {
          unreadCount: 0,
        },
        include: {
          messages: {
            orderBy: {
              createdAt: "desc",
            },
            take: 50,
          },
        },
      });

      return updatedChat;
    });

    res.json(result);
  } catch (error) {
    console.error("Error marking chat as read:", error);
    serverStats.errors++;
    res.status(500).json({ error: "Failed to mark chat as read" });
  }
});

// Delete a chat
router.delete('/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;

    await prisma.$transaction(async (tx) => {
      // First delete all messages in the chat
      await tx.message.deleteMany({
        where: { chatId },
      });

      // Then delete the chat itself
      await tx.chat.delete({
        where: { id: chatId },
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    serverStats.errors++;
    res.status(500).json({ error: "Failed to delete chat" });
  }
});

export default router; 