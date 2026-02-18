// netlify/functions/admin-get-stats.js
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db();
  cachedDb = db;
  return db;
}

async function verifyAdmin(authHeader, db) {
  if (!authHeader) {
    throw new Error('Token não fornecido');
  }
  const token = authHeader.replace('Bearer ', '');
  const decoded = jwt.verify(token, JWT_SECRET);
  const { ObjectId } = require('mongodb');
  const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
  if (!user || !user.isAdmin) {
    throw new Error('Acesso negado');
  }
  return decoded;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const db = await connectToDatabase();
    await verifyAdmin(event.headers.authorization, db);

    const totalUsers = await db.collection('users').countDocuments();
    const totalOrders = await db.collection('orders').countDocuments();
    
    const ordersByStatus = await db.collection('orders').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    
    const totalRevenue = await db.collection('orders').aggregate([
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]).toArray();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalUsers,
        totalOrders,
        ordersByStatus,
        totalRevenue: totalRevenue[0]?.total || 0
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: error.message === 'Acesso negado' ? 403 : 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
