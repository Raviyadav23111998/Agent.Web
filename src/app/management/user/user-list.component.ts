import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  standalone: false
})
export class UserListComponent implements OnInit {
  users: any[] = [];
  total = 0;
  skip = 0;
  take = 20;
  search = '';
  sortField = '';
  sortDir = '';
  isLoading = false;

  constructor(
    private userService: UserService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.userService.getUsers(
      this.skip, this.take,
      this.search || undefined,
      this.sortField || undefined,
      this.sortDir || undefined
    ).subscribe({
      next: (res) => {
        this.users = res.data;
        this.total = res.total;
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to load users');
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.skip = 0;
    this.loadData();
  }

  onSort(field: string): void {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
    this.loadData();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return '↕';
    return this.sortDir === 'asc' ? '↑' : '↓';
  }

  nextPage(): void {
    if (this.skip + this.take < this.total) {
      this.skip += this.take;
      this.loadData();
    }
  }

  prevPage(): void {
    if (this.skip > 0) {
      this.skip = Math.max(0, this.skip - this.take);
      this.loadData();
    }
  }

  get currentPage(): number {
    return Math.floor(this.skip / this.take) + 1;
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.take);
  }

  editUser(user: any): void {
    this.router.navigate(['/admin/users/add-user', user.userId]);
  }

  newUser(): void {
    this.router.navigate(['/admin/users/add-user', 0]);
  }

  deleteUser(user: any, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Delete user "${user.fullName}"? This action cannot be undone.`)) return;
    this.userService.deleteUser(user.userId).subscribe({
      next: () => {
        this.toastr.success('User deleted');
        this.loadData();
      },
      error: () => this.toastr.error('Failed to delete user')
    });
  }
}
