import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import http from "http";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import os from "os";

// Import routes
import userRoutes from "./routes/userRoutes";
import accountRoutes from "./routes/accountRoutes";
import planRoutes from "./routes/planRoutes";
import walletRoutes from "./routes/walletRoutes";
import referralRoutes from "./routes/referralRoutes";
import pnlRoutes from "./routes/pnlRoutes";
import staffRoutes from "./routes/staffRoutes";
import { initChatRoutes } from "./routes/chatRoutes";

// Import error handler
import { errorHandler } from "./middleware/errorHandler";

// Server stats
const serverStats = {
  startTime: new Date(),
  connections: 0,
  totalConnections: 0,
  messagesSent: 0,
  errors: 0,
  cpuUsage: 0,
  memoryUsage: 0,
  lastUpdateTime: new Date(),
};

// Create Express app
const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;

// Ensure we don't use port 5000 which seems to be in use
if (parseInt(port.toString()) === 5000) {
  console.log("⚠️ Port 5000 is already in use, defaulting to port 3001");
  process.env.PORT = "3001";
}

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with enhanced configuration
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://localhost:5173", // Vite dev server default port
      "*", // Allow all origins temporarily for troubleshooting
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  allowEIO3: true, // Allow Engine.IO v3 client
  transports: ["polling", "websocket"],
  pingTimeout: 30000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e8,
  connectTimeout: 45000,
});

