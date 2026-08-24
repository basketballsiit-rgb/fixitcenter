import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients = 0;

  afterInit(server: Server) {
    this.logger.log('🔌 WebSocket Gateway initialized at /ws');
  }

  handleConnection(client: Socket) {
    this.connectedClients++;
    this.logger.log(`Client connected: ${client.id} (total: ${this.connectedClients})`);
  }

  handleDisconnect(client: Socket) {
    this.connectedClients--;
    this.logger.log(`Client disconnected: ${client.id} (total: ${this.connectedClients})`);
  }

  /**
   * Client joins a center-specific room to receive center updates.
   * Emit: { centerId: string }
   */
  @SubscribeMessage('join:center')
  handleJoinCenter(
    @MessageBody() data: { centerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `center:${data.centerId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
    return { event: 'joined', room };
  }

  /**
   * Client joins the dashboard room for aggregated updates.
   */
  @SubscribeMessage('join:dashboard')
  handleJoinDashboard(@ConnectedSocket() client: Socket) {
    client.join('dashboard');
    this.logger.log(`Client ${client.id} joined room: dashboard`);
    return { event: 'joined', room: 'dashboard' };
  }

  /**
   * Client leaves a center room.
   */
  @SubscribeMessage('leave:center')
  handleLeaveCenter(
    @MessageBody() data: { centerId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `center:${data.centerId}`;
    client.leave(room);
    return { event: 'left', room };
  }
}
