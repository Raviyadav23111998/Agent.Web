import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  IntegrationService, IntegrationSummary, IntegrationDetail,
  IntegrationOperation, AppOption, PersonaOption,
} from '../../services/integration.service';

@Component({
  selector: 'app-api-integrations',
  templateUrl: './api-integrations.component.html',
  styleUrls: ['./api-integrations.component.scss'],
  standalone: false,
})
export class ApiIntegrationsComponent implements OnInit {
  list: IntegrationSummary[] = [];
  loading = true;
  selected: IntegrationDetail | null = null;

  @ViewChild('importDialog') importDialogRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('grantDialog') grantDialogRef!: ElementRef<HTMLDialogElement>;
  @ViewChild('deleteDialog') deleteDialogRef!: ElementRef<HTMLDialogElement>;

  importOpen = false;
  importing = false;
  imp = { slug: '', source: '', display_name: '', allow_private: false };

  grantOpen = false;
  grant = { scope: 'app', ref: '', op_filter: '' };
  apps: AppOption[] = [];
  personas: Array<PersonaOption & { appName: string }> = [];
  grantTargetsLoading = false;

  editAuthOpen = false;
  authEdit = { auth_type: '', auth_config_text: '', default_headers_text: '' };
  private static AUTH_LABELS: Record<string, string> = {
    api_key: 'API key', bearer_static: 'Bearer (static)', basic: 'Basic',
    oauth2_client_credentials: 'OAuth2 — client credentials',
    oauth2_password: 'OAuth2 — password', login_grant: 'Login flow (live token)',
    hmac: 'HMAC', custom: 'Custom',
    apiKey: 'API key', bearer: 'Bearer', oauth2: 'OAuth2',
  };

  testing: Record<number, boolean> = {};
  testResult: Record<number, { ok: boolean; message: string }> = {};
  deleteConfirmId: number | null = null;

  constructor(private svc: IntegrationService, private toastr: ToastrService) {}

  ngOnInit(): void { this.refresh(); }

  refresh(): void {
    this.loading = true;
    this.svc.list().subscribe({
      next: (r) => { this.list = r; this.loading = false; },
      error: () => { this.loading = false; this.toastr.error('Failed to load integrations.'); },
    });
  }

  open(i: IntegrationSummary): void {
    this.svc.detail(i.integration_id).subscribe({
      next: (d) => (this.selected = d),
      error: () => this.toastr.error('Failed to load detail.'),
    });
  }

  close(): void { this.selected = null; this.editAuthOpen = false; }

  authLabel(t: string | null | undefined): string {
    return t ? (ApiIntegrationsComponent.AUTH_LABELS[t] || t) : 'None';
  }

  toggleAuthEdit(): void {
    this.editAuthOpen = !this.editAuthOpen;
    if (this.editAuthOpen && this.selected) {
      this.authEdit = {
        auth_type: this.selected.auth_type || '',
        auth_config_text: JSON.stringify(this.selected.auth_config || {}, null, 2),
        default_headers_text: JSON.stringify(this.selected.default_headers || {}, null, 2),
      };
    }
  }

  saveAuth(): void {
    if (!this.selected) return;
    let cfg: any, hdrs: any;
    try { cfg = JSON.parse(this.authEdit.auth_config_text || '{}'); }
    catch { this.toastr.error('Auth config is not valid JSON.'); return; }
    try { hdrs = JSON.parse(this.authEdit.default_headers_text || '{}'); }
    catch { this.toastr.error('Default headers is not valid JSON.'); return; }
    this.svc.patchIntegration(this.selected.integration_id, {
      auth_type: this.authEdit.auth_type, auth_config: cfg, default_headers: hdrs,
    }).subscribe({
      next: () => { this.editAuthOpen = false; this.open(this.selected!); this.toastr.success('Authentication updated.'); },
      error: (e) => this.toastr.error(e?.error?.detail || 'Auth update failed.'),
    });
  }

  startImport(): void {
    this.imp = { slug: '', source: '', display_name: '', allow_private: false };
    this.importOpen = true;
    this.importDialogRef.nativeElement.showModal();
  }

