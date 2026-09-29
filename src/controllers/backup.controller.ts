import { Request, Response, NextFunction } from 'express';
import { BackupService } from '../services/backup.service';

export class BackupController {
  private backupService: BackupService;

  constructor(backupService: BackupService) {
    this.backupService = backupService;
  }

  /**
   * 문서 백업 생성
   * POST /api/documents/:id/backup
   */
  async createBackup(req: any, res: Response, next: NextFunction) {
    try {
      const docId = req.params.id;
      const backup = await this.backupService.createBackup(docId);
      res.status(201).json(backup);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 백업에서 복원
   * POST /api/documents/:id/restore/:backupId
   */
  async restoreFromBackup(req: any, res: Response, next: NextFunction) {
    try {
      const targetDocId = req.params.id;
      const backupId = req.params.backupId;
      const restored = await this.backupService.restoreFromBackup(backupId, targetDocId);
      res.json(restored);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 방의 모든 백업 조회
   * GET /api/rooms/:roomId/backups
   */
  async listBackupsForRoom(req: any, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.roomId;
      const backups = await this.backupService.listBackupsForRoom(roomId);
      res.json(backups);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 문서의 모든 백업 삭제
   * DELETE /api/documents/:id/backups
   */
  async deleteBackups(req: any, res: Response, next: NextFunction) {
    try {
      const docId = req.params.id;
      const count = await this.backupService.deleteBackupsForDocument(docId);
      res.json({ deletedCount: count });
    } catch (error) {
      next(error);
    }
  }
}
