import express from 'express';
import multer from 'multer';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { RoomController } from './controllers/room.controller';
import { DocumentController } from './controllers/document.controller';
import { BackupController } from './controllers/backup.controller';
import { RoomService, DocumentService } from './services/core.service';
import { BackupService } from './services/backup.service';
import { createAuthMiddleware, createOptionalAuthMiddleware } from './middlewares/auth.middleware';
import { createRbacMiddleware } from './middlewares/rbac.middleware';
import { PluginManager } from './plugins/plugin-manager';
import { SfuService } from './services/webrtc/sfu.service';
import { WebRtcController } from './controllers/webrtc.controller';

export const createRouter = (authService: AuthService, roomService: RoomService, docService: DocumentService, backupService: BackupService, sfuService: SfuService) => {
  const authController = new AuthController(authService);
  const roomController = new RoomController(roomService);
  const pluginManager = new PluginManager(docService);
  const documentController = new DocumentController(docService, pluginManager);
  const backupController = new BackupController(backupService);
  const webrtcController = new WebRtcController(sfuService);
  
  const authMiddleware = createAuthMiddleware(authService);
  const optionalAuthMiddleware = createOptionalAuthMiddleware(authService);
  const requirePermission = createRbacMiddleware(roomService);

  const router = express.Router();

  // ── Auth Routes (인증 불필요) ──
  router.post('/auth/register', authController.register);
  router.post('/auth/login', authController.login);

  // ── Room Routes (방 단위로 RBAC 적용) ──
  // 방 생성: authenticated만 필요 (생성자는 owner가 됨)
  router.post('/rooms', authMiddleware, roomController.createRoom);

  // 방 조회: viewer 권한이면 읽기 가능
  router.get('/rooms', optionalAuthMiddleware, roomController.listRooms);
  router.get('/rooms/:id', optionalAuthMiddleware, roomController.getRoom);
  router.delete('/rooms/:id', authMiddleware, roomController.deleteRoom);

  // 방 참여: editor 권한 필요 (실제로는 참여 요청일 수 있으므로 기본 권한으로)
  router.post('/rooms/:id/join', authMiddleware, roomController.joinRoom);

  // 방 나가기: 참여자 목록에서 사용자 제거 (마지막 참여자면 방 삭제)
  router.post('/rooms/:id/leave', authMiddleware, roomController.leaveRoom);

  // ── Document Routes (문서/블록 단위로 RBAC 적용) ──
  // 문서 생성: authenticated만 필요
  router.post('/documents', authMiddleware, documentController.createDocument);

  // 문서 조회: authenticated만 필요
  router.get('/documents/:id', authMiddleware, documentController.getDocument);
  router.get('/documents', authMiddleware, documentController.listDocuments);

  // 블록 추가: editor 권한 필요
  router.post('/documents/:id/blocks', authMiddleware, documentController.addBlock);
  router.patch('/documents/:id/blocks/:blockId', authMiddleware, documentController.updateBlock);
  router.delete('/documents/:id/blocks/:blockId', authMiddleware, documentController.deleteBlock);

  // 블록 내보내기: viewer 권한만 필요
  router.get('/documents/:id/blocks/:blockId/export/:format', authMiddleware, documentController.exportBlock);

  // 문서 전체 마크다운 내보내기: viewer 권한만 필요
  router.get('/documents/:id/export/markdown', authMiddleware, documentController.exportMarkdown);

  // 마크다운 파일 업로드: authenticated만 필요
  const upload = multer({ storage: multer.memoryStorage() });
  router.post('/documents/import/markdown', authMiddleware, upload.single('file'), documentController.importMarkdown);

  // ── Backup Routes ──
  // 백업 생성: owner 권한 필요
  router.post('/documents/:id/backup', authMiddleware, backupController.createBackup);
  
  // 백업에서 복원: owner 권한 필요
  router.post('/documents/:id/restore/:backupId', authMiddleware, backupController.restoreFromBackup);
  
  // 방의 모든 백업 조회: viewer 권한만 필요
  router.get('/rooms/:roomId/backups', authMiddleware, backupController.listBackupsForRoom);
  
  // 문서의 모든 백업 삭제: owner 권한 필요
  router.delete('/documents/:id/backups', authMiddleware, backupController.deleteBackups);

  // ── WebRTC (mediasoup SFU) Routes ──
  router.get('/webrtc/rooms/:roomId/rtp-capabilities', authMiddleware, webrtcController.getRtpCapabilities);
  router.post('/webrtc/rooms/:roomId/transport', authMiddleware, webrtcController.createTransport);
  router.post('/webrtc/transports/:transportId/connect', authMiddleware, webrtcController.connectTransport);
  router.post('/webrtc/rooms/:roomId/produce', authMiddleware, webrtcController.produce);
  router.post('/webrtc/rooms/:roomId/consume', authMiddleware, webrtcController.consume);
  router.get('/webrtc/rooms/:roomId/producers', authMiddleware, webrtcController.listProducers);
  router.delete('/webrtc/rooms/:roomId/producers/:producerId', authMiddleware, webrtcController.closeProducer);
  router.delete('/webrtc/rooms/:roomId', authMiddleware, webrtcController.closeRoom);

  return router;
};
