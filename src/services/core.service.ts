import { User, IUser } from '../models/User';
import { Room, IRoom, IParticipant, Role } from '../models/Room';
import { Document, IDocument, IBlock } from '../models/Document';
import { Transcript, ITranscript } from '../models/Transcript';
import { AppError } from './error.service';
import { EventEmitter } from 'events';
import bcrypt from 'bcrypt';

/**
 * 권한 등급을 비교하기 위한 권한 순서 (오름차순)
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  editor: 1,
  owner: 2
};

export class UserService {
  async createUser(userData: Partial<IUser>): Promise<IUser> {
    const user = new User(userData);
    return await user.save();
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email });
  }

  async getUserById(userId: string): Promise<IUser | null> {
    return await User.findById(userId);
  }
}

export class RoomService extends EventEmitter {
  /**
   * 새로운 방을 생성합니다. 생성자는 기본적으로 'owner' 역할을 가집니다.
   * @param roomData 방 데이터 (password: 비밀번호 포함)
   */
  async createRoom(roomData: Partial<IRoom> & { password?: string }): Promise<IRoom> {
    const ownerUserId = roomData.ownerId;
    
    // 비밀번호 해싱
    let passwordHash: string | undefined;
    let hasPassword = false;
    if (roomData.password) {
      passwordHash = await bcrypt.hash(roomData.password, 10);
      hasPassword = true;
    }

    const room = new Room({
      ...roomData,
      passwordHash,
      hasPassword,
      participants: [
        { userId: ownerUserId, role: 'owner', joinedAt: new Date() },
        ...(roomData.participants || [])
      ]
    });
    
    // password 필드 제거 (DB에 저장하지 않음)
    delete (room as any).password;

    const savedRoom = await room.save();
    // 방 생성 이벤트를 발화하여 WebSocket 브로드캐스트를 트리거합니다.
    this.emit('room_created', savedRoom);
    return savedRoom;
  }

  async getRoomById(roomId: string): Promise<IRoom | null> {
    return await Room.findById(roomId);
  }

  /**
   * 방 목록을 조회합니다.
   */
  async listRooms(): Promise<IRoom[]> {
    return await Room.find().sort({ createdAt: -1 });
  }

  /**
   * 방에 참여합니다. 기본 역할은 'editor'입니다.
   * @param roomId 방 ID
   * @param userId 사용자 ID
   * @param password 방 비밀번호 (해당 방에 비밀번호가 설정된 경우)
   */
  async joinRoom(roomId: string, userId: string, password?: string): Promise<IRoom | null> {
    const room = await Room.findById(roomId);
    if (!room) return null;

    // 비밀번호 검증
    if (room.hasPassword && room.passwordHash) {
      if (!password) {
        throw new AppError(401, '비밀번호가 필요합니다.');
      }
      
      const isPasswordValid = await bcrypt.compare(password, room.passwordHash);
      if (!isPasswordValid) {
        throw new AppError(401, '비밀번호가 일치하지 않습니다.');
      }
    }

    const existing = room.participants.find(p => p.userId === userId);
    if (!existing) {
      room.participants.push({ userId, role: 'editor', joinedAt: new Date() });
      await room.save();
      // 방 참여 이벤트를 발화합니다.
      this.emit('room_updated', room);
    }
    return room;
  }

  /**
   * 사용자가 방에서 나갑니다. (참여자에서 제거)
   */
  async leaveRoom(roomId: string, userId: string): Promise<IRoom | null> {
    const room = await Room.findById(roomId);
    if (!room) return null;

    // 참여자 목록에서 해당 사용자 제거
    room.participants = room.participants.filter(p => p.userId !== userId);

    // 마지막 참여자가 나가면 방 삭제
    if (room.participants.length === 0) {
      await Document.deleteMany({ roomId });
      await Room.findByIdAndDelete(roomId);
      this.emit('room_deleted', roomId);
      return null;
    }

    await room.save();
    this.emit('room_updated', room);
    return room;
  }

  /**
   * 특정 사용자의 방 내 참여자 정보를 조회합니다.
   */
  async getParticipant(roomId: string, userId: string): Promise<IParticipant | null> {
    const room = await Room.findById(roomId);
    if (!room) return null;
    return room.participants.find(p => p.userId === userId) || null;
  }

  /**
   * RBAC 권한 검증: 사용자가 방에 대해 특정 권한 이상을 가진지 확인합니다.
   * @throws AppError(403) 권한이 부족한 경우
   */
  async assertPermission(
    roomId: string,
    userId: string,
    requiredRole: Role
  ): Promise<IParticipant> {
    const participant = await this.getParticipant(roomId, userId);

    if (!participant) {
      throw new AppError(403, '해당 방에 참여하고 있지 않습니다.');
    }

    if (ROLE_HIERARCHY[participant.role] < ROLE_HIERARCHY[requiredRole]) {
      throw new AppError(403, `이 작업에는 '${requiredRole}' 권한이 필요합니다. (현재: '${participant.role}')`);
    }

    return participant;
  }

  /**
   * 사용자 퇴출 (방 참여자에서 제거)
   */
  async removeParticipant(roomId: string, targetUserId: string, requestingUserId: string): Promise<IRoom | null> {
    const room = await Room.findById(roomId);
    if (!room) return null;

    const requester = room.participants.find(p => p.userId === requestingUserId);
    if (!requester || requester.role !== 'owner') {
      throw new AppError(403, '오너만 참여자를 퇴출할 수 있습니다.');
    }

    room.participants = room.participants.filter(p => p.userId !== targetUserId);
    await room.save();
    return room;
  }

  /**
   * 방을 삭제합니다. (문서도 함께 삭제)
   * 마지막 사용자가 나갈 때 호출됩니다.
   */
  async deleteRoom(roomId: string): Promise<IRoom | null> {
    const room = await Room.findById(roomId);
    if (!room) return null;
    // 해당 방의 문서도 함께 삭제
    await Document.deleteMany({ roomId });
    const result = await Room.findByIdAndDelete(roomId);
    // 방 삭제 이벤트를 방화해 실시간 갱신
    this.emit('room_deleted', roomId);
    return result;
  }
}

