import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of, timer } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
  standalone: false
})
export class UserComponent implements OnInit {
  public userForm: FormGroup;
  public userId: number = 0;
  public isEditMode: boolean = false;
  public isSubmitting: boolean = false;
  public roles: any[] = [];
  public activeTab: 'details' | 'attachments' = 'details';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private toastr: ToastrService
  ) {
    this.userForm = this.fb.group({
      userCode: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)], [this.userCodeValidator()]],
      fullName: ['', [Validators.required, Validators.maxLength(200)]],
      email: ['', [Validators.required, Validators.email], [this.emailValidator()]],
      mobile: [''],
      roleId: [null, Validators.required],
      isActive: [true],
      password: ['']
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.route.params.subscribe(params => {
      this.userId = +params['id'];
      if (this.userId && this.userId > 0) {
        this.isEditMode = true;
        this.loadUser(this.userId);
      } else {
        this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
        this.userForm.get('password')?.updateValueAndValidity();
      }
    });
  }

  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (res) => {
        this.roles = res.map(r => ({ text: r.role_name, value: r.role_id }));
      },
      error: () => this.toastr.error('Failed to load roles')
    });
  }

  userCodeValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) return of(null);
      return timer(500).pipe(
        switchMap(() => this.userService.validateUserCode(control.value, this.userId)),
        map(res => res.exists ? { codeTaken: true } : null),
        catchError(() => of(null))
      );
    };
  }

  emailValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) return of(null);
      if (this.isEditMode && control.pristine) return of(null);
      return timer(500).pipe(
        switchMap(() => this.userService.validateEmail(control.value)),
        map(res => res.exists ? { emailTaken: true } : null),
        catchError(() => of(null))
      );
    };
  }

  loadUser(id: number): void {
    this.userService.getUser(id).subscribe({
      next: (user: any) => {
        this.userForm.patchValue({
          userCode: user.userCode,
          fullName: user.fullName,
          email: user.email,
          mobile: user.mobile,
          roleId: user.roleId,
          isActive: user.isActive
        });
      },
      error: () => {
        this.toastr.error('Failed to load user details');
        this.navigateBack();
      }
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formData = this.userForm.value;

    if (this.isEditMode) {
      if (!formData.password) delete formData.password;
      this.userService.updateUser(this.userId, formData).subscribe({
        next: () => {
          this.toastr.success('User updated successfully');
          this.navigateBack();
        },
        error: () => {
          this.toastr.error('Error updating user');
          this.isSubmitting = false;
        }
      });
    } else {
      this.userService.createUser(formData).subscribe({
        next: () => {
          this.toastr.success('User created successfully');
          this.navigateBack();
        },
        error: () => {
          this.toastr.error('Error creating user');
          this.isSubmitting = false;
        }
      });
    }
  }

  navigateBack(): void {
    this.router.navigate(['/admin/users']);
  }
}