// Health check and server status endpoint
app.get("/api/health", (req, res) => {
  try {
    // Update server stats
    serverStats.cpuUsage = process.cpuUsage().system / 1000;
    serverStats.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
    serverStats.lastUpdateTime = new Date();

    // Return comprehensive health info
    res.json({
      status: "OK",
      uptime: Math.floor((Date.now() - serverStats.startTime.getTime()) / 1000),
      timestamp: new Date().toISOString(),
      connections: serverStats.connections,
      totalConnections: serverStats.totalConnections,
      messagesSent: serverStats.messagesSent,
      errors: serverStats.errors,
      system: {
        cpuUsage: serverStats.cpuUsage.toFixed(2) + " ms",
        memoryUsage: serverStats.memoryUsage.toFixed(2) + " MB",
        platform: process.platform,
        nodeVersion: process.version,
        hostname: os.hostname(),
      },
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({ status: "ERROR", error: "Health check failed" });
  }
});

// Debug endpoint to force emit test data
app.get("/api/debug/emit-test-data", (req, res) => {
  try {
    const testData = {
      total: Math.random() * 1000,
      timestamp: new Date().toISOString(),
    };

    io.emit("divineAlgoShareUpdate", testData);
    serverStats.messagesSent++;

    res.json({
      status: "OK",
      message: "Test data emitted successfully",
      data: testData,
    });
  } catch (error) {
    console.error("Debug emit error:", error);
    res
      .status(500)
      .json({ status: "ERROR", error: "Failed to emit test data" });
  }
});

// Initialize admin user if not exists
async function initializeAdminUser() {
  try {
    let admin = await prisma.user.findFirst({
      where: {
        role: "ADMIN",
      },
    });

    if (!admin) {
      admin = await prisma.user.create({
        data: {
          uniqueId: "admin",
          username: "Admin",
          email: "admin@divinalgo.com",
          role: "ADMIN",
          status: "ACTIVE",
        },
      });
      console.log("Admin user created successfully");
    }

    return admin;
  } catch (error) {
    console.error("Error initializing admin user:", error);
    serverStats.errors++;
    throw error;
  }
}

// Enhanced function to calculate and emit real-time data updates with error handling
async function emitRealTimeData() {
  try {
    // Calculate total divine algo share
    const pnlData = await prisma.pnL.findMany({
      where: {
        totalPnL: {
          gt: 0,
        },
      },
      select: {
        divineAlgoShare: true,
      },
    });

    const totalDivineAlgoShare = pnlData.reduce((total, entry) => {
      return total + (entry.divineAlgoShare || 0);
    }, 0);

    // Calculate total wallet balance
    const wallets = await prisma.wallet.findMany({
      where: {
        archivedAt: null,
      },
      select: {
        balance: true,
      },
    });

    const totalWalletBalance = wallets.reduce((total, wallet) => {
      return total + wallet.balance;
    }, 0);

    // Emit the calculated values
    const activeConnections = io.engine.clientsCount;

    io.emit("divineAlgoShareUpdate", { total: totalDivineAlgoShare });
    io.emit("walletBalanceUpdate", { total: totalWalletBalance });
    serverStats.messagesSent += 2;
  } catch (error) {
    console.error(
      "❌ BACKEND SOCKET: Error calculating real-time data:",
      error
    );
    serverStats.errors++;

    // Try to emit an error notification
    try {
      io.emit("serverError", {
        message: "Error calculating real-time data",
        timestamp: new Date().toISOString(),
      });
      serverStats.messagesSent++;
    } catch (emitError) {
      console.error(
        "❌ BACKEND SOCKET: Failed to emit error notification:",
        emitError
      );
    }
  }
}

// Initialize admin user when server starts
let adminUser: { id: string } | null = null;
initializeAdminUser()
  .then((admin) => {
    adminUser = admin;
  })
  .catch(console.error);

// Customer-specific socket handlers
io.on("connection", (socket: any) => {
  serverStats.connections++;
  serverStats.totalConnections++;

  // Log detailed connection info
  const clientInfo = {
    id: socket.id,
    transport: socket.conn.transport.name,
    address: socket.handshake.address,
    userAgent: socket.handshake.headers["user-agent"],
    query: socket.handshake.query,
    time: new Date().toISOString(),
  };
  // Send initial real-time data
  emitRealTimeData();

  // Add user authentication for socket connections
  let authenticatedUserId: string | null = null;
  
  // Handle customer authentication
  socket.on("authenticate", async (data: { userId: string }, callback: Function) => {
    try {
      // Verify the user exists
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
      });
      
      if (user) {
        authenticatedUserId = user.id;
        socket.join(`user:${user.id}`); // Join user-specific room for targeted updates
        console.log(`✅ BACKEND SOCKET: User ${user.id} authenticated`);
        
        // Send initial data for this specific user
        await emitCustomerDashboardData(user.id, socket);
        
        if (callback && typeof callback === "function") {
          callback({ success: true });
        }
      } else {
        console.log(`❌ BACKEND SOCKET: Failed authentication for user ID ${data.userId}`);
        if (callback && typeof callback === "function") {
          callback({ success: false, error: "Authentication failed" });
        }
      }
    } catch (error) {
      console.error(`❌ BACKEND SOCKET: Authentication error:`, error);
      if (callback && typeof callback === "function") {
        callback({ success: false, error: "Server error during authentication" });
      }
    }
  });
  
  // Handle customer dashboard data request
  socket.on("getCustomerDashboardData", async (data: { userId: string }, callback: Function) => {
    try {
      if (authenticatedUserId !== data.userId) {
        // Only allow requesting data for authenticated user
        if (callback && typeof callback === "function") {
          callback({ success: false, error: "Unauthorized" });
        }
        return;
      }
      
      await emitCustomerDashboardData(data.userId, socket);
      
      if (callback && typeof callback === "function") {
        callback({ success: true });
      }
    } catch (error) {
      console.error(`❌ BACKEND SOCKET: Error fetching customer dashboard data:`, error);
      if (callback && typeof callback === "function") {
        callback({ success: false, error: "Failed to fetch dashboard data" });
      }
    }
  });

  // Handle ping from client (for measuring latency)
  socket.on("ping", (callback: Function) => {
    // If callback is provided, call it to measure round-trip time
    if (callback && typeof callback === "function") {
      callback();
    } else {
      console.log(
        `❌ BACKEND SOCKET: Client ${socket.id} sent ping without callback function`
      );
    }
  });

  // Log transport changes
  socket.conn.on("upgrade", (transport: any) => {});

  // Enhanced error handling
  socket.on("error", (error: any) => {
    serverStats.errors++;
    console.error(`❌ BACKEND SOCKET: Error for client ${socket.id}:`, error);

    // Try to notify client about the error
    try {
      socket.emit("serverMessage", {
        type: "error",
        message: "Server encountered an error processing your request",
        timestamp: new Date().toISOString(),
      });
      serverStats.messagesSent++;
    } catch (emitError) {
      console.error(
        `❌ BACKEND SOCKET: Failed to send error message to client ${socket.id}:`,
        emitError
      );
    }
  });

  // Handle client messages and debugging requests
  socket.on("clientMessage", (data: any) => {
    // Acknowledge receipt
    if (data.requireAck && typeof data.callback === "function") {
      data.callback({ received: true, timestamp: new Date().toISOString() });
      console.log(
        `✅ BACKEND SOCKET: Message acknowledgment sent to client ${socket.id}`
      );
    }
  });

  // Debug command handler
  socket.on("debug", (command: string, params: any, callback: Function) => {
    console.log(
      `🔧 BACKEND SOCKET: Debug command from ${socket.id}: ${command}`,
      params
    );

    if (command === "stats") {
      callback(serverStats);
      console.log(`✅ BACKEND SOCKET: Stats sent to client ${socket.id}`);
    } else if (command === "ping") {
      callback({ pong: true, serverTime: new Date().toISOString() });
      console.log(`✅ BACKEND SOCKET: Pong sent to client ${socket.id}`);
    } else if (command === "forceUpdate") {
      emitRealTimeData();
      callback({ updating: true });
    } else {
      callback({ error: "Unknown command" });
      console.log(
        `❌ BACKEND SOCKET: Unknown command from client ${socket.id}: ${command}`
      );
    }
  });

  socket.on("disconnect", (reason: string) => {
    serverStats.connections--;
    console.log(
      `👋 BACKEND SOCKET: Client disconnected: ${socket.id}, reason: ${reason}`
    );
    console.log(
      `🔌 BACKEND SOCKET: Remaining active connections: ${serverStats.connections}`
    );
  });
});

