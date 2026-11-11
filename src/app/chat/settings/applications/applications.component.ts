import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ConfirmService } from '../../../common/ui/confirm.service';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { AppAdminService, ApplicationDTO, ApplicationCreateRequest, ApplicationUpdateRequest, PersonaDTO, PersonaCreateRequest, PersonaUpdateRequest, ScopePolicy } from '../../services/app-admin.service';
import { ConnectionService, Connection } from '../../../services/connection.service';

@Component({
  selector: 'app-applications',
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.scss'],
  standalone: false
})
export class ApplicationsComponent implements OnInit {
  loading = true;
  saving = false;
  deleting = false;

  apps: ApplicationDTO[] = [];
  selectedApp: ApplicationDTO | null = null;
  isEditing = false;
  isCreating = false;
  appBindings: Record<number, Connection[]> = {};

  appForm: FormGroup;

  activeTab: 'details' | 'personas' = 'details';
  personas: PersonaDTO[] = [];
  selectedPersona: PersonaDTO | null = null;
  isEditingPersona = false;
  isCreatingPersona = false;
  availableTools: string[] = [];
  personaForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private appService: AppAdminService,
    private connectionService: ConnectionService,
    private confirm: ConfirmService
  ) {
    this.appForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      description: ['', Validators.maxLength(2000)],
      appType: ['internal', Validators.required],
      llmModel: [''],
      maxTokensDay: [0],
      maxDocuments: [0],
      isActive: [true]
    });

    this.personaForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      identityPrompt: ['', Validators.required],
      constraintsPrompt: ['', Validators.required],
      communicationPrompt: ['', Validators.required],
      allowedTools: [[]],
      disablePassivityCorrection: [true],
      isDefault: [false],
      isActive: [true],
      approvalMode: [''],
      inputGuardrailPrompt: [''],
      executionPolicies: [''],
      outputDlpPatterns: [''],
      outputSemanticRules: [''],
      // Input scope rail (persona.scope_policy) — structured, not raw JSON.
      scopeRestrict: [false],
      scopeDomain: [''],
      scopeRefusal: [''],
      scopeFailOpen: [true]
    });
  }

  ngOnInit(): void {
    this.loadApps();
    this.loadAvailableTools();
  }

  loadAvailableTools(): void {
    this.appService.getAvailableTools().subscribe({
      next: (tools) => this.availableTools = tools,
      error: () => this.toastr.error('Failed to load available tools')
    });
  }

  loadApps(): void {
    this.loading = true;
    this.appService.listApps().subscribe({
      next: (apps) => {
        this.apps = apps;
        this.loading = false;
        this.loadBindings();
      },
      error: () => {
        this.toastr.error('Failed to load applications');
        this.loading = false;
      }
    });
  }

  loadBindings(): void {

    const byUuid: Record<string, number> = {};
    for (const a of this.apps) byUuid[a.appUuid] = a.appId;
    this.connectionService.list().subscribe({
      next: (conns) => {
        this.appBindings = {};
        for (const c of conns) {
          if (c.scope !== 'app') continue;
          const appId = byUuid[c.owner_ref];
          if (appId === undefined) continue;
          (this.appBindings[appId] ||= []).push(c);
        }
      },
      error: () => {}
    });
  }

  getAppBindings(appId: number): Connection[] {
    return this.appBindings[appId] || [];
  }

  getProviderIcon(key: string): string {
    const icons: Record<string, string> = {
      jira: '🔗', m365: '📧', smtp: '📮', imap: '📥',
      confluence: '📄', slack: '💬', openrouter: '🤖',
      google_gemini: '✨', neo4j: '🔵', elasticsearch: '🔍',
      telegram: '📱', platform_security: '🔒'
    };
    return icons[key] || '🔌';
  }

  showCreateForm(): void {
    this.isCreating = true;
    this.isEditing = false;
    this.selectedApp = null;
    this.activeTab = 'details';
    this.appForm.reset({
      appType: 'internal',
      maxTokensDay: 0,
      maxDocuments: 0,
      isActive: true
    });
  }

  editApp(app: ApplicationDTO): void {
    this.selectedApp = app;
    this.isEditing = true;
    this.isCreating = false;
    this.activeTab = 'details';
    this.appForm.patchValue({
      name: app.name,
      description: app.description || '',
      appType: app.appType || 'internal',
      llmModel: app.llmModel || '',
      maxTokensDay: app.maxTokensDay || 0,
      maxDocuments: app.maxDocuments || 0,
      isActive: app.isActive
    });
    this.loadPersonas(app.appId);
  }

  cancelForm(): void {
    this.isCreating = false;
    this.isEditing = false;
    this.selectedApp = null;
    this.activeTab = 'details';
    this.appForm.reset({ appType: 'internal', maxTokensDay: 0, maxDocuments: 0, isActive: true });
    this.cancelPersonaForm();
  }

  saveApp(): void {
    if (this.appForm.invalid) {
      this.toastr.warning('Please fill in all required fields');
      return;
    }

    this.saving = true;
    const val = this.appForm.value;

    if (this.isCreating) {
      const req: ApplicationCreateRequest = {
        name: val.name,
        description: val.description,
        appType: val.appType,
        llmModel: val.llmModel || undefined,
        maxTokensDay: val.maxTokensDay || 0,
        maxDocuments: val.maxDocuments || 0
      };
      this.appService.createApp(req).subscribe({
        next: () => {
          this.toastr.success('Application created successfully');
          this.cancelForm();
          this.saving = false;
          this.loadApps();
        },
        error: (err) => {
          this.toastr.error(err.error?.detail || 'Failed to create application');
          this.saving = false;
        }
      });
    } else if (this.isEditing && this.selectedApp) {
      const req: ApplicationUpdateRequest = {
        name: val.name,
        description: val.description,
        appType: val.appType,
        llmModel: val.llmModel || undefined,
        maxTokensDay: val.maxTokensDay || 0,
        maxDocuments: val.maxDocuments || 0,
        isActive: val.isActive
      };
      this.appService.updateApp(this.selectedApp.appId, req).subscribe({
        next: () => {
          this.toastr.success('Application updated successfully');
          this.cancelForm();
          this.saving = false;
          this.loadApps();
        },
        error: (err) => {
          this.toastr.error(err.error?.detail || 'Failed to update application');
          this.saving = false;
        }
      });
    }
  }

  async deleteApp(app: ApplicationDTO): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete application?',
      message: `“${app.name}” will be soft-deleted. Bots and crons using it may stop working.`,
      confirmText: 'Delete', variant: 'danger',
    });
    if (!ok) return;

    this.deleting = true;
    this.appService.deleteApp(app.appId).subscribe({
      next: () => {
        this.toastr.success(`"${app.name}" deleted`);
        this.deleting = false;
        this.loadApps();
      },
      error: (err) => {
        this.toastr.error(err.error?.detail || 'Failed to delete application');
        this.deleting = false;
      }
    });
  }

  loadPersonas(appId: number): void {
    this.appService.listPersonas(appId).subscribe({
      next: (personas) => this.personas = personas,
      error: () => this.toastr.error('Failed to load personas')
    });
  }

  showCreatePersonaForm(): void {
    this.isCreatingPersona = true;
    this.isEditingPersona = false;
    this.selectedPersona = null;
    this.showAdvancedPolicy = false;
    this.personaForm.reset({
      disablePassivityCorrection: true,
      isDefault: false,
      isActive: true,
      allowedTools: [],
      approvalMode: '',
      inputGuardrailPrompt: '',
      executionPolicies: '',
      outputDlpPatterns: '',
      outputSemanticRules: '',
      scopeRestrict: false,
      scopeDomain: '',
      scopeRefusal: '',
      scopeFailOpen: true
    });
  }

  editPersona(persona: PersonaDTO): void {
    this.selectedPersona = persona;
    this.isEditingPersona = true;
    this.isCreatingPersona = false;
    this.showAdvancedPolicy = false;
    this.personaForm.patchValue({
      name: persona.name,
      description: persona.description || '',
      identityPrompt: persona.identityPrompt,
      constraintsPrompt: persona.constraintsPrompt,
      communicationPrompt: persona.communicationPrompt,
      allowedTools: persona.allowedTools || [],
      disablePassivityCorrection: persona.disablePassivityCorrection,
      isDefault: persona.isDefault,
      isActive: persona.isActive,
      approvalMode: persona.approvalMode || '',
      inputGuardrailPrompt: persona.inputGuardrailPrompt || '',
      executionPolicies: persona.executionPolicies ? JSON.stringify(persona.executionPolicies, null, 2) : '',
      outputDlpPatterns: persona.outputDlpPatterns ? JSON.stringify(persona.outputDlpPatterns, null, 2) : '',
      outputSemanticRules: persona.outputSemanticRules || '',
      scopeRestrict: (persona.scopePolicy?.mode === 'restrict'),
      scopeDomain: persona.scopePolicy?.domain || '',
      scopeRefusal: persona.scopePolicy?.refusal_message || '',
      scopeFailOpen: persona.scopePolicy?.fail_open !== false
    });
  }

  cancelPersonaForm(): void {
    this.isCreatingPersona = false;
    this.isEditingPersona = false;
    this.selectedPersona = null;
    this.personaForm.reset({ allowedTools: [], disablePassivityCorrection: true, isDefault: false, isActive: true, approvalMode: '', inputGuardrailPrompt: '', executionPolicies: '', outputDlpPatterns: '', outputSemanticRules: '', scopeRestrict: false, scopeDomain: '', scopeRefusal: '', scopeFailOpen: true });
  }

  savePersona(): void {
    if (this.personaForm.invalid || !this.selectedApp) {
      this.toastr.warning('Please fill in all required fields');
      return;
    }

    const val = this.personaForm.value;

    let execPolicies: any, dlpPatterns: any;
    try {
      execPolicies = val.executionPolicies ? JSON.parse(val.executionPolicies) : undefined;
    } catch {
      this.toastr.error('Execution Policies contains invalid JSON. Check the Advanced editor.');
      return;
    }
    try {
      dlpPatterns = val.outputDlpPatterns ? JSON.parse(val.outputDlpPatterns) : undefined;
    } catch {
      this.toastr.error('Output DLP Patterns contains invalid JSON.');
      return;
    }

    // Input scope rail: build the structured scope_policy. Sending {mode:'off'}
    // when unchecked is deliberate — it clears a previously-restricted persona.
    const scopeDomain = (val.scopeDomain || '').trim();
    if (val.scopeRestrict && !scopeDomain) {
      this.toastr.error('Scope: describe the domain to restrict this persona to, or turn off "Restrict to a domain".');
      return;
    }
    const scopePolicy: ScopePolicy = val.scopeRestrict
      ? {
          mode: 'restrict',
          domain: scopeDomain,
          refusal_message: (val.scopeRefusal || '').trim() || undefined,
          fail_open: val.scopeFailOpen !== false
        }
      : { mode: 'off' };

    this.saving = true;

    if (this.isCreatingPersona) {
      const req: PersonaCreateRequest = {
        name: val.name,
        description: val.description,
        identityPrompt: val.identityPrompt,
        constraintsPrompt: val.constraintsPrompt,
        communicationPrompt: val.communicationPrompt,
        allowedTools: val.allowedTools || [],
        disablePassivityCorrection: val.disablePassivityCorrection,
        isDefault: val.isDefault,
        approvalMode: val.approvalMode || undefined,
        inputGuardrailPrompt: val.inputGuardrailPrompt || undefined,
        executionPolicies: execPolicies,
        outputDlpPatterns: dlpPatterns,
        outputSemanticRules: val.outputSemanticRules || undefined,
        scopePolicy: scopePolicy
      };
      this.appService.createPersona(this.selectedApp.appId, req).subscribe({
        next: () => {
          this.toastr.success('Persona created successfully');
          this.cancelPersonaForm();
          this.saving = false;
          this.loadPersonas(this.selectedApp!.appId);
        },
        error: (err) => {
          this.toastr.error(err.error?.detail || 'Failed to create persona');
          this.saving = false;
        }
      });
    } else if (this.isEditingPersona && this.selectedPersona) {
      const req: PersonaUpdateRequest = {
        name: val.name,
        description: val.description,
        identityPrompt: val.identityPrompt,
        constraintsPrompt: val.constraintsPrompt,
        communicationPrompt: val.communicationPrompt,
        allowedTools: val.allowedTools || [],
        disablePassivityCorrection: val.disablePassivityCorrection,
        isDefault: val.isDefault,
        isActive: val.isActive,

        approvalMode: val.approvalMode ?? '',
        inputGuardrailPrompt: val.inputGuardrailPrompt || undefined,
        executionPolicies: execPolicies,
        outputDlpPatterns: dlpPatterns,
        outputSemanticRules: val.outputSemanticRules || undefined,
        scopePolicy: scopePolicy
      };
      this.appService.updatePersona(this.selectedPersona.personaId, req).subscribe({
        next: () => {
          this.toastr.success('Persona updated successfully');
          this.cancelPersonaForm();
          this.saving = false;
          this.loadPersonas(this.selectedApp!.appId);
        },
        error: (err) => {
          this.toastr.error(err.error?.detail || 'Failed to update persona');
          this.saving = false;
        }
      });
    }
  }

  async deletePersona(persona: PersonaDTO): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete persona?',
      message: `“${persona.name}” will be removed. Active bots using it may fail.`,
      confirmText: 'Delete', variant: 'danger',
    });
    if (!ok) return;

    this.deleting = true;
    this.appService.deletePersona(persona.personaId).subscribe({
      next: () => {
        this.toastr.success('Persona deleted');
        this.deleting = false;
        this.loadPersonas(this.selectedApp!.appId);
      },
      error: (err) => {
        this.toastr.error(err.error?.detail || 'Failed to delete persona');
        this.deleting = false;
      }
    });
  }

  toggleTool(tool: string): void {
    const currentTools = this.personaForm.get('allowedTools')?.value || [];
    const index = currentTools.indexOf(tool);
    if (index > -1) {
      currentTools.splice(index, 1);
    } else {
      currentTools.push(tool);
    }
    this.personaForm.patchValue({ allowedTools: currentTools });
  }

  hasTool(tool: string): boolean {
    return (this.personaForm.get('allowedTools')?.value || []).includes(tool);
  }

  showAdvancedPolicy = false;

  private parseExecPolicy(): any {
    const raw = this.personaForm.get('executionPolicies')?.value;
    if (!raw || !raw.trim()) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  }

  private writeExecPolicy(obj: any): void {
    const clean = obj || {};
    const str = Object.keys(clean).length ? JSON.stringify(clean, null, 2) : '';
    this.personaForm.patchValue({ executionPolicies: str });
  }

  get executionPolicyInvalid(): boolean {
    const raw = this.personaForm.get('executionPolicies')?.value;
    if (!raw || !raw.trim()) return false;
    try { JSON.parse(raw); return false; } catch { return true; }
  }

  get whitelistMode(): boolean {
    return this.parseExecPolicy()['$mode'] === 'whitelist';
  }

  toggleWhitelistMode(): void {
    const p = this.parseExecPolicy();
    if (p['$mode'] === 'whitelist') {
      delete p['$mode'];
    } else {
      p['$mode'] = 'whitelist';

      for (const t of (this.personaForm.get('allowedTools')?.value || [])) {
        const r = p[t];
        const denied = r && r['$deny'] === true;
        if (!denied && p[t] === undefined) p[t] = {};
      }
    }
    this.writeExecPolicy(p);
  }

  isToolExecutable(tool: string): boolean {
    const r = this.parseExecPolicy()[tool];
    if (this.whitelistMode) {
      return r !== undefined && !(r && r['$deny'] === true);
    }
    return !(r && r['$deny'] === true);
  }

  toolHasArgRules(tool: string): boolean {
    const r = this.parseExecPolicy()[tool];
    return !!(r && typeof r === 'object' &&
              Object.keys(r).some(k => k !== '$deny'));
  }

  toggleToolExecutable(tool: string): void {
    const p = this.parseExecPolicy();
    const existing = (p[tool] && typeof p[tool] === 'object') ? { ...p[tool] } : {};
    delete existing['$deny'];
    const argRules = existing;
    const turningOn = !this.isToolExecutable(tool);

    if (this.whitelistMode) {
      if (turningOn) {
        p[tool] = Object.keys(argRules).length ? argRules : {};
      } else {
        delete p[tool];
      }
    } else {
      if (turningOn) {
        if (Object.keys(argRules).length) p[tool] = argRules; else delete p[tool];
      } else {
        p[tool] = { ...argRules, '$deny': true };
      }
    }
    this.writeExecPolicy(p);
  }

  getAppTypeIcon(type: string): string {
    switch (type) {
      case 'chatbot': return '🤖';
      case 'internal': return '🧠';
      case 'api': return '⚡';
      default: return '📦';
    }
  }

  getAppTypeBadgeClass(type: string): string {
    switch (type) {
      case 'chatbot': return 'type-chatbot';
      case 'internal': return 'type-internal';
      case 'api': return 'type-api';
      default: return 'type-other';
    }
  }
}
