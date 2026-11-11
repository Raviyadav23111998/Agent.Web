import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { BrandingService } from './branding.service';

@Component({
  selector: 'app-branding',
  templateUrl: './branding.component.html',
  styleUrls: ['./branding.component.scss'],
  standalone: false,
})
export class BrandingComponent implements OnInit {
  tenantDomain = window.location.hostname;

  logoUrl = '';
  logoExists = false;
  checking = true;
  uploading = false;

  constructor(private svc: BrandingService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.refreshLogo();
  }

  private refreshLogo(bust = 0): void {
    this.checking = true;
    const url = this.svc.tenantLogoUrl(bust);
    const img = new Image();
    img.onload = () => { this.logoExists = true; this.logoUrl = url; this.checking = false; };
    img.onerror = () => { this.logoExists = false; this.logoUrl = ''; this.checking = false; };
    img.src = url;
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) { return; }

    if (!/^image\/(png|jpe?g|svg\+xml|webp|x-icon|vnd\.microsoft\.icon)$/.test(file.type)) {
      this.toastr.warning('Please choose an image file (PNG, JPG, SVG, WEBP, or ICO).');
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.toastr.warning('Logo must be under 2 MB.');
      input.value = '';
      return;
    }

    this.uploading = true;
    this.svc.uploadLogo(file).subscribe({
      next: () => {
        this.uploading = false;
        this.toastr.success('Logo updated — it now applies across the web app, favicon, Teams, chatbot, and VS Code.');
        this.refreshLogo(Date.now());
      },
      error: (e) => {
        this.uploading = false;
        const msg = e?.error?.message || e?.error?.detail ||
          (e?.status === 401 ? 'Not authorized to upload a logo for this tenant.'
                             : 'Logo upload failed. Please try again.');
        this.toastr.error(msg);
      },
    });
    input.value = '';
  }
}
