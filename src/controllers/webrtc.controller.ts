import { Request, Response, NextFunction } from 'express';
import { SfuService } from '../services/webrtc/sfu.service';
import { AppError } from '../services/error.service';

/**
 * WebRtcController는 mediasoup 기반 SFU와 클라이언트 간의 시그널링 API를 제공합니다.
 *
 * 클라이언트(브라우저)는 이 API를 통해:
 * 1. 방에 접속하고 Transport를 생성합니다.
 * 2. 마이크/카메라를 프로듀스합니다.
 * 3. 다른 사용자의 미디어를 컨슈미합니다.
 */
export class WebRtcController {
  constructor(private sfuService: SfuService) {}

  /**
   * 방의 Router RTP 기능을 반환합니다.
   * GET /api/webrtc/rooms/:roomId/rtp-capabilities
   */
  getRtpCapabilities = async (req: any, res: Response, next: NextFunction) => {
    try {
      const { roomId } = req.params;
      await this.sfuService.initRoom(roomId);
      const capabilities = this.sfuService.getRtpCapabilities(roomId);
      res.json({
        status: 'success',
        data: capabilities
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * 방에 접속하여 WebRtc Transport를 생성합니다.
   * POST /api/webrtc/rooms/:roomId/transport
   */
  createTransport = async (req: any, res: Response, next: NextFunction) => {
    try {
      const roomId = req.params.roomId;
      await this.sfuService.initRoom(roomId);

  const transportData = await this.sfuService.createTransport(roomId);
      res.json({
        status: 'success',
        data: transportData
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * Transport를 연결합니다 (DTLS 핸드셰이크).
   * POST /api/webrtc/transports/:transportId/connect
   */
  connectTransport = async (req: any, res: Response, next: NextFunction) => {
    try {
      const { transportId } = req.params;
      const { dtlsParameters } = req.body;
      await this.sfuService.connectTransport(transportId, dtlsParameters);
      res.json({ status: 'success' });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * 미디어를 프로듀스합니다 (마이크/카메라 송신).
   * POST /api/webrtc/rooms/:roomId/produce
   */
  produce = async (req: any, res: Response, next: NextFunction) => {
    try {
      const { roomId } = req.params;
      const { transportId, kind, rtpParameters } = req.body;

      const producerId = await this.sfuService.handleProducer(
        roomId,
        transportId,
        kind,
        rtpParameters
      );

      res.json({
        status: 'success',
        data: { producerId }
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * 미디어를 컨슈미합니다 (다른 사용자의 미디어 수신).
   * POST /api/webrtc/rooms/:roomId/consume
   */
  consume = async (req: any, res: Response, next: NextFunction) => {
    try {
      const { roomId } = req.params;
      const { targetTransportId, producerId, paused } = req.body;

      const consumer = await this.sfuService.handleConsumer(
        roomId,
        targetTransportId,
        producerId,
        paused
      );

      res.json({
        status: 'success',
        data: consumer
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * 방에 있는 프로듀서 목록을 반환합니다.
   * GET /api/webrtc/rooms/:roomId/producers
   */
  listProducers = async (req: any, res: Response, next: NextFunction) => {
    try {
      const { roomId } = req.params;
      const producers = this.sfuService.listProducers(roomId);
      res.json({
        status: 'success',
        data: producers
      });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * 프로듀서 폐기 (사용자 퇴장).
   * DELETE /api/webrtc/rooms/:roomId/producers/:producerId
   */
  closeProducer = async (req: any, res: Response, next: NextFunction) => {
    try {
      const { roomId, producerId } = req.params;
      await this.sfuService.closeProducer(roomId, producerId);
      res.json({ status: 'success' });
    } catch (error: any) {
      next(error);
    }
  };

  /**
   * 방 정리 (모든 사용자 퇴장 시).
   * DELETE /api/webrtc/rooms/:roomId
   */
  closeRoom = async (req: any, res: Response, next: NextFunction) => {
    try {
      const { roomId } = req.params;
      await this.sfuService.closeRoom(roomId);
      res.json({ status: 'success' });
    } catch (error: any) {
      next(error);
    }
  };
}