export class DocumentService {
  async createDocument(docData: Partial<IDocument>): Promise<IDocument> {
    const doc = new Document(docData);
    return await doc.save();
  }

  async getDocumentById(docId: string): Promise<IDocument | null> {
    return await Document.findById(docId);
  }

  /**
   * 방 ID로 문서를 조회합니다.
   */
  async listDocumentsByRoom(roomId: string): Promise<IDocument[]> {
    return await Document.find({ roomId }).sort({ updatedAt: -1 });
  }

  async updateDocument(docId: string, updateData: Partial<IDocument>): Promise<IDocument | null> {
    const doc = await Document.findById(docId);
    if (!doc) return null;

    // 전체 문서 데이터를 업데이트합니다.
    Object.assign(doc, updateData);
    doc.updatedAt = new Date();
    return await doc.save();
  }

  async updateBlock(docId: string, blockId: string, blockData: any): Promise<IDocument | null> {
    const doc = await Document.findById(docId);
    if (!doc) return null;

    const blockIndex = doc.blocks.findIndex((b: IBlock) => b.id === blockId);
    if (blockIndex !== -1) {
      doc.blocks[blockIndex].data = { ...doc.blocks[blockIndex].data, ...blockData };
      doc.blocks[blockIndex].updatedAt = new Date();
      return await doc.save();
    }
    return null;
  }

  /**
   * 블록을 삭제합니다.
   */
  async deleteBlock(docId: string, blockId: string): Promise<IDocument | null> {
    const doc = await Document.findById(docId);
    if (!doc) return null;

    doc.blocks = doc.blocks.filter((b: IBlock) => b.id !== blockId);
    doc.updatedAt = new Date();
    return await doc.save();
  }

  /**
   * 문서 전체를 마크다운 포맷으로 직렬화합니다.
   */
  async exportDocumentToMarkdown(docId: string): Promise<string> {
    const doc = await this.getDocumentById(docId);
    if (!doc) {
      throw new AppError(404, '문서를 찾을 수 없습니다.');
    }

    const lines: string[] = [`# ${doc.title}`, ''];

    for (const block of doc.blocks) {
      lines.push(`<!-- block: ${block.id} type: ${block.type} -->`);
      lines.push(`[BLOCK:${block.type}]`);
      lines.push(JSON.stringify(block.data, null, 2));
      lines.push(`[/BLOCK:${block.type}]`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 마크다운 문자열을 파싱하여 문서로 가져옵니다.
   */
  async importDocumentFromMarkdown(markdown: string, title: string, roomId: string, ownerId: string): Promise<IDocument> {
    const lines = markdown.split('\n');
    const blocks: IBlock[] = [];
    let i = 0;

    // 첫 번째 헤더(# ...)는 제목으로 취급하여 건너뜀
    while (i < lines.length && lines[i].startsWith('# ')) {
      i++;
    }

    while (i < lines.length) {
      const line = lines[i];

      // 블록 시작 마커: <!-- block: xxx type: yyy -->
      const blockStart = line.match(/^<!-- block: (\S+) type: (\S+) -->/);
      if (blockStart) {
        const blockId = blockStart[1];
        const blockType = blockStart[2];
        i++; // 마커 라인 건너뜀

        let data: Record<string, any> = {};

        // [BLOCK:TYPE] ... [/BLOCK:TYPE] 구문 (모든 블록 동일)
        i++; // [BLOCK:TYPE] 라인 건너뜀
        const jsonLines: string[] = [];
        while (i < lines.length && lines[i] !== `[/BLOCK:${blockType}]`) {
          jsonLines.push(lines[i]);
          i++;
        }
        i++; // [/BLOCK:TYPE] 라인 건너뜀
        try {
          data = JSON.parse(jsonLines.join('\n'));
        } catch {
          data = { raw: jsonLines.join('\n') };
        }

        blocks.push({
          id: blockId,
          type: blockType,
          updatedAt: new Date(),
          data
        });
      } else {
        i++; // 다른 라인은 건너뜀
      }
    }

    const newDoc = new Document({
      title: title || '가져온 문서',
      roomId,
      ownerId,
      blocks
    });

    return await newDoc.save();
  }
}

export class AIService {
  async createTranscript(transcriptData: Partial<ITranscript>): Promise<ITranscript> {
    const transcript = new Transcript(transcriptData);
    return await transcript.save();
  }

  async addTranscriptEntry(transcriptId: string, entry: any): Promise<ITranscript | null> {
    const transcript = await Transcript.findById(transcriptId);
    if (!transcript) return null;

    transcript.content.push(entry);
    return await transcript.save();
  }
}