// Function to emit customer dashboard data
async function emitCustomerDashboardData(userId: string, socket: any) {
  try {
    // Get user details with plan
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userPlan: {
          include: {
            plan: true,
          },
        },
      },
    });
    
    if (!user) return;
    
    // Get wallet data
    const wallet = await prisma.wallet.findFirst({
      where: { 
        userId: user.uniqueId,
        archivedAt: null,
      },
    });
    
    // Get user's approved accounts
    const accounts = await prisma.account.findMany({
      where: {
        userId: userId,
        status: "APPROVED",
      },
    });
    
    // Get user's PnL data
    const userPnLs = await prisma.userPnL.findMany({
      where: {
        userId: userId,
      },
      include: {
        pnl: true,
      },
      orderBy: {
        pnl: {
          date: 'desc',
        },
      },
      take: 30, // Last 30 days
    });
    
    // Calculate totals
    const totalPnL = userPnLs.reduce((sum, entry) => sum + entry.pnl.totalPnL, 0);
    const totalCustomerShare = userPnLs.reduce((sum, entry) => sum + entry.pnl.customerShare, 0);
    const activePlan = user.userPlan?.plan;
    
    // Emit data to the specific user's room
    const dashboardData = {
      totalPnL,
      totalCustomerShare,
      walletBalance: wallet?.balance || 0,
      activeAccounts: accounts.length,
      maxAccounts: activePlan?.maxAccounts || 0,
      activePlan: activePlan ? {
        name: activePlan.name,
        profitSharingCustomer: activePlan.profitSharingCustomer,
      } : null,
      timestamp: new Date().toISOString(),
    };
    
    // Send to this specific socket or to user's room
    socket.emit("customerDashboardUpdate", dashboardData);
    console.log(`✅ BACKEND SOCKET: Emitted dashboard data to user ${userId}`);
    
    return dashboardData;
  } catch (error) {
    console.error(`❌ BACKEND SOCKET: Error generating customer dashboard data:`, error);
    throw error;
  }
}

// Enhanced periodic update with exponential backoff retry mechanism
let updateInterval = 30000; // Start with 30 seconds
let consecutiveFailures = 0;
let maxInterval = 5 * 60 * 1000; // 5 minutes max

function scheduleNextUpdate() {
  setTimeout(() => {
    emitRealTimeData()
      .then(() => {
        // Reset on success
        consecutiveFailures = 0;
        updateInterval = 30000;
        scheduleNextUpdate();
      })
      .catch((error) => {
        console.error("Failed to emit updates:", error);
        serverStats.errors++;

        // Exponential backoff
        consecutiveFailures++;
        if (consecutiveFailures > 5) {
          updateInterval = Math.min(updateInterval * 2, maxInterval);
          console.log(
            `Backing off update interval to ${updateInterval}ms due to errors`
          );
        }

        scheduleNextUpdate();
      });
  }, updateInterval);
}

// Start the update cycle
scheduleNextUpdate();

// Middleware
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "*",
    ],
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/pnl", pnlRoutes);
app.use("/api/staff", staffRoutes);
// Initialize chat routes with required dependencies
app.use("/api/chat", initChatRoutes(prisma, io, adminUser, serverStats));

