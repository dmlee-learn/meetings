import { Request, Response } from 'express';
import { DocumentService } from '../services/core.service';
import { PluginManager } from '../plugins/plugin-manager';
import { AppError } from '../services/error.service';

export class DocumentController {
  constructor(
    private docService: DocumentService,
    private pluginManager: PluginManager
  ) {}

  /**
   * 새 문서를 생성합니다.
   */
  createDocument = async (req: any, res: Response, next: Function) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError(401, '인증된 사용자만 문서를 생성할 수 있습니다.');
      }

      const doc = await this.docService.createDocument({
        title: req.body.title || '무제 문서',
        roomId: req.body.roomId,
        ownerId: userId
      });

      res.status(201).json({
        status: 'success',
        data: doc
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 특정 문서를 조회합니다.
   */
  getDocument = async (req: Request, res: Response, next: Function) => {
    try {
      const doc = await this.docService.getDocumentById(req.params.id);
      if (!doc) {
        throw new AppError(404, '문서를 찾을 수 없습니다.');
      }

      res.json({
        status: 'success',
        data: doc
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 방 ID로 문서 목록을 조회합니다.
   */
  listDocuments = async (req: Request, res: Response, next: Function) => {
    try {
      const roomId = req.query.roomId as string;
      if (!roomId) {
        throw new AppError(400, 'roomId 쿼리 파라미터가 필요합니다.');
      }

      const docs = await this.docService.listDocumentsByRoom(roomId);
      res.json({
        status: 'success',
        data: docs
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 문서에 새 블록을 추가합니다.
   */
  addBlock = async (req: any, res: Response, next: Function) => {
    try {
      const { type, data } = req.body;
      const docId = req.params.id;

      const doc = await this.pluginManager.addBlockToDocument(docId, type, data);

      res.status(201).json({
        status: 'success',
        data: doc
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 특정 블록을 수정합니다.
   */
  updateBlock = async (req: any, res: Response, next: Function) => {
    try {
      const docId = req.params.id;
      const blockId = req.params.blockId;
      const { data } = req.body;

      const doc = await this.docService.updateBlock(docId, blockId, data);
      if (!doc) {
        throw new AppError(404, '블록을 찾을 수 없습니다.');
      }

      res.json({
        status: 'success',
        data: doc
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 특정 블록을 내보냅니다.
   */
  exportBlock = async (req: Request, res: Response, next: Function) => {
    try {
      const { id: docId, blockId } = req.params;
      const format = req.params.format || 'json';

      const buffer = await this.pluginManager.exportBlock(docId, blockId, format);

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="block_${blockId}.${format}"`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 특정 블록을 삭제합니다.
   */
  deleteBlock = async (req: any, res: Response, next: Function) => {
    try {
      const docId = req.params.id;
      const blockId = req.params.blockId;

      const doc = await this.docService.deleteBlock(docId, blockId);
      if (!doc) {
        throw new AppError(404, '문서를 찾을 수 없습니다.');
      }

      res.json({
        status: 'success',
        data: doc
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * 문서 전체를 마크다운으로 내보냅니다.
   */
  exportMarkdown = async (req: Request, res: Response, next: Function) => {
    try {
      const { id: docId } = req.params;
      const markdown = await this.docService.exportDocumentToMarkdown(docId);

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="document.md"');
      res.send(markdown);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 마크다운 파일을 업로드하여 문서를 생성합니다.
   */
  importMarkdown = async (req: any, res: Response, next: Function) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError(401, '인증된 사용자만 문서를 가져올 수 있습니다.');
      }

      // multer를 통해 업로드된 파일 사용
      const file = req.file;
      if (!file) {
        throw new AppError(400, '업로드된 파일을 찾을 수 없습니다.');
      }

      const markdownContent = file.buffer.toString('utf-8');
      const roomId = req.body.roomId || 'default_room';

      const doc = await this.docService.importDocumentFromMarkdown(
        markdownContent,
        '가져온 문서',
        roomId,
        userId
      );

      res.status(201).json({
        status: 'success',
        data: doc
      });
    } catch (error) {
      next(error);
    }
  };
}
