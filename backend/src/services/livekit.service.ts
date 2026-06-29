import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class LiveKitService {
  private static roomService = new RoomServiceClient(
    env.LIVEKIT_URL,
    env.LIVEKIT_API_KEY,
    env.LIVEKIT_API_SECRET
  );

  /**
   * Generates a token for a user to join a LiveKit room.
   */
  static async generateToken(roomName: string, participantIdentity: string, participantName: string): Promise<string> {
    try {
      const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
        identity: participantIdentity,
        name: participantName,
      });

      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      return await at.toJwt();
    } catch (error) {
      logger.error('Error generating LiveKit token:', error);
      throw error;
    }
  }

  /**
   * Creates an interview room explicitly on LiveKit Cloud.
   */
  static async createRoom(roomName: string): Promise<void> {
    try {
      await this.roomService.createRoom({
        name: roomName,
        emptyTimeout: 30, // 30 seconds to save free tier minutes
        maxParticipants: 2, // Candidate and AI
      });
      logger.info(`LiveKit room created: ${roomName}`);
    } catch (error) {
      logger.error(`Failed to create LiveKit room ${roomName}:`, error);
      // We don't throw here, as LiveKit auto-creates rooms when a client joins if room doesn't exist.
    }
  }

  /**
   * Deletes/ends a LiveKit room.
   */
  static async deleteRoom(roomName: string): Promise<void> {
    try {
      await this.roomService.deleteRoom(roomName);
      logger.info(`LiveKit room deleted: ${roomName}`);
    } catch (error) {
      logger.error(`Failed to delete LiveKit room ${roomName}:`, error);
    }
  }
}