// Modify routes to emit socket events on relevant changes
// For example, when a new transaction is created or wallet balance updated
app.use("/api/wallets", (req, res, next) => {
  const originalSend = res.send;

  res.send = function (body) {
    // Check if this is a POST or PUT request for a transaction or balance update
    if (
      (req.method === "POST" || req.method === "PUT") &&
      (req.url.includes("/transaction") || req.url.includes("/balance"))
    ) {
      try {
        // Try to extract user ID from the request or body
        let userId = null;
        if (req.body && req.body.userId) {
          userId = req.body.userId;
        }
        
        // Emit global updates for admin dashboards
        emitRealTimeData();
        
        // If we know which user was affected, send targeted update
        if (userId) {
          // Get socket connected to this user's room
          const userRoom = `user:${userId}`;
          const socketsInRoom = io.sockets.adapter.rooms.get(userRoom);
          
          if (socketsInRoom && socketsInRoom.size > 0) {
            // Use the first user socket to emit data (or emit to room)
            const socketId = Array.from(socketsInRoom)[0];
            const socket = io.sockets.sockets.get(socketId);
            
            if (socket) {
              emitCustomerDashboardData(userId, socket).catch(console.error);
            } else {
              // Fallback to emitting to the whole room
              emitCustomerDashboardData(userId, { 
                emit: (event: any, data: any) => io.to(userRoom).emit(event, data) 
              }).catch(console.error);
            }
          }
        }
      } catch (e) {
        console.error("Error handling wallet update for socket:", e);
      }
    }

    return originalSend.call(this, body);
  };

  next();
});

// Apply similar middleware to PnL route to emit updates when new PnL data is added
app.use("/api/pnl", (req, res, next) => {
  const originalSend = res.send;

  res.send = function (body) {
    // If this is a POST or PUT request, emit updates
    if (req.method === "POST" || req.method === "PUT") {
      emitRealTimeData();
      
      // If PnL update belongs to specific user(s), send targeted updates
      try {
        let affectedUserIds: string[] = [];
        
        // Try to extract users from the PnL entry
        if (req.body) {
          if (req.body.userPnls && Array.isArray(req.body.userPnls)) {
            affectedUserIds = req.body.userPnls.map((up: any) => up.userId);
          } else if (req.body.userId) {
            affectedUserIds.push(req.body.userId);
          }
        }
        
        // Send targeted updates to each affected user
        affectedUserIds.forEach(userId => {
          const userRoom = `user:${userId}`;
          io.to(userRoom).emit("pnlDataUpdated", { timestamp: new Date().toISOString() });
        });
      } catch (e) {
        console.error("Error handling PnL update for socket:", e);
      }
    }

    return originalSend.call(this, body);
  };

  next();
});

