import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import {
  EmbedIntegrationsService,
  EmbedIntegration,
  IntegrationCreateResponse,
  AuditEntry
} from '../../services/embed-integrations.service';
import { AppAdminService, ApplicationDTO } from '../../chat/services/app-admin.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-embed-integrations',
  templateUrl: './embed-integrations.component.html',
  styleUrls: ['./embed-integrations.component.scss'],
  standalone: false
})
export class EmbedIntegrationsComponent implements OnInit {
  integrations: EmbedIntegration[] = [];
  apps: ApplicationDTO[] = [];
  isLoading = true;
  saving = false;

  editorOpen = false;
  editorMode: 'create' | 'edit' = 'create';
  editingId: number | null = null;
  activeTab: 'settings' | 'snippet' | 'audit' = 'settings';
  form: FormGroup;

  createdResponse: IntegrationCreateResponse | null = null;
  secretCopied = false;

  rotatingKeys = false;
  rotatedKeys: { publishable_key: string; secret_key: string } | null = null;

  confirmAction: 'rotate' | 'deactivate' | null = null;
  confirmTarget: EmbedIntegration | null = null;

  auditEntries: AuditEntry[] = [];
  auditLoading = false;

  constructor(
    private integrationService: EmbedIntegrationsService,
    private appService: AppAdminService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      mode: ['chat', Validators.required],
      allowed_domains: ['*'],
      app_id: [null],
      persona_id: [null],
      welcome_message: ['Hi! How can I help you?'],
      theme_color: ['#3b82f6'],
      is_active: [true]
    });
  }

  ngOnInit(): void {
    this.loadIntegrations();
    this.loadApps();
  }

  loadIntegrations(): void {
    this.isLoading = true;
    this.integrationService.list().subscribe({
      next: (list) => {
        this.integrations = list;
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to load integrations');
        this.isLoading = false;
      }
    });
  }

  loadApps(): void {
    this.appService.listApps().subscribe({
      next: (apps) => this.apps = apps,
      error: () => {}
    });
  }

  openCreate(): void {
    this.editorOpen = true;
    this.editorMode = 'create';
    this.editingId = null;
    this.activeTab = 'settings';
    this.createdResponse = null;
    this.secretCopied = false;
    this.rotatedKeys = null;
    this.form.reset({
      name: '',
      mode: 'chat',
      allowed_domains: '*',
      app_id: null,
      persona_id: null,
      welcome_message: 'Hi! How can I help you?',
      theme_color: '#3b82f6',
      is_active: true
    });
  }

  openEdit(integration: EmbedIntegration): void {
    this.editorOpen = true;
    this.editorMode = 'edit';
    this.editingId = integration.integration_id;
    this.activeTab = 'settings';
    this.createdResponse = null;
    this.secretCopied = false;
    this.rotatedKeys = null;
    this.form.patchValue({
      name: integration.name,
      mode: integration.mode,
      allowed_domains: (integration.allowed_domains || []).join(', '),
      app_id: integration.app_id || null,
      persona_id: integration.persona_id || null,
      is_active: integration.is_active
    });

    this.loadAudit(integration.integration_id);
  }

  closeEditor(): void {
    this.editorOpen = false;
    this.editingId = null;
    this.createdResponse = null;
    this.rotatedKeys = null;
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;

    const val = this.form.value;
    const domains = (val.allowed_domains || '*')
      .split(',')
      .map((d: string) => d.trim())
      .filter((d: string) => d);

    if (this.editorMode === 'create') {
      this.integrationService.create({
        name: val.name,
        mode: val.mode,
        allowed_domains: domains,
        app_id: val.app_id || undefined,
        persona_id: val.persona_id || undefined,
        welcome_message: val.welcome_message || undefined,
        theme_color: val.theme_color || undefined
      }).subscribe({
        next: (resp) => {
          this.createdResponse = resp;
          this.editingId = resp.integration_id;
          this.editorMode = 'edit';
          this.activeTab = 'snippet';
          this.saving = false;
          this.toastr.success('Integration created! Copy your keys now.');
          this.loadIntegrations();
        },
        error: (err) => {
          this.toastr.error(err.error?.detail || 'Failed to create integration');
          this.saving = false;
        }
      });
    } else {
      this.integrationService.patch(this.editingId!, {
        name: val.name,
        mode: val.mode,
        allowed_domains: domains,
        app_id: val.app_id || undefined,
        persona_id: val.persona_id || undefined,
        is_active: val.is_active
      }).subscribe({
        next: () => {
          this.toastr.success('Integration updated');
          this.saving = false;
          this.loadIntegrations();
        },
        error: (err) => {
          this.toastr.error(err.error?.detail || 'Failed to update');
          this.saving = false;
        }
      });
    }
  }

  requestRotate(integration: EmbedIntegration): void {
    this.confirmAction = 'rotate';
    this.confirmTarget = integration;
  }

  confirmRotate(): void {
    if (!this.confirmTarget) return;
    this.rotatingKeys = true;
    this.integrationService.rotateKeys(this.confirmTarget.integration_id).subscribe({
      next: (resp) => {
        this.rotatedKeys = resp;
        this.rotatingKeys = false;
        this.confirmAction = null;
        this.confirmTarget = null;
        this.activeTab = 'snippet';
        this.toastr.warning('Keys rotated! Old keys are now invalid. Copy the new ones.');
        this.loadIntegrations();
      },
      error: (err) => {
        this.toastr.error(err.error?.detail || 'Failed to rotate keys');
        this.rotatingKeys = false;
        this.confirmAction = null;
      }
    });
  }

  cancelConfirm(): void {
    this.confirmAction = null;
    this.confirmTarget = null;
  }

  getEmbedSnippet(pk?: string): string {
    const key = pk || this.createdResponse?.publishable_key || '';
    const apiBase = environment.apiUrl;
    const tenant = window.location.hostname;
    return `<script src="${apiBase}/bot/embed.js?tenant=${tenant}" data-key="${key}"></script>`;
  }

  copyToClipboard(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.toastr.success(`${label} copied to clipboard`);
      if (label.toLowerCase().includes('secret')) {
        this.secretCopied = true;
      }
    });
  }

  loadAudit(integrationId: number): void {
    this.auditLoading = true;
    this.integrationService.getAuditLog(integrationId).subscribe({
      next: (entries) => {
        this.auditEntries = entries;
        this.auditLoading = false;
      },
      error: () => {
        this.auditEntries = [];
        this.auditLoading = false;
      }
    });
  }

  getModeIcon(mode: string): string {
    return mode === 'copilot' ? '🎯' : '💬';
  }

  getStatusClass(active: boolean): string {
    return active ? 'status-active' : 'status-inactive';
  }

  truncateKey(key: string): string {
    if (!key) return '';
    return key.length > 16 ? key.slice(0, 12) + '…' + key.slice(-4) : key;
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return 'never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  trackById(_: number, item: EmbedIntegration): number {
    return item.integration_id;
  }

  trackByAuditId(_: number, item: AuditEntry): number {
    return item.id;
  }

  getAuditStatusClass(status: string): string {
    switch (status) {
      case 'executed': return 'audit-executed';
      case 'blocked': return 'audit-blocked';
      case 'approved': return 'audit-approved';
      case 'denied': return 'audit-denied';
      default: return '';
    }
  }

  getCurrentIntegration(): EmbedIntegration | undefined {
    return this.integrations.find(i => i.integration_id === this.editingId);
  }
}
