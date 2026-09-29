import { Document, IDocument } from '../models/Document';
import { AppError } from './error.service';

/**
 * BackupService는 문서 백업 및 복원을 담당합니다.
 */
export class BackupService {
  /**
   * 문서를 백업합니다.
   * @param docId 백업할 문서 ID
   * @returns 백업된 문서 객체
   */
  async createBackup(docId: string): Promise<IDocument> {
    const doc = await Document.findById(docId);
    if (!doc) {
      throw new AppError(404, '문서를 찾을 수 없습니다.');
    }

    // 백업 문서 생성 (원본 문서의 복사본)
    const backupDoc = new Document({
      title: `${doc.title} [Backup]`,
      roomId: doc.roomId,
      ownerId: doc.ownerId,
      blocks: JSON.parse(JSON.stringify(doc.blocks)), // 딥 복사
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const saved = await backupDoc.save();
    console.log(`[BackupService] 문서 ${docId}의 백업이 생성되었습니다: ${saved._id}`);
    return saved;
  }

  /**
   * 백업 문서에서 원본 문서로 복원합니다.
   * @param backupDocId 복원할 백업 문서 ID
   * @param targetDocId 복원 대상 원본 문서 ID
   * @returns 복원된 문서
   */
  async restoreFromBackup(backupDocId: string, targetDocId: string): Promise<IDocument> {
    const backupDoc = await Document.findById(backupDocId);
    if (!backupDoc) {
      throw new AppError(404, '백업 문서를 찾을 수 없습니다.');
    }

    // 백업 문서가 실제로 백업인지 확인 (title에 [Backup]이 포함되어야 함)
    if (!backupDoc.title.includes('[Backup]')) {
      throw new AppError(400, '해당 문서는 백업 문서가 아닙니다.');
    }

    const targetDoc = await Document.findById(targetDocId);
    if (!targetDoc) {
      throw new AppError(404, '복원 대상 문서를 찾을 수 없습니다.');
    }

    // 원본 문서에 백업된 블록 데이터를 복원
    targetDoc.blocks = JSON.parse(JSON.stringify(backupDoc.blocks));
    targetDoc.updatedAt = new Date();
    
    const restored = await targetDoc.save();
    console.log(`[BackupService] 백업 ${backupDocId}가 문서 ${targetDocId}로 복원되었습니다.`);
    return restored;
  }

  /**
   * 특정 방의 모든 문서에 대한 백업 목록을 조회합니다.
   * @param roomId 방 ID
   * @returns 백업 문서 목록
   */
  async listBackupsForRoom(roomId: string): Promise<IDocument[]> {
    const backups = await Document.find({
      roomId,
      title: /.*\[Backup\].*/
    }).sort({ createdAt: -1 });

    return backups;
  }

  /**
   * 특정 문서의 모든 백업을 삭제합니다.
   * @param docId 대상 문서 ID
   * @returns 삭제된 백업 개수
   */
  async deleteBackupsForDocument(docId: string): Promise<number> {
    const doc = await Document.findById(docId);
    if (!doc) {
      throw new AppError(404, '문서를 찾을 수 없습니다.');
    }

    const result = await Document.deleteMany({
      roomId: doc.roomId,
      title: new RegExp(`.*${doc.title}\\s*\\[Backup\\].*`)
    });

    console.log(`[BackupService] 문서 ${docId}의 백업 ${result.deletedCount}개가 삭제되었습니다.`);
    return result.deletedCount || 0;
  }
}
