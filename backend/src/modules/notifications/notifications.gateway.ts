import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect,
  ConnectedSocket, MessageBody,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { JwtService } from '@nestjs/jwt'
import { Logger }     from '@nestjs/common'

@WebSocketGateway({
  cors: {
    origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  private readonly log = new Logger(NotificationsGateway.name)

  constructor(private jwt: JwtService) {}

  // ── Connection lifecycle ─────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers.authorization?.replace('Bearer ', '') ?? '')

      const payload = this.jwt.verify<{ sub: string; companyId: string }>(
        token,
        { secret: process.env.JWT_SECRET || 'dev_jwt_secret_key_minimum_32_characters_long' },
      )

      // Each company gets its own room
      client.data.companyId = payload.companyId
      client.data.userId    = payload.sub
      await client.join(`company:${payload.companyId}`)
      this.log.debug(`Client ${client.id} joined company:${payload.companyId}`)
    } catch {
      // Invalid token — disconnect silently
      client.disconnect(true)
    }
  }

  handleDisconnect(client: Socket) {
    this.log.debug(`Client ${client.id} disconnected`)
  }

  // ── Incoming events ──────────────────────────────────────────────────────

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { ts: Date.now() })
  }

  @SubscribeMessage('mark_read')
  handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string },
  ) {
    // Acknowledge — actual DB update happens via REST
    client.emit('marked_read', { id: data.id })
  }

  // ── Push helpers (called from NotificationsService) ──────────────────────

  /** Push a single notification to all sockets in the company room */
  pushToCompany(companyId: string, notification: object) {
    this.server.to(`company:${companyId}`).emit('notification', notification)
  }

  /** Push unread-count update to all sockets in the company room */
  pushUnreadCount(companyId: string, count: number) {
    this.server.to(`company:${companyId}`).emit('unread_count', { count })
  }
}
