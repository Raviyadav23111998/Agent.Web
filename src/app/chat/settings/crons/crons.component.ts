import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CronAdminService, CronJob } from '../../services/cron-admin.service';
import { AppAdminService, ApplicationDTO, PersonaDTO } from '../../services/app-admin.service';
import { ToastrService } from 'ngx-toastr';
import { ConfirmService } from '../../../common/ui/confirm.service';

@Component({
  selector: 'app-crons',
  templateUrl: './crons.component.html',
  styleUrls: ['./crons.component.scss'],
  standalone: false
})
export class CronsComponent implements OnInit {
  crons: CronJob[] = [];
  apps: ApplicationDTO[] = [];
  personas: PersonaDTO[] = [];        // active editor's persona list
  personaNameCache: Record<number, string> = {};  // persona_id → name (for cards)
  isLoading = false;
  loadError = false;
  isSaving = false;

  isEditorOpen = false;
  editingJobId: string | null = null;

  cronForm: FormGroup;

  constructor(
    private cronService: CronAdminService,
    private appService: AppAdminService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private confirm: ConfirmService
  ) {
    this.cronForm = this.fb.group({
      name: [''],
      prompt: ['', Validators.required],
      schedule: ['every 1h', Validators.required],
      repeat_times: [null],
      deliver: ['local'],
      enabled: [true],
      app_id: [null],
      persona_id: [null]
    });
  }

  ngOnInit() {
    this.loadCrons();
    this.loadApps();
    // A USER changing the app reloads its personas and clears the stale
    // choice. emitEvent:false on the reset avoids a feedback loop; programmatic
    // patches in openEditor also use emitEvent:false so editing never wipes the
    // saved persona.
    this.cronForm.get('app_id')!.valueChanges.subscribe((appId) => {
      this.cronForm.get('persona_id')!.setValue(null, { emitEvent: false });
      this.loadPersonas(appId);
    });
  }

  loadApps() {
    this.appService.listApps().subscribe({
      next: (apps) => this.apps = apps,
      error: () => {}
    });
  }

  loadCrons() {
    this.isLoading = true;
    this.loadError = false;
    this.cronService.listJobs().subscribe({
      next: (crons) => {
        this.crons = crons;
        this.isLoading = false;
        // Pre-fetch persona names for every cron that has a persona_id,
        // so the card grid can show the name without opening the editor.
        this.prefetchPersonaNames(crons);
      },
      error: () => {
        this.isLoading = false;
        this.loadError = true;
      }
    });
  }

  /** Batch-load persona names for cron cards (one API call per distinct app). */
  private prefetchPersonaNames(crons: CronJob[]) {
    const appIds = new Set(crons.filter(j => j.app_id).map(j => j.app_id!));
    appIds.forEach(appId => {
      this.appService.listPersonas(appId).subscribe({
        next: (personas) => {
          personas.forEach(p => this.personaNameCache[p.personaId] = p.name);
        },
        error: () => {} // best-effort
      });
    });
  }

  openEditor(job?: CronJob) {
    this.isEditorOpen = true;

    if (job) {
      this.editingJobId = job.id;
      // Load the app's personas so the picker can show the saved one.
      this.loadPersonas(job.app_id ?? null);
      // emitEvent:false → don't trigger the app_id subscription, which would
      // clear the persona we're about to restore.
      this.cronForm.patchValue({
        name: job.name,
        prompt: job.prompt,
        schedule: job.schedule_display,
        repeat_times: job.repeat?.times,
        deliver: job.deliver,
        enabled: job.enabled,
        app_id: job.app_id || null,
        persona_id: job.persona_id ?? null
      }, { emitEvent: false });
    } else {
      this.editingJobId = null;
      this.personas = [];
      this.cronForm.reset({
        schedule: 'every 1h',
        deliver: 'local',
        enabled: true,
        app_id: null,
        persona_id: null
      }, { emitEvent: false });
    }
  }

  private loadPersonas(appId: number | null) {
    if (!appId) { this.personas = []; return; }
    this.appService.listPersonas(appId).subscribe({
      next: (p) => this.personas = p,
      error: () => this.personas = []
    });
  }

  /** Resolve app name for a cron card. */
  getAppName(appId: number | undefined): string {
    if (!appId) return '';
    const app = this.apps.find(a => a.appId === appId);
    return app?.name || `App #${appId}`;
  }

  /** Resolve persona name for a cron card. */
  getPersonaName(personaId: number | null | undefined): string {
    if (!personaId) return '';
    return this.personaNameCache[personaId] || `Persona #${personaId}`;
  }

  closeEditor() {
    this.isEditorOpen = false;
  }

  saveCron() {
    if (this.cronForm.invalid) {
      this.cronForm.markAllAsTouched();
      return;
    }

    const val = this.cronForm.value;

    if (val.repeat_times === '' || val.repeat_times === undefined) {
      val.repeat_times = null;
    }

    this.isSaving = true;
    const saveObs = this.editingJobId
      ? this.cronService.updateJob(this.editingJobId, val)
      : this.cronService.createJob(val);

    saveObs.subscribe({
      next: () => {
        this.isSaving = false;
        this.toastr.success(this.editingJobId ? 'Cron job updated' : 'Cron job created');
        this.closeEditor();
        this.loadCrons();
      },
      error: (err) => {
        this.isSaving = false;
        this.toastr.error(err.error?.detail || 'Error saving cron job');
      }
    });
  }

  async deleteCron(job: CronJob) {
    const ok = await this.confirm.ask({
      title: 'Delete cron job?',
      message: `“${job.name || job.id}” will be permanently removed. This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    this.cronService.deleteJob(job.id).subscribe({
      next: () => { this.toastr.success('Cron job deleted'); this.loadCrons(); },
      error: (err) => this.toastr.error(err.error?.detail || 'Error deleting cron job'),
    });
  }

  toggleCronState(job: CronJob) {
    this.cronService.updateJob(job.id, { enabled: !job.enabled }).subscribe(() => {
      this.loadCrons();
    });
  }
}
