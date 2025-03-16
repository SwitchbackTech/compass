import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
@Injectable()
export class SyncNotificationService {
  @WebSocketServer()
  private server: Server;

  async notifyEventChange(userId: string) {
    this.server.to(userId).emit('calendar-change');
  }
}
