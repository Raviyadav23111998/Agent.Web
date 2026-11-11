import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import {
  ConnectionService, ConnProvider, Connection, ConnFormField,
  buildFields, collectFields, providerIcon,
} from '../../services/connection.service';
import { AuthService } from '../../services/auth.service';
import { AppAdminService, ApplicationDTO } from '../../chat/services/app-admin.service';

type Surface = 'user' | 'org';

@Component({
  selector: 'app-connections',
  templateUrl: './connections.component.html',
  styleUrls: ['./connections.component.scss'],
  standalone: false,
})
export class ConnectionsComponent implements OnInit {
  surface: Surface = 'user';
  isAdmin = false;

  providers: ConnProvider[] = [];
  connections: Connection[] = [];
  apps: ApplicationDTO[] = [];
  loading = true;
  saving = false;

  orgTarget = 'org';

  modalOpen = false;
  modalMode: 'add' | 'edit' = 'add';
  modalProvider: ConnProvider | null = null;
  modalConnectionId: number | null = null;
  modalLabel = '';
  modalFields: ConnFormField[] = [];

  deleteConfirmId: number | null = null;
  testing: Record<number, boolean> = {};
  testResult: Record<number, { ok: boolean; message: string }> = {};

  constructor(
    private svc: ConnectionService,
    private auth: AuthService,
    private appSvc: AppAdminService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    const role = (this.auth.getActiveSession()?.role || '').toLowerCase();
    this.isAdmin = ['admin', 'superadmin', 'administrator', 'owner', 'tenant owner'].includes(role);
    this.load();
  }

  load(): void {
    this.loading = true;
    if (this.isAdmin) {
      this.appSvc.listApps().subscribe({ next: (a) => this.apps = a, error: () => {} });
    }
    this.svc.getProviders().subscribe({
      next: (providers) => {
        this.providers = providers;
        this.svc.list().subscribe({
          next: (connections) => { this.connections = connections; this.loading = false; },
          error: () => { this.loading = false; },
        });
      },
      error: () => { this.toastr.error('Failed to load providers'); this.loading = false; },
    });
  }

  appName(uuid: string): string {
    return this.apps.find(a => a.appUuid === uuid)?.name || 'App';
  }

  ownerLabel(c: Connection): string {
    if (c.scope === 'org') return 'Organization';
    if (c.scope === 'app') return `App: ${this.appName(c.owner_ref)}`;
    return '';
  }

  selectSurface(s: Surface): void { this.surface = s; }

  icon(key: string): string { return providerIcon(key); }

  get visibleProviders(): ConnProvider[] {
    if (this.surface === 'user') return this.providers.filter(p => p.supports_user);
    return this.providers;
  }

  connsFor(providerKey: string): Connection[] {
    return this.connections.filter(c => {
      if (c.provider_key !== providerKey) return false;
      return this.surface === 'org' ? (c.scope === 'org' || c.scope === 'app')
                                    : c.scope === 'user';
    });
  }

  isOrgAppConfigured(providerKey: string): boolean {
    return this.connections.some(c => c.provider_key === providerKey && c.scope === 'org');
  }

  openAdd(provider: ConnProvider): void {
    this.modalOpen = true;
    this.modalMode = 'add';
    this.modalProvider = provider;
    this.modalConnectionId = null;
    this.modalLabel = '';
    this.orgTarget = 'org';
    this.modalFields = this.fieldsFor(provider, {}, this.surface === 'user' ? 'user' : 'org');
  }

  get appTargetsAllowed(): boolean {
    if (this.surface !== 'org' || !this.modalProvider) return false;
    if (this.modalProvider.kind === 'direct') return true;
    return this.modalProvider.kind === 'shared_app'
        && this.isOrgAppConfigured(this.modalProvider.provider_key);
  }

  private fieldsFor(provider: ConnProvider, config: Record<string, any>,
                    targetScope: 'user' | 'org' | 'app'): ConnFormField[] {
    const identityOnly = targetScope === 'user'
      || (targetScope === 'app' && provider.kind === 'shared_app');
    return buildFields(provider, config, identityOnly ? 'user' : 'org');
  }

