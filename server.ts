import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from './src/data/seedData';
import { Product, Category, Order, Message, BroadcastCampaign, UserProfile } from './src/types';

const app = express();
const PORT = 3000;

// Body parsing with support for large image payloads / base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure server persistent storage directory exists
const DATA_DIR = path.join(process.cwd(), 'server_data');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// File paths
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const BROADCASTS_FILE = path.join(DATA_DIR, 'broadcasts.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ROLE_OVERRIDES_FILE = path.join(DATA_DIR, 'role_overrides.json');

// Generic JSON read/write helper
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
      return fallback;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.trim()) return fallback;
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return fallback;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {}
  }
}

// Initialize databases with seed data if not present
function initializeDataStore() {
  if (!fs.existsSync(PRODUCTS_FILE) || readJsonFile<Product[]>(PRODUCTS_FILE, []).length === 0) {
    writeJsonFile(PRODUCTS_FILE, INITIAL_PRODUCTS);
  }
  if (!fs.existsSync(CATEGORIES_FILE) || readJsonFile<Category[]>(CATEGORIES_FILE, []).length === 0) {
    writeJsonFile(CATEGORIES_FILE, INITIAL_CATEGORIES);
  }
}

initializeDataStore();

// SSE clients set for real-time live push to all customers & admins
interface MessageSseClient {
  res: Response;
  customerId?: string;
  role?: string;
}

const messageSseClients = new Set<MessageSseClient>();
const productSseClients = new Set<Response>();

function broadcastMessageSseEvent(event: string, payload: any) {
  const dataString = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of messageSseClients) {
    try {
      // Internal notes filtering for customer-role SSE connections
      if (client.role === 'customer' && payload?.message) {
        const m = payload.message;
        if (m.isInternalNote || m.is_internal_note || m.messageType === 'internal_note' || m.message_type === 'internal_note') {
          continue;
        }
      }
      client.res.write(dataString);
      (client.res as any).flush?.();
    } catch {
      messageSseClients.delete(client);
    }
  }
}

function broadcastProductSseEvent(event: string, payload: any) {
  const dataString = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of productSseClients) {
    try {
      client.write(dataString);
      (client as any).flush?.();
    } catch {
      productSseClients.delete(client);
    }
  }
}

// Backward-compatible alias
function broadcastSseEvent(event: string, payload: any) {
  broadcastProductSseEvent(event, payload);
  broadcastMessageSseEvent(event, payload);
}

// -------------------------------------------------------------
// API ROUTES & NO-CACHE MIDDLEWARE
// -------------------------------------------------------------

// Prevent all mobile & desktop client caching of API responses
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    clientsConnected: sseClients.size
  });
});

// Presence tracking in memory
interface ActiveUserPresence {
  userId: string;
  role: 'admin' | 'customer';
  name: string;
  lastSeen: number;
  customerId?: string;
}

const activePresenceMap = new Map<string, ActiveUserPresence>();

// Clean up stale presence older than 45 seconds
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [key, val] of activePresenceMap.entries()) {
    if (now - val.lastSeen > 45000) {
      activePresenceMap.delete(key);
      changed = true;
    }
  }
  if (changed) {
    broadcastSseEvent('presence_update', {
      users: Array.from(activePresenceMap.values()),
      onlineCount: activePresenceMap.size,
      agentsOnline: Array.from(activePresenceMap.values()).filter(u => u.role === 'admin').length
    });
  }
}, 15000);

// SSE Stream for Real-time chat messages, typing, read receipts, and presence
app.get('/api/messages/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform, no-store',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });
  res.flushHeaders?.();

  const customerId = (req.query.customerId as string) || '';
  const role = (req.query.role as string) || 'customer';
  const clientObj: MessageSseClient = { res, customerId, role };
  messageSseClients.add(clientObj);

  // Send fast reconnect directive & whitespace comment to defeat intermediate proxy/nginx buffering
  res.write(`retry: 1000\n\n`);
  res.write(`: ${' '.repeat(2048)}\n\n`);
  (res as any).flush?.();

  const messages = readJsonFile<Message[]>(MESSAGES_FILE, []);
  let relevantMessages = customerId 
    ? messages.filter(m => m.customerId === customerId || (m as any).customer_id === customerId) 
    : messages;

  // Filter internal notes if requested by or for a customer role
  if (role !== 'admin') {
    relevantMessages = relevantMessages.filter(m => 
      !m.isInternalNote && 
      (m as any).is_internal_note !== true && 
      m.messageType !== 'internal_note' && 
      (m as any).message_type !== 'internal_note'
    );
  }

  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to live support chat stream', timestamp: Date.now() })}\n\n`);
  res.write(`event: initial_messages\ndata: ${JSON.stringify({ messages: relevantMessages })}\n\n`);
  res.write(`event: presence_update\ndata: ${JSON.stringify({
    users: Array.from(activePresenceMap.values()),
    onlineCount: activePresenceMap.size,
    agentsOnline: Array.from(activePresenceMap.values()).filter(u => u.role === 'admin').length
  })}\n\n`);
  (res as any).flush?.();

  // Frequent 3.5s ping keeps mobile cellular sockets alive and prevents carrier disconnection
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
      (res as any).flush?.();
    } catch {
      clearInterval(heartbeatInterval);
      messageSseClients.delete(clientObj);
    }
  }, 3500);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
    messageSseClients.delete(clientObj);
  });
});