// Special admin panel for server monitoring
app.get("/admin/server-status", (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Divine Algo Admin - Server Monitor</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f7f9fc; }
      .container { max-width: 1200px; margin: 0 auto; }
      h1 { color: #2d3748; }
      .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .stat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
      .stat-box { background: #f1f5f9; padding: 16px; border-radius: 8px; }
      .stat-label { font-size: 14px; color: #64748b; margin-bottom: 8px; }
      .stat-value { font-size: 24px; font-weight: bold; color: #0f172a; }
      .actions { display: flex; gap: 10px; margin-top: 20px; }
      button { padding: 10px 15px; border: none; border-radius: 4px; background: #3b82f6; color: white; cursor: pointer; }
      button:hover { background: #2563eb; }
      .log-container { background: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 8px; max-height: 300px; overflow-y: auto; font-family: monospace; }
      .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
      .status-online { background-color: #22c55e; }
      .status-offline { background-color: #ef4444; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Divine Algo Server Monitor</h1>
      
      <div class="card">
        <h2>Server Status</h2>
        <div>
          <span class="status-indicator status-online"></span>
          <span>Online since ${serverStats.startTime.toLocaleString()}</span>
        </div>
        
        <div class="stat-grid">
          <div class="stat-box">
            <div class="stat-label">Active Connections</div>
            <div class="stat-value">${serverStats.connections}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Total Connections</div>
            <div class="stat-value">${serverStats.totalConnections}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Messages Sent</div>
            <div class="stat-value">${serverStats.messagesSent}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Errors</div>
            <div class="stat-value">${serverStats.errors}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">CPU Usage</div>
            <div class="stat-value">${serverStats.cpuUsage.toFixed(2)} ms</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Memory Usage</div>
            <div class="stat-value">${serverStats.memoryUsage.toFixed(
              2
            )} MB</div>
          </div>
        </div>
        
        <div class="actions">
          <button onclick="forceUpdate()">Force Data Update</button>
          <button onclick="emitTestData()">Emit Test Data</button>
          <button onclick="refreshStats()">Refresh Stats</button>
        </div>
      </div>
      
      <div class="card">
        <h2>System Information</h2>
        <p>Node Version: ${process.version}</p>
        <p>Platform: ${process.platform}</p>
        <p>Hostname: ${os.hostname()}</p>
      </div>
      
      <div class="card">
        <h2>Server Logs</h2>
        <div class="log-container" id="logs">
          <div>Server started at ${serverStats.startTime.toLocaleString()}</div>
          <div>Listening on port ${port}</div>
        </div>
      </div>
    </div>
    
    <script>
      function forceUpdate() {
        fetch('/api/debug/emit-test-data')
          .then(response => response.json())
          .then(data => {
            alert('Data update triggered: ' + JSON.stringify(data));
            refreshStats();
          })
          .catch(err => alert('Error: ' + err));
      }
      
      function emitTestData() {
        fetch('/api/debug/emit-test-data')
          .then(response => response.json())
          .then(data => {
            alert('Test data emitted: ' + JSON.stringify(data));
            refreshStats();
          })
          .catch(err => alert('Error: ' + err));
      }
      
      function refreshStats() {
        fetch('/api/health')
          .then(response => response.json())
          .then(data => {
            console.log('Updated stats:', data);
            // Update the UI with the new stats
            location.reload();
          })
          .catch(err => alert('Error refreshing stats: ' + err));
      }
      
      // Auto-refresh every 30 seconds
      setInterval(refreshStats, 30000);
    </script>
  </body>
  </html>
  `;

  res.send(html);
});

// Error handling middleware
app.use(errorHandler);

// Process error handling for uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ CRITICAL: Uncaught Exception:", error);
  serverStats.errors++;

  // Log to file for forensics
  fs.appendFileSync(
    path.join(__dirname, "../error.log"),
    `${new Date().toISOString()} - Uncaught Exception: ${error.stack}\n`
  );

  // Try to notify connected clients
  try {
    io.emit("serverMessage", {
      type: "critical",
      message: "The server encountered a critical error",
      timestamp: new Date().toISOString(),
    });
  } catch (emitError) {
    console.error("Failed to notify clients about critical error:", emitError);
  }

  // Don't crash the process in production, but log that we should restart
  if (process.env.NODE_ENV !== "production") {
    console.log("Server would normally restart in production environment");
  }
});

// Start server (use 'server' instead of 'app')
server.listen(port, () => {
  const serverUrl = `http://localhost:${port}`;

  console.log(`
  🚀 Enhanced Divine Algo Server running!
  
  ===== SERVER DETAILS =====
  ⏰ Server started at: ${new Date().toLocaleString()}
  🌐 Environment: ${process.env.NODE_ENV || "development"}
  📍 Hostname: ${os.hostname()}
  💻 Platform: ${process.platform} (${os.type()} ${os.release()})
  🧠 Node.js: ${process.version}
  💾 Memory: ${(os.totalmem() / (1024 * 1024 * 1024)).toFixed(2)} GB total
  
  ===== ENDPOINTS =====
  ✅ Socket.io server: ${serverUrl}
  ✅ Health check: ${serverUrl}/api/health
  ✅ Admin panel: ${serverUrl}/admin/server-status
  ✅ Debug emit: ${serverUrl}/api/debug/emit-test-data
  
  ===== SOCKET.IO CONFIGURATION =====
  🔌 Transports: polling, websocket
  ⏱️ Ping interval: 25000ms
  ⏱️ Ping timeout: 30000ms
  ⏱️ Upgrade timeout: 10000ms
  ⏱️ Connection timeout: 45000ms
  
  ===== CORS CONFIGURATION =====
  🌍 Origins: ${
    Array.isArray(io.engine.opts.cors)
      ? JSON.stringify(io.engine.opts.cors)
      : typeof io.engine.opts.cors === "object" && io.engine.opts.cors
      ? JSON.stringify(io.engine.opts.cors.origin || "all")
      : "all"
  }
  📝 Methods: ${
    Array.isArray(io.engine.opts.cors)
      ? "GET, POST"
      : typeof io.engine.opts.cors === "object" && io.engine.opts.cors
      ? JSON.stringify(io.engine.opts.cors.methods || ["GET", "POST"])
      : "GET, POST"
  }
  
  💡 To test the socket connection: Visit ${serverUrl}/admin/server-status
  `);

  // First scheduled update to ensure data is available
  setTimeout(() => {
    console.log("📊 BACKEND SOCKET: Running initial scheduled data update...");
    emitRealTimeData();
  }, 2000);
});