  onTargetChange(): void {
    if (!this.modalProvider) return;
    const targetScope: 'user' | 'org' | 'app' =
      this.surface === 'user' ? 'user' : (this.orgTarget === 'org' ? 'org' : 'app');
    this.modalFields = this.fieldsFor(this.modalProvider, collectFields(this.modalFields), targetScope);
  }

  openEdit(provider: ConnProvider, conn: Connection): void {
    this.svc.detail(conn.connection_id).subscribe({
      next: (detail) => {
        this.modalOpen = true;
        this.modalMode = 'edit';
        this.modalProvider = provider;
        this.modalConnectionId = conn.connection_id;
        this.modalLabel = detail.label || conn.label;
        this.modalFields = this.fieldsFor(provider, detail.config || {}, conn.scope);
      },
      error: () => {
        this.modalOpen = true;
        this.modalMode = 'edit';
        this.modalProvider = provider;
        this.modalConnectionId = conn.connection_id;
        this.modalLabel = conn.label;
        this.modalFields = this.fieldsFor(provider, {}, conn.scope);
        this.toastr.warning('Could not load existing values');
      },
    });
  }

  closeModal(): void {
    this.modalOpen = false;
    this.modalProvider = null;
    this.modalConnectionId = null;
  }

  save(): void {
    if (!this.modalProvider) return;
    this.saving = true;
    const fields = collectFields(this.modalFields);

    if (this.modalMode === 'add') {

      let scope: 'user' | 'org' | 'app' = this.surface;
      let owner_ref: string | undefined;
      if (this.surface === 'org' && this.appTargetsAllowed && this.orgTarget !== 'org') {
        scope = 'app';
        owner_ref = this.orgTarget;
      }
      this.svc.create({
        provider: this.modalProvider.provider_key,
        scope,
        owner_ref,
        label: this.modalLabel || 'Default',
        fields,
      }).subscribe({
        next: () => this._afterSave(`${this.modalProvider!.display_name} connection saved`),
        error: (err) => this._saveError(err),
      });
    } else {
      this.svc.update(this.modalConnectionId!, {
        label: this.modalLabel || undefined,
        fields,
      }).subscribe({
        next: () => this._afterSave(`${this.modalProvider!.display_name} connection updated`),
        error: (err) => this._saveError(err),
      });
    }
  }

  private _afterSave(msg: string): void {
    this.toastr.success(msg);
    this.saving = false;
    this.closeModal();
    this.load();
  }
  private _saveError(err: any): void {
    this.toastr.error(err?.error?.detail || 'Failed to save connection');
    this.saving = false;
  }

  test(conn: Connection): void {
    this.testing[conn.connection_id] = true;
    delete this.testResult[conn.connection_id];
    this.svc.test(conn.connection_id).subscribe({
      next: (res) => {
        this.testing[conn.connection_id] = false;
        this.testResult[conn.connection_id] = res;
        res.ok ? this.toastr.success(res.message) : this.toastr.warning(res.message);
      },
      error: (err) => {
        this.testing[conn.connection_id] = false;
        const message = err?.error?.detail || 'Test failed';
        this.testResult[conn.connection_id] = { ok: false, message };
        this.toastr.error(message);
      },
    });
  }

  providerSupportsVerify(key: string): boolean {
    return !!this.providers.find(p => p.provider_key === key)?.supports_verify;
  }

  confirmDelete(id: number): void { this.deleteConfirmId = id; }
  cancelDelete(): void { this.deleteConfirmId = null; }
  executeDelete(id: number): void {
    this.svc.remove(id).subscribe({
      next: () => { this.toastr.success('Connection deleted'); this.deleteConfirmId = null; this.load(); },
      error: (err) => { this.toastr.error(err?.error?.detail || 'Failed to delete'); this.deleteConfirmId = null; },
    });
  }

  trackByProvider(_: number, p: ConnProvider): string { return p.provider_key; }
  trackByConn(_: number, c: Connection): number { return c.connection_id; }
}
