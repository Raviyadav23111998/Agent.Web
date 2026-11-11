import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LlmConfigService, LlmConfig } from '../../services/llm-config.service';
import { SystemService, Code } from '../../../services/system.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-llm-settings',
  templateUrl: './llm-settings.component.html',
  styleUrls: ['./llm-settings.component.scss'],
  standalone: false
})
export class LlmSettingsComponent implements OnInit, OnDestroy {
  llmForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  successMessage = '';
  errorMessage = '';

  providerOptions: Code[] = [];
  allModels: Code[] = [];
  filteredModels: Code[] = [];
  baseUrls: Code[] = [];
  private codesSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private llmConfigService: LlmConfigService,
    private systemService: SystemService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCodes();
    this.loadConfig();

    this.llmForm.get('provider')?.valueChanges.subscribe(providerValue => {
      this.filterModels(providerValue);
      this.autoFillBaseUrl(providerValue);
    });
  }

  ngOnDestroy(): void {
    if (this.codesSub) this.codesSub.unsubscribe();
  }

  private initForm(): void {
    this.llmForm = this.fb.group({
      provider: ['', Validators.required],
      model: ['', Validators.required],
      base_url: [''],
      api_key: [''],
      provider_order: [''],
      max_tokens: ['16000'],
      temperature: ['0.7']
    });
  }

  private loadCodes(): void {
    this.systemService.loadAllCodes().subscribe();
    this.codesSub = this.systemService.codes$.subscribe(codes => {
      this.providerOptions = codes.filter(c => c.code_type_name === 'LLM_PROVIDER' || c.codeTypeName === 'LLM_PROVIDER');
      this.allModels = codes.filter(c => c.code_type_name === 'LLM_MODEL' || c.codeTypeName === 'LLM_MODEL');
      this.baseUrls = codes.filter(c => c.code_type_name === 'LLM_BASE_URL' || c.codeTypeName === 'LLM_BASE_URL');

      const currentProvider = this.llmForm.get('provider')?.value;
      if (currentProvider) {
        this.filterModels(currentProvider);
      }
    });
  }

  private filterModels(providerValue: string): void {
    const provider = this.providerOptions.find(p => p.code === providerValue);
    if (provider) {
      const pId = provider.codeId || (provider as any).code_id;
      this.filteredModels = this.allModels.filter(m => m.parent_id === pId || m.parentId === pId);
    } else {
      this.filteredModels = [];
    }
  }

  private autoFillBaseUrl(providerValue: string): void {
    const provider = this.providerOptions.find(p => p.code === providerValue);
    if (provider) {
      const pId = provider.codeId || (provider as any).code_id;
      const defaultUrl = this.baseUrls.find(u => u.parent_id === pId || u.parentId === pId);
      if (defaultUrl) {
        this.llmForm.patchValue({ base_url: defaultUrl.value });
      }
    }
  }

  private loadConfig(): void {
    this.isLoading = true;
    this.llmConfigService.getConfig().subscribe({
      next: (config: LlmConfig) => {
        this.llmForm.patchValue(config, { emitEvent: false });
        if (config.provider) {
          this.filterModels(config.provider);
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Failed to load configuration.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  syncOpenRouter(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.llmConfigService.syncOpenRouterModels().subscribe({
      next: (res) => {
        this.successMessage = 'Successfully synced real models from OpenRouter! Refreshing UI...';

        this.systemService.loadAllCodes().subscribe(() => {
          this.loadConfig();
        });
      },
      error: (err) => {
        this.errorMessage = 'Failed to sync models from OpenRouter.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  saveConfig(): void {
    if (this.llmForm.invalid) {
      this.llmForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';

    const payload = { ...this.llmForm.value };

    if (payload.api_key && payload.api_key.startsWith('*')) {
      delete payload.api_key;
    }

    this.llmConfigService.updateConfig(payload).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.successMessage = res.message || 'Configuration updated successfully! The system has been hot-reloaded.';

        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = err.error?.detail || err.error?.message || 'Failed to update configuration.';
        console.error(err);
      }
    });
  }
}
