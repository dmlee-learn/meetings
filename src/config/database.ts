import mongoose from 'mongoose';
import { ENV } from './env';

// Use dynamic import for ESM compatibility
let MongoDBMemoryServer: any;

/**
 * Database connection manager using Singleton pattern.
 * Supports real MongoDB for production and In-memory MongoDB for development.
 */
class DatabaseConnector {
  private static instance: DatabaseConnector;
  private isConnected: boolean = false;
  private mongod: any = null;

  private constructor() {}

  public static getInstance(): DatabaseConnector {
    if (!DatabaseConnector.instance) {
      DatabaseConnector.instance = new DatabaseConnector();
    }
    return DatabaseConnector.instance;
  }

  /**
   * Establishes connection to MongoDB.
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      if (ENV.NODE_ENV === 'development') {
        console.log('[Database] Development mode detected. Starting In-memory MongoDB...');
        
        // Dynamically import the module to ensure it's loaded correctly
        const mod = await import('mongodb-memory-server');
        MongoDBMemoryServer = mod.MongoMemoryServer;

        this.mongod = await MongoDBMemoryServer.create();
        const uri = this.mongod.getUri();
        await mongoose.connect(uri);
      } else {
        console.log(`[Database] Connecting to Production MongoDB at ${ENV.MONGODB_URI}...`);
        await mongoose.connect(ENV.MONGODB_URI);
      }

      this.isConnected = true;
      console.log('[Database] MongoDB connection established successfully.');

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('[Database] MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        console.warn('[Database] MongoDB connection lost.');
      });

    } catch (error) {
      console.error('[Database] Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await mongoose.disconnect();
      if (this.mongod) {
        await this.mongod.stop();
        this.mongod = null;
      }
      this.isConnected = false;
      console.log('[Database] MongoDB connection closed.');
    }
  }

  public get connection(): typeof mongoose {
    return mongoose;
  }
}

export const dbConnector = DatabaseConnector.getInstance();
