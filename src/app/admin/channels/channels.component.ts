import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ConfirmService } from '../../common/ui/confirm.service';
import { ChannelsService, TeamsStatus, VscodeStatus, VisualStudioStatus } from '../../services/channels.service';
import { ConnectionService, Connection } from '../../services/connection.service';
import { HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-channels',
  templateUrl: './channels.component.html',
  styleUrls: ['./channels.component.scss'],
  standalone: false,
})
export class ChannelsComponent implements OnInit {
  loading = true;
  teams: TeamsStatus | null = null;
  downloading = false;

  vscode: VscodeStatus | null = null;
  vscodeDownloading = false;

  visualstudio: VisualStudioStatus | null = null;
  visualstudioDownloading = false;

  telegramLoading = true;
  telegramConn: Connection | null = null;
  telegramToken = '';
  telegramSaving = false;
  telegramTesting = false;
  telegramBotName = '';

  tenantDomain = window.location.hostname;
  botEmbedSnippet = '';
  vscodeMarketplaceUrl = 'https://marketplace.visualstudio.com/items?itemName=storeglance.antigravity-agent';
  visualstudioMarketplaceUrl = 'https://marketplace.visualstudio.com/items?itemName=Storeglance.AntigravityAgent';

  constructor(
    private svc: ChannelsService,
    private conn: ConnectionService,
    private toastr: ToastrService,
    private confirm: ConfirmService,
  ) {}

  ngOnInit(): void {
    const apiBase = environment.apiUrl;
    this.botEmbedSnippet =
      `<script src="${apiBase}/bot/embed.js?tenant=${this.tenantDomain}" data-key="YOUR_PUBLISHABLE_KEY"></script>`;
    this.svc.getTeamsStatus().subscribe({
      next: (s) => { this.teams = s; this.loading = false; },
      error: () => { this.loading = false; },
    });
    this.svc.getVscodeStatus().subscribe({
      next: (s) => { this.vscode = s; if (s.marketplaceUrl) { this.vscodeMarketplaceUrl = s.marketplaceUrl; } },
      error: () => { /* card still shows the marketplace link */ },
    });
    this.svc.getVisualStudioStatus().subscribe({
      next: (s) => { this.visualstudio = s; if (s.marketplaceUrl) { this.visualstudioMarketplaceUrl = s.marketplaceUrl; } },
      error: () => { /* card still shows the marketplace link */ },
    });
    this.loadTelegram();
  }

  private loadTelegram(): void {
    this.telegramLoading = true;
    this.conn.list().subscribe({
      next: (rows) => {
        this.telegramConn =
          rows.find(c => c.provider_key === 'telegram' && c.scope === 'user') || null;
        this.telegramLoading = false;
      },
      error: () => { this.telegramLoading = false; },
    });
  }

  get telegramState(): 'connected' | 'error' | 'none' {
    if (!this.telegramConn) { return 'none'; }
    return this.telegramConn.status === 'error' ? 'error' : 'connected';
  }

  connectTelegram(): void {
    const token = this.telegramToken.trim();
    if (!token) {
      this.toastr.warning('Paste the bot token from @BotFather first.');
      return;
    }
    this.telegramSaving = true;
    this.conn.create({
      provider: 'telegram', scope: 'user', label: 'My Telegram bot',
      fields: { bot_token: token },
    }).subscribe({
      next: () => {
        this.telegramToken = '';
        this.telegramSaving = false;
        this.toastr.success('Bot connected — it goes live within a minute.');

        this.conn.list().subscribe(rows => {
          this.telegramConn =
            rows.find(c => c.provider_key === 'telegram' && c.scope === 'user') || null;
          if (this.telegramConn) { this.testTelegram(true); }
        });
      },
      error: (e) => {
        this.telegramSaving = false;
        this.toastr.error(e?.error?.detail || 'Could not connect the bot. Check the token.');
      },
    });
  }

  testTelegram(silent = false): void {
    if (!this.telegramConn) { return; }
    this.telegramTesting = true;
    this.conn.test(this.telegramConn.connection_id).subscribe({
      next: (r) => {
        this.telegramTesting = false;

        const m = /@([A-Za-z0-9_]+)/.exec(r.message || '');
        this.telegramBotName = m ? m[1] : '';
        if (this.telegramConn) { this.telegramConn.status = r.ok ? 'active' : 'error'; }
        if (!silent) {
          r.ok ? this.toastr.success(r.message) : this.toastr.error(r.message);
        }
      },
      error: () => {
        this.telegramTesting = false;
        if (!silent) { this.toastr.error('Could not reach Telegram to test the token.'); }
      },
    });
  }

  async disconnectTelegram(): Promise<void> {
    if (!this.telegramConn) { return; }
    const ok = await this.confirm.ask({
      title: 'Disconnect Telegram bot?',
      message: 'Your Telegram bot will stop responding until you reconnect it.',
      confirmText: 'Disconnect', variant: 'danger',
    });
    if (!ok) return;
    this.conn.remove(this.telegramConn.connection_id).subscribe({
      next: () => {
        this.telegramConn = null;
        this.telegramBotName = '';
        this.toastr.success('Telegram bot disconnected.');
      },
      error: () => this.toastr.error('Could not disconnect the bot.'),
    });
  }

  private saveBlob(res: HttpResponse<Blob>, fallbackName: string): void {
    const blob = res.body as Blob;
    const cd = res.headers.get('content-disposition') || '';
    const match = /filename="?([^"]+)"?/.exec(cd);
    const filename = match ? match[1] : fallbackName;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  downloadTeams(): void {
    if (!this.teams?.ready) {
      this.toastr.warning('Connect Microsoft 365 first (Connections → Microsoft 365) so the bot has an identity.');
      return;
    }
    this.downloading = true;
    this.svc.downloadTeamsApp().subscribe({
      next: (res) => {
        this.saveBlob(res, `${this.teams?.tenantDomain || 'agent'}-teams-app.zip`);
        this.downloading = false;
        this.toastr.success('Teams app package downloaded.');
      },
      error: () => {
        this.downloading = false;
        this.toastr.error('Could not build the Teams app. Ensure Microsoft 365 is connected.');
      },
    });
  }

  downloadVscode(): void {
    if (!this.vscode?.available) {
      this.toastr.warning('The extension package is not available on the server yet.');
      return;
    }
    this.vscodeDownloading = true;
    this.svc.downloadVscodeApp().subscribe({
      next: (res) => {
        this.saveBlob(res, this.vscode?.filename || 'antigravity-agent.vsix');
        this.vscodeDownloading = false;
        this.toastr.success('VS Code extension (.vsix) downloaded.');
      },
      error: () => {
        this.vscodeDownloading = false;
        this.toastr.error('Could not download the VS Code extension.');
      },
    });
  }

  downloadVisualStudio(): void {
    if (!this.visualstudio?.available) {
      this.toastr.warning('The Visual Studio extension package is not available on the server yet.');
      return;
    }
    this.visualstudioDownloading = true;
    this.svc.downloadVisualStudioApp().subscribe({
      next: (res) => {
        this.saveBlob(res, this.visualstudio?.filename || 'AntigravityAgent.vsix');
        this.visualstudioDownloading = false;
        this.toastr.success('Visual Studio extension (.vsix) downloaded.');
      },
      error: () => {
        this.visualstudioDownloading = false;
        this.toastr.error('Could not download the Visual Studio extension.');
      },
    });
  }

  copy(text: string, label: string): void {
    navigator.clipboard.writeText(text);
    this.toastr.success(`${label} copied to clipboard`);
  }
}
