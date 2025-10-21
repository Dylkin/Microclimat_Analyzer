export interface DocumentComment {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  comment: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ApprovalRecord {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  status: 'approved' | 'rejected' | 'pending';
  comment?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface DocumentApprovalStatus {
  documentId: string;
  status: 'pending' | 'approved' | 'rejected';
  lastApproval?: ApprovalRecord;
  comments: DocumentComment[];
  approvalHistory: ApprovalRecord[];
}

export interface DocumentApprovalService {
  addComment(documentId: string, comment: string, userId: string): Promise<DocumentComment>;
  getComments(documentId: string): Promise<DocumentComment[]>;
  approveDocument(documentId: string, userId: string, comment?: string): Promise<ApprovalRecord>;
  rejectDocument(documentId: string, userId: string, comment?: string): Promise<ApprovalRecord>;
  getApprovalStatus(documentId: string): Promise<DocumentApprovalStatus>;
  getApprovalHistory(documentId: string): Promise<ApprovalRecord[]>;
}

