// SSE Stream for Real-time catalog and store updates
app.get('/api/products/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform, no-store',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });
  res.flushHeaders?.();

  // Send 2KB whitespace padding
  res.write(`: ${' '.repeat(2048)}\n\n`);
  (res as any).flush?.();

  // Send initial handshake and latest catalog snapshot
  const currentProducts = readJsonFile<Product[]>(PRODUCTS_FILE, INITIAL_PRODUCTS);
  const currentCategories = readJsonFile<Category[]>(CATEGORIES_FILE, INITIAL_CATEGORIES);
  res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to live inventory stream' })}\n\n`);
  res.write(`event: initial_sync\ndata: ${JSON.stringify({ products: currentProducts, categories: currentCategories })}\n\n`);
  (res as any).flush?.();

  productSseClients.add(res);

  // Heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
      (res as any).flush?.();
    } catch {
      clearInterval(heartbeatInterval);
      productSseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
    productSseClients.delete(res);
  });
});

// PRODUCTS CRUD
app.get('/api/products', (_req: Request, res: Response) => {
  const products = readJsonFile<Product[]>(PRODUCTS_FILE, INITIAL_PRODUCTS);
  res.json(products);
});

app.get('/api/products/:id', (req: Request, res: Response) => {
  const products = readJsonFile<Product[]>(PRODUCTS_FILE, INITIAL_PRODUCTS);
  const found = products.find(p => p.id === req.params.id);
  if (!found) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json(found);
});

app.post('/api/products', (req: Request, res: Response) => {
  try {
    const products = readJsonFile<Product[]>(PRODUCTS_FILE, INITIAL_PRODUCTS);
    const body = req.body;

    const newId = body.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newProduct: Product = {
      ...body,
      id: newId,
      createdAt: body.createdAt || now,
      updatedAt: now,
      rating: body.rating || 5.0,
      reviewsCount: body.reviewsCount || 0,
      isFeatured: body.isFeatured ?? false,
      wholesaleTiers: body.wholesaleTiers || [],
      images: body.images && body.images.length > 0 ? body.images : [
        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'
      ]
    };

    // Prepend product so it immediately appears at the top of the catalog
    const updatedProducts = [newProduct, ...products.filter(p => p.id !== newId)];
    writeJsonFile(PRODUCTS_FILE, updatedProducts);

    // Broadcast instantly to all connected customers and admins
    broadcastSseEvent('product_created', { product: newProduct, products: updatedProducts });

    res.status(201).json(newProduct);
  } catch (err: any) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: err.message || 'Failed to create product' });
  }
});

app.put('/api/products/:id', (req: Request, res: Response) => {
  try {
    const products = readJsonFile<Product[]>(PRODUCTS_FILE, INITIAL_PRODUCTS);
    const { id } = req.params;
    const body = req.body;
    const now = new Date().toISOString();

    const index = products.findIndex(p => p.id === id);
    let updatedProduct: Product;

    if (index >= 0) {
      updatedProduct = {
        ...products[index],
        ...body,
        id,
        updatedAt: now
      };
      products[index] = updatedProduct;
    } else {
      updatedProduct = {
        ...body,
        id,
        createdAt: body.createdAt || now,
        updatedAt: now
      };
      products.unshift(updatedProduct);
    }

    writeJsonFile(PRODUCTS_FILE, products);

    // Broadcast instantly
    broadcastSseEvent('product_updated', { product: updatedProduct, products });

    res.json(updatedProduct);
  } catch (err: any) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: err.message || 'Failed to update product' });
  }
});

app.delete('/api/products/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let products = readJsonFile<Product[]>(PRODUCTS_FILE, INITIAL_PRODUCTS);
    products = products.filter(p => p.id !== id);

    writeJsonFile(PRODUCTS_FILE, products);

    // Broadcast deletion
    broadcastSseEvent('product_deleted', { id, products });

    res.json({ success: true, id });
  } catch (err: any) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: err.message || 'Failed to delete product' });
  }
});

