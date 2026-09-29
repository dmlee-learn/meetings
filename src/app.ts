import express from 'express';
import { dbConnector } from './config/database';
import { errorMiddleware } from './middlewares/error-handler';
import { RoomService, DocumentService, UserService } from './services/core.service';
import { AuthService } from './services/auth.service';
import { PresenceService } from './services/presence.service';
import { createRouter } from './routes';
import { YjsServer } from './services/yjs.service';
import { PresenceHandler } from './websockets/handlers/presence.handler';
import { BackupService } from './services/backup.service';
import { SfuService } from './services/webrtc/sfu.service';
import { PluginManager } from './plugins/plugin-manager';
import { TextBlockPlugin } from './plugins/text/text-block.plugin';
import { MindmapBlockPlugin } from './plugins/mindmap/mindmap-block.plugin';
import { SpreadsheetBlockPlugin } from './plugins/spreadsheet/spreadsheet-block.plugin';

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS 설정
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Max-Age', '86400');
  // Preflight (OPTIONS) 요청은 즉시 응답하여 후속 요청을 허용
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// Yjs WebSocket 서버 (포트 3001)
const yjsPort = PORT + 1;

// 서비스 초기화
const userService = new UserService();
const authService = new AuthService(userService);
const roomService = new RoomService();
const docService = new DocumentService();
const backupService = new BackupService();

// 플러그인 관리자 초기화
const pluginManager = new PluginManager(docService);

// Yjs 서버와 Presence 서비스 초기화
const presenceService = new PresenceService(roomService, docService);
const presenceHandler = new PresenceHandler(presenceService);
const yjsServer = new YjsServer(yjsPort, docService, presenceHandler, presenceService, roomService);

// SFU(mediasoup) 서비스 초기화 (서버 종료 시 함께 정리)
const sfuService = new SfuService();

// 라우트 등록
const router = createRouter(authService, roomService, docService, backupService, sfuService);
app.use('/api', router);

// 에러 핸들러
app.use(errorMiddleware);

// 서버 시작
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Collaborative Canvas Hub API 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📡 Yjs WebSocket 서버가 포트 ${yjsPort}에서 실행 중입니다.`);
  await dbConnector.connect();
});

// 서버 종료 처리
process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT 수신 - 서버를 안전하게 종료합니다...');
  await yjsServer.close();
  await sfuService.close();
  await dbConnector.disconnect();
  process.exit(0);
});
