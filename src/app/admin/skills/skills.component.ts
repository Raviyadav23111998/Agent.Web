import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { SkillsAdminService, Skill, SkillVersion }
  from '../../chat/services/skills-admin.service';
import { ConfirmService } from '../../common/ui/confirm.service';
import { FormDialogService } from '../../common/ui/form-dialog.service';

@Component({
  selector: 'app-skills',
  templateUrl: './skills.component.html',
  styleUrls: ['./skills.component.scss'],
  standalone: false
})
export class SkillsComponent implements OnInit {
  skills: Skill[] = [];
  isLoading = false;
  loadError = false;
  errorMessage = '';
  successMessage = '';

  @ViewChild('editorTpl', { static: true }) editorTpl!: TemplateRef<any>;
  editing: Skill | null = null;
  editBody = '';
  editDescription = '';
  versions: SkillVersion[] = [];

  constructor(
    private svc: SkillsAdminService,
    private confirm: ConfirmService,
    public formDialog: FormDialogService,
  ) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading = true;
    this.loadError = false;
    this.svc.list().subscribe({
      next: (rows) => { this.skills = rows; this.isLoading = false; },
      error: () => { this.isLoading = false; this.loadError = true; },
    });
  }

  correctionRatio(s: Skill): string {
    if (!s.use_count) return '—';
    return Math.round(100 * s.correction_after_use / s.use_count) + '%';
  }

  togglePin(s: Skill): void {
    this.svc.update(s.skill_id, { pinned: !s.pinned }).subscribe({
      next: () => { s.pinned = !s.pinned;
                    this.flash(s.pinned ? 'Pinned.' : 'Unpinned.'); },
      error: (e) => this.errorMessage = e.error?.detail || 'Update failed.',
    });
  }

  openEditor(s: Skill): void {
    this.editing = s;
    this.editBody = s.body;
    this.editDescription = s.description;
    this.versions = [];
    this.svc.versions(s.skill_id).subscribe({
      next: (v) => this.versions = v, error: () => {},
    });
    this.formDialog.open({ title: `Skill: ${s.name}`, template: this.editorTpl });
  }

  saveEdit(): void {
    if (!this.editing) return;
    this.svc.update(this.editing.skill_id, {
      body: this.editBody, description: this.editDescription,
    }).subscribe({
      next: () => { this.formDialog.close(); this.flash('Skill updated.'); this.load(); },
      error: (e) => this.errorMessage = e.error?.detail || 'Save failed.',
    });
  }

  rollback(v: SkillVersion): void {
    if (!this.editing) return;
    this.svc.rollback(this.editing.skill_id, v.version).subscribe({
      next: () => { this.formDialog.close(); this.flash(`Rolled back to v${v.version}.`); this.load(); },
      error: (e) => this.errorMessage = e.error?.detail || 'Rollback failed.',
    });
  }

  async archive(s: Skill): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Archive skill?',
      message: `"${s.name}" stops appearing in the agent's skill index. Version history is kept.`,
      confirmText: 'Archive', variant: 'danger',
    });
    if (!ok) return;
    this.svc.archive(s.skill_id).subscribe({
      next: () => { this.flash('Skill archived.'); this.load(); },
      error: (e) => this.errorMessage = e.error?.detail || 'Archive failed.',
    });
  }

  private flash(msg: string): void {
    this.successMessage = msg;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 4000);
  }
}
