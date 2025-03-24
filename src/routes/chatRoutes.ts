import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { Server } from "socket.io";
import { emailService } from "../services/emailService";

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
router.get("/customer/:customerId", async (req, res) => {
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
router.post("/", async (req, res) => {
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
router.post("/message", async (req, res) => {
  try {
    const { chatId, senderId, content } = req.body;

    if (!chatId || !senderId || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { username: true, email: true, role: true },
    });
    const isAdminSender = sender?.role === "ADMIN" ? true : false;

    const result = await prisma.$transaction(async (tx) => {
      // Get the chat to determine the recipient
      const chat = await tx.chat.findUnique({
        where: { id: chatId },
        include: {
          customer: true,
        },
      });

      if (!chat) {
        throw new Error("Chat not found");
      }

      // Create the message
      const message = await tx.message.create({
        data: {
          chatId,
          senderId,
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

      return { chat, message, updatedChat };
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

    // Get receiver information for email notification
    try {
      // Determine recipient (if admin is sender, recipient is customer, otherwise recipient is admin)

      // Get sender name for the email notification
      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { username: true },
      });

      const senderName = sender?.username || "User";

      if (isAdminSender) {
        // Admin sending to customer - notify customer
        const customer = await prisma.user.findUnique({
          where: { id: result.chat.customerId },
          select: { email: true, username: true, id: true },
        });

        if (customer?.email) {
          // Generate a URL for the customer to view the chat
          const chatUrl = `${
            process.env.FRONTEND_URL || "http://localhost:5173"
          }admin/chat`;

          // Send email notification
          const emailSent = await emailService.sendMessageNotification(
            result.chat.customer.email,
            "Admin", // Admin name can be customized
            content,
            chatUrl
          );
        }
      } else {
        // Customer sending to admin - notify all staff with chat write permissions and admin users
        const [allStaff, adminUsers] = await Promise.all([
          // Get all active staff with relevant roles
          prisma.staff.findMany({
            where: {
              status: "ACTIVE",
              role: {
                in: ["ADMIN", "MANAGER", "SUPPORT", "COO", "CTO", "CMO", "CAO"],
              },
            },
            select: { email: true, name: true, role: true, permissions: true },
          }),
          // Get all admin users
          prisma.user.findMany({
            where: {
              role: "ADMIN",
              status: "ACTIVE",
            },
            select: { email: true, username: true, role: true },
          }),
        ]);

        // Filter staff members who have chat write permissions
        const staffWithChatPermissions = allStaff.filter((staff) => {
          try {
            const permissions = JSON.parse(staff.permissions as string);
            return (
              permissions.chat?.edit === true || permissions.chat?.view === true
            );
          } catch (e) {
            console.error("Error parsing permissions for staff:", e);
            return false;
          }
        });

        // Send email to each staff member with chat permissions
        // for (const staff of staffWithChatPermissions) {
        //   if (staff.email) {
        //     // Generate a URL for the staff to view the chat
        //     const chatUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}dashboard/chat`;

        //     // Send email notification
        //     await emailService.sendMessageNotification(
        //       staff.email,
        //       senderName,
        //       content,
        //       chatUrl
        //     );
        //   }
        // }

        // // Send email to all admin users
        // for (const admin of adminUsers) {
        //   if (admin.email) {
        //     // Generate a URL for the admin to view the chat
        //     const chatUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}dashboard/chat`;

        //     // Send email notification
        //     await emailService.sendMessageNotification(
        //       admin.email,
        //       senderName,
        //       content,
        //       chatUrl
        //     );
        //   }
        // }
        const chatUrl = `${
          process.env.FRONTEND_URL || "http://localhost:5173"
        }dashboard/chat`;

        await emailService.sendMessageNotification(
          process.env.EMAIL_USER || "",
          senderName,
          content,
          chatUrl
        );
      }
    } catch (emailError) {
      console.error("Error sending email notification:", emailError);
      // Don't fail the request if email sending fails
    }

    res.json(result.updatedChat);
  } catch (error) {
    console.error("Error sending message:", error);
    serverStats.errors++;
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Mark chat as read
router.post("/:chatId/read", async (req, res) => {
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
router.delete("/:chatId", async (req, res) => {
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
