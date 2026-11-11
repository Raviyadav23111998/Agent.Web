import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LlmProfilesService, LlmProfile, Budget, UsageRow }
  from '../../chat/services/llm-profiles.service';
import { ConfirmService } from '../../common/ui/confirm.service';
import { FormDialogService } from '../../common/ui/form-dialog.service';
import { AppAdminService, ApplicationDTO } from '../../chat/services/app-admin.service';
import { UserService } from '../../services/user.service';
import { UserSummary } from '../../models/user.model';

/** Known OpenAI-compatible providers: picking one pre-fills the endpoint and
 *  offers its common models — free-typing stays available via "Custom". */
interface ProviderPreset {
  value: string;
  label: string;
  baseUrl: string;
  models: string[];
}

const PROVIDER_PRESETS: ProviderPreset[] = [
  { value: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'] },
  { value: 'zhipu', label: 'Zhipu (GLM)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    models: ['glm-5.2', 'glm-5.2-air', 'glm-4.6'] },
  { value: 'anthropic', label: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com/v1/messages',
    models: ['claude-sonnet-4-6', 'claude-haiku-4-5', 'claude-opus-4-6'] },
  { value: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o', 'gpt-4o-mini', 'o4-mini'] },
  { value: 'openrouter', label: 'OpenRouter (any model)', baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    models: ['deepseek/deepseek-v4-flash', 'anthropic/claude-sonnet-4', 'openai/gpt-4o-mini', 'zhipu/glm-5.2'] },
  { value: 'google', label: 'Google (Gemini)', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash'] },
  { value: 'moonshot', label: 'Moonshot (Kimi)', baseUrl: 'https://api.moonshot.ai/v1/chat/completions',
    models: ['kimi-k2'] },
  { value: 'qwen', label: 'Alibaba (Qwen)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    models: ['qwen-max', 'qwen-plus'] },
  { value: 'xai', label: 'xAI (Grok)', baseUrl: 'https://api.x.ai/v1/chat/completions',
    models: ['grok-4'] },
  { value: 'mistral', label: 'Mistral', baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    models: ['mistral-large-latest'] },
  { value: 'custom', label: 'Custom (OpenAI-compatible)', baseUrl: '', models: [] },
];

@Component({
  selector: 'app-llm-profiles',
  templateUrl: './llm-profiles.component.html',
  styleUrls: ['./llm-profiles.component.scss'],
  standalone: false
})
export class LlmProfilesComponent implements OnInit {
  tab: 'profiles' | 'budgets' | 'usage' = 'profiles';

  isLoading = false;
  loadError = false;
  errorMessage = '';
  successMessage = '';

  profiles: LlmProfile[] = [];
  budgets: Budget[] = [];
  apps: ApplicationDTO[] = [];
  users: UserSummary[] = [];

  providerPresets = PROVIDER_PRESETS;
  /** true = the Model field is a free-text input (unknown provider/model) */
  modelCustom = false;
  fallbackCustom = false;

  // Profile editor
  @ViewChild('profileTpl', { static: true }) profileTpl!: TemplateRef<any>;
  editing: LlmProfile | null = null;
  profileForm!: FormGroup;
  isSaving = false;

  // Budget editor
  @ViewChild('budgetTpl', { static: true }) budgetTpl!: TemplateRef<any>;
  budgetForm!: FormGroup;

  // Usage
  usageRows: UsageRow[] = [];
  usageGroupBy = 'user';
  usageDays = 30;
  usageLoading = false;

  constructor(
    private svc: LlmProfilesService,
    private fb: FormBuilder,
    private confirm: ConfirmService,
    public formDialog: FormDialogService,
    private appService: AppAdminService,
    private userService: UserService,
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      provider: ['', Validators.required],
      model: ['', Validators.required],
      base_url: ['', Validators.required],
      api_key: [''],
      fallback_model: [''],
      temperature: [null],
      max_tokens: [null],
      reasoning_effort: [''],
    });
    this.budgetForm = this.fb.group({
      scope_type: ['user', Validators.required],
      scope_id: [null],
      win: ['day', Validators.required],
      max_tokens: [0],
      max_usd: [0],
      action: ['block', Validators.required],
    });
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.loadError = false;
    forkJoin({
      profiles: this.svc.listProfiles(),
      budgets: this.svc.listBudgets(),
      apps: this.appService.listApps(),
      // Users feed the budget scope dropdown — optional, never fail the page.
      users: this.userService.getUsersDdl().pipe(catchError(() => of([] as UserSummary[]))),
    }).subscribe({
      next: ({ profiles, budgets, apps, users }) => {
        this.profiles = profiles;
        this.budgets = budgets;
        this.apps = apps || [];
        this.users = users || [];
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; this.loadError = true; },
    });
  }

  // ── Profiles ──────────────────────────────────────────────────────────
  preset(provider: string | null | undefined): ProviderPreset | undefined {
    return PROVIDER_PRESETS.find(x => x.value === (provider || '').toLowerCase());
  }

  /** Options for the Model dropdown: the provider's catalog plus the value
   *  currently saved on the profile (so editing older/custom rows works). */
  modelOptions(): string[] {
    const opts = [...(this.preset(this.profileForm?.value?.provider)?.models || [])];
    const current = this.profileForm?.value?.model;
    if (current && !opts.includes(current)) opts.unshift(current);
    return opts;
  }

  onProviderChange(): void {
    const p = this.preset(this.profileForm.value.provider);
    // Pre-fill the endpoint when it's empty or still another preset's URL —
    // never overwrite a hand-edited one.
    const base = this.profileForm.value.base_url;
    const isPresetUrl = !base || PROVIDER_PRESETS.some(x => x.baseUrl && x.baseUrl === base);
    if (p && isPresetUrl) this.profileForm.patchValue({ base_url: p.baseUrl });
    this.modelCustom = !p || p.models.length === 0;
    if (p && p.models.length && !p.models.includes(this.profileForm.value.model)) {
      this.profileForm.patchValue({ model: '' });
    }
    if (p && p.models.length && this.profileForm.value.fallback_model
        && !p.models.includes(this.profileForm.value.fallback_model)) {
      this.profileForm.patchValue({ fallback_model: '' });
      this.fallbackCustom = false;
    }
  }

  onModelSelect(value: string): void {
    if (value === '__custom__') {
      this.modelCustom = true;
      this.profileForm.patchValue({ model: '' });
    } else {
      this.profileForm.patchValue({ model: value });
    }
  }

  onFallbackSelect(value: string): void {
    if (value === '__custom__') {
      this.fallbackCustom = true;
      this.profileForm.patchValue({ fallback_model: '' });
    } else {
      this.fallbackCustom = false;
      this.profileForm.patchValue({ fallback_model: value });
    }
  }

  openEditor(p?: LlmProfile): void {
    this.editing = p || null;
    this.profileForm.reset({
      name: p?.name || '', provider: (p?.provider || '').toLowerCase(),
      model: p?.model || '', base_url: p?.base_url || '',
      api_key: p?.api_key || '', fallback_model: p?.fallback_model || '',
      temperature: p?.temperature ?? null, max_tokens: p?.max_tokens ?? null,
      reasoning_effort: p?.reasoning_effort || '',
    });
    const preset = this.preset(p?.provider);
    this.modelCustom = !!p && (!preset || preset.models.length === 0);
    this.fallbackCustom = false;
    this.formDialog.open({
      title: this.editing ? 'Edit profile' : 'New model profile',
      template: this.profileTpl,
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    this.isSaving = true;
    const body = { ...this.profileForm.value };
    if (body.api_key && body.api_key.startsWith('*')) delete body.api_key;
    const req = this.editing?.profile_id
      ? this.svc.updateProfile(this.editing.profile_id, body)
      : this.svc.createProfile(body);
    req.subscribe({
      next: () => {
        this.isSaving = false;
        this.formDialog.close();
        this.flash(this.editing ? 'Profile updated.' : 'Profile created.');
        this.load();
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = err.error?.detail || 'Failed to save profile.';
      },
    });
  }

  async deleteProfile(p: LlmProfile): Promise<void> {
    if (p.is_default) return;
    const ok = await this.confirm.ask({
      title: 'Delete model profile?',
      message: `Apps and users bound to “${p.name}” fall back to the default profile.`,
      confirmText: 'Delete', variant: 'danger',
    });
    if (!ok) return;
    this.svc.deleteProfile(p.profile_id!).subscribe({
      next: () => { this.flash('Profile deleted.'); this.load(); },
      error: (err) => this.errorMessage = err.error?.detail || 'Delete failed.',
    });
  }

  bindApp(app: ApplicationDTO, profileId: string): void {
    const pid = profileId ? Number(profileId) : null;
    this.svc.bind('app', app.appId, pid).subscribe({
      next: () => this.flash(`“${app.name}” → ${pid ? this.profileName(pid) : 'default'}`),
      error: (err) => this.errorMessage = err.error?.detail || 'Binding failed.',
    });
  }

  profileName(id: number | null | undefined): string {
    return this.profiles.find(p => p.profile_id === id)?.name || 'default';
  }

  // ── Budgets ───────────────────────────────────────────────────────────
  openBudgetEditor(b?: Budget): void {
    this.budgetForm.reset(b ? { ...b } : {
      scope_type: 'user', scope_id: null, win: 'day',
      max_tokens: 0, max_usd: 0, action: 'block',
    });
    this.formDialog.open({ title: 'Budget', template: this.budgetTpl });
  }

  saveBudget(): void {
    if (this.budgetForm.invalid) { this.budgetForm.markAllAsTouched(); return; }
    const b = { ...this.budgetForm.value };
    if (b.scope_type !== 'tenant' && (b.scope_id === null || b.scope_id === '')) {
      this.errorMessage = 'Scope id is required for user/app budgets.';
      return;
    }
    if (!(+b.max_tokens > 0) && !(+b.max_usd > 0)) {
      this.errorMessage = 'Set a token cap, a $ cap, or both.';
      return;
    }
    this.svc.upsertBudget(b).subscribe({
      next: () => {
        this.formDialog.close();
        this.flash('Budget saved.');
        this.load();
      },
      error: (err) => this.errorMessage = err.error?.detail || 'Failed to save budget.',
    });
  }

  async deleteBudget(b: Budget): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Remove budget?',
      message: 'Usage in this scope becomes unlimited again.',
      confirmText: 'Remove', variant: 'danger',
    });
    if (!ok) return;
    this.svc.deleteBudget(b.budget_id!).subscribe({
      next: () => { this.flash('Budget removed.'); this.load(); },
      error: (err) => this.errorMessage = err.error?.detail || 'Delete failed.',
    });
  }

  userName(id: number | null | undefined): string {
    const u = this.users.find(x => x.userId === id);
    return u ? (u.name || u.email || `#${id}`) : `#${id}`;
  }

  scopeLabel(b: Budget): string {
    if (b.scope_type === 'tenant') return 'Whole organization';
    if (b.scope_type === 'app') {
      const app = this.apps.find(a => a.appId === b.scope_id);
      return app ? `App: ${app.name}` : `App #${b.scope_id}`;
    }
    return `User: ${this.userName(b.scope_id)}`;
  }

  // ── Usage ─────────────────────────────────────────────────────────────
  loadUsage(): void {
    this.usageLoading = true;
    this.svc.usage(this.usageGroupBy, this.usageDays).subscribe({
      next: (rows) => { this.usageRows = rows; this.usageLoading = false; },
      error: () => { this.usageRows = []; this.usageLoading = false; },
    });
  }

  setTab(t: 'profiles' | 'budgets' | 'usage'): void {
    this.tab = t;
    if (t === 'usage' && this.usageRows.length === 0) this.loadUsage();
  }

  usageGrpLabel(row: UsageRow): string {
    if (this.usageGroupBy === 'app') {
      const app = this.apps.find(a => a.appId === row.grp);
      return app ? app.name : (row.grp == null ? '(system)' : `App #${row.grp}`);
    }
    if (this.usageGroupBy === 'user') {
      return row.grp == null ? '(system / crons)' : `User: ${this.userName(row.grp)}`;
    }
    return String(row.grp ?? '—');
  }

  private flash(msg: string): void {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 4000);
  }
}