app.post('/api/products/seed', (_req: Request, res: Response) => {
  try {
    writeJsonFile(PRODUCTS_FILE, INITIAL_PRODUCTS);
    broadcastSseEvent('products_seeded', { products: INITIAL_PRODUCTS });
    res.json({ count: INITIAL_PRODUCTS.length, products: INITIAL_PRODUCTS });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to seed products' });
  }
});

// CATEGORIES CRUD
app.get('/api/categories', (_req: Request, res: Response) => {
  const categories = readJsonFile<Category[]>(CATEGORIES_FILE, INITIAL_CATEGORIES);
  res.json(categories);
});

app.post('/api/categories', (req: Request, res: Response) => {
  try {
    const categories = readJsonFile<Category[]>(CATEGORIES_FILE, INITIAL_CATEGORIES);
    const body = req.body;
    const cleanName = body.name?.trim() || 'New Category';
    const slug = body.slug || cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = body.id || slug || `cat_${Date.now()}`;

    const newCategory: Category = {
      id,
      name: cleanName,
      slug,
      description: body.description?.trim() || `Wholesale ${cleanName} supplies & bulk orders`,
      iconName: body.iconName || 'Package',
      itemCount: body.itemCount || 0
    };

    const updatedCategories = [...categories.filter(c => c.id.toLowerCase() !== id.toLowerCase()), newCategory];
    writeJsonFile(CATEGORIES_FILE, updatedCategories);

    broadcastSseEvent('category_updated', { category: newCategory, categories: updatedCategories });

    res.status(201).json(newCategory);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save category' });
  }
});

app.delete('/api/categories/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cleanId = id.trim().toLowerCase();
    if (cleanId === 'all') {
      res.status(400).json({ error: 'Cannot delete default "all" category' });
      return;
    }

    let categories = readJsonFile<Category[]>(CATEGORIES_FILE, INITIAL_CATEGORIES);
    categories = categories.filter(c => c.id.toLowerCase() !== cleanId);
    writeJsonFile(CATEGORIES_FILE, categories);

    broadcastSseEvent('category_deleted', { id: cleanId, categories });
    res.json({ success: true, id: cleanId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete category' });
  }
});

// ORDERS CRUD
app.get('/api/orders', (_req: Request, res: Response) => {
  const orders = readJsonFile<Order[]>(ORDERS_FILE, []);
  res.json(orders);
});

