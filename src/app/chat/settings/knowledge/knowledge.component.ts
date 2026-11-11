import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ConfirmService } from '../../../common/ui/confirm.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BrainService, DocumentDTO, IngestRequest, BrainStats, BrainHealth } from '../../services/brain.service';
import { AppAdminService, ApplicationDTO } from '../../services/app-admin.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-knowledge',
  templateUrl: './knowledge.component.html',
  styleUrls: ['./knowledge.component.scss'],
  standalone: false
})
export class KnowledgeComponent implements OnInit {
  loading = true;
  ingestLoading = false;
  showIngestModal = false;
  deleteLoading = false;
  isEditing = false;

  documents: DocumentDTO[] = [];
  filteredDocuments: DocumentDTO[] = [];
  stats: BrainStats | null = null;
  health: BrainHealth | null = null;
  healthLoading = false;
  pillarKeys: Array<'document_store' | 'lexical' | 'graph' | 'vector'> =
    ['document_store', 'lexical', 'graph', 'vector'];
  pillarLabels: { [k: string]: string } = {
    document_store: 'Document store (Postgres)',
    lexical: 'Full-text (Elasticsearch)',
    graph: 'Knowledge graph (Neo4j)',
    vector: 'Vector embeddings'
  };
  searchQuery = '';
  typeFilter = 'all';
  appFilter: number | null = null;
  apps: ApplicationDTO[] = [];
  isAdmin = false;
  currentPage = 1;
  pageSize = 10;
  Math = Math;
  
  selectedDoc: DocumentDTO | null = null;
  isFileOverDragZone = false;
  
  ingestForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private brainService: BrainService,
    private appService: AppAdminService,
    private authService: AuthService,
    private confirm: ConfirmService
  ) {
    this.ingestForm = this.fb.group({
      title: ['', Validators.maxLength(500)],
      sourcePath: ['', [Validators.required, Validators.maxLength(500)]],
      docType: ['document', Validators.required],
      content: ['', [Validators.required, Validators.minLength(1)]],
      appId: [null]
    });
  }

  ngOnInit(): void {
    this.detectAdmin();
    this.loadApps();
    this.loadKnowledgeBase();
    this.loadHealth();
  }

  /** Live ingestion health — real per-store probe + indexing coverage. The API
   *  returns 200 (healthy/degraded) or 503 (unhealthy); we render both. */
  loadHealth(): void {
    this.healthLoading = true;
    this.brainService.getHealth().subscribe({
      next: (h) => { this.health = h; this.healthLoading = false; },
      error: (err) => {
        // 503 still carries the report body (unhealthy) — keep it if present.
        this.health = err?.error && err.error.components ? err.error : null;
        this.healthLoading = false;
      }
    });
  }

  private detectAdmin(): void {
    const session = this.authService.getActiveSession();
    const role = (session?.role || '').toLowerCase();
    this.isAdmin = ['admin', 'superadmin', 'administrator', 'owner', 'tenant owner'].includes(role);
  }

  loadApps(): void {
    this.appService.listApps().subscribe({
      next: (apps) => this.apps = apps,
      error: () => {} // Non-critical
    });
  }

  loadKnowledgeBase() {
    this.loading = true;
    // Admin: appFilter=null means "All Apps" → send appId=0 to API
    // Admin: appFilter=N means specific app → send appId=N
    // Regular user: never sends appId override → API uses JWT app_id
    let appId: number | undefined;
    if (this.isAdmin) {
      appId = this.appFilter === null ? 0 : this.appFilter;
    }

    this.brainService.getStats(appId).subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: () => {
        this.toastr.error('Failed to load knowledge statistics');
      }
    });

    this.brainService.getDocuments(appId).subscribe({
      next: (docs) => {
        this.documents = docs;
        this.filterDocuments();
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load knowledge documents');
        this.loading = false;
      }
    });
  }

  onAppFilterChange(): void {
    this.currentPage = 1;
    this.loadKnowledgeBase();
  }

  getAppName(appId: number | null | undefined): string {
    if (!appId) return '—';
    const app = this.apps.find(a => a.appId === appId);
    return app ? app.name : `App #${appId}`;
  }

  filterDocuments() {
    const q = this.searchQuery.trim().toLowerCase();
    this.filteredDocuments = this.documents.filter(d => {
      const title = d.title || '';
      const sourcePath = d.sourcePath || (d as any).source_path || '';
      const content = d.content || '';
      const owner = d.ownerId || (d as any).owner_id || '';
      const type = d.docType || (d as any).doc_type || '';

      const matchesSearch = !q || 
             title.toLowerCase().includes(q) || 
             sourcePath.toLowerCase().includes(q) ||
             content.toLowerCase().includes(q) ||
             owner.toLowerCase().includes(q);
             
      const matchesType = this.typeFilter === 'all' || type === this.typeFilter;
      
      return matchesSearch && matchesType;
    });
    this.currentPage = 1; // Reset to first page on filter change
  }

  get paginatedDocuments() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredDocuments.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.filteredDocuments.length / this.pageSize);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  onSearchChange() {
    this.filterDocuments();
  }

  viewDocument(doc: DocumentDTO) {
    this.selectedDoc = null;
    const docId = doc.docId !== undefined ? doc.docId : (doc as any).doc_id;
    if (docId === undefined) {
      this.toastr.error('Unable to view document: missing ID');
      return;
    }
    this.brainService.getDocument(docId).subscribe({
      next: (fullDoc) => {
        this.selectedDoc = fullDoc;
      },
      error: () => {
        this.toastr.error('Failed to load document content');
      }
    });
  }

  closeDocumentView() {
    this.selectedDoc = null;
  }

  // Open the ingest form as a modal dialog (Add new document).
  openIngest() {
    this.isEditing = false;
    this.ingestForm.reset({ docType: 'document', appId: null });
    this.showIngestModal = true;
  }

  closeIngest() {
    this.showIngestModal = false;
    this.isEditing = false;
    this.ingestForm.reset({ docType: 'document', appId: null });
  }

  editDocument(doc: DocumentDTO) {
    const docId = doc.docId !== undefined ? doc.docId : (doc as any).doc_id;
    if (docId === undefined) {
      this.toastr.error('Unable to edit document: missing ID');
      return;
    }

    // Fetch full document to ensure we have the complete content for editing
    this.brainService.getDocument(docId).subscribe({
      next: (fullDoc) => {
        this.isEditing = true;
        this.showIngestModal = true;
        this.ingestForm.patchValue({
          title: fullDoc.title || '',
          sourcePath: fullDoc.sourcePath || (fullDoc as any).source_path || '',
          docType: fullDoc.docType || (fullDoc as any).doc_type || 'document',
          content: fullDoc.content || '',
          appId: fullDoc.appId || (fullDoc as any).app_id || null
        });
        this.toastr.info('Editing document: ' + (fullDoc.title || fullDoc.sourcePath));
      },
      error: () => {
        this.toastr.error('Failed to load full document for editing');
      }
    });
  }

  cancelEdit() {
    this.isEditing = false;
    this.showIngestModal = false;
    this.ingestForm.reset({ docType: 'document', appId: null });
  }

  saveIngestion() {
    if (this.ingestForm.invalid) {
      this.toastr.warning('Please fill in all required fields');
      return;
    }
    this.ingestLoading = true;
    const val = this.ingestForm.value;
    const req: IngestRequest = {
      sourcePath: val.sourcePath,
      content: val.content,
      title: val.title || undefined,
      docType: val.docType,
      appId: val.appId || undefined
    };

    this.brainService.ingestDocument(req).subscribe({
      next: () => {
        this.toastr.success(this.isEditing ? 'Document successfully updated' : 'Document successfully ingested');
        this.ingestForm.reset({ docType: 'document', appId: null });
        this.ingestLoading = false;
        this.isEditing = false;
        this.showIngestModal = false;
        this.loadKnowledgeBase();
      },
      error: (err) => {
        const msg = err.error?.message || 'Failed to ingest document';
        this.toastr.error(msg);
        this.ingestLoading = false;
      }
    });
  }

  async deleteDoc(doc: DocumentDTO): Promise<void> {
    const docId = doc.docId !== undefined ? doc.docId : (doc as any).doc_id;
    const title = doc.title || doc.sourcePath || (doc as any).source_path || 'Untitled';
    if (docId === undefined) {
      this.toastr.error('Unable to delete document: missing ID');
      return;
    }
    const ok = await this.confirm.ask({
      title: 'Delete document?',
      message: `“${title}” will be removed from the knowledge base.`,
      confirmText: 'Delete', variant: 'danger',
    });
    if (!ok) return;
    this.deleteLoading = true;
    this.brainService.deleteDocument(docId).subscribe({
      next: () => {
        this.toastr.success('Document deleted successfully');
        this.loadKnowledgeBase();
        this.deleteLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to delete document');
        this.deleteLoading = false;
      }
    });
  }

  // ── Drag and Drop & File Reader ──

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isFileOverDragZone = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isFileOverDragZone = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isFileOverDragZone = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.handleIngestFile(file);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.handleIngestFile(file);
    }
  }

  private handleIngestFile(file: File) {
    const isText = file.type.startsWith('text/') || 
                   file.name.endsWith('.txt') || 
                   file.name.endsWith('.md') || 
                   file.name.endsWith('.json') ||
                   file.name.endsWith('.js') ||
                   file.name.endsWith('.ts') ||
                   file.name.endsWith('.py') ||
                   file.name.endsWith('.html') ||
                   file.name.endsWith('.css');
                   
    if (!isText && file.size > 1024 * 1024) {
      this.toastr.warning('Only standard text/code files under 1MB can be parsed');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const docType = this.detectDocType(file.name);
      
      this.ingestForm.patchValue({
        title: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
        sourcePath: `uploads/${file.name}`,
        docType: docType,
        content: text
      });
      this.toastr.info(`Loaded file: ${file.name}`);
    };
    reader.onerror = () => {
      this.toastr.error('Failed to read file contents');
    };
    reader.readAsText(file);
  }

  private detectDocType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['js', 'ts', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'html', 'css', 'scss', 'sh'].includes(ext || '')) {
      return 'code';
    }
    if (['eml', 'msg'].includes(ext || '')) {
      return 'email';
    }
    if (['md', 'txt'].includes(ext || '')) {
      return 'note';
    }
    return 'document';
  }
}
