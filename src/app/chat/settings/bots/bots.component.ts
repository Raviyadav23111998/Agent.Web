import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { BotAdminService, Bot, BotCreateResponse, BotRule } from '../../services/bot-admin.service';
import { BrainService } from '../../services/brain.service';
import { AppAdminService, ApplicationDTO } from '../../services/app-admin.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-bots',
  templateUrl: './bots.component.html',
  styleUrls: ['./bots.component.scss'],
  standalone: false
})
export class BotsComponent implements OnInit {
  bots: Bot[] = [];
  documents: any[] = [];
  apps: ApplicationDTO[] = [];
  isLoading = false;

  isEditorOpen = false;
  editingBotId: number | null = null;
  currentBotApiToken: string | null = null;
  newBotToken: string | null = null;
  activeTab = 'core';

  botForm: FormGroup;
  rulesFormArray: FormArray;

  get filteredDocuments(): any[] {
    const selectedAppId = this.botForm?.get('app_id')?.value;
    if (!selectedAppId) return this.documents;
    return this.documents.filter(d => {
      const docAppId = d.app_id || d.appId;
      return !docAppId || docAppId === selectedAppId;
    });
  }

  constructor(
    private botService: BotAdminService,
    private brainService: BrainService,
    private appService: AppAdminService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.rulesFormArray = this.fb.array([]);
    this.botForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      system_prompt: ['You are a helpful assistant.', Validators.required],
      welcome_message: ['Hi! How can I help you today?'],
      model: [''],
      theme_color: ['#3b82f6'],
      max_context_docs: [5],
      allowed_domains: ['*'],
      is_active: [true],
      app_id: [null]
    });
  }

  ngOnInit() {
    this.loadBots();
    this.loadDocuments();
    this.loadApps();
  }

  loadBots() {
    this.isLoading = true;
    this.botService.listBots().subscribe({
      next: (bots) => {
        this.bots = bots;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  loadDocuments(appId?: number) {
    this.brainService.getDocuments(appId).subscribe({
      next: (docs) => this.documents = docs
    });
  }

  loadApps() {
    this.appService.listApps().subscribe({
      next: (apps) => this.apps = apps,
      error: () => {}
    });
  }

  openEditor(bot?: Bot) {
    this.isEditorOpen = true;
    this.activeTab = 'core';
    this.rulesFormArray.clear();

    if (bot) {
      this.editingBotId = bot.bot_id;
      this.currentBotApiToken = bot.api_token_prefix || null;
      this.newBotToken = null;
      this.botForm.patchValue({
        name: bot.name,
        description: bot.description,
        system_prompt: bot.system_prompt,
        welcome_message: bot.welcome_message,
        model: bot.model,
        theme_color: bot.theme_color,
        max_context_docs: bot.max_context_docs,
        allowed_domains: bot.allowed_domains.join(', '),
        is_active: bot.is_active,
        app_id: bot.app_id || null
      });

      this.botService.getRules(bot.bot_id).subscribe(rules => {
        rules.forEach(r => this.addRuleFormGroup(r));
      });
    } else {
      this.editingBotId = null;
      this.currentBotApiToken = null;
      this.newBotToken = null;
      this.botForm.reset({
        system_prompt: 'You are a helpful assistant.',
        welcome_message: 'Hi! How can I help you today?',
        theme_color: '#3b82f6',
        max_context_docs: 5,
        allowed_domains: '*',
        is_active: true,
        app_id: null
      });
      this.addRuleFormGroup();
    }
  }

  closeEditor() {
    this.isEditorOpen = false;
    this.newBotToken = null;
  }

  get rulesControls() {
    return this.rulesFormArray.controls;
  }

  addRuleFormGroup(rule?: BotRule) {
    this.rulesFormArray.push(this.fb.group({
      rule_type: [rule?.rule_type || 'url_contains', Validators.required],
      pattern: [rule?.pattern || '', Validators.required],
      instruction: [rule?.instruction || '', Validators.required],
      priority: [rule?.priority || 0],
      is_active: [rule?.is_active ?? true]
    }));
  }

  removeRule(index: number) {
    this.rulesFormArray.removeAt(index);
  }

  saveBot() {
    if (this.botForm.invalid) return;

    const val = this.botForm.value;
    const req = {
      ...val,
      allowed_domains: val.allowed_domains.split(',').map((d: string) => d.trim()).filter((d: string) => d)
    };

    const saveObs = this.editingBotId
      ? this.botService.updateBot(this.editingBotId, req)
      : this.botService.createBot(req);

    saveObs.subscribe({
      next: (bot: any) => {

        this.botService.setRules(bot.bot_id, this.rulesFormArray.value).subscribe();

        if (!this.editingBotId && bot.api_token) {

          this.newBotToken = bot.api_token;
          this.currentBotApiToken = bot.api_token;
          this.editingBotId = bot.bot_id;
          this.activeTab = 'security';
          this.toastr.success('Bot created! Copy your API token now — it won\'t be shown again.');
          this.loadBots();
        } else {
          this.toastr.success('Bot updated successfully');
          this.closeEditor();
          this.loadBots();
        }
      },
      error: (err) => {
        this.toastr.error(err.error?.detail || 'Failed to save bot');
      }
    });
  }

  deleteBot(id: number) {
    if (confirm('Are you sure you want to delete this bot?')) {
      this.botService.deleteBot(id).subscribe(() => this.loadBots());
    }
  }

  copyScript(token?: string) {
    const t = token || this.newBotToken;
    if (!t) {
      this.toastr.warning('Token not available. Copy it from the Security tab after creating a bot.');
      return;
    }

    const apiBase = environment.apiUrl;
    const tenant = window.location.hostname;
    const script = `<script src="${apiBase}/bot/embed.js?tenant=${tenant}" data-key="YOUR_PUBLISHABLE_KEY"></script>`;
    navigator.clipboard.writeText(script);
    this.toastr.success('Embed script copied to clipboard!');
  }

  copyApiToken() {
    const token = this.newBotToken || this.currentBotApiToken;
    if (token) {
      navigator.clipboard.writeText(token);
      this.toastr.success('API Token copied to clipboard!');
    }
  }
}