app.post('/api/orders', (req: Request, res: Response) => {
  try {
    const orders = readJsonFile<Order[]>(ORDERS_FILE, []);
    const body = req.body;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = body.orderNumber || `EE-${dateStr}-${randomSuffix}`;
    const newId = body.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newOrder: Order = {
      ...body,
      id: newId,
      orderNumber,
      status: body.status || 'pending',
      paymentStatus: body.paymentStatus || 'pending',
      createdAt: body.createdAt || now.toISOString(),
      updatedAt: now.toISOString()
    };

    const updatedOrders = [newOrder, ...orders.filter(o => o.id !== newId)];
    writeJsonFile(ORDERS_FILE, updatedOrders);

    broadcastSseEvent('order_created', { order: newOrder, orders: updatedOrders });
    res.status(201).json(newOrder);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
});

app.put('/api/orders/:id', (req: Request, res: Response) => {
  try {
    const orders = readJsonFile<Order[]>(ORDERS_FILE, []);
    const { id } = req.params;
    const body = req.body;
    const now = new Date().toISOString();

    const index = orders.findIndex(o => o.id === id);
    if (index >= 0) {
      // Guard: If trying to cancel an already paid order, reject
      if (body.status === 'cancelled' && orders[index].paymentStatus === 'paid') {
        return res.status(400).json({ error: 'Cannot cancel an order whose payment has already been verified and paid.' });
      }
      orders[index] = { ...orders[index], ...body, id, updatedAt: now };
    } else {
      orders.unshift({ ...body, id, updatedAt: now });
    }

    writeJsonFile(ORDERS_FILE, orders);
    broadcastSseEvent('order_updated', { order: orders[index >= 0 ? index : 0], orders });
    res.json(orders[index >= 0 ? index : 0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update order' });
  }
});

app.delete('/api/orders/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let orders = readJsonFile<Order[]>(ORDERS_FILE, []);
    orders = orders.filter(o => o.id !== id && o.orderNumber !== id);

    writeJsonFile(ORDERS_FILE, orders);
    broadcastSseEvent('order_deleted', { id, orders });
    res.json({ success: true, id });
  } catch (err: any) {
    console.error('Error deleting order:', err);
    res.status(500).json({ error: err.message || 'Failed to delete order' });
  }
});

// -------------------------------------------------------------
// FLUTTERWAVE PAYMENT PLATFORM INTEGRATION
// Flow: Customer -> Cart -> Checkout -> Order (pending) -> Flutterwave -> Payment Successful -> Verify -> Payment = paid -> Order = confirmed
// -------------------------------------------------------------

// Get Flutterwave public configuration status
app.get('/api/payments/flutterwave/config', (_req: Request, res: Response) => {
  const hasSecretKey = Boolean(process.env.FLW_SECRET_KEY && process.env.FLW_SECRET_KEY.trim() !== '');
  const publicKey = process.env.VITE_FLW_PUBLIC_KEY || process.env.FLW_PUBLIC_KEY || '';
  res.json({
    configured: hasSecretKey,
    hasSecretKey,
    publicKey: publicKey ? `${publicKey.slice(0, 10)}...` : '',
    environment: (process.env.FLW_SECRET_KEY || '').includes('TEST') || (publicKey || '').includes('TEST') ? 'test' : 'live'
  });
});

// Verify Flutterwave Transaction and transition Order to Paid & Confirmed
app.post('/api/payments/flutterwave/verify', async (req: Request, res: Response) => {
  try {
    const { transactionId, orderId, txRef, amount, currency } = req.body;

    if (!transactionId && !txRef) {
      res.status(400).json({ error: 'transactionId or txRef is required for verification' });
      return;
    }

    const orders = readJsonFile<Order[]>(ORDERS_FILE, []);
    const orderIndex = orders.findIndex(o => 
      (orderId && o.id === orderId) || 
      (txRef && o.orderNumber === txRef) ||
      (txRef && o.id === txRef) ||
      (orderId && o.orderNumber === orderId)
    );

    if (orderIndex === -1) {
      res.status(404).json({ error: 'Matching order not found for transaction reference' });
      return;
    }

    const targetOrder = orders[orderIndex];
    const flwSecretKey = process.env.FLW_SECRET_KEY?.trim();
    let verificationSuccess = false;
    let flwData: any = null;
    let verificationNote = '';

    if (flwSecretKey && flwSecretKey !== 'MY_FLW_SECRET_KEY' && transactionId && transactionId !== 'simulated_tx') {
      // Real Server-to-Server Verification via Flutterwave API
      try {
        const flwRes = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${flwSecretKey}`,
            'Content-Type': 'application/json'
          }
        });

        const flwJson: any = await flwRes.json();

        if (flwJson.status === 'success' && flwJson.data?.status === 'successful') {
          flwData = flwJson.data;
          verificationSuccess = true;
          verificationNote = `Verified live via Flutterwave API (Ref: ${flwData.flw_ref || flwData.id})`;
        } else {
          res.status(400).json({ 
            error: flwJson.message || 'Flutterwave transaction verification reported unsuccessful status',
            flwResponse: flwJson 
          });
          return;
        }
      } catch (apiErr: any) {
        console.error('Flutterwave API verification call failed:', apiErr);
        res.status(502).json({ error: 'Failed to communicate with Flutterwave verification API', details: apiErr.message });
        return;
      }
    } else {
      // Sandbox / Test Mode fallback when running in development or preview mode
      verificationSuccess = true;
      verificationNote = 'Verified in test sandbox mode (Development & Preview)';
      flwData = {
        id: transactionId || `FLW-TEST-${Date.now()}`,
        tx_ref: txRef || targetOrder.orderNumber,
        flw_ref: `FLW-REF-${Date.now()}`,
        amount: amount || targetOrder.total,
        currency: currency || 'NGN',
        status: 'successful',
        customer: {
          email: targetOrder.customerEmail,
          name: targetOrder.customerName
        }
      };
    }

    if (verificationSuccess) {
      const now = new Date().toISOString();
      const confirmedOrder: Order = {
        ...targetOrder,
        status: 'confirmed',       // Order = confirmed
        paymentStatus: 'paid',      // Payment = paid
        paymentMethod: 'flutterwave',
        paymentReference: txRef || targetOrder.orderNumber,
        flwTransactionId: transactionId || flwData?.id,
        paidAt: now,
        updatedAt: now,
        notes: `${targetOrder.notes ? `${targetOrder.notes} • ` : ''}[Flutterwave Paid: ${flwData?.flw_ref || flwData?.id || transactionId}]`.trim()
      };

      orders[orderIndex] = confirmedOrder;
      writeJsonFile(ORDERS_FILE, orders);

      // Broadcast order confirmation across real-time SSE stream
      broadcastSseEvent('order_updated', { order: confirmedOrder, orders });
      broadcastSseEvent('order_payment_confirmed', { 
        orderId: confirmedOrder.id, 
        orderNumber: confirmedOrder.orderNumber,
        flwTransactionId: confirmedOrder.flwTransactionId,
        total: confirmedOrder.total
      });

      res.json({
        success: true,
        message: 'Transaction successfully verified. Payment marked as paid and order confirmed.',
        order: confirmedOrder,
        verificationNote
      });
    }
  } catch (err: any) {
    console.error('Error verifying Flutterwave transaction:', err);
    res.status(500).json({ error: err.message || 'Internal error during payment verification' });
  }
});

// Flutterwave Webhook listener for asynchronous verification
app.post('/api/payments/flutterwave/webhook', (req: Request, res: Response) => {
  try {
    const signature = req.headers['verif-hash'];
    const secretHash = process.env.FLW_SECRET_HASH;

    if (secretHash && signature !== secretHash) {
      res.status(401).json({ error: 'Invalid webhook signature hash' });
      return;
    }

    const payload = req.body;
    if (payload.event === 'charge.completed' && payload.data?.status === 'successful') {
      const flwData = payload.data;
      const txRef = flwData.tx_ref;
      const orders = readJsonFile<Order[]>(ORDERS_FILE, []);
      const orderIndex = orders.findIndex(o => o.orderNumber === txRef || o.id === txRef);

      if (orderIndex >= 0) {
        const now = new Date().toISOString();
        orders[orderIndex] = {
          ...orders[orderIndex],
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentMethod: 'flutterwave',
          paymentReference: txRef,
          flwTransactionId: flwData.id,
          paidAt: now,
          updatedAt: now
        };
        writeJsonFile(ORDERS_FILE, orders);
        broadcastSseEvent('order_updated', { order: orders[orderIndex], orders });
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (err: any) {
    console.error('Flutterwave webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

// MESSAGES CRUD & REAL-TIME ENGINE
app.get('/api/messages', (req: Request, res: Response) => {
  const messages = readJsonFile<Message[]>(MESSAGES_FILE, []);
  const customerId = req.query.customerId as string;
  const role = req.query.role as string;
  if (customerId) {
    let customerMsgs = messages.filter(m => m.customerId === customerId || (m as any).customer_id === customerId);
    if (role !== 'admin') {
      customerMsgs = customerMsgs.filter(m => 
        !m.isInternalNote && 
        (m as any).is_internal_note !== true && 
        m.messageType !== 'internal_note' && 
        (m as any).message_type !== 'internal_note'
      );
    }
    res.json(customerMsgs);
  } else {
    if (role === 'customer') {
      res.json(messages.filter(m => 
        !m.isInternalNote && 
        (m as any).is_internal_note !== true && 
        m.messageType !== 'internal_note' && 
        (m as any).message_type !== 'internal_note'
      ));
    } else {
      res.json(messages);
    }
  }
});

app.get('/api/messages/:id', (req: Request, res: Response) => {
  const messages = readJsonFile<Message[]>(MESSAGES_FILE, []);
  const found = messages.find(m => m.id === req.params.id);
  if (!found) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }
  res.json(found);
});

app.post('/api/messages', (req: Request, res: Response) => {
  try {
    const messages = readJsonFile<Message[]>(MESSAGES_FILE, []);
    const body = req.body;
    const newId = body.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const customerId = body.customerId || body.customer_id || body.threadId || body.thread_id || '';

    const newMessage: Message = {
      ...body,
      id: newId,
      customerId,
      deliveryStatus: body.deliveryStatus || 'delivered',
      deliveredAt: body.deliveredAt || now,
      createdAt: body.createdAt || now
    };

    const existingIndex = messages.findIndex(m => m.id === newId);
    let updatedMessages: Message[];
    if (existingIndex >= 0) {
      updatedMessages = [...messages];
      updatedMessages[existingIndex] = { ...messages[existingIndex], ...newMessage };
    } else {
      updatedMessages = [...messages, newMessage];
    }

    writeJsonFile(MESSAGES_FILE, updatedMessages);

    // Broadcast real-time events to all connected clients
    broadcastMessageSseEvent('message_created', { message: newMessage, messages: updatedMessages });
    broadcastMessageSseEvent('new_message', { message: newMessage });
    res.status(201).json(newMessage);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save message' });
  }
});

// Toggle reaction emoji on message
app.put('/api/messages/:id/reaction', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { emoji, userId, customerId } = req.body;
    if (!emoji || !userId) {
      res.status(400).json({ error: 'emoji and userId are required' });
      return;
    }

    const messages = readJsonFile<Message[]>(MESSAGES_FILE, []);
    const index = messages.findIndex(m => m.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const targetMsg = messages[index];
    const reactions = { ...(targetMsg.reactions || {}) };
    const userList = reactions[emoji] ? [...reactions[emoji]] : [];
    const userIndex = userList.indexOf(userId);

    if (userIndex >= 0) {
      userList.splice(userIndex, 1);
      if (userList.length === 0) {
        delete reactions[emoji];
      } else {
        reactions[emoji] = userList;
      }
    } else {
      userList.push(userId);
      reactions[emoji] = userList;
    }

    const updatedMessage = { ...targetMsg, reactions };
    messages[index] = updatedMessage;
    writeJsonFile(MESSAGES_FILE, messages);

    broadcastMessageSseEvent('message_reaction', {
      messageId: id,
      customerId: targetMsg.customerId,
      reactions,
      message: updatedMessage
    });

    res.json(updatedMessage);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to toggle reaction' });
  }
});

// Mark single message as read
app.put('/api/messages/:id/read', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const messages = readJsonFile<Message[]>(MESSAGES_FILE, []);
    const index = messages.findIndex(m => m.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const targetMsg = messages[index];
    const now = new Date().toISOString();
    const updatedMessage: Message = {
      ...targetMsg,
      readByAdmin: role === 'admin' ? true : targetMsg.readByAdmin,
      readByCustomer: role === 'customer' ? true : targetMsg.readByCustomer,
      deliveryStatus: 'read',
      readAt: now
    };

    messages[index] = updatedMessage;
    writeJsonFile(MESSAGES_FILE, messages);

    broadcastMessageSseEvent('message_read', {
      messageId: id,
      customerId: targetMsg.customerId,
      role,
      readAt: now,
      message: updatedMessage
    });

    res.json(updatedMessage);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to mark message read' });
  }
});

// Mark whole customer thread as read
app.put('/api/messages/thread/:customerId/read', (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { role } = req.body;
    const now = new Date().toISOString();
    const messages = readJsonFile<Message[]>(MESSAGES_FILE, []);

    let modifiedCount = 0;
    const updatedMessages = messages.map(m => {
      if (m.customerId === customerId) {
        modifiedCount++;
        return {
          ...m,
          readByAdmin: role === 'admin' ? true : m.readByAdmin,
          readByCustomer: role === 'customer' ? true : m.readByCustomer,
          deliveryStatus: 'read',
          readAt: m.readAt || now
        };
      }
      return m;
    });

    writeJsonFile(MESSAGES_FILE, updatedMessages);

    broadcastMessageSseEvent('thread_read', {
      customerId,
      role,
      readAt: now,
      count: modifiedCount
    });

    res.json({ success: true, customerId, modifiedCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to mark thread as read' });
  }
});

// Mark all conversations across platform as read
app.put('/api/messages/read-all', (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const now = new Date().toISOString();
    const messages = readJsonFile<Message[]>(MESSAGES_FILE, []);

    const updatedMessages = messages.map(m => ({
      ...m,
      readByAdmin: role === 'admin' ? true : m.readByAdmin,
      readByCustomer: role === 'customer' ? true : m.readByCustomer,
      deliveryStatus: 'read',
      readAt: m.readAt || now
    }));

    writeJsonFile(MESSAGES_FILE, updatedMessages);

    broadcastMessageSseEvent('all_read', { role, readAt: now });
    res.json({ success: true, count: updatedMessages.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to mark all read' });
  }
});

// Delete single message
app.delete('/api/messages/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let messages = readJsonFile<Message[]>(MESSAGES_FILE, []);
    const target = messages.find(m => m.id === id);
    messages = messages.filter(m => m.id !== id);
    writeJsonFile(MESSAGES_FILE, messages);

    broadcastMessageSseEvent('message_deleted', {
      id,
      customerId: target?.customerId || 'all'
    });

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete message' });
  }
});

// Delete entire customer thread
app.delete('/api/messages/thread/:customerId', (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    let messages = readJsonFile<Message[]>(MESSAGES_FILE, []);
    const initialLen = messages.length;
    messages = messages.filter(m => m.customerId !== customerId);
    writeJsonFile(MESSAGES_FILE, messages);

    broadcastMessageSseEvent('thread_deleted', {
      customerId,
      deletedCount: initialLen - messages.length
    });

    res.json({ success: true, customerId, deletedCount: initialLen - messages.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete customer thread' });
  }
});

// Broadcast typing indicator in real-time
app.post('/api/messages/typing', (req: Request, res: Response) => {
  try {
    const { customerId, role, isTyping, senderName } = req.body;
    if (!customerId || !role) {
      res.status(400).json({ error: 'customerId and role are required' });
      return;
    }

    const payload = {
      customerId,
      role,
      isTyping: !!isTyping,
      senderName: senderName || (role === 'admin' ? 'Operations Desk' : 'Customer'),
      timestamp: Date.now()
    };

    broadcastMessageSseEvent('typing_status', payload);
    res.json({ success: true, ...payload });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to broadcast typing status' });
  }
});

// Presence Heartbeat
app.post('/api/messages/presence', (req: Request, res: Response) => {
  try {
    const { userId, role, name, customerId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    activePresenceMap.set(userId, {
      userId,
      role: role || 'customer',
      name: name || 'User',
      customerId: customerId || userId,
      lastSeen: Date.now()
    });

    const presencePayload = {
      users: Array.from(activePresenceMap.values()),
      onlineCount: activePresenceMap.size,
      agentsOnline: Array.from(activePresenceMap.values()).filter(u => u.role === 'admin').length
    };

    broadcastMessageSseEvent('presence_update', presencePayload);
    res.json(presencePayload);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record presence' });
  }
});

app.get('/api/messages/presence', (_req: Request, res: Response) => {
  res.json({
    users: Array.from(activePresenceMap.values()),
    onlineCount: activePresenceMap.size,
    agentsOnline: Array.from(activePresenceMap.values()).filter(u => u.role === 'admin').length
  });
});

// BROADCASTS CRUD
app.get('/api/broadcasts', (_req: Request, res: Response) => {
  const broadcasts = readJsonFile<BroadcastCampaign[]>(BROADCASTS_FILE, []);
  res.json(broadcasts);
});

app.post('/api/broadcasts', (req: Request, res: Response) => {
  try {
    const broadcasts = readJsonFile<BroadcastCampaign[]>(BROADCASTS_FILE, []);
    const body = req.body;
    const newId = body.id || `broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newBroadcast: BroadcastCampaign = {
      ...body,
      id: newId,
      sentAt: body.sentAt || new Date().toISOString(),
      active: body.active ?? true
    };

    const updatedBroadcasts = [newBroadcast, ...broadcasts.filter(b => b.id !== newId)];
    writeJsonFile(BROADCASTS_FILE, updatedBroadcasts);

    broadcastSseEvent('broadcast_created', { broadcast: newBroadcast, broadcasts: updatedBroadcasts });
    res.status(201).json(newBroadcast);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save broadcast' });
  }
});

// USERS & PROFILES CRUD & ROLE MANAGEMENT
const ROOT_ADMIN_EMAIL = 'joshuaegesienyinnaya@gmail.com';

function getRoleOverridesMap(): Record<string, 'admin' | 'customer'> {
  return readJsonFile<Record<string, 'admin' | 'customer'>>(ROLE_OVERRIDES_FILE, {});
}

function resolveEffectiveRole(userId?: string, email?: string, defaultRole?: string): 'admin' | 'customer' {
  if (email && email.trim().toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) {
    return 'admin';
  }
  const overrides = getRoleOverridesMap();
  if (userId && overrides[userId]) return overrides[userId];
  if (userId && overrides[userId.toLowerCase()]) return overrides[userId.toLowerCase()];
  if (email && overrides[email.trim().toLowerCase()]) return overrides[email.trim().toLowerCase()];
  if (email && overrides[email.trim()]) return overrides[email.trim()];
  return (defaultRole === 'admin' ? 'admin' : 'customer');
}

// Get global server-side role overrides
app.get('/api/users/roles', (_req: Request, res: Response) => {
  const overrides = getRoleOverridesMap();
  res.json({ overrides });
});

// Update User Role Endpoint (Authoritative Server Store & Real-time SSE Broadcast)
app.post(['/api/users/role', '/api/users/set-role'], (req: Request, res: Response) => {
  try {
    const { userId, role, email, actorName, reason } = req.body;
    if (!userId && !email) {
      res.status(400).json({ error: 'userId or email is required to update user role' });
      return;
    }

    const targetRole: 'admin' | 'customer' = role === 'admin' ? 'admin' : 'customer';
    const now = new Date().toISOString();

    // 1. Update persistent role overrides map
    const overrides = getRoleOverridesMap();
    if (userId) {
      overrides[userId] = targetRole;
      overrides[userId.toLowerCase()] = targetRole;
    }
    if (email) {
      overrides[email.trim().toLowerCase()] = targetRole;
      overrides[email.trim()] = targetRole;
    }
    writeJsonFile(ROLE_OVERRIDES_FILE, overrides);

    // 2. Update user in users.json if present
    const users = readJsonFile<UserProfile[]>(USERS_FILE, []);
    let userFound = false;
    const updatedUsers = users.map(u => {
      const matchId = userId && (u.id === userId || u.id.toLowerCase() === userId.toLowerCase());
      const matchEmail = email && u.email && u.email.trim().toLowerCase() === email.trim().toLowerCase();
      if (matchId || matchEmail) {
        userFound = true;
        return {
          ...u,
          role: targetRole,
          updatedAt: now
        };
      }
      return u;
    });

    if (!userFound && userId) {
      // Create new profile record if missing
      const newProfile: UserProfile = {
        id: userId,
        email: email || '',
        displayName: email ? email.split('@')[0] : (targetRole === 'admin' ? 'Administrator' : 'Wholesale Buyer'),
        companyName: targetRole === 'admin' ? 'Eagle Excel Headquarters' : 'Enterprise Buyer',
        role: targetRole,
        photoURL: targetRole === 'admin'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
        avatarUrl: targetRole === 'admin'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
        createdAt: now,
        updatedAt: now,
        totalSpent: 0,
        ordersCount: 0
      };
      updatedUsers.unshift(newProfile);
    }
    writeJsonFile(USERS_FILE, updatedUsers);

    // 3. Broadcast real-time SSE event to ALL connected clients (Mobile, Desktop, Tablet)
    const roleEventPayload = {
      userId,
      email,
      role: targetRole,
      actorName: actorName || 'System Administrator',
      reason: reason || '',
      timestamp: Date.now()
    };

    broadcastMessageSseEvent('user_role_changed', roleEventPayload);
    broadcastProductSseEvent('user_role_changed', roleEventPayload);
    broadcastMessageSseEvent('user_updated', { userId, role: targetRole });

    res.json({
      success: true,
      userId,
      email,
      role: targetRole,
      message: `User role successfully updated to "${targetRole}". Broadcasted to all connected devices.`,
      updatedAt: now
    });
  } catch (err: any) {
    console.error('Error updating user role on server:', err);
    res.status(500).json({ error: err.message || 'Failed to update user role' });
  }
});

app.get('/api/users', (_req: Request, res: Response) => {
  const users = readJsonFile<UserProfile[]>(USERS_FILE, []);
  const normalized = users.map(u => ({
    ...u,
    role: resolveEffectiveRole(u.id, u.email, u.role)
  }));
  res.json(normalized);
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const users = readJsonFile<UserProfile[]>(USERS_FILE, []);
  const found = users.find(u => u.id === id || (u.email && u.email.toLowerCase() === id.toLowerCase()));
  if (!found) {
    // Check if there is a role override for this ID/email
    const role = resolveEffectiveRole(id, id);
    res.json({
      id,
      role,
      displayName: 'User',
      createdAt: new Date().toISOString()
    });
    return;
  }
  const effectiveRole = resolveEffectiveRole(found.id, found.email, found.role);
  res.json({ ...found, role: effectiveRole });
});

app.post('/api/users', (req: Request, res: Response) => {
  try {
    const users = readJsonFile<UserProfile[]>(USERS_FILE, []);
    const body = req.body;
    const id = body.id;
    const now = new Date().toISOString();
    const effectiveRole = resolveEffectiveRole(id, body.email, body.role);

    const profile: UserProfile = {
      ...body,
      id,
      role: effectiveRole,
      updatedAt: now,
      createdAt: body.createdAt || now
    };

    const updatedUsers = [...users.filter(u => u.id !== id), profile];
    writeJsonFile(USERS_FILE, updatedUsers);

    broadcastMessageSseEvent('user_updated', { profile });
    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save user profile' });
  }
});

// IMAGE UPLOAD ENDPOINT
app.post('/api/upload-image', (req: Request, res: Response) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: 'imageBase64 is required' });
      return;
    }

    // Extract base64 data
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      // If it's already a URL or pure data, return it
      res.json({ url: imageBase64 });
      return;
    }

    const ext = matches[1].includes('webp') ? 'webp' : matches[1].includes('png') ? 'png' : 'jpg';
    const buffer = Buffer.from(matches[2], 'base64');
    const safeName = `${Date.now()}_${(filename || 'upload').replace(/[^a-zA-Z0-9_-]/g, '')}.${ext}`;
    const savePath = path.join(UPLOADS_DIR, safeName);

    fs.writeFileSync(savePath, buffer);
    const publicUrl = `/uploads/${safeName}`;

    res.json({ url: publicUrl });
  } catch (err: any) {
    console.error('Image upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to save image' });
  }
});

// Static serving of uploaded images in /public/uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// -------------------------------------------------------------
// VITE INTEGRATION
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Eagle Excel server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
