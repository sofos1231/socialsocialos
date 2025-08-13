import { Injectable } from '@nestjs/common';

@Injectable()
export class LogsService {
  private logs: any[] = [];
  private clients: Set<any> = new Set();

  ingest(data: any) {
    const logEntry = {
      ...data,
      ts: data.ts || new Date().toISOString(),
      level: data.level || 'info',
    };
    
    this.logs.push(logEntry);
    
    // Broadcast to all connected clients
    this.broadcast(logEntry);
    
    return { success: true, message: 'Log ingested' };
  }

  query(query: any) {
    let filtered = [...this.logs];
    
    if (query.level) {
      filtered = filtered.filter(log => log.level === query.level);
    }
    
    if (query.opid) {
      filtered = filtered.filter(log => log.opid === query.opid);
    }
    
    if (query.limit) {
      filtered = filtered.slice(-parseInt(query.limit));
    }
    
    return filtered;
  }

  addClient(client: any) {
    this.clients.add(client);
  }

  removeClient(client: any) {
    this.clients.delete(client);
  }

  private broadcast(data: any) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach(client => {
      try {
        client.write(message);
      } catch (error) {
        // Remove disconnected clients
        this.clients.delete(client);
      }
    });
  }
}
