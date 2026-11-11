import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  private static readonly ADMIN_ROLES = [
    'admin', 'superadmin', 'administrator', 'owner', 'tenant owner'
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const session = this.authService.getActiveSession();
    if (!session) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    const role = (session.role || '').toLowerCase();
    if (AdminGuard.ADMIN_ROLES.includes(role)) {
      return true;
    }

    this.toastr.error('Admin access required', 'Access Denied');
    this.router.navigate(['/chat']);
    return false;
  }
}