  submitImport(): void {
    const slug = this.imp.slug.trim();
    const source = this.imp.source.trim();
    if (!slug || !source) { this.toastr.error('Slug and spec URL/text are required.'); return; }
    this.importing = true;
    this.svc.import({
      slug, source, display_name: this.imp.display_name || undefined,
      allow_private: this.imp.allow_private,
    }).subscribe({
      next: (rep) => {
        this.importing = false;
        this.importOpen = false;
        this.importDialogRef.nativeElement.close();
        const msg = rep.unchanged
          ? `No changes (${rep.operation_count} operations).`
          : `Imported ${rep.operation_count} operations (+${rep.added} ~${rep.updated} -${rep.deprecated}).`;
        this.toastr.success(msg);
        if (rep.warnings?.length) { rep.warnings.forEach((w) => this.toastr.warning(w)); }
        this.refresh();
      },
      error: (e) => {
        this.importing = false;
        this.toastr.error(e?.error?.detail || 'Import failed.');
      },
    });
  }

  toggleOp(op: IntegrationOperation, field: 'enabled' | 'requires_approval' | 'embed_safe'): void {
    if (!this.selected) return;
    const val = !op[field];
    this.svc.patchOperation(this.selected.integration_id, op.operation_id, { [field]: val }).subscribe({
      next: () => { (op as any)[field] = val; },
      error: () => this.toastr.error('Update failed.'),
    });
  }

  startGrant(): void {
    this.grant = { scope: 'app', ref: '', op_filter: '' };
    this.loadGrantTargets();
    this.grantOpen = true;
    this.grantDialogRef.nativeElement.showModal();
  }

  private loadGrantTargets(): void {
    this.grantTargetsLoading = true;
    this.svc.listApps().subscribe({
      next: (apps) => {
        this.apps = apps || [];
        if (!this.apps.length) { this.personas = []; this.grantTargetsLoading = false; return; }
        forkJoin(
          this.apps.map((a) =>
            this.svc.listPersonas(a.appId).pipe(
              map((ps) => (ps || []).map((p) => ({ ...p, appName: a.name }))),
              catchError(() => of([] as Array<PersonaOption & { appName: string }>)),
            ),
          ),
        ).subscribe((lists) => {
          this.personas = ([] as Array<PersonaOption & { appName: string }>).concat(...lists);
          this.grantTargetsLoading = false;
        });
      },
      error: () => { this.apps = []; this.personas = []; this.grantTargetsLoading = false; },
    });
  }

  submitGrant(): void {
    if (!this.selected) return;
    const op_filter = this.grant.op_filter.trim()
      ? this.grant.op_filter.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    this.svc.addGrant(this.selected.integration_id, {
      scope: this.grant.scope,
      ref: this.grant.scope === 'org' ? undefined : this.grant.ref.trim(),
      op_filter,
    }).subscribe({
      next: () => { this.grantOpen = false; this.grantDialogRef.nativeElement.close(); this.open(this.selected!); this.toastr.success('Grant added.'); },
      error: (e) => this.toastr.error(e?.error?.detail || 'Grant failed.'),
    });
  }

  removeGrant(grantId: number): void {
    if (!this.selected) return;
    this.svc.deleteGrant(this.selected.integration_id, grantId).subscribe({
      next: () => this.open(this.selected!),
      error: () => this.toastr.error('Failed to remove grant.'),
    });
  }

  test(i: IntegrationSummary): void {
    this.testing[i.integration_id] = true;
    this.svc.test(i.integration_id).subscribe({
      next: (r) => { this.testing[i.integration_id] = false; this.testResult[i.integration_id] = r; },
      error: () => { this.testing[i.integration_id] = false;
                     this.testResult[i.integration_id] = { ok: false, message: 'Test failed.' }; },
    });
  }

  reimport(i: IntegrationSummary): void {
    this.svc.reimport(i.integration_id).subscribe({
      next: (r) => { this.toastr.success(`Re-imported (+${r.added} ~${r.updated} -${r.deprecated}).`);
                     this.refresh(); if (this.selected) this.open(i); },
      error: () => this.toastr.error('Re-import failed.'),
    });
  }

  confirmDelete(id: number): void { this.deleteConfirmId = id; this.deleteDialogRef.nativeElement.showModal(); }

  remove(id: number): void {
    this.svc.remove(id).subscribe({
      next: () => { this.deleteConfirmId = null; this.deleteDialogRef.nativeElement.close(); this.close(); this.refresh();
                    this.toastr.success('Integration deleted.'); },
      error: () => this.toastr.error('Delete failed.'),
    });
  }
}
